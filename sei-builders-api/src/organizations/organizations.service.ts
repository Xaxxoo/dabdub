import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  OrganizationEntity,
  OrganizationStatus,
} from './entities/organization.entity';
import {
  OrganizationMemberEntity,
  OrganizationRole,
} from './entities/organization-member.entity';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { buildPaginatedResult } from '../common/utils/pagination.util';
import { generateUniqueSlug } from '../common/utils/slug.util';
import { CacheService } from '../cache/cache.service';
import { CACHE_KEYS, CACHE_TTL } from '../common/constants/cache.constants';

@Injectable()
export class OrganizationsService {
  constructor(
    @InjectRepository(OrganizationEntity)
    private readonly orgRepo: Repository<OrganizationEntity>,
    @InjectRepository(OrganizationMemberEntity)
    private readonly memberRepo: Repository<OrganizationMemberEntity>,
    private readonly cache: CacheService,
  ) {}

  async create(
    dto: CreateOrganizationDto,
    userId: string,
  ): Promise<OrganizationEntity> {
    const slug = await generateUniqueSlug(dto.name, async (s) =>
      !!(await this.orgRepo.findOne({ where: { slug: s } })),
    );

    const org = await this.orgRepo.save(
      this.orgRepo.create({ ...dto, slug }),
    );

    // Add creator as owner
    await this.memberRepo.save(
      this.memberRepo.create({
        organizationId: org.id,
        userId,
        role: OrganizationRole.OWNER,
        joinedAt: new Date(),
      }),
    );

    return org;
  }

  async findAll(pagination: PaginationDto) {
    const qb = this.orgRepo
      .createQueryBuilder('org')
      .where('org.deletedAt IS NULL')
      .andWhere('org.status != :suspended', {
        suspended: OrganizationStatus.SUSPENDED,
      });

    if (pagination.search) {
      qb.andWhere('org.name ILIKE :search', {
        search: `%${pagination.search}%`,
      });
    }

    qb.orderBy('org.createdAt', 'DESC')
      .skip(pagination.skip)
      .take(pagination.limit);

    const [data, total] = await qb.getManyAndCount();
    return buildPaginatedResult(data, total, pagination);
  }

  async findById(id: string): Promise<OrganizationEntity> {
    return this.cache.getOrSet(
      CACHE_KEYS.ORGANIZATION(id),
      async () => {
        const org = await this.orgRepo.findOne({
          where: { id },
          relations: ['members', 'members.user'],
        });
        if (!org) throw new NotFoundException(`Organization ${id} not found`);
        return org;
      },
      CACHE_TTL.ORGANIZATION,
    );
  }

  async findBySlug(slug: string): Promise<OrganizationEntity> {
    const org = await this.orgRepo.findOne({
      where: { slug },
      relations: ['members', 'members.user'],
    });
    if (!org) throw new NotFoundException(`Organization @${slug} not found`);
    return org;
  }

  async update(
    id: string,
    dto: Partial<CreateOrganizationDto>,
    userId: string,
  ): Promise<OrganizationEntity> {
    await this.assertMaintainerOrAbove(id, userId);
    await this.orgRepo.update(id, dto);
    await this.cache.del(CACHE_KEYS.ORGANIZATION(id));
    return this.findById(id);
  }

  async suspend(id: string): Promise<OrganizationEntity> {
    await this.orgRepo.update(id, {
      status: OrganizationStatus.SUSPENDED,
      suspendedAt: new Date(),
    });
    await this.cache.del(CACHE_KEYS.ORGANIZATION(id));
    return this.findById(id);
  }

  async reinstate(id: string): Promise<OrganizationEntity> {
    await this.orgRepo
      .createQueryBuilder()
      .update()
      .set({ status: OrganizationStatus.ACTIVE, suspendedAt: null as any, suspendedReason: null as any })
      .where('id = :id', { id })
      .execute();
    await this.cache.del(CACHE_KEYS.ORGANIZATION(id));
    return this.findById(id);
  }

  async getMembers(organizationId: string) {
    return this.memberRepo.find({
      where: { organizationId, isActive: true },
      relations: ['user'],
      order: { role: 'ASC' },
    });
  }

  async addMember(
    organizationId: string,
    userId: string,
    role: OrganizationRole = OrganizationRole.MEMBER,
    invitedById?: string,
  ): Promise<OrganizationMemberEntity> {
    const existing = await this.memberRepo.findOne({
      where: { organizationId, userId },
    });
    if (existing) {
      existing.isActive = true;
      return this.memberRepo.save(existing);
    }
    return this.memberRepo.save(
      this.memberRepo.create({
        organizationId,
        userId,
        role,
        invitedById,
        invitedAt: new Date(),
        joinedAt: new Date(),
      }),
    );
  }

  async removeMember(organizationId: string, userId: string): Promise<void> {
    await this.memberRepo.update(
      { organizationId, userId },
      { isActive: false },
    );
  }

  // ─── Private ─────────────────────────────────────────────────────────────────

  private async assertMaintainerOrAbove(
    orgId: string,
    userId: string,
  ): Promise<void> {
    const member = await this.memberRepo.findOne({
      where: { organizationId: orgId, userId, isActive: true },
    });
    const allowedRoles: OrganizationRole[] = [
      OrganizationRole.OWNER,
      OrganizationRole.ADMIN,
      OrganizationRole.MAINTAINER,
    ];
    if (!member || !allowedRoles.includes(member.role)) {
      throw new ForbiddenException('Insufficient organization permissions');
    }
  }
}
