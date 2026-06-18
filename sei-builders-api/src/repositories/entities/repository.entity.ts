import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { OrganizationEntity } from '../../organizations/entities/organization.entity';
import { RepositorySyncEntity } from './repository-sync.entity';

export enum RepositoryVisibility {
  PUBLIC = 'public',
  PRIVATE = 'private',
  INTERNAL = 'internal',
}

export enum RepositorySyncStatus {
  NEVER = 'never',
  SYNCING = 'syncing',
  SYNCED = 'synced',
  FAILED = 'failed',
}

@Entity('repositories')
@Index(['organizationId', 'fullName'], { unique: true })
export class RepositoryEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  githubId: string;

  @Column()
  name: string;

  @Column()
  fullName: string; // owner/repo

  @Column({ nullable: true, type: 'text' })
  description: string;

  @Column()
  htmlUrl: string;

  @Column()
  cloneUrl: string;

  @Column({ nullable: true })
  defaultBranch: string;

  @Column({ nullable: true })
  language: string;

  @Column({ type: 'simple-array', nullable: true })
  topics: string[];

  @Column({
    type: 'enum',
    enum: RepositoryVisibility,
    default: RepositoryVisibility.PUBLIC,
  })
  visibility: RepositoryVisibility;

  @Column({ default: 0 })
  starCount: number;

  @Column({ default: 0 })
  forkCount: number;

  @Column({ default: 0 })
  watcherCount: number;

  @Column({ default: 0 })
  openIssueCount: number;

  @Column({ default: 0 })
  subscriberCount: number;

  @Column({ nullable: true })
  pushedAt: Date;

  @Column({ nullable: true })
  organizationId: string;

  @Column({ nullable: true })
  projectId: string;

  @Column({
    type: 'enum',
    enum: RepositorySyncStatus,
    default: RepositorySyncStatus.NEVER,
  })
  syncStatus: RepositorySyncStatus;

  @Column({ nullable: true })
  lastSyncedAt: Date;

  @Column({ nullable: true })
  syncError: string;

  @Column({ default: false })
  webhookRegistered: boolean;

  @Column({ nullable: true })
  webhookId: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown>;

  @ManyToOne(() => OrganizationEntity, { nullable: true, onDelete: 'SET NULL' })
  organization: OrganizationEntity;

  @OneToMany(() => RepositorySyncEntity, (sync) => sync.repository)
  syncs: RepositorySyncEntity[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;
}
