import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { RepositoryEntity, RepositorySyncStatus, RepositoryVisibility } from './entities/repository.entity';
import { RepositorySyncEntity, SyncStatus, SyncType } from './entities/repository-sync.entity';
import { RepositoryIssueEntity, IssueState } from './entities/repository-issue.entity';
import { RepositoryPullRequestEntity, PullRequestState } from './entities/repository-pull-request.entity';
import { RepositoryLanguageEntity } from './entities/repository-language.entity';
import { RepositoryContributorEntity } from './entities/repository-contributor.entity';
import { GithubApiClient } from '../github/github-api.client';
import { GithubAccountEntity } from '../github/entities/github-account.entity';
import { decrypt } from '../common/utils/crypto.util';
import { ConfigService } from '@nestjs/config';
import { QUEUE_NAMES, JOB_NAMES } from '../queue/queue.constants';

@Injectable()
export class RepositorySyncService {
  private readonly logger = new Logger(RepositorySyncService.name);

  constructor(
    @InjectRepository(RepositoryEntity)
    private readonly repoRepo: Repository<RepositoryEntity>,
    @InjectRepository(RepositorySyncEntity)
    private readonly syncRepo: Repository<RepositorySyncEntity>,
    @InjectRepository(RepositoryIssueEntity)
    private readonly issueRepo: Repository<RepositoryIssueEntity>,
    @InjectRepository(RepositoryPullRequestEntity)
    private readonly prRepo: Repository<RepositoryPullRequestEntity>,
    @InjectRepository(RepositoryLanguageEntity)
    private readonly languageRepo: Repository<RepositoryLanguageEntity>,
    @InjectRepository(RepositoryContributorEntity)
    private readonly contributorRepo: Repository<RepositoryContributorEntity>,
    @InjectRepository(GithubAccountEntity)
    private readonly githubAccountRepo: Repository<GithubAccountEntity>,
    private readonly githubApiClient: GithubApiClient,
    private readonly config: ConfigService,
    @InjectQueue(QUEUE_NAMES.GITHUB_SYNC)
    private readonly syncQueue: Queue,
  ) {}

  /**
   * Enqueue a full or incremental sync for a repository.
   */
  async enqueueSyncJob(
    repositoryId: string,
    syncType: SyncType = SyncType.INCREMENTAL,
    priority = 3,
  ): Promise<void> {
    await this.syncQueue.add(
      JOB_NAMES.SYNC_REPOSITORY,
      { repositoryId, syncType },
      {
        priority,
        attempts: 5,
        backoff: { type: 'exponential', delay: 2000 },
        jobId: `sync:${repositoryId}:${syncType}`,
        removeOnComplete: 50,
        removeOnFail: 200,
      },
    );
    this.logger.log(`Enqueued ${syncType} sync for repository ${repositoryId}`);
  }

  /**
   * Perform a full synchronization of a repository.
   * Syncs: metadata, languages, issues, PRs, contributors.
   */
  async syncRepository(
    repositoryId: string,
    syncType: SyncType = SyncType.INCREMENTAL,
  ): Promise<RepositorySyncEntity> {
    const repo = await this.repoRepo.findOne({ where: { id: repositoryId } });
    if (!repo) throw new NotFoundException(`Repository ${repositoryId} not found`);

    // Create sync record
    const syncRecord = await this.syncRepo.save(
      this.syncRepo.create({
        repositoryId,
        syncType,
        status: SyncStatus.RUNNING,
        startedAt: new Date(),
      }),
    );

    // Mark repo as syncing
    await this.repoRepo.update(repositoryId, {
      syncStatus: RepositorySyncStatus.SYNCING,
    });

    try {
      const token = await this.resolveTokenForRepo(repo);
      const { owner, repo: repoName } = this.githubApiClient.parseFullName(repo.fullName);
      const since = syncType === SyncType.INCREMENTAL ? (repo.lastSyncedAt ?? undefined) : undefined;

      // 1. Sync metadata
      const repoData = await this.githubApiClient.getRepository(owner, repoName, token);
      await this.repoRepo.update(repositoryId, {
        name: repoData.name,
        description: repoData.description ?? undefined,
        defaultBranch: repoData.default_branch,
        language: repoData.language ?? undefined,
        topics: repoData.topics,
        visibility: (repoData.visibility as RepositoryVisibility) ?? RepositoryVisibility.PUBLIC,
        starCount: repoData.stargazers_count,
        forkCount: repoData.forks_count,
        watcherCount: repoData.watchers_count,
        openIssueCount: repoData.open_issues_count,
        subscriberCount: repoData.subscribers_count,
        pushedAt: repoData.pushed_at ? new Date(repoData.pushed_at) : undefined,
      });

      // 2. Sync languages
      await this.syncLanguages(repositoryId, owner, repoName, token);

      // 3. Sync issues
      const issuesSynced = await this.syncIssues(repositoryId, owner, repoName, token, since);
      syncRecord.issuesSynced = issuesSynced;

      // 4. Sync PRs
      const prsSynced = await this.syncPullRequests(repositoryId, owner, repoName, token, since);
      syncRecord.prsSynced = prsSynced;

      // 5. Sync contributors (full sync only, or first time)
      let contributorsSynced = 0;
      if (syncType === SyncType.FULL || !repo.lastSyncedAt) {
        contributorsSynced = await this.syncContributors(repositoryId, owner, repoName, token);
        syncRecord.contributorsSynced = contributorsSynced;
      }

      // Mark success
      const completedAt = new Date();
      await this.syncRepo.update(syncRecord.id, {
        status: SyncStatus.COMPLETED,
        completedAt,
        issuesSynced,
        prsSynced,
        contributorsSynced,
      });

      await this.repoRepo.update(repositoryId, {
        syncStatus: RepositorySyncStatus.SYNCED,
        lastSyncedAt: completedAt,
        syncError: undefined,
      });

      this.logger.log(
        `Sync complete for ${repo.fullName}: ${issuesSynced} issues, ${prsSynced} PRs, ${contributorsSynced} contributors`,
      );

      return { ...syncRecord, status: SyncStatus.COMPLETED, completedAt };
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Sync failed for ${repo.fullName}: ${errMsg}`, error instanceof Error ? error.stack : undefined);

      await this.syncRepo.update(syncRecord.id, {
        status: SyncStatus.FAILED,
        completedAt: new Date(),
        errorMessage: errMsg,
      });

      await this.repoRepo.update(repositoryId, {
        syncStatus: RepositorySyncStatus.FAILED,
        syncError: errMsg,
      });

      throw error;
    }
  }

  /**
   * Sync language breakdown for a repository.
   * Replaces all existing language records.
   */
  async syncLanguages(
    repositoryId: string,
    owner: string,
    repo: string,
    token?: string,
  ): Promise<void> {
    const langMap = await this.githubApiClient.getLanguages(owner, repo, token);
    const totalBytes = Object.values(langMap).reduce((a, b) => a + b, 0);

    if (totalBytes === 0) return;

    // Delete existing
    await this.languageRepo.delete({ repositoryId });

    // Insert new
    const entities = Object.entries(langMap).map(([language, bytes]) =>
      this.languageRepo.create({
        repositoryId,
        language,
        bytes,
        percentage: Math.round((bytes / totalBytes) * 10000) / 100,
      }),
    );

    await this.languageRepo.save(entities);
  }

  /**
   * Sync issues for a repository (upsert by githubId).
   * Filters out pull_request items from the issues endpoint.
   */
  async syncIssues(
    repositoryId: string,
    owner: string,
    repo: string,
    token?: string,
    since?: Date,
  ): Promise<number> {
    const rawIssues = await this.githubApiClient.getIssues(owner, repo, token, since);
    // GitHub issues endpoint returns PRs too — filter them out
    const issues = rawIssues.filter((i) => !i.pull_request);
    let count = 0;

    for (const issue of issues) {
      const existing = await this.issueRepo.findOne({
        where: { repositoryId, githubNumber: issue.number },
      });

      const entity = {
        repositoryId,
        githubId: String(issue.id),
        githubNumber: issue.number,
        title: issue.title,
        body: issue.body ?? undefined,
        state: issue.state === 'open' ? IssueState.OPEN : IssueState.CLOSED,
        htmlUrl: issue.html_url,
        authorLogin: issue.user?.login,
        authorAvatarUrl: issue.user?.avatar_url,
        assigneeLogin: issue.assignee?.login,
        labels: issue.labels.map((l) => l.name),
        commentsCount: issue.comments,
        closedAt: issue.closed_at ? new Date(issue.closed_at) : undefined,
        githubCreatedAt: new Date(issue.created_at),
        githubUpdatedAt: new Date(issue.updated_at),
      };

      if (existing) {
        await this.issueRepo.update(existing.id, entity);
      } else {
        await this.issueRepo.save(this.issueRepo.create(entity));
      }
      count++;
    }

    return count;
  }

  /**
   * Sync pull requests for a repository (upsert by githubId).
   */
  async syncPullRequests(
    repositoryId: string,
    owner: string,
    repo: string,
    token?: string,
    since?: Date,
  ): Promise<number> {
    const prs = await this.githubApiClient.getPullRequests(owner, repo, token, since);
    let count = 0;

    for (const pr of prs) {
      const existing = await this.prRepo.findOne({
        where: { repositoryId, githubNumber: pr.number },
      });

      let state: PullRequestState;
      if (pr.merged_at) state = PullRequestState.MERGED;
      else if (pr.state === 'closed') state = PullRequestState.CLOSED;
      else state = PullRequestState.OPEN;

      const entity = {
        repositoryId,
        githubId: String(pr.id),
        githubNumber: pr.number,
        title: pr.title,
        body: pr.body ?? undefined,
        state,
        htmlUrl: pr.html_url,
        headBranch: pr.head.ref,
        baseBranch: pr.base.ref,
        headSha: pr.head.sha,
        authorLogin: pr.user?.login,
        authorAvatarUrl: pr.user?.avatar_url,
        mergedByLogin: pr.merged_by?.login,
        labels: pr.labels.map((l) => l.name),
        requestedReviewers: pr.requested_reviewers.map((r) => r.login),
        commentsCount: pr.comments,
        reviewCommentsCount: pr.review_comments,
        commits: pr.commits,
        additions: pr.additions,
        deletions: pr.deletions,
        changedFiles: pr.changed_files,
        mergedAt: pr.merged_at ? new Date(pr.merged_at) : undefined,
        closedAt: pr.closed_at ? new Date(pr.closed_at) : undefined,
        githubCreatedAt: new Date(pr.created_at),
        githubUpdatedAt: new Date(pr.updated_at),
      };

      if (existing) {
        await this.prRepo.update(existing.id, entity);
      } else {
        await this.prRepo.save(this.prRepo.create(entity));
      }
      count++;
    }

    return count;
  }

  /**
   * Sync contributors for a repository (upsert by githubLogin).
   */
  async syncContributors(
    repositoryId: string,
    owner: string,
    repo: string,
    token?: string,
  ): Promise<number> {
    const contributors = await this.githubApiClient.getContributors(owner, repo, token);
    let count = 0;

    for (const contrib of contributors) {
      const existing = await this.contributorRepo.findOne({
        where: { repositoryId, githubLogin: contrib.login },
      });

      const entity = {
        repositoryId,
        githubLogin: contrib.login,
        githubId: String(contrib.id),
        avatarUrl: contrib.avatar_url,
        htmlUrl: contrib.html_url,
        contributions: contrib.contributions,
      };

      if (existing) {
        await this.contributorRepo.update(existing.id, entity);
      } else {
        await this.contributorRepo.save(this.contributorRepo.create(entity));
      }
      count++;
    }

    return count;
  }

  /**
   * Get sync history for a repository.
   */
  async getSyncHistory(
    repositoryId: string,
    limit = 10,
  ): Promise<RepositorySyncEntity[]> {
    return this.syncRepo.find({
      where: { repositoryId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  /**
   * Get synced issues for a repository with optional filters.
   */
  async getIssues(
    repositoryId: string,
    filters: { state?: IssueState; page?: number; limit?: number } = {},
  ) {
    const { state, page = 1, limit = 30 } = filters;
    const qb = this.issueRepo
      .createQueryBuilder('issue')
      .where('issue.repositoryId = :repositoryId', { repositoryId })
      .orderBy('issue.githubNumber', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (state) {
      qb.andWhere('issue.state = :state', { state });
    }

    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit };
  }

  /**
   * Get synced PRs for a repository with optional filters.
   */
  async getPullRequests(
    repositoryId: string,
    filters: { state?: PullRequestState; page?: number; limit?: number } = {},
  ) {
    const { state, page = 1, limit = 30 } = filters;
    const qb = this.prRepo
      .createQueryBuilder('pr')
      .where('pr.repositoryId = :repositoryId', { repositoryId })
      .orderBy('pr.githubNumber', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (state) {
      qb.andWhere('pr.state = :state', { state });
    }

    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit };
  }

  /**
   * Get language breakdown for a repository.
   */
  async getLanguages(repositoryId: string): Promise<RepositoryLanguageEntity[]> {
    return this.languageRepo.find({
      where: { repositoryId },
      order: { bytes: 'DESC' },
    });
  }

  /**
   * Get contributors for a repository.
   */
  async getContributors(
    repositoryId: string,
    limit = 50,
  ): Promise<RepositoryContributorEntity[]> {
    return this.contributorRepo.find({
      where: { repositoryId },
      order: { contributions: 'DESC' },
      take: limit,
    });
  }

  // ─── Private helpers ──────────────────────────────────────────────────────────

  private async resolveTokenForRepo(repo: RepositoryEntity): Promise<string | undefined> {
    if (!repo.organizationId) return undefined;

    const account = await this.githubAccountRepo.findOne({
      where: { organizationId: repo.organizationId },
    });

    if (!account?.accessTokenEncrypted) return undefined;

    try {
      const key = this.config.get<string>('encryption.key') ?? '';
      const iv = this.config.get<string>('encryption.iv') ?? '';
      return decrypt(account.accessTokenEncrypted, key, iv);
    } catch {
      this.logger.warn(`Failed to decrypt token for repo ${repo.fullName}`);
      return undefined;
    }
  }
}
