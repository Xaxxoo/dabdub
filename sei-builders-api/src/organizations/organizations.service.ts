import {
  BadRequestException,
  ConflictException,
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
import {
  OrganizationInviteEntity,
  InviteStatus,
} from './entities/organization-invite.entity';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { InviteMemberDto } from './dto/invite-member.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { buildPaginatedResult } from '../common/utils/pagination.util';
import { generateUniqueSlug } from '../common/utils/slug.util';
import { generateRandomToken } from '../common/utils/crypto.util';
import { CacheService } from '../cache/cache.service';
import { CACHE_KEYS, CACHE_TTL } from '../common/constants/cache.constants';

@Injectable()
export class OrganizationsService {
  constructor(
    @InjectRepository(OrganizationEntity)
    private readonly orgRepo: Repository<OrganizationEntity>,
    @InjectRepository(OrganizationMemberEntity)
    private readonly memberRepo: Repository<OrganizationMemberEntity>,
    @InjectRepository(OrganizationInviteEntity)
    private readonly inviteRepo: Repository<OrganizationInviteEntity>,
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

  async softDelete(id: string, userId: string): Promise<void> {
    await this.assertOwner(id, userId);
    await this.orgRepo.softDelete(id);
    await this.cache.del(CACHE_KEYS.ORGANIZATION(id));
  }

  async updateMemberRole(
    orgId: string,
    targetUserId: string,
    role: OrganizationRole,
    requesterId: string,
  ): Promise<OrganizationMemberEntity> {
    await this.assertAdminOrAbove(orgId, requesterId);

    // Cannot demote/change the owner's role
    const target = await this.memberRepo.findOne({
      where: { organizationId: orgId, userId: targetUserId, isActive: true },
    });
    if (!target) throw new NotFoundException('Member not found in this organization');
    if (target.role === OrganizationRole.OWNER) {
      throw new ForbiddenException('Cannot change the owner\'s role. Use transfer ownership instead.');
    }

    await this.memberRepo.update(target.id, { role });
    return { ...target, role };
  }

  async transferOwnership(
    orgId: string,
    newOwnerId: string,
    currentOwnerId: string,
  ): Promise<OrganizationEntity> {
    await this.assertOwner(orgId, currentOwnerId);

    const newOwnerMember = await this.memberRepo.findOne({
      where: { organizationId: orgId, userId: newOwnerId, isActive: true },
    });
    if (!newOwnerMember) {
      throw new BadRequestException('New owner must already be an active member of this organization');
    }

    // Demote current owner → ADMIN, promote new owner → OWNER
    const currentOwnerMember = await this.memberRepo.findOne({
      where: { organizationId: orgId, userId: currentOwnerId, isActive: true },
    });

    await Promise.all([
      this.memberRepo.update(newOwnerMember.id, { role: OrganizationRole.OWNER }),
      currentOwnerMember
        ? this.memberRepo.update(currentOwnerMember.id, { role: OrganizationRole.ADMIN })
        : Promise.resolve(),
    ]);

    await this.cache.del(CACHE_KEYS.ORGANIZATION(orgId));
    await this.cache.del(CACHE_KEYS.ORGANIZATION_MEMBERS(orgId));
    return this.findById(orgId);
  }

  async inviteMember(
    orgId: string,
    dto: InviteMemberDto,
    invitedById: string,
  ): Promise<OrganizationInviteEntity> {
    await this.assertAdminOrAbove(orgId, invitedById);

    if (!dto.userId && !dto.email) {
      throw new BadRequestException('Either userId or email is required');
    }

    // Check for existing pending invite for same target
    const existing = await this.inviteRepo.findOne({
      where: {
        organizationId: orgId,
        ...(dto.email ? { email: dto.email } : { inviteeId: dto.userId }),
        status: InviteStatus.PENDING,
      },
    });
    if (existing) {
      throw new ConflictException('A pending invite already exists for this user');
    }

    // If inviting existing user, check they're not already a member
    if (dto.userId) {
      const existingMember = await this.memberRepo.findOne({
        where: { organizationId: orgId, userId: dto.userId, isActive: true },
      });
      if (existingMember) {
        throw new ConflictException('User is already a member of this organization');
      }
    }

    const token = generateRandomToken(24);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    return this.inviteRepo.save(
      this.inviteRepo.create({
        organizationId: orgId,
        inviteeId: dto.userId,
        email: dto.email,
        role: dto.role,
        invitedById,
        token,
        expiresAt,
        message: dto.message,
        status: InviteStatus.PENDING,
      }),
    );
  }

  async acceptInvite(token: string, userId: string): Promise<OrganizationMemberEntity> {
    const invite = await this.inviteRepo.findOne({ where: { token } });
    if (!invite) throw new NotFoundException('Invite not found');
    if (invite.status !== InviteStatus.PENDING) {
      throw new BadRequestException(`Invite is ${invite.status}`);
    }
    if (invite.expiresAt && new Date() > invite.expiresAt) {
      await this.inviteRepo.update(invite.id, { status: InviteStatus.EXPIRED });
      throw new BadRequestException('Invite has expired');
    }

    // Accept invite
    await this.inviteRepo.update(invite.id, {
      status: InviteStatus.ACCEPTED,
      acceptedAt: new Date(),
    });

    return this.addMember(invite.organizationId, userId, invite.role, invite.invitedById);
  }

  async rejectInvite(token: string, userId: string): Promise<void> {
    const invite = await this.inviteRepo.findOne({ where: { token } });
    if (!invite) throw new NotFoundException('Invite not found');
    if (invite.status !== InviteStatus.PENDING) {
      throw new BadRequestException(`Invite is ${invite.status}`);
    }
    await this.inviteRepo.update(invite.id, {
      status: InviteStatus.REJECTED,
      rejectedAt: new Date(),
    });
  }

  async revokeInvite(inviteId: string, requesterId: string): Promise<void> {
    const invite = await this.inviteRepo.findOne({ where: { id: inviteId } });
    if (!invite) throw new NotFoundException('Invite not found');
    await this.assertAdminOrAbove(invite.organizationId, requesterId);
    await this.inviteRepo.update(inviteId, { status: InviteStatus.REVOKED });
  }

  async getPendingInvites(orgId: string): Promise<OrganizationInviteEntity[]> {
    return this.inviteRepo.find({
      where: { organizationId: orgId, status: InviteStatus.PENDING },
      order: { createdAt: 'DESC' },
    });
  }

  async getAnalytics(orgId: string) {
    // Basic org-level analytics aggregated from related data
    const [memberCount, activeMembers] = await Promise.all([
      this.memberRepo.count({ where: { organizationId: orgId } }),
      this.memberRepo.count({ where: { organizationId: orgId, isActive: true } }),
    ]);

    return {
      organizationId: orgId,
      memberCount,
      activeMembers,
      inactiveMembers: memberCount - activeMembers,
    };
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

  private async assertAdminOrAbove(orgId: string, userId: string): Promise<void> {
    const member = await this.memberRepo.findOne({
      where: { organizationId: orgId, userId, isActive: true },
    });
    if (!member || ![OrganizationRole.OWNER, OrganizationRole.ADMIN].includes(member.role)) {
      throw new ForbiddenException('Admin or owner role required');
    }
  }

  private async assertOwner(orgId: string, userId: string): Promise<void> {
    const member = await this.memberRepo.findOne({
      where: { organizationId: orgId, userId, isActive: true },
    });
    if (!member || member.role !== OrganizationRole.OWNER) {
      throw new ForbiddenException('Only the organization owner can perform this action');
    }
  }
}
