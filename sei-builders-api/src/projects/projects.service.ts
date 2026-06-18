import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProjectEntity, ProjectStatus } from './entities/project.entity';
import { RepositoryEntity } from '../repositories/entities/repository.entity';
import { CreateProjectDto } from './dto/create-project.dto';
import { ConnectProjectRepositoryDto } from './dto/connect-repository.dto';
import { UpdateContributionSettingsDto } from './dto/update-contribution-settings.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { buildPaginatedResult } from '../common/utils/pagination.util';
import { generateUniqueSlug } from '../common/utils/slug.util';
import { CacheService } from '../cache/cache.service';
import { CACHE_KEYS, CACHE_TTL } from '../common/constants/cache.constants';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(ProjectEntity)
    private readonly projectRepo: Repository<ProjectEntity>,
    @InjectRepository(RepositoryEntity)
    private readonly repoRepo: Repository<RepositoryEntity>,
    private readonly cache: CacheService,
  ) {}

  async create(dto: CreateProjectDto, userId: string): Promise<ProjectEntity> {
    const slug = await generateUniqueSlug(dto.name, async (s) =>
      !!(await this.projectRepo.findOne({ where: { slug: s } })),
    );

    const project = await this.projectRepo.save(
      this.projectRepo.create({ ...dto, slug, ownerId: userId }),
    );
    return project;
  }

  async findAll(pagination: PaginationDto) {
    const qb = this.projectRepo
      .createQueryBuilder('project')
      .leftJoinAndSelect('project.category', 'category')
      .leftJoinAndSelect('project.tags', 'tags')
      .leftJoinAndSelect('project.organization', 'organization')
      .where('project.deletedAt IS NULL')
      .andWhere('project.status = :status', { status: ProjectStatus.ACTIVE });

    if (pagination.search) {
      qb.andWhere(
        '(project.name ILIKE :search OR project.description ILIKE :search)',
        { search: `%${pagination.search}%` },
      );
    }

    qb.orderBy('project.createdAt', 'DESC')
      .skip(pagination.skip)
      .take(pagination.limit);

    const [data, total] = await qb.getManyAndCount();
    return buildPaginatedResult(data, total, pagination);
  }

  async findById(id: string): Promise<ProjectEntity> {
    return this.cache.getOrSet(
      CACHE_KEYS.PROJECT(id),
      async () => {
        const project = await this.projectRepo.findOne({
          where: { id },
          relations: ['category', 'tags', 'organization', 'owner'],
        });
        if (!project) throw new NotFoundException(`Project ${id} not found`);
        return project;
      },
      CACHE_TTL.PROJECT,
    );
  }

  async findBySlug(slug: string): Promise<ProjectEntity> {
    const project = await this.projectRepo.findOne({
      where: { slug },
      relations: ['category', 'tags', 'organization', 'owner'],
    });
    if (!project) throw new NotFoundException(`Project ${slug} not found`);
    return project;
  }

  async update(
    id: string,
    dto: Partial<CreateProjectDto>,
    userId: string,
  ): Promise<ProjectEntity> {
    const project = await this.findById(id);
    if (project.ownerId !== userId) {
      throw new ForbiddenException('Only the project owner can update it');
    }
    await this.projectRepo.update(id, dto);
    await this.cache.del(CACHE_KEYS.PROJECT(id));
    return this.findById(id);
  }

  async publish(id: string, userId: string): Promise<ProjectEntity> {
    const project = await this.findById(id);
    if (project.ownerId !== userId) {
      throw new ForbiddenException('Only the project owner can publish it');
    }
    await this.projectRepo.update(id, { status: ProjectStatus.ACTIVE });
    await this.cache.del(CACHE_KEYS.PROJECT(id));
    return this.findById(id);
  }

  async archive(id: string, userId: string): Promise<ProjectEntity> {
    const project = await this.findById(id);
    if (project.ownerId !== userId) {
      throw new ForbiddenException('Only the project owner can archive it');
    }
    await this.projectRepo.update(id, { status: ProjectStatus.ARCHIVED });
    await this.cache.del(CACHE_KEYS.PROJECT(id));
    return this.findById(id);
  }

  async softDelete(id: string, userId: string): Promise<void> {
    const project = await this.findById(id);
    if (project.ownerId !== userId) {
      throw new ForbiddenException('Only the project owner can delete it');
    }
    await this.projectRepo.softDelete(id);
    await this.cache.del(CACHE_KEYS.PROJECT(id));
  }

  async connectRepository(
    id: string,
    dto: ConnectProjectRepositoryDto,
    userId: string,
  ): Promise<ProjectEntity> {
    const project = await this.findById(id);
    if (project.ownerId !== userId) {
      throw new ForbiddenException('Only the project owner can connect repositories');
    }

    const repo = await this.repoRepo.findOne({ where: { id: dto.repositoryId } });
    if (!repo) throw new NotFoundException(`Repository ${dto.repositoryId} not found`);

    // Associate the repository with this project
    await this.repoRepo.update(dto.repositoryId, { projectId: id });

    // Optionally set as primary repository
    if (dto.setPrimary) {
      await this.projectRepo.update(id, { primaryRepositoryId: dto.repositoryId });
    }

    await this.cache.del(CACHE_KEYS.PROJECT(id));
    return this.findById(id);
  }

  async disconnectRepository(
    id: string,
    repositoryId: string,
    userId: string,
  ): Promise<void> {
    const project = await this.findById(id);
    if (project.ownerId !== userId) {
      throw new ForbiddenException('Only the project owner can disconnect repositories');
    }

    const repo = await this.repoRepo.findOne({
      where: { id: repositoryId, projectId: id },
    });
    if (!repo) {
      throw new BadRequestException('Repository is not connected to this project');
    }

    await this.repoRepo.update(repositoryId, { projectId: null as any });

    // Clear primary reference if it was the primary repo
    if (project.primaryRepositoryId === repositoryId) {
      await this.projectRepo.update(id, { primaryRepositoryId: null as any });
    }

    await this.cache.del(CACHE_KEYS.PROJECT(id));
  }

  async updateContributionSettings(
    id: string,
    dto: UpdateContributionSettingsDto,
    userId: string,
  ): Promise<ProjectEntity> {
    const project = await this.findById(id);
    if (project.ownerId !== userId) {
      throw new ForbiddenException('Only the project owner can update contribution settings');
    }
    await this.projectRepo.update(id, dto as any);
    await this.cache.del(CACHE_KEYS.PROJECT(id));
    return this.findById(id);
  }

  async getRepositories(id: string): Promise<RepositoryEntity[]> {
    return this.repoRepo.find({ where: { projectId: id } });
  }
}
