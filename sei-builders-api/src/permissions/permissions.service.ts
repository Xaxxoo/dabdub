import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RoleEntity } from '../users/entities/role.entity';
import { PermissionEntity } from '../users/entities/permission.entity';
import { UserRoleEntity } from '../users/entities/user-role.entity';
import { CacheService } from '../cache/cache.service';
import { CACHE_KEYS, CACHE_TTL } from '../common/constants/cache.constants';

@Injectable()
export class PermissionsService {
  constructor(
    @InjectRepository(RoleEntity)
    private readonly roleRepo: Repository<RoleEntity>,
    @InjectRepository(PermissionEntity)
    private readonly permissionRepo: Repository<PermissionEntity>,
    @InjectRepository(UserRoleEntity)
    private readonly userRoleRepo: Repository<UserRoleEntity>,
    private readonly cache: CacheService,
  ) {}

  async getRoles(): Promise<RoleEntity[]> {
    return this.roleRepo.find({
      relations: ['permissions'],
      order: { name: 'ASC' },
    });
  }

  async getRoleById(id: string): Promise<RoleEntity> {
    const role = await this.roleRepo.findOne({
      where: { id },
      relations: ['permissions'],
    });
    if (!role) throw new NotFoundException(`Role ${id} not found`);
    return role;
  }

  async getPermissions(): Promise<PermissionEntity[]> {
    return this.permissionRepo.find({ order: { resource: 'ASC', action: 'ASC' } });
  }

  async getUserPermissions(userId: string): Promise<string[]> {
    return this.cache.getOrSet(
      CACHE_KEYS.USER_PERMISSIONS(userId),
      async () => {
        const userRoles = await this.userRoleRepo.find({
          where: { userId },
          relations: ['role', 'role.permissions'],
        });
        const perms = new Set<string>();
        userRoles.forEach((ur) =>
          ur.role?.permissions?.forEach((p) => perms.add(p.name)),
        );
        return Array.from(perms);
      },
      CACHE_TTL.PERMISSIONS,
    );
  }

  async assignRoleToUser(
    userId: string,
    roleId: string,
    organizationId?: string,
  ): Promise<UserRoleEntity> {
    const role = await this.getRoleById(roleId);
    const existing = await this.userRoleRepo.findOne({
      where: { userId, roleId },
    });
    if (existing) return existing;

    const userRole = await this.userRoleRepo.save(
      this.userRoleRepo.create({ userId, roleId, organizationId }),
    );
    await this.cache.del(CACHE_KEYS.USER_PERMISSIONS(userId));
    await this.cache.del(CACHE_KEYS.USER(userId));
    return userRole;
  }

  async removeRoleFromUser(userId: string, roleId: string): Promise<void> {
    await this.userRoleRepo.delete({ userId, roleId });
    await this.cache.del(CACHE_KEYS.USER_PERMISSIONS(userId));
    await this.cache.del(CACHE_KEYS.USER(userId));
  }

  async seedDefaultRoles(): Promise<void> {
    const defaultRoles = [
      {
        name: 'ADMIN',
        description: 'Platform administrator',
        isSystem: true,
        isDefault: false,
      },
      {
        name: 'MAINTAINER',
        description: 'Project maintainer',
        isSystem: true,
        isDefault: false,
      },
      {
        name: 'CONTRIBUTOR',
        description: 'Open source contributor',
        isSystem: true,
        isDefault: true,
      },
      {
        name: 'VIEWER',
        description: 'Read-only access',
        isSystem: true,
        isDefault: false,
      },
    ];

    for (const roleData of defaultRoles) {
      const existing = await this.roleRepo.findOne({
        where: { name: roleData.name },
      });
      if (!existing) {
        await this.roleRepo.save(this.roleRepo.create(roleData));
      }
    }
  }
}
