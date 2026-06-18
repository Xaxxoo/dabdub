import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { UserEntity } from '../../users/entities/user.entity';

export enum ActivityEventType {
  PR_MERGED = 'pr_merged',
  ISSUE_OPENED = 'issue_opened',
  ISSUE_CLOSED = 'issue_closed',
  PROJECT_CREATED = 'project_created',
  PROJECT_UPDATED = 'project_updated',
  OPPORTUNITY_POSTED = 'opportunity_posted',
  OPPORTUNITY_CLOSED = 'opportunity_closed',
  APPLICATION_SUBMITTED = 'application_submitted',
  APPLICATION_ACCEPTED = 'application_accepted',
  CONTRIBUTOR_JOINED = 'contributor_joined',
  ORGANIZATION_CREATED = 'organization_created',
  REPOSITORY_SYNCED = 'repository_synced',
  BOUNTY_AWARDED = 'bounty_awarded',
}

@Entity('activities')
export class ActivityEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: ActivityEventType,
  })
  eventType: ActivityEventType;

  @Index()
  @Column({ nullable: true })
  actorId: string;

  @Column({ nullable: true })
  targetId: string; // resource ID being acted upon

  @Column({ nullable: true })
  targetType: string; // project, opportunity, repository, etc.

  @Column({ nullable: true })
  organizationId: string;

  @Column({ nullable: true })
  projectId: string;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ nullable: true })
  actionUrl: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown>;

  @ManyToOne(() => UserEntity, { nullable: true, onDelete: 'SET NULL' })
  actor: UserEntity;

  @CreateDateColumn()
  createdAt: Date;
}
