import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RepositoryEntity } from './entities/repository.entity';
import { PaginationDto } from '../common/dto/pagination.dto';
import { buildPaginatedResult } from '../common/utils/pagination.util';

@Injectable()
export class RepositoriesService {
  constructor(
    @InjectRepository(RepositoryEntity)
    private readonly repoRepo: Repository<RepositoryEntity>,
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
}
