import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { RepositoryEntity } from './repository.entity';

export enum SyncType {
  FULL = 'full',
  INCREMENTAL = 'incremental',
  WEBHOOK = 'webhook',
}

export enum SyncStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  PARTIAL = 'partial',
}

@Entity('repository_syncs')
export class RepositorySyncEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  repositoryId: string;

  @Column({ type: 'enum', enum: SyncType, default: SyncType.INCREMENTAL })
  syncType: SyncType;

  @Column({ type: 'enum', enum: SyncStatus, default: SyncStatus.PENDING })
  status: SyncStatus;

  @Column({ nullable: true })
  startedAt: Date;

  @Column({ nullable: true })
  completedAt: Date;

  @Column({ nullable: true })
  errorMessage: string;

  @Column({ default: 0 })
  issuesSynced: number;

  @Column({ default: 0 })
  prsSynced: number;

  @Column({ default: 0 })
  contributorsSynced: number;

  @Column({ default: 0 })
  commitsSynced: number;

  @Column({ type: 'jsonb', nullable: true })
  details: Record<string, unknown>;

  @ManyToOne(() => RepositoryEntity, (repo) => repo.syncs, {
    onDelete: 'CASCADE',
  })
  repository: RepositoryEntity;

  @CreateDateColumn()
  createdAt: Date;
}
