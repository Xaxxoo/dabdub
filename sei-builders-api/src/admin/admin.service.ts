import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity, UserStatus } from '../users/entities/user.entity';
import { ProjectEntity, ProjectStatus } from '../projects/entities/project.entity';
import { OrganizationEntity, OrganizationStatus } from '../organizations/entities/organization.entity';
import { ApplicationEntity } from '../applications/entities/application.entity';
import { RepositoryEntity } from '../repositories/entities/repository.entity';
import { PaginationDto } from '../common/dto/pagination.dto';
import { buildPaginatedResult } from '../common/utils/pagination.util';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
    @InjectRepository(ProjectEntity)
    private readonly projectRepo: Repository<ProjectEntity>,
    @InjectRepository(OrganizationEntity)
    private readonly orgRepo: Repository<OrganizationEntity>,
    @InjectRepository(ApplicationEntity)
    private readonly appRepo: Repository<ApplicationEntity>,
    @InjectRepository(RepositoryEntity)
    private readonly repoRepo: Repository<RepositoryEntity>,
  ) {}

  async getDashboardStats() {
    const [
      totalUsers,
      totalProjects,
      activeProjects,
      totalOrgs,
      activeOrgs,
      totalApplications,
      totalRepos,
    ] = await Promise.all([
      this.userRepo.count({ where: {} }),
      this.projectRepo.count({ where: {} }),
      this.projectRepo.count({ where: { status: ProjectStatus.ACTIVE } }),
      this.orgRepo.count({ where: {} }),
      this.orgRepo.count({ where: { status: OrganizationStatus.ACTIVE } }),
      this.appRepo.count({ where: {} }),
      this.repoRepo.count({ where: {} }),
    ]);

    return {
      users: { total: totalUsers },
      projects: { total: totalProjects, active: activeProjects },
      organizations: { total: totalOrgs, active: activeOrgs },
      applications: { total: totalApplications },
      repositories: { total: totalRepos },
    };
  }

  async listUsers(pagination: PaginationDto) {
    const qb = this.userRepo
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.userRoles', 'userRole')
      .leftJoinAndSelect('userRole.role', 'role')
      .withDeleted();

    if (pagination.search) {
      qb.where(
        '(user.email ILIKE :s OR user.username ILIKE :s OR user.fullName ILIKE :s)',
        { s: `%${pagination.search}%` },
      );
    }

    qb.orderBy('user.createdAt', 'DESC')
      .skip(pagination.skip)
      .take(pagination.limit);

    const [data, total] = await qb.getManyAndCount();
    return buildPaginatedResult(data, total, pagination);
  }

  async listProjects(pagination: PaginationDto) {
    const qb = this.projectRepo
      .createQueryBuilder('project')
      .leftJoinAndSelect('project.owner', 'owner')
      .leftJoinAndSelect('project.organization', 'org')
      .withDeleted();

    if (pagination.search) {
      qb.where('project.name ILIKE :s', { s: `%${pagination.search}%` });
    }

    qb.orderBy('project.createdAt', 'DESC')
      .skip(pagination.skip)
      .take(pagination.limit);

    const [data, total] = await qb.getManyAndCount();
    return buildPaginatedResult(data, total, pagination);
  }

  async listOrganizations(pagination: PaginationDto) {
    const qb = this.orgRepo
      .createQueryBuilder('org')
      .withDeleted();

    if (pagination.search) {
      qb.where('org.name ILIKE :s', { s: `%${pagination.search}%` });
    }

    qb.orderBy('org.createdAt', 'DESC')
      .skip(pagination.skip)
      .take(pagination.limit);

    const [data, total] = await qb.getManyAndCount();
    return buildPaginatedResult(data, total, pagination);
  }

  async suspendUser(id: string): Promise<void> {
    await this.userRepo.update(id, { status: UserStatus.SUSPENDED });
  }

  async reinstateUser(id: string): Promise<void> {
    await this.userRepo.update(id, { status: UserStatus.ACTIVE });
  }

  async approveProject(id: string): Promise<void> {
    await this.projectRepo.update(id, { status: ProjectStatus.ACTIVE });
  }

  async rejectProject(id: string): Promise<void> {
    await this.projectRepo.update(id, { status: ProjectStatus.SUSPENDED });
  }

  async suspendOrganization(id: string): Promise<void> {
    await this.orgRepo.update(id, {
      status: OrganizationStatus.SUSPENDED,
      suspendedAt: new Date(),
    });
  }

  async reinstateOrganization(id: string): Promise<void> {
    await this.orgRepo
      .createQueryBuilder()
      .update()
      .set({ status: OrganizationStatus.ACTIVE, suspendedAt: null as any })
      .where('id = :id', { id })
      .execute();
  }
}
