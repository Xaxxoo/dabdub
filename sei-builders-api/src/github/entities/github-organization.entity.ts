import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('github_organizations')
export class GithubOrganizationEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ unique: true })
  githubId: string; // GitHub numeric org ID

  @Index({ unique: true })
  @Column({ unique: true })
  login: string; // GitHub org login (handle)

  @Column({ nullable: true })
  name: string;

  @Column({ nullable: true, type: 'text' })
  description: string;

  @Column({ nullable: true })
  avatarUrl: string;

  @Column({ nullable: true })
  htmlUrl: string;

  @Column({ nullable: true })
  blogUrl: string;

  @Column({ nullable: true })
  location: string;

  @Column({ nullable: true })
  email: string;

  @Column({ nullable: true })
  twitterUsername: string;

  @Column({ default: 0 })
  publicRepoCount: number;

  @Column({ default: 0 })
  privateRepoCount: number;

  @Column({ default: 0 })
  memberCount: number;

  @Column({ default: false })
  hasOrganizationProjects: boolean;

  @Column({ default: false })
  hasRepositoryProjects: boolean;

  @Column({ nullable: true })
  organizationId: string; // linked platform org

  @Column({ nullable: true })
  installationId: string; // GitHub App installation ID

  @Column({ nullable: true })
  lastSyncedAt: Date;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
