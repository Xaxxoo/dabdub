import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { GithubService } from './github.service';
import { GithubController } from './github.controller';
import { GithubApiClient } from './github-api.client';
import { GithubInstallationEntity } from './entities/github-installation.entity';
import { GithubAccountEntity } from './entities/github-account.entity';
import { GithubWebhookEventEntity } from './entities/github-webhook-event.entity';
import { GithubOrganizationEntity } from './entities/github-organization.entity';
import { GithubTeamEntity } from './entities/github-team.entity';
import { GithubWebhookProcessor } from './processors/github-webhook.processor';
import { GithubSyncProcessor } from './processors/github-sync.processor';
import { RepositoriesModule } from '../repositories/repositories.module';
import { QUEUE_NAMES } from '../queue/queue.constants';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      GithubInstallationEntity,
      GithubAccountEntity,
      GithubWebhookEventEntity,
      GithubOrganizationEntity,
      GithubTeamEntity,
    ]),
    BullModule.registerQueue(
      { name: QUEUE_NAMES.WEBHOOKS },
      { name: QUEUE_NAMES.GITHUB_SYNC },
    ),
    RepositoriesModule,
  ],
  providers: [GithubService, GithubApiClient, GithubWebhookProcessor, GithubSyncProcessor],
  controllers: [GithubController],
  exports: [GithubService, GithubApiClient],
})
export class GithubModule {}
