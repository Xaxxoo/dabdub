import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { UserEntity } from '../../users/entities/user.entity';

export enum NotificationType {
  APPLICATION_RECEIVED = 'application_received',
  APPLICATION_ACCEPTED = 'application_accepted',
  APPLICATION_REJECTED = 'application_rejected',
  OPPORTUNITY_ASSIGNED = 'opportunity_assigned',
  OPPORTUNITY_CLOSED = 'opportunity_closed',
  PR_MERGED = 'pr_merged',
  NEW_OPPORTUNITY = 'new_opportunity',
  SYSTEM_ANNOUNCEMENT = 'system_announcement',
  ORG_INVITE = 'org_invite',
  MENTION = 'mention',
}

@Entity('notifications')
export class NotificationEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  recipientId: string;

  @Column({ nullable: true })
  actorId: string; // who triggered the notification (null = system)

  @Column({
    type: 'enum',
    enum: NotificationType,
  })
  type: NotificationType;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  body: string;

  @Column({ nullable: true })
  actionUrl: string;

  @Column({ nullable: true })
  resourceType: string; // opportunity, application, project, etc.

  @Column({ nullable: true })
  resourceId: string;

  @Column({ default: false })
  isRead: boolean;

  @Column({ nullable: true })
  readAt: Date;

  @Column({ default: false })
  isEmailed: boolean;

  @Column({ nullable: true })
  emailedAt: Date;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown>;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  recipient: UserEntity;

  @ManyToOne(() => UserEntity, { nullable: true, onDelete: 'SET NULL' })
  actor: UserEntity;

  @CreateDateColumn()
  createdAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;
}
