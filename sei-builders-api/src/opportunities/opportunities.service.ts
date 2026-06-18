import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  OpportunityEntity,
  OpportunityStatus,
} from './entities/opportunity.entity';
import { CreateOpportunityDto } from './dto/create-opportunity.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { buildPaginatedResult } from '../common/utils/pagination.util';
import { CacheService } from '../cache/cache.service';
import { CACHE_KEYS, CACHE_TTL } from '../common/constants/cache.constants';

@Injectable()
export class OpportunitiesService {
  constructor(
    @InjectRepository(OpportunityEntity)
    private readonly oppRepo: Repository<OpportunityEntity>,
    private readonly cache: CacheService,
  ) {}

  async create(
    dto: CreateOpportunityDto,
    userId: string,
  ): Promise<OpportunityEntity> {
    return this.oppRepo.save(
      this.oppRepo.create({ ...dto, createdById: userId }),
    );
  }

  async findAll(
    pagination: PaginationDto,
    filters?: { type?: string; status?: string; projectId?: string },
  ) {
    const qb = this.oppRepo
      .createQueryBuilder('opp')
      .leftJoinAndSelect('opp.project', 'project')
      .leftJoinAndSelect('opp.createdBy', 'createdBy')
      .where('opp.deletedAt IS NULL');

    if (filters?.type) {
      qb.andWhere('opp.type = :type', { type: filters.type });
    }
    if (filters?.status) {
      qb.andWhere('opp.status = :status', { status: filters.status });
    } else {
      qb.andWhere('opp.status = :status', { status: OpportunityStatus.OPEN });
    }
    if (filters?.projectId) {
      qb.andWhere('opp.projectId = :projectId', { projectId: filters.projectId });
    }

    if (pagination.search) {
      qb.andWhere(
        '(opp.title ILIKE :search OR opp.description ILIKE :search)',
        { search: `%${pagination.search}%` },
      );
    }

    qb.orderBy('opp.createdAt', 'DESC')
      .skip(pagination.skip)
      .take(pagination.limit);

    const [data, total] = await qb.getManyAndCount();
    return buildPaginatedResult(data, total, pagination);
  }

  async findById(id: string): Promise<OpportunityEntity> {
    return this.cache.getOrSet(
      CACHE_KEYS.OPPORTUNITY(id),
      async () => {
        const opp = await this.oppRepo.findOne({
          where: { id },
          relations: ['project', 'createdBy', 'assignedTo', 'applications'],
        });
        if (!opp) throw new NotFoundException(`Opportunity ${id} not found`);
        return opp;
      },
      CACHE_TTL.OPPORTUNITY,
    );
  }

  async update(
    id: string,
    dto: Partial<CreateOpportunityDto>,
    userId: string,
  ): Promise<OpportunityEntity> {
    const opp = await this.findById(id);
    if (opp.createdById !== userId) {
      throw new ForbiddenException('Only the creator can update this opportunity');
    }
    await this.oppRepo.update(id, dto as any);
    await this.cache.del(CACHE_KEYS.OPPORTUNITY(id));
    return this.findById(id);
  }

  async close(id: string, userId: string): Promise<OpportunityEntity> {
    const opp = await this.findById(id);
    if (opp.createdById !== userId) {
      throw new ForbiddenException('Only the creator can close this opportunity');
    }
    await this.oppRepo.update(id, {
      status: OpportunityStatus.CLOSED,
      closedAt: new Date(),
    });
    await this.cache.del(CACHE_KEYS.OPPORTUNITY(id));
    return this.findById(id);
  }

  async reopen(id: string, userId: string): Promise<OpportunityEntity> {
    const opp = await this.findById(id);
    if (opp.createdById !== userId) {
      throw new ForbiddenException('Only the creator can reopen this opportunity');
    }
    await this.oppRepo
      .createQueryBuilder()
      .update()
      .set({ status: OpportunityStatus.OPEN, closedAt: null as any })
      .where('id = :id', { id })
      .execute();
    await this.cache.del(CACHE_KEYS.OPPORTUNITY(id));
    return this.findById(id);
  }

  async softDelete(id: string, userId: string): Promise<void> {
    const opp = await this.findById(id);
    if (opp.createdById !== userId) {
      throw new ForbiddenException('Only the creator can delete this opportunity');
    }
    await this.oppRepo.softDelete(id);
    await this.cache.del(CACHE_KEYS.OPPORTUNITY(id));
  }
}
