import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum InstallationStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  DELETED = 'deleted',
}

@Entity('github_installations')
export class GithubInstallationEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ unique: true })
  installationId: string; // GitHub app installation ID

  @Column()
  accountLogin: string;

  @Column()
  accountType: string; // User or Organization

  @Column({ nullable: true })
  accountAvatarUrl: string;

  @Column({ nullable: true })
  organizationId: string; // linked platform org

  @Column({ nullable: true })
  installedById: string; // platform user who triggered install

  @Column({
    type: 'enum',
    enum: InstallationStatus,
    default: InstallationStatus.ACTIVE,
  })
  status: InstallationStatus;

  @Column({ type: 'simple-array', nullable: true })
  repositorySelection: string[]; // 'all' or specific repo names

  @Column({ type: 'jsonb', nullable: true })
  permissions: Record<string, string>;

  @Column({ type: 'simple-array', nullable: true })
  events: string[];

  @Column({ nullable: true })
  suspendedAt: Date;

  @Column({ nullable: true })
  deletedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
