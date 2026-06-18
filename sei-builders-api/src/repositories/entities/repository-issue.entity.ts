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

export enum IssueState {
  OPEN = 'open',
  CLOSED = 'closed',
}

@Entity('repository_issues')
@Index(['repositoryId', 'githubNumber'], { unique: true })
export class RepositoryIssueEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  repositoryId: string;

  @Column()
  githubId: string; // GitHub issue ID (numeric as string)

  @Column()
  githubNumber: number; // Issue #

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  body: string;

  @Column({
    type: 'enum',
    enum: IssueState,
    default: IssueState.OPEN,
  })
  state: IssueState;

  @Column({ nullable: true })
  htmlUrl: string;

  @Column({ nullable: true })
  authorLogin: string;

  @Column({ nullable: true })
  authorAvatarUrl: string;

  @Column({ nullable: true })
  assigneeLogin: string;

  @Column({ type: 'simple-array', nullable: true })
  labels: string[]; // label names

  @Column({ default: 0 })
  commentsCount: number;

  @Column({ nullable: true })
  isPullRequest: boolean;

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
