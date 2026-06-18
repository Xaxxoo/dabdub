import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import { GithubInstallationEntity } from './entities/github-installation.entity';
import { GithubAccountEntity, GithubAccountType } from './entities/github-account.entity';
import {
  GithubWebhookEventEntity,
  WebhookEventStatus,
} from './entities/github-webhook-event.entity';
import { GithubOrganizationEntity } from './entities/github-organization.entity';
import { GithubTeamEntity } from './entities/github-team.entity';
import { GithubApiClient } from './github-api.client';
import { encrypt, decrypt } from '../common/utils/crypto.util';

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
    @InjectRepository(GithubOrganizationEntity)
    private readonly githubOrgRepo: Repository<GithubOrganizationEntity>,
    @InjectRepository(GithubTeamEntity)
    private readonly teamRepo: Repository<GithubTeamEntity>,
    private readonly githubApiClient: GithubApiClient,
    private readonly config: ConfigService,
  ) {}

  // ─── Webhook handling ─────────────────────────────────────────────────────

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

  // ─── Installations ────────────────────────────────────────────────────────

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

  // ─── GitHub Accounts (OAuth) ──────────────────────────────────────────────

  async connectAccount(
    token: string,
    userId?: string,
    organizationId?: string,
    scopes: string[] = [],
  ): Promise<GithubAccountEntity> {
    const userData = await this.githubApiClient.getAuthenticatedUser(token);
    const encryptedToken = this.encryptToken(token);

    const existing = await this.accountRepo.findOne({
      where: { githubId: String(userData.id) },
    });

    const update: Partial<GithubAccountEntity> = {
      login: userData.login,
      name: userData.name ?? undefined,
      avatarUrl: userData.avatar_url,
      htmlUrl: userData.html_url,
      email: userData.email ?? undefined,
      bio: userData.bio ?? undefined,
      company: userData.company ?? undefined,
      location: userData.location ?? undefined,
      publicRepoCount: userData.public_repos,
      followersCount: userData.followers,
      type: GithubAccountType.USER,
      accessTokenEncrypted: encryptedToken,
      scopes,
      lastSyncedAt: new Date(),
      ...(userId ? { userId } : {}),
      ...(organizationId ? { organizationId } : {}),
    };

    if (existing) {
      await this.accountRepo.update(existing.id, update);
      return this.accountRepo.findOneOrFail({ where: { id: existing.id } });
    }

    return this.accountRepo.save(
      this.accountRepo.create({ githubId: String(userData.id), ...update }),
    );
  }

  async disconnectAccount(userId: string): Promise<void> {
    const account = await this.accountRepo.findOne({ where: { userId } });
    if (!account) throw new NotFoundException('No connected GitHub account found');
    await this.accountRepo.update(account.id, {
      accessTokenEncrypted: null as any,
      scopes: [],
    });
  }

  async getAccountForUser(userId: string): Promise<GithubAccountEntity | null> {
    return this.accountRepo.findOne({ where: { userId } });
  }

  async getUserRepositories(userId: string) {
    const account = await this.accountRepo.findOne({ where: { userId } });
    if (!account?.accessTokenEncrypted) {
      throw new BadRequestException('No connected GitHub account with token');
    }
    const token = this.decryptToken(account.accessTokenEncrypted);
    return this.githubApiClient.getUserRepositories(token);
  }

  async getUserOrganizations(userId: string) {
    const account = await this.accountRepo.findOne({ where: { userId } });
    if (!account?.accessTokenEncrypted) {
      throw new BadRequestException('No connected GitHub account with token');
    }
    const token = this.decryptToken(account.accessTokenEncrypted);
    return this.githubApiClient.getUserOrganizations(token);
  }

  // ─── GitHub Org sync ─────────────────────────────────────────────────────

  async syncOrganization(
    orgLogin: string,
    platformOrgId: string,
    token?: string,
  ): Promise<GithubOrganizationEntity> {
    const orgData = await this.githubApiClient.getOrganization(orgLogin, token);

    const existing = await this.githubOrgRepo.findOne({
      where: { githubId: String(orgData.id) },
    });

    const payload: Partial<GithubOrganizationEntity> = {
      githubId: String(orgData.id),
      login: orgData.login,
      name: orgData.name ?? undefined,
      description: orgData.description ?? undefined,
      avatarUrl: orgData.avatar_url,
      htmlUrl: orgData.html_url,
      blogUrl: orgData.blog ?? undefined,
      location: orgData.location ?? undefined,
      email: orgData.email ?? undefined,
      twitterUsername: orgData.twitter_username ?? undefined,
      publicRepoCount: orgData.public_repos,
      organizationId: platformOrgId,
    };

    if (existing) {
      await this.githubOrgRepo.update(existing.id, payload as any);
      return this.githubOrgRepo.findOneOrFail({ where: { id: existing.id } });
    }

    return this.githubOrgRepo.save(this.githubOrgRepo.create(payload as any) as unknown as GithubOrganizationEntity);
  }

  async syncOrganizationTeams(
    orgLogin: string,
    githubOrgId: string,
    token: string,
  ): Promise<GithubTeamEntity[]> {
    const teams = await this.githubApiClient.getOrganizationTeams(orgLogin, token);
    const saved: GithubTeamEntity[] = [];

    for (const team of teams) {
      const existing = await this.teamRepo.findOne({
        where: { githubTeamId: String(team.id), githubOrgId },
      });

      const payload: Partial<GithubTeamEntity> = {
        githubTeamId: String(team.id),
        slug: team.slug,
        name: team.name,
        description: team.description ?? undefined,
        privacy: team.privacy as any,
        permission: team.permission as any,
        memberCount: team.members_count,
        repoCount: team.repos_count,
        htmlUrl: team.html_url,
        githubOrgId,
        orgLogin,
        parentTeamId: team.parent ? String(team.parent.id) : undefined,
      };

      if (existing) {
        await this.teamRepo.update(existing.id, payload);
        saved.push(await this.teamRepo.findOneOrFail({ where: { id: existing.id } }));
      } else {
        saved.push(await this.teamRepo.save(this.teamRepo.create(payload)));
      }
    }

    return saved;
  }

  // ─── Webhook events ───────────────────────────────────────────────────────

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

  // ─── Private helpers ──────────────────────────────────────────────────────

  private encryptToken(token: string): string {
    const key = this.config.get<string>('encryption.key') ?? '';
    const iv = this.config.get<string>('encryption.iv') ?? '';
    return encrypt(token, key, iv);
  }

  private decryptToken(encrypted: string): string {
    const key = this.config.get<string>('encryption.key') ?? '';
    const iv = this.config.get<string>('encryption.iv') ?? '';
    return decrypt(encrypted, key, iv);
  }
}
