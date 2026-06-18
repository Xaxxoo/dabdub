import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { RepositoryEntity } from './repository.entity';

export enum PullRequestState {
  OPEN = 'open',
  CLOSED = 'closed',
  MERGED = 'merged',
}

@Entity('repository_pull_requests')
@Index(['repositoryId', 'githubNumber'], { unique: true })
export class RepositoryPullRequestEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  repositoryId: string;

  @Column()
  githubId: string;

  @Column()
  githubNumber: number;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  body: string;

  @Column({
    type: 'enum',
    enum: PullRequestState,
    default: PullRequestState.OPEN,
  })
  state: PullRequestState;

  @Column({ nullable: true })
  htmlUrl: string;

  @Column({ nullable: true })
  headBranch: string;

  @Column({ nullable: true })
  baseBranch: string;

  @Column({ nullable: true })
  headSha: string;

  @Column({ nullable: true })
  authorLogin: string;

  @Column({ nullable: true })
  authorAvatarUrl: string;

  @Column({ nullable: true })
  mergedByLogin: string;

  @Column({ type: 'simple-array', nullable: true })
  labels: string[];

  @Column({ type: 'simple-array', nullable: true })
  requestedReviewers: string[];

  @Column({ default: 0 })
  commentsCount: number;

  @Column({ default: 0 })
  reviewCommentsCount: number;

  @Column({ default: 0 })
  commits: number;

  @Column({ default: 0 })
  additions: number;

  @Column({ default: 0 })
  deletions: number;

  @Column({ default: 0 })
  changedFiles: number;

  @Column({ nullable: true })
  mergedAt: Date;

  @Column({ nullable: true })
  closedAt: Date;

  @Column({ nullable: true })
  githubCreatedAt: Date;

  @Column({ nullable: true })
  githubUpdatedAt: Date;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown>;

  @ManyToOne(() => RepositoryEntity, { onDelete: 'CASCADE' })
  repository: RepositoryEntity;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
