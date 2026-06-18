import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ActivityEntity, ActivityEventType } from './entities/activity.entity';
import { PaginationDto } from '../common/dto/pagination.dto';
import { buildPaginatedResult } from '../common/utils/pagination.util';

export interface CreateActivityDto {
  eventType: ActivityEventType;
  actorId?: string;
  targetId?: string;
  targetType?: string;
  organizationId?: string;
  projectId?: string;
  title: string;
  description?: string;
  actionUrl?: string;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class ActivityService {
  constructor(
    @InjectRepository(ActivityEntity)
    private readonly activityRepo: Repository<ActivityEntity>,
  ) {}

  async record(dto: CreateActivityDto): Promise<ActivityEntity> {
    return this.activityRepo.save(this.activityRepo.create(dto));
  }

  async findAll(pagination: PaginationDto, filters?: {
    eventType?: string;
    actorId?: string;
    organizationId?: string;
    projectId?: string;
  }) {
    const qb = this.activityRepo
      .createQueryBuilder('activity')
      .leftJoinAndSelect('activity.actor', 'actor');

    if (filters?.eventType) {
      qb.andWhere('activity.eventType = :eventType', { eventType: filters.eventType });
    }
    if (filters?.actorId) {
      qb.andWhere('activity.actorId = :actorId', { actorId: filters.actorId });
    }
    if (filters?.organizationId) {
      qb.andWhere('activity.organizationId = :organizationId', {
        organizationId: filters.organizationId,
      });
    }
    if (filters?.projectId) {
      qb.andWhere('activity.projectId = :projectId', { projectId: filters.projectId });
    }

    qb.orderBy('activity.createdAt', 'DESC')
      .skip(pagination.skip)
      .take(pagination.limit);

    const [data, total] = await qb.getManyAndCount();
    return buildPaginatedResult(data, total, pagination);
  }
}
