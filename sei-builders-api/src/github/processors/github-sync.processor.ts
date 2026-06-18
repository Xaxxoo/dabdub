import { Process, Processor, OnQueueFailed, OnQueueCompleted } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { RepositorySyncService } from '../../repositories/repository-sync.service';
import { QUEUE_NAMES, JOB_NAMES } from '../../queue/queue.constants';
import { SyncType } from '../../repositories/entities/repository-sync.entity';

export interface SyncRepositoryJobData {
  repositoryId: string;
  syncType?: SyncType;
}

export interface SyncOrgJobData {
  orgLogin: string;
  organizationId: string;
  token?: string;
}

@Processor(QUEUE_NAMES.GITHUB_SYNC)
export class GithubSyncProcessor {
  private readonly logger = new Logger(GithubSyncProcessor.name);

  constructor(private readonly repoSyncService: RepositorySyncService) {}

  @Process(JOB_NAMES.SYNC_REPOSITORY)
  async handleSyncRepository(job: Job<SyncRepositoryJobData>): Promise<void> {
    const { repositoryId, syncType = SyncType.INCREMENTAL } = job.data;

    this.logger.log(
      `Starting ${syncType} sync for repository ${repositoryId} (attempt ${job.attemptsMade + 1})`,
    );

    await this.repoSyncService.syncRepository(repositoryId, syncType);
  }

  @Process(JOB_NAMES.SYNC_REPOSITORIES)
  async handleSyncAllRepositories(job: Job<{ organizationId?: string }>): Promise<void> {
    this.logger.log('Bulk repository sync triggered');
    // This would fetch all repos and enqueue individual sync jobs
    // For now, log the trigger
    this.logger.log(`Bulk sync job data: ${JSON.stringify(job.data)}`);
  }

  @OnQueueFailed()
  onFailed(job: Job, error: Error): void {
    this.logger.error(
      `Job ${job.name}#${job.id} failed after ${job.attemptsMade} attempts: ${error.message}`,
      error.stack,
    );
  }

  @OnQueueCompleted()
  onCompleted(job: Job, result: unknown): void {
    this.logger.debug(`Job ${job.name}#${job.id} completed`);
  }
}
