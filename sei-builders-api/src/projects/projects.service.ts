import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProjectEntity, ProjectStatus } from './entities/project.entity';
import { CreateProjectDto } from './dto/create-project.dto';
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
}
