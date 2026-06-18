import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { TagEntity } from './tag.entity';
import { ProjectCategoryEntity } from './project-category.entity';
import { OrganizationEntity } from '../../organizations/entities/organization.entity';
import { UserEntity } from '../../users/entities/user.entity';
import { OpportunityEntity } from '../../opportunities/entities/opportunity.entity';

export enum ProjectStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  ARCHIVED = 'archived',
  SUSPENDED = 'suspended',
}

export enum ProjectDifficulty {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced',
}

@Entity('projects')
export class ProjectEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Index({ unique: true })
  @Column({ unique: true })
  slug: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'text', nullable: true })
  contributionGuidelines: string;

  @Column({ type: 'text', nullable: true })
  welcomeMessage: string;

  @Column({ nullable: true })
  website: string;

  @Column({ nullable: true })
  logoUrl: string;

  @Column({
    type: 'enum',
    enum: ProjectStatus,
    default: ProjectStatus.DRAFT,
  })
  status: ProjectStatus;

  @Column({
    type: 'enum',
    enum: ProjectDifficulty,
    nullable: true,
  })
  difficultyPreference: ProjectDifficulty;

  @Column({ default: false })
  supportsBounties: boolean;

  @Column({ nullable: true })
  organizationId: string;

  @Column()
  ownerId: string;

  @Column({ nullable: true })
  categoryId: string;

  @Column({ nullable: true })
  primaryRepositoryId: string;

  @Column({ type: 'simple-array', nullable: true })
  techStack: string[];

  @Column({ type: 'simple-array', nullable: true })
  requiredSkills: string[];

  @Column({ default: 0 })
  starCount: number;

  @Column({ default: 0 })
  contributorCount: number;

  @Column({ default: 0 })
  openIssueCount: number;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown>;

  @ManyToOne(() => OrganizationEntity, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'organizationId' })
  organization: OrganizationEntity;

  @ManyToOne(() => UserEntity, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'ownerId' })
  owner: UserEntity;

  @ManyToOne(() => ProjectCategoryEntity, (cat) => cat.projects, {
    nullable: true,
  })
  @JoinColumn({ name: 'categoryId' })
  category: ProjectCategoryEntity;

  @ManyToMany(() => TagEntity, (tag) => tag.projects, { eager: true })
  @JoinTable({
    name: 'project_tags',
    joinColumn: { name: 'project_id' },
    inverseJoinColumn: { name: 'tag_id' },
  })
  tags: TagEntity[];

  @OneToMany(() => OpportunityEntity, (opp) => opp.project)
  opportunities: OpportunityEntity[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;
}
