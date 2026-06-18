import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { OpportunityEntity } from '../../opportunities/entities/opportunity.entity';
import { UserEntity } from '../../users/entities/user.entity';

export enum ApplicationStatus {
  PENDING = 'pending',
  REVIEWING = 'reviewing',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
  WITHDRAWN = 'withdrawn',
  COMPLETED = 'completed',
}

@Entity('applications')
@Index(['opportunityId', 'applicantId'], { unique: true })
export class ApplicationEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  opportunityId: string;

  @Column()
  applicantId: string;

  @Column({
    type: 'enum',
    enum: ApplicationStatus,
    default: ApplicationStatus.PENDING,
  })
  status: ApplicationStatus;

  @Column({ type: 'text', nullable: true })
  coverLetter: string;

  @Column({ type: 'text', nullable: true })
  proposal: string;

  @Column({ nullable: true })
  portfolioUrl: string;

  @Column({ nullable: true })
  githubProfileUrl: string;

  @Column({ type: 'simple-array', nullable: true })
  relevantSkills: string[];

  @Column({ nullable: true })
  estimatedCompletionDays: number;

  @Column({ nullable: true })
  reviewedById: string;

  @Column({ nullable: true })
  reviewedAt: Date;

  @Column({ type: 'text', nullable: true })
  reviewNotes: string;

  @Column({ nullable: true })
  completedAt: Date;

  @Column({ nullable: true })
  prUrl: string; // link to the PR that completed the work

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown>;

  @Index()
  @ManyToOne(() => OpportunityEntity, (opp) => opp.applications, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'opportunityId' })
  opportunity: OpportunityEntity;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'applicantId' })
  applicant: UserEntity;

  @ManyToOne(() => UserEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'reviewedById' })
  reviewedBy: UserEntity;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;
}
