import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationEntity, NotificationType } from './entities/notification.entity';
import { PaginationDto } from '../common/dto/pagination.dto';
import { buildPaginatedResult } from '../common/utils/pagination.util';

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
  constructor(
    @InjectRepository(NotificationEntity)
    private readonly notifRepo: Repository<NotificationEntity>,
  ) {}

  async create(dto: CreateNotificationDto): Promise<NotificationEntity> {
    return this.notifRepo.save(this.notifRepo.create(dto));
  }

  async createMany(dtos: CreateNotificationDto[]): Promise<void> {
    await this.notifRepo.save(dtos.map((d) => this.notifRepo.create(d)));
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
}
