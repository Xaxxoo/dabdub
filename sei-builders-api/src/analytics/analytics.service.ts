import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from '../users/entities/user.entity';
import { ProjectEntity } from '../projects/entities/project.entity';
import { OrganizationEntity } from '../organizations/entities/organization.entity';
import { ApplicationEntity } from '../applications/entities/application.entity';
import { OpportunityEntity } from '../opportunities/entities/opportunity.entity';
import { RepositoryEntity } from '../repositories/entities/repository.entity';
import { CacheService } from '../cache/cache.service';
import { CACHE_KEYS, CACHE_TTL } from '../common/constants/cache.constants';

export type AnalyticsPeriod = '7d' | '30d' | '90d';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
    @InjectRepository(ProjectEntity)
    private readonly projectRepo: Repository<ProjectEntity>,
    @InjectRepository(OrganizationEntity)
    private readonly orgRepo: Repository<OrganizationEntity>,
    @InjectRepository(ApplicationEntity)
    private readonly appRepo: Repository<ApplicationEntity>,
    @InjectRepository(OpportunityEntity)
    private readonly oppRepo: Repository<OpportunityEntity>,
    @InjectRepository(RepositoryEntity)
    private readonly repoRepo: Repository<RepositoryEntity>,
    private readonly cache: CacheService,
  ) {}

  async getPlatformStats(period: AnalyticsPeriod = '30d') {
    return this.cache.getOrSet(
      CACHE_KEYS.ANALYTICS_OVERVIEW(period),
      async () => {
        const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
        const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

        const [
          totalUsers,
          newUsers,
          totalProjects,
          activeProjects,
          totalOrgs,
          totalApplications,
          newApplications,
          openOpportunities,
          totalRepos,
        ] = await Promise.all([
          this.userRepo.count({ where: {} }),
          this.userRepo
            .createQueryBuilder('u')
            .where('u.createdAt >= :since', { since })
            .getCount(),
          this.projectRepo.count({ where: {} }),
          this.projectRepo
            .createQueryBuilder('p')
            .where("p.status = 'active'")
            .getCount(),
          this.orgRepo.count({ where: {} }),
          this.appRepo.count({ where: {} }),
          this.appRepo
            .createQueryBuilder('a')
            .where('a.createdAt >= :since', { since })
            .getCount(),
          this.oppRepo
            .createQueryBuilder('o')
            .where("o.status = 'open'")
            .getCount(),
          this.repoRepo.count({ where: {} }),
        ]);

        return {
          period,
          totalUsers,
          newUsers,
          totalProjects,
          activeProjects,
          totalOrganizations: totalOrgs,
          totalApplications,
          newApplications,
          openOpportunities,
          totalRepositories: totalRepos,
        };
      },
      CACHE_TTL.ANALYTICS,
    );
  }

  async getOrganizationStats(organizationId: string, period: AnalyticsPeriod = '30d') {
    return this.cache.getOrSet(
      CACHE_KEYS.ANALYTICS_ORG(organizationId, period),
      async () => {
        const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
        const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

        const [projects, opportunities, applications] = await Promise.all([
          this.projectRepo.count({ where: { organizationId } }),
          this.oppRepo
            .createQueryBuilder('o')
            .leftJoin('o.project', 'p')
            .where('p.organizationId = :organizationId', { organizationId })
            .getCount(),
          this.appRepo
            .createQueryBuilder('a')
            .leftJoin('a.opportunity', 'o')
            .leftJoin('o.project', 'p')
            .where('p.organizationId = :organizationId', { organizationId })
            .andWhere('a.createdAt >= :since', { since })
            .getCount(),
        ]);

        return {
          organizationId,
          period,
          totalProjects: projects,
          totalOpportunities: opportunities,
          recentApplications: applications,
        };
      },
      CACHE_TTL.ANALYTICS,
    );
  }
}
