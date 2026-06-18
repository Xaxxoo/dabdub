import {
  BadRequestException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import { GithubInstallationEntity } from './entities/github-installation.entity';
import { GithubAccountEntity } from './entities/github-account.entity';
import {
  GithubWebhookEventEntity,
  WebhookEventStatus,
} from './entities/github-webhook-event.entity';

@Injectable()
export class GithubService {
  private readonly logger = new Logger(GithubService.name);

  constructor(
    @InjectRepository(GithubInstallationEntity)
    private readonly installationRepo: Repository<GithubInstallationEntity>,
    @InjectRepository(GithubAccountEntity)
    private readonly accountRepo: Repository<GithubAccountEntity>,
    @InjectRepository(GithubWebhookEventEntity)
    private readonly webhookRepo: Repository<GithubWebhookEventEntity>,
    private readonly config: ConfigService,
  ) {}

  verifyWebhookSignature(payload: string, signature: string): boolean {
    const secret = this.config.get<string>('github.webhookSecret');
    if (!secret) return true; // skip in dev

    const expected = `sha256=${crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex')}`;

    return crypto.timingSafeEqual(
      Buffer.from(expected),
      Buffer.from(signature),
    );
  }

  async receiveWebhook(
    deliveryId: string,
    eventType: string,
    payload: Record<string, unknown>,
    signature: string,
    rawBody: string,
  ): Promise<GithubWebhookEventEntity> {
    if (!this.verifyWebhookSignature(rawBody, signature)) {
      throw new UnauthorizedException('Invalid webhook signature');
    }

    // Deduplicate by deliveryId
    const existing = await this.webhookRepo.findOne({ where: { deliveryId } });
    if (existing) {
      this.logger.warn(`Duplicate webhook delivery: ${deliveryId}`);
      return existing;
    }

    const action = (payload.action as string) ?? null;
    const repo = payload.repository as Record<string, unknown>;
    const org = payload.organization as Record<string, unknown>;
    const installation = payload.installation as Record<string, unknown>;

    return this.webhookRepo.save(
      this.webhookRepo.create({
        deliveryId,
        eventType,
        action,
        installationId: (installation?.id as string) ?? null,
        repositoryFullName: (repo?.full_name as string) ?? null,
        organizationLogin: (org?.login as string) ?? null,
        payload,
        status: WebhookEventStatus.RECEIVED,
      }),
    );
  }

  async getInstallations(organizationId: string): Promise<GithubInstallationEntity[]> {
    return this.installationRepo.find({ where: { organizationId } });
  }

  async upsertInstallation(
    data: Partial<GithubInstallationEntity>,
  ): Promise<GithubInstallationEntity> {
    const existing = data.installationId
      ? await this.installationRepo.findOne({
          where: { installationId: data.installationId },
        })
      : null;

    if (existing) {
      await this.installationRepo.update(existing.id, data as any);
      return this.installationRepo.findOneOrFail({ where: { id: existing.id } });
    }

    return this.installationRepo.save(this.installationRepo.create(data));
  }

  async getWebhookEvents(pagination: {
    skip: number;
    take: number;
    status?: WebhookEventStatus;
  }) {
    const qb = this.webhookRepo
      .createQueryBuilder('event')
      .orderBy('event.createdAt', 'DESC')
      .skip(pagination.skip)
      .take(pagination.take);

    if (pagination.status) {
      qb.where('event.status = :status', { status: pagination.status });
    }

    return qb.getManyAndCount();
  }
}
