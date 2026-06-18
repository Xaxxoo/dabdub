import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  RepositoryEntity,
  RepositorySyncStatus,
  RepositoryVisibility,
} from './entities/repository.entity';
import { ConnectRepositoryDto } from './dto/connect-repository.dto';
import { GithubApiClient } from '../github/github-api.client';
import { GithubAccountEntity } from '../github/entities/github-account.entity';
import { RepositorySyncService } from './repository-sync.service';
import { SyncType } from './entities/repository-sync.entity';
import { PaginationDto } from '../common/dto/pagination.dto';
import { buildPaginatedResult } from '../common/utils/pagination.util';
import { decrypt } from '../common/utils/crypto.util';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class RepositoriesService {
  constructor(
    @InjectRepository(RepositoryEntity)
    private readonly repoRepo: Repository<RepositoryEntity>,
    @InjectRepository(GithubAccountEntity)
    private readonly accountRepo: Repository<GithubAccountEntity>,
    private readonly githubApiClient: GithubApiClient,
    private readonly repoSyncService: RepositorySyncService,
    private readonly config: ConfigService,
  ) {}

  async findAll(pagination: PaginationDto, organizationId?: string) {
    const qb = this.repoRepo
      .createQueryBuilder('repo')
      .leftJoinAndSelect('repo.organization', 'organization')
      .where('repo.deletedAt IS NULL');

    if (organizationId) {
      qb.andWhere('repo.organizationId = :organizationId', { organizationId });
    }

    if (pagination.search) {
      qb.andWhere(
        '(repo.name ILIKE :search OR repo.fullName ILIKE :search)',
        { search: `%${pagination.search}%` },
      );
    }

    qb.orderBy('repo.starCount', 'DESC')
      .skip(pagination.skip)
      .take(pagination.limit);

    const [data, total] = await qb.getManyAndCount();
    return buildPaginatedResult(data, total, pagination);
  }

  async findById(id: string): Promise<RepositoryEntity> {
    const repo = await this.repoRepo.findOne({
      where: { id },
      relations: ['organization', 'syncs'],
    });
    if (!repo) throw new NotFoundException(`Repository ${id} not found`);
    return repo;
  }

  async findByFullName(fullName: string): Promise<RepositoryEntity> {
    const repo = await this.repoRepo.findOne({
      where: { fullName },
      relations: ['organization'],
    });
    if (!repo) throw new NotFoundException(`Repository ${fullName} not found`);
    return repo;
  }

  async connect(dto: ConnectRepositoryDto): Promise<RepositoryEntity> {
    // Check if already connected
    const existing = await this.repoRepo.findOne({
      where: { fullName: dto.fullName },
    });
    if (existing) {
      // Re-associate org if provided
      if (dto.organizationId) {
        await this.repoRepo.update(existing.id, { organizationId: dto.organizationId });
      }
      if (dto.syncOnConnect !== false) {
        await this.repoSyncService.enqueueSyncJob(existing.id, SyncType.FULL);
      }
      return this.findById(existing.id);
    }

    // Fetch from GitHub
    const token = await this.resolveTokenForOrg(dto.organizationId);
    const { owner, repo } = this.githubApiClient.parseFullName(dto.fullName);
    const ghRepo = await this.githubApiClient.getRepository(owner, repo, token);

    const saved = await this.repoRepo.save(
      this.repoRepo.create({
        githubId: String(ghRepo.id),
        name: ghRepo.name,
        fullName: ghRepo.full_name,
        description: ghRepo.description ?? undefined,
        htmlUrl: ghRepo.html_url,
        cloneUrl: ghRepo.clone_url,
        defaultBranch: ghRepo.default_branch,
        language: ghRepo.language ?? undefined,
        topics: ghRepo.topics,
        visibility: ghRepo.private
          ? RepositoryVisibility.PRIVATE
          : RepositoryVisibility.PUBLIC,
        starCount: ghRepo.stargazers_count,
        forkCount: ghRepo.forks_count,
        watcherCount: ghRepo.watchers_count,
        openIssueCount: ghRepo.open_issues_count,
        subscriberCount: ghRepo.subscribers_count,
        pushedAt: ghRepo.pushed_at ? new Date(ghRepo.pushed_at) : undefined,
        organizationId: dto.organizationId,
        syncStatus: RepositorySyncStatus.NEVER,
      }),
    );

    if (dto.syncOnConnect !== false) {
      await this.repoSyncService.enqueueSyncJob(saved.id, SyncType.FULL);
    }

    return saved;
  }

  async disconnect(id: string, purgeData = false): Promise<void> {
    if (purgeData) {
      // Hard delete all associated sync data handled by cascade in DB
      await this.repoRepo.delete(id);
    } else {
      await this.repoRepo.softDelete(id);
    }
  }

  async triggerSync(id: string, full = false): Promise<void> {
    await this.findById(id); // ensure exists
    await this.repoSyncService.enqueueSyncJob(
      id,
      full ? SyncType.FULL : SyncType.INCREMENTAL,
    );
  }

  async upsert(data: Partial<RepositoryEntity>): Promise<RepositoryEntity> {
    const existing = data.githubId
      ? await this.repoRepo.findOne({ where: { githubId: data.githubId } })
      : null;

    if (existing) {
      await this.repoRepo.update(existing.id, data as any);
      return this.findById(existing.id);
    }

    return this.repoRepo.save(this.repoRepo.create(data));
  }

  async softDelete(id: string): Promise<void> {
    await this.repoRepo.softDelete(id);
  }

  // ─── Sub-resource passthrough ─────────────────────────────────────────────

  async getIssues(repositoryId: string, filters?: Record<string, unknown>) {
    return this.repoSyncService.getIssues(repositoryId, filters);
  }

  async getPullRequests(repositoryId: string, filters?: Record<string, unknown>) {
    return this.repoSyncService.getPullRequests(repositoryId, filters);
  }

  async getLanguages(repositoryId: string) {
    return this.repoSyncService.getLanguages(repositoryId);
  }

  async getContributors(repositoryId: string, limit?: number) {
    return this.repoSyncService.getContributors(repositoryId, limit);
  }

  async getSyncHistory(repositoryId: string, limit?: number) {
    return this.repoSyncService.getSyncHistory(repositoryId, limit);
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  private async resolveTokenForOrg(organizationId?: string): Promise<string | undefined> {
    if (!organizationId) return undefined;
    const account = await this.accountRepo.findOne({
      where: { organizationId },
    });
    if (!account?.accessTokenEncrypted) return undefined;
    try {
      const key = this.config.get<string>('encryption.key') ?? '';
      const iv = this.config.get<string>('encryption.iv') ?? '';
      return decrypt(account.accessTokenEncrypted, key, iv);
    } catch {
      return undefined;
    }
  }
}
