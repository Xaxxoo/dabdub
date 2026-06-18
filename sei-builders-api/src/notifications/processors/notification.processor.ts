import { Process, Processor, OnQueueFailed } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Job } from 'bull';
import { NotificationEntity } from '../entities/notification.entity';
import { QUEUE_NAMES, JOB_NAMES } from '../../queue/queue.constants';

export interface SendNotificationJobData {
  notificationId: string;
}

@Processor(QUEUE_NAMES.NOTIFICATIONS)
export class NotificationProcessor {
  private readonly logger = new Logger(NotificationProcessor.name);

  constructor(
    @InjectRepository(NotificationEntity)
    private readonly notifRepo: Repository<NotificationEntity>,
  ) {}

  @Process(JOB_NAMES.SEND_NOTIFICATION)
  async handleSendNotification(job: Job<SendNotificationJobData>): Promise<void> {
    const { notificationId } = job.data;

    const notification = await this.notifRepo.findOne({
      where: { id: notificationId },
    });

    if (!notification) {
      this.logger.warn(`Notification ${notificationId} not found, skipping`);
      return;
    }

    // Delivery channel routing:
    // In production this would dispatch to email, push, or in-app delivery services.
    // For now we log and mark as processed.
    this.logger.log(
      `Delivering notification [${notification.type}] to user ${notification.recipientId}: "${notification.title}"`,
    );

    // Future: dispatch to email service, push notification service, etc.
    // await this.emailService.send(notification);
    // await this.pushService.send(notification);
  }

  @Process(JOB_NAMES.SEND_BULK_NOTIFICATIONS)
  async handleBulkNotifications(job: Job<{ count: number }>): Promise<void> {
    this.logger.log(`Bulk notification job processed: ${job.data.count} notifications enqueued`);
  }

  @OnQueueFailed()
  onFailed(job: Job, error: Error): void {
    this.logger.error(
      `Notification job ${job.name}#${job.id} failed after ${job.attemptsMade} attempts: ${error.message}`,
      error.stack,
    );
  }
}
