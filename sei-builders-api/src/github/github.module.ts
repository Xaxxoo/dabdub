import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GithubService } from './github.service';
import { GithubController } from './github.controller';
import { GithubInstallationEntity } from './entities/github-installation.entity';
import { GithubAccountEntity } from './entities/github-account.entity';
import { GithubWebhookEventEntity } from './entities/github-webhook-event.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      GithubInstallationEntity,
      GithubAccountEntity,
      GithubWebhookEventEntity,
    ]),
  ],
  providers: [GithubService],
  controllers: [GithubController],
  exports: [GithubService],
})
export class GithubModule {}
