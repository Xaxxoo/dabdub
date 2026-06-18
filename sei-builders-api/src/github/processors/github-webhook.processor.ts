import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Job } from 'bull';
import {
  GithubWebhookEventEntity,
  WebhookEventStatus,
} from '../entities/github-webhook-event.entity';
import { GithubService } from '../github.service';
import { RepositorySyncService } from '../../repositories/repository-sync.service';
import { QUEUE_NAMES, JOB_NAMES } from '../../queue/queue.constants';
import { SyncType } from '../../repositories/entities/repository-sync.entity';
import { RepositoriesService } from '../../repositories/repositories.service';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

export interface WebhookJobData {
  webhookEventId: string;
  eventType: string;
  action: string;
  payload: Record<string, unknown>;
}

@Processor(QUEUE_NAMES.WEBHOOKS)
export class GithubWebhookProcessor {
  private readonly logger = new Logger(GithubWebhookProcessor.name);

  constructor(
    @InjectRepository(GithubWebhookEventEntity)
    private readonly webhookRepo: Repository<GithubWebhookEventEntity>,
    private readonly githubService: GithubService,
    private readonly reposService: RepositoriesService,
    private readonly repoSyncService: RepositorySyncService,
    @InjectQueue(QUEUE_NAMES.GITHUB_SYNC)
    private readonly syncQueue: Queue,
  ) {}

  @Process(JOB_NAMES.PROCESS_GITHUB_WEBHOOK)
  async handleWebhook(job: Job<WebhookJobData>): Promise<void> {
    const { webhookEventId, eventType, action, payload } = job.data;

    this.logger.log(`Processing webhook: ${eventType}.${action ?? '*'} (event=${webhookEventId})`);

    // Mark as processing
    await this.webhookRepo.update(webhookEventId, {
      status: WebhookEventStatus.PROCESSING,
      processingStartedAt: new Date(),
      retryCount: job.attemptsMade,
    });

    try {
      await this.dispatchWebhookEvent(eventType, action, payload);

      await this.webhookRepo.update(webhookEventId, {
        status: WebhookEventStatus.PROCESSED,
        processingCompletedAt: new Date(),
      });
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Webhook processing failed: ${eventType}.${action} — ${errMsg}`,
        error instanceof Error ? error.stack : undefined,
      );

      await this.webhookRepo.update(webhookEventId, {
        status: WebhookEventStatus.FAILED,
        processingCompletedAt: new Date(),
        errorMessage: errMsg,
        retryCount: job.attemptsMade + 1,
      });

      throw error; // re-throw so Bull retries
    }
  }

  // ─── Event dispatcher ─────────────────────────────────────────────────────────

  private async dispatchWebhookEvent(
    eventType: string,
    action: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    switch (eventType) {
      case 'push':
        await this.handlePush(payload);
        break;
      case 'pull_request':
        await this.handlePullRequest(action, payload);
        break;
      case 'issues':
        await this.handleIssue(action, payload);
        break;
      case 'issue_comment':
        await this.handleIssueComment(action, payload);
        break;
      case 'member':
        await this.handleMember(action, payload);
        break;
      case 'installation':
        await this.handleInstallation(action, payload);
        break;
      case 'installation_repositories':
        await this.handleInstallationRepositories(action, payload);
        break;
      case 'repository':
        await this.handleRepository(action, payload);
        break;
      case 'star':
        await this.handleStar(action, payload);
        break;
      case 'fork':
        await this.handleFork(payload);
        break;
      default:
        this.logger.debug(`Unhandled webhook event type: ${eventType}`);
    }
  }

  // ─── Event handlers ────────────────────────────────────────────────────────────

  private async handlePush(payload: Record<string, unknown>): Promise<void> {
    const repo = payload.repository as Record<string, unknown> | undefined;
    if (!repo?.full_name) return;

    // Trigger incremental sync to pick up new commits
    await this.enqueueSyncByFullName(repo.full_name as string, SyncType.INCREMENTAL);
  }

  private async handlePullRequest(
    action: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    const repo = payload.repository as Record<string, unknown> | undefined;
    if (!repo?.full_name) return;

    // On opened, closed, merged, synchronized — sync PRs incrementally
    if (['opened', 'closed', 'reopened', 'synchronize', 'merged'].includes(action)) {
      await this.enqueueSyncByFullName(repo.full_name as string, SyncType.INCREMENTAL);
    }
  }

  private async handleIssue(
    action: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    const repo = payload.repository as Record<string, unknown> | undefined;
    if (!repo?.full_name) return;

    if (['opened', 'closed', 'reopened', 'edited', 'labeled', 'unlabeled'].includes(action)) {
      await this.enqueueSyncByFullName(repo.full_name as string, SyncType.INCREMENTAL);
    }
  }

  private async handleIssueComment(
    action: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    // Update comment count — trigger lightweight sync
    const repo = payload.repository as Record<string, unknown> | undefined;
    if (!repo?.full_name) return;
    if (action === 'created') {
      await this.enqueueSyncByFullName(repo.full_name as string, SyncType.INCREMENTAL);
    }
  }

  private async handleMember(
    action: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    // Membership changes — trigger contributor sync
    const repo = payload.repository as Record<string, unknown> | undefined;
    if (!repo?.full_name) return;
    this.logger.log(`Member ${action} on ${repo.full_name}`);
    if (action === 'added') {
      await this.enqueueSyncByFullName(repo.full_name as string, SyncType.INCREMENTAL);
    }
  }

  private async handleInstallation(
    action: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    const installation = payload.installation as Record<string, unknown> | undefined;
    if (!installation?.id) return;

    const installationId = String(installation.id);
    const account = installation.account as Record<string, unknown> | undefined;

    if (action === 'deleted' || action === 'suspend') {
      await this.githubService.upsertInstallation({
        installationId,
        status: action === 'deleted' ? 'deleted' : 'suspended',
        suspendedAt: action === 'suspend' ? new Date() : undefined,
      } as any);
    } else if (action === 'unsuspend') {
      await this.githubService.upsertInstallation({
        installationId,
        status: 'active',
      } as any);
    } else if (action === 'created') {
      await this.githubService.upsertInstallation({
        installationId,
        accountLogin: (account?.login as string) ?? '',
        accountType: (account?.type as string) ?? 'User',
        accountAvatarUrl: (account?.avatar_url as string) ?? '',
        status: 'active',
      } as any);
    }
  }

  private async handleInstallationRepositories(
    action: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    // Repositories added or removed from an installation
    if (action === 'added') {
      const addedRepos = (payload.repositories_added as Array<Record<string, unknown>>) ?? [];
      for (const repo of addedRepos) {
        this.logger.log(`Repository added to installation: ${repo.full_name}`);
        // Could auto-connect repo if org is linked
      }
    } else if (action === 'removed') {
      const removedRepos = (payload.repositories_removed as Array<Record<string, unknown>>) ?? [];
      for (const repo of removedRepos) {
        this.logger.log(`Repository removed from installation: ${repo.full_name}`);
      }
    }
  }

  private async handleRepository(
    action: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    const repo = payload.repository as Record<string, unknown> | undefined;
    if (!repo?.full_name) return;

    if (action === 'publicized' || action === 'privatized') {
      // Update visibility
      await this.enqueueSyncByFullName(repo.full_name as string, SyncType.INCREMENTAL);
    } else if (action === 'deleted') {
      // Soft-delete the platform repo record
      const platformRepo = await this.reposService.findByFullName(
        repo.full_name as string,
      ).catch(() => null);
      if (platformRepo) {
        await this.reposService.softDelete(platformRepo.id);
      }
    }
  }

  private async handleStar(
    action: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    const repo = payload.repository as Record<string, unknown> | undefined;
    if (!repo?.full_name) return;

    // Update star count from payload
    const starCount = repo.stargazers_count as number | undefined;
    if (starCount !== undefined) {
      const platformRepo = await this.reposService
        .findByFullName(repo.full_name as string)
        .catch(() => null);
      if (platformRepo) {
        await this.reposService.upsert({
          githubId: platformRepo.githubId,
          starCount,
        });
      }
    }
  }

  private async handleFork(payload: Record<string, unknown>): Promise<void> {
    const repo = payload.repository as Record<string, unknown> | undefined;
    if (!repo?.full_name) return;

    const forkCount = repo.forks_count as number | undefined;
    if (forkCount !== undefined) {
      const platformRepo = await this.reposService
        .findByFullName(repo.full_name as string)
        .catch(() => null);
      if (platformRepo) {
        await this.reposService.upsert({
          githubId: platformRepo.githubId,
          forkCount,
        });
      }
    }
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────────

  private async enqueueSyncByFullName(
    fullName: string,
    syncType: SyncType,
  ): Promise<void> {
    const platformRepo = await this.reposService
      .findByFullName(fullName)
      .catch(() => null);

    if (!platformRepo) return;

    await this.repoSyncService.enqueueSyncJob(platformRepo.id, syncType);
  }
}
