import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ProjectEntity } from '../../projects/entities/project.entity';
import { UserEntity } from '../../users/entities/user.entity';
import { ApplicationEntity } from '../../applications/entities/application.entity';

export enum OpportunityType {
  GOOD_FIRST_ISSUE = 'good-first-issue',
  BUG_FIX = 'bug-fix',
  FEATURE = 'feature',
  DOCUMENTATION = 'documentation',
  BOUNTY = 'bounty',
  MENTORING = 'mentoring',
}

export enum OpportunityDifficulty {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced',
}

export enum OpportunityStatus {
  OPEN = 'open',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CLOSED = 'closed',
  CANCELLED = 'cancelled',
}

@Entity('opportunities')
export class OpportunityEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'text', nullable: true })
  requirements: string;

  @Column({
    type: 'enum',
    enum: OpportunityType,
    default: OpportunityType.GOOD_FIRST_ISSUE,
  })
  type: OpportunityType;

  @Column({
    type: 'enum',
    enum: OpportunityDifficulty,
    default: OpportunityDifficulty.BEGINNER,
  })
  difficulty: OpportunityDifficulty;

  @Column({
    type: 'enum',
    enum: OpportunityStatus,
    default: OpportunityStatus.OPEN,
  })
  status: OpportunityStatus;

  @Column({ nullable: true })
  projectId: string;

  @Column()
  createdById: string;

  @Column({ nullable: true })
  assignedToId: string;

  @Column({ type: 'simple-array', nullable: true })
  requiredSkills: string[];

  // Bounty fields
  @Column({ default: false })
  hasBounty: boolean;

  @Column({ type: 'decimal', precision: 18, scale: 6, nullable: true })
  bountyAmount: number;

  @Column({ nullable: true })
  bountyCurrency: string; // SEI, USDC, etc.

  @Column({ nullable: true })
  bountyDeadline: Date;

  @Column({ nullable: true })
  githubIssueUrl: string;

  @Column({ nullable: true })
  githubIssueNumber: number;

  @Column({ default: 0 })
  applicationCount: number;

  @Column({ default: 0 })
  viewCount: number;

  @Column({ nullable: true })
  closedAt: Date;

  @Column({ nullable: true })
  completedAt: Date;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown>;

  @Index()
  @ManyToOne(() => ProjectEntity, (project) => project.opportunities, {
    onDelete: 'CASCADE',
    nullable: true,
  })
  @JoinColumn({ name: 'projectId' })
  project: ProjectEntity;

  @ManyToOne(() => UserEntity, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'createdById' })
  createdBy: UserEntity;

  @ManyToOne(() => UserEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'assignedToId' })
  assignedTo: UserEntity;

  @OneToMany(() => ApplicationEntity, (app) => app.opportunity)
  applications: ApplicationEntity[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;
}
