import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLogEntity, AuditAction } from './entities/audit-log.entity';
import { PaginationDto } from '../common/dto/pagination.dto';
import { buildPaginatedResult } from '../common/utils/pagination.util';

export interface CreateAuditLogDto {
  actorId?: string;
  actorEmail?: string;
  actorUsername?: string;
  action: AuditAction;
  resource: string;
  resourceId?: string;
  organizationId?: string;
  description?: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  changes?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
  sessionId?: string;
  isSensitive?: boolean;
}

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLogEntity)
    private readonly auditRepo: Repository<AuditLogEntity>,
  ) {}

  async log(dto: CreateAuditLogDto): Promise<AuditLogEntity> {
    return this.auditRepo.save(this.auditRepo.create(dto));
  }

  async findAll(
    pagination: PaginationDto,
    filters?: {
      actorId?: string;
      resource?: string;
      action?: AuditAction;
      organizationId?: string;
    },
  ) {
    const qb = this.auditRepo
      .createQueryBuilder('audit')
      .orderBy('audit.createdAt', 'DESC');

    if (filters?.actorId) {
      qb.andWhere('audit.actorId = :actorId', { actorId: filters.actorId });
    }
    if (filters?.resource) {
      qb.andWhere('audit.resource = :resource', { resource: filters.resource });
    }
    if (filters?.action) {
      qb.andWhere('audit.action = :action', { action: filters.action });
    }
    if (filters?.organizationId) {
      qb.andWhere('audit.organizationId = :organizationId', {
        organizationId: filters.organizationId,
      });
    }

    qb.skip(pagination.skip).take(pagination.limit);

    const [data, total] = await qb.getManyAndCount();
    return buildPaginatedResult(data, total, pagination);
  }
}
