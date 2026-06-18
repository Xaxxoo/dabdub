import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { RepositoriesService } from './repositories.service';
import { RepositoriesController } from './repositories.controller';
import { RepositorySyncService } from './repository-sync.service';
import { RepositoryEntity } from './entities/repository.entity';
import { RepositorySyncEntity } from './entities/repository-sync.entity';
import { RepositoryIssueEntity } from './entities/repository-issue.entity';
import { RepositoryPullRequestEntity } from './entities/repository-pull-request.entity';
import { RepositoryLanguageEntity } from './entities/repository-language.entity';
import { RepositoryContributorEntity } from './entities/repository-contributor.entity';
import { GithubAccountEntity } from '../github/entities/github-account.entity';
import { GithubApiClient } from '../github/github-api.client';
import { QUEUE_NAMES } from '../queue/queue.constants';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      RepositoryEntity,
      RepositorySyncEntity,
      RepositoryIssueEntity,
      RepositoryPullRequestEntity,
      RepositoryLanguageEntity,
      RepositoryContributorEntity,
      GithubAccountEntity,
    ]),
    BullModule.registerQueue({ name: QUEUE_NAMES.GITHUB_SYNC }),
  ],
  providers: [RepositoriesService, RepositorySyncService, GithubApiClient],
  controllers: [RepositoriesController],
  exports: [RepositoriesService, RepositorySyncService],
})
export class RepositoriesModule {}
