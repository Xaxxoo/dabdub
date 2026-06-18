import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { NotificationEntity, NotificationType } from './entities/notification.entity';
import { PaginationDto } from '../common/dto/pagination.dto';
import { buildPaginatedResult } from '../common/utils/pagination.util';
import { QUEUE_NAMES, JOB_NAMES } from '../queue/queue.constants';

export interface CreateNotificationDto {
  recipientId: string;
  actorId?: string;
  type: NotificationType;
  title: string;
  body?: string;
  actionUrl?: string;
  resourceType?: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(NotificationEntity)
    private readonly notifRepo: Repository<NotificationEntity>,
    @InjectQueue(QUEUE_NAMES.NOTIFICATIONS)
    private readonly notificationsQueue: Queue,
  ) {}

  async create(dto: CreateNotificationDto): Promise<NotificationEntity> {
    const notification = await this.notifRepo.save(this.notifRepo.create(dto));

    // Enqueue async delivery (email, push, etc.)
    await this.notificationsQueue
      .add(
        JOB_NAMES.SEND_NOTIFICATION,
        { notificationId: notification.id },
        { attempts: 3, backoff: { type: 'exponential', delay: 1000 }, removeOnComplete: 100 },
      )
      .catch((err: Error) =>
        this.logger.warn(`Failed to enqueue notification ${notification.id}: ${err.message}`),
      );

    return notification;
  }

  async createMany(dtos: CreateNotificationDto[]): Promise<void> {
    if (dtos.length === 0) return;
    await this.notifRepo.save(dtos.map((d) => this.notifRepo.create(d)));
    await this.notificationsQueue
      .add(JOB_NAMES.SEND_BULK_NOTIFICATIONS, { count: dtos.length }, { attempts: 2 })
      .catch(() => {});
  }

  async findForUser(
    userId: string,
    pagination: PaginationDto,
    unreadOnly = false,
  ) {
    const qb = this.notifRepo
      .createQueryBuilder('notif')
      .leftJoinAndSelect('notif.actor', 'actor')
      .where('notif.recipientId = :userId', { userId })
      .andWhere('notif.deletedAt IS NULL');

    if (unreadOnly) {
      qb.andWhere('notif.isRead = false');
    }

    qb.orderBy('notif.createdAt', 'DESC')
      .skip(pagination.skip)
      .take(pagination.limit);

    const [data, total] = await qb.getManyAndCount();
    return buildPaginatedResult(data, total, pagination);
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.notifRepo.count({
      where: { recipientId: userId, isRead: false },
    });
  }

  async markRead(id: string, userId: string): Promise<void> {
    await this.notifRepo.update(
      { id, recipientId: userId },
      { isRead: true, readAt: new Date() },
    );
  }

  async markAllRead(userId: string): Promise<void> {
    await this.notifRepo.update(
      { recipientId: userId, isRead: false },
      { isRead: true, readAt: new Date() },
    );
  }

  async softDelete(id: string, userId: string): Promise<void> {
    const notif = await this.notifRepo.findOne({
      where: { id, recipientId: userId },
    });
    if (!notif) throw new NotFoundException('Notification not found');
    await this.notifRepo.softDelete(id);
  }

  // ─── Domain notification helpers ──────────────────────────────────────────────

  async notifyApplicationReceived(
    maintainerId: string,
    applicantId: string,
    opportunityId: string,
    opportunityTitle: string,
  ): Promise<void> {
    await this.create({
      recipientId: maintainerId,
      actorId: applicantId,
      type: NotificationType.APPLICATION_RECEIVED,
      title: 'New application received',
      body: `Someone applied to: "${opportunityTitle}"`,
      actionUrl: `/dashboard/opportunities/${opportunityId}`,
      resourceType: 'opportunity',
      resourceId: opportunityId,
    });
  }

  async notifyApplicationAccepted(
    applicantId: string,
    reviewerId: string,
    opportunityId: string,
    opportunityTitle: string,
  ): Promise<void> {
    await this.create({
      recipientId: applicantId,
      actorId: reviewerId,
      type: NotificationType.APPLICATION_ACCEPTED,
      title: 'Application accepted!',
      body: `Your application to "${opportunityTitle}" has been accepted.`,
      actionUrl: `/dashboard/opportunities/${opportunityId}`,
      resourceType: 'opportunity',
      resourceId: opportunityId,
    });
  }

  async notifyApplicationRejected(
    applicantId: string,
    reviewerId: string,
    opportunityId: string,
    opportunityTitle: string,
  ): Promise<void> {
    await this.create({
      recipientId: applicantId,
      actorId: reviewerId,
      type: NotificationType.APPLICATION_REJECTED,
      title: 'Application not selected',
      body: `Your application to "${opportunityTitle}" was not selected this time.`,
      actionUrl: `/dashboard/opportunities/${opportunityId}`,
      resourceType: 'opportunity',
      resourceId: opportunityId,
    });
  }

  async notifyOpportunityAssigned(
    assigneeId: string,
    assignerId: string,
    opportunityId: string,
    opportunityTitle: string,
  ): Promise<void> {
    await this.create({
      recipientId: assigneeId,
      actorId: assignerId,
      type: NotificationType.OPPORTUNITY_ASSIGNED,
      title: 'Opportunity assigned to you',
      body: `You have been assigned to: "${opportunityTitle}"`,
      actionUrl: `/dashboard/opportunities/${opportunityId}`,
      resourceType: 'opportunity',
      resourceId: opportunityId,
    });
  }

  async notifyOpportunityClosed(
    applicantId: string,
    opportunityId: string,
    opportunityTitle: string,
  ): Promise<void> {
    await this.create({
      recipientId: applicantId,
      type: NotificationType.OPPORTUNITY_CLOSED,
      title: 'Opportunity closed',
      body: `The opportunity "${opportunityTitle}" has been closed.`,
      actionUrl: `/dashboard/opportunities/${opportunityId}`,
      resourceType: 'opportunity',
      resourceId: opportunityId,
    });
  }

  async notifyOrgInvite(
    inviteeId: string,
    inviterId: string,
    organizationId: string,
    organizationName: string,
    inviteToken: string,
  ): Promise<void> {
    await this.create({
      recipientId: inviteeId,
      actorId: inviterId,
      type: NotificationType.ORG_INVITE,
      title: `You've been invited to ${organizationName}`,
      body: `You have been invited to join "${organizationName}". Click to accept or decline.`,
      actionUrl: `/invites/accept/${inviteToken}`,
      resourceType: 'organization',
      resourceId: organizationId,
      metadata: { inviteToken },
    });
  }

  async notifyPRMerged(
    contributorId: string,
    projectId: string,
    projectName: string,
    prUrl: string,
    prTitle: string,
  ): Promise<void> {
    await this.create({
      recipientId: contributorId,
      type: NotificationType.PR_MERGED,
      title: 'Your PR was merged!',
      body: `"${prTitle}" has been merged into ${projectName}.`,
      actionUrl: prUrl,
      resourceType: 'project',
      resourceId: projectId,
    });
  }
}
