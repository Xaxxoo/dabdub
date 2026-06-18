import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  JoinTable,
  ManyToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UserEntity } from '../../users/entities/user.entity';
import { SkillEntity } from './skill.entity';

@Entity('contributor_profiles')
export class ContributorProfileEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ unique: true })
  userId: string;

  @Column({ nullable: true, type: 'text' })
  bio: string;

  @Column({ nullable: true })
  githubUsername: string;

  @Column({ nullable: true })
  twitterHandle: string;

  @Column({ nullable: true })
  website: string;

  @Column({ nullable: true })
  location: string;

  @Column({ nullable: true })
  timezone: string;

  @Column({ nullable: true })
  openToWork: boolean;

  @Column({ type: 'simple-array', nullable: true })
  preferredLanguages: string[];

  @Column({ type: 'simple-array', nullable: true })
  availableFor: string[]; // bug-fix, feature, documentation, mentoring

  // Reputation & scoring
  @Column({ type: 'float', default: 0 })
  reputationScore: number;

  @Column({ type: 'float', default: 0 })
  ecosystemScore: number;

  @Column({ default: 0 })
  totalContributions: number;

  @Column({ default: 0 })
  mergedPrCount: number;

  @Column({ default: 0 })
  openIssueCount: number;

  @Column({ default: 0 })
  closedIssueCount: number;

  @Column({ default: 0 })
  reviewCount: number;

  @Column({ default: 0 })
  projectsContributed: number;

  @Column({ type: 'jsonb', nullable: true })
  languageBreakdown: Record<string, number>; // { TypeScript: 60, Rust: 30, ... }

  @Column({ type: 'jsonb', nullable: true })
  weeklyActivity: number[]; // last 12 weeks commit counts

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown>;

  @OneToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: UserEntity;

  @ManyToMany(() => SkillEntity, (skill) => skill.contributors, { eager: true })
  @JoinTable({
    name: 'contributor_skills',
    joinColumn: { name: 'contributor_id' },
    inverseJoinColumn: { name: 'skill_id' },
  })
  skills: SkillEntity[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
