import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum TeamPrivacy {
  SECRET = 'secret',
  CLOSED = 'closed',
}

export enum TeamPermission {
  PULL = 'pull',
  PUSH = 'push',
  ADMIN = 'admin',
  MAINTAIN = 'maintain',
  TRIAGE = 'triage',
}

@Entity('github_teams')
@Index(['githubOrgId', 'slug'], { unique: true })
export class GithubTeamEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  githubTeamId: string; // GitHub numeric team ID

  @Column()
  slug: string;

  @Column()
  name: string;

  @Column({ nullable: true, type: 'text' })
  description: string;

  @Column()
  githubOrgId: string; // GitHub numeric org ID

  @Column()
  orgLogin: string; // GitHub org login

  @Column({ nullable: true })
  organizationId: string; // platform org ID

  @Column({
    type: 'enum',
    enum: TeamPrivacy,
    default: TeamPrivacy.CLOSED,
  })
  privacy: TeamPrivacy;

  @Column({
    type: 'enum',
    enum: TeamPermission,
    default: TeamPermission.PULL,
  })
  permission: TeamPermission;

  @Column({ nullable: true })
  parentTeamId: string; // GitHub parent team ID for nested teams

  @Column({ default: 0 })
  memberCount: number;

  @Column({ default: 0 })
  repoCount: number;

  @Column({ nullable: true })
  htmlUrl: string;

  @Column({ nullable: true })
  lastSyncedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
