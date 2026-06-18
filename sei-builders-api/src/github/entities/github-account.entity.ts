import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum GithubAccountType {
  USER = 'user',
  ORGANIZATION = 'organization',
}

@Entity('github_accounts')
export class GithubAccountEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ unique: true })
  githubId: string;

  @Column()
  login: string;

  @Column({
    type: 'enum',
    enum: GithubAccountType,
    default: GithubAccountType.USER,
  })
  type: GithubAccountType;

  @Column({ nullable: true })
  name: string;

  @Column({ nullable: true })
  avatarUrl: string;

  @Column({ nullable: true })
  htmlUrl: string;

  @Column({ nullable: true })
  email: string;

  @Column({ nullable: true })
  location: string;

  @Column({ nullable: true })
  bio: string;

  @Column({ nullable: true })
  company: string;

  @Column({ default: 0 })
  publicRepoCount: number;

  @Column({ default: 0 })
  followersCount: number;

  @Column({ nullable: true })
  userId: string; // linked platform user

  @Column({ nullable: true })
  organizationId: string; // linked platform org (for GitHub orgs)

  @Column({ nullable: true })
  accessTokenEncrypted: string;

  @Column({ nullable: true })
  tokenExpiresAt: Date;

  @Column({ type: 'simple-array', nullable: true })
  scopes: string[];

  @Column({ nullable: true })
  lastSyncedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
