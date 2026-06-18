import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

export enum WebhookEventStatus {
  RECEIVED = 'received',
  PROCESSING = 'processing',
  PROCESSED = 'processed',
  FAILED = 'failed',
  SKIPPED = 'skipped',
}

@Entity('github_webhook_events')
export class GithubWebhookEventEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ unique: true })
  deliveryId: string; // X-GitHub-Delivery header

  @Index()
  @Column()
  eventType: string; // push, pull_request, issues, etc.

  @Column({ nullable: true })
  action: string; // opened, closed, merged, etc.

  @Column({ nullable: true })
  installationId: string;

  @Column({ nullable: true })
  repositoryFullName: string;

  @Column({ nullable: true })
  organizationLogin: string;

  @Column({ type: 'jsonb' })
  payload: Record<string, unknown>;

  @Column({
    type: 'enum',
    enum: WebhookEventStatus,
    default: WebhookEventStatus.RECEIVED,
  })
  status: WebhookEventStatus;

  @Column({ nullable: true })
  processingStartedAt: Date;

  @Column({ nullable: true })
  processingCompletedAt: Date;

  @Column({ nullable: true, type: 'text' })
  errorMessage: string;

  @Column({ default: 0 })
  retryCount: number;

  @Column({ nullable: true })
  jobId: string; // BullMQ job ID

  @CreateDateColumn()
  createdAt: Date;
}
