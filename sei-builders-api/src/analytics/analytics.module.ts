import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalyticsService } from './analytics.service';
import { AnalyticsController } from './analytics.controller';
import { UserEntity } from '../users/entities/user.entity';
import { ProjectEntity } from '../projects/entities/project.entity';
import { OrganizationEntity } from '../organizations/entities/organization.entity';
import { ApplicationEntity } from '../applications/entities/application.entity';
import { OpportunityEntity } from '../opportunities/entities/opportunity.entity';
import { RepositoryEntity } from '../repositories/entities/repository.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserEntity,
      ProjectEntity,
      OrganizationEntity,
      ApplicationEntity,
      OpportunityEntity,
      RepositoryEntity,
    ]),
  ],
  providers: [AnalyticsService],
  controllers: [AnalyticsController],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
