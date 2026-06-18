import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { UserRoleEntity } from './user-role.entity';
import { RefreshTokenEntity } from '../../auth/entities/refresh-token.entity';
import { SessionEntity } from '../../auth/entities/session.entity';

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  PENDING_VERIFICATION = 'pending_verification',
}

export enum OnboardingStatus {
  NOT_STARTED = 'not_started',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
}

@Entity('users')
export class UserEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true, where: '"email" IS NOT NULL' })
  @Column({ nullable: true })
  email: string;

  @Exclude()
  @Column({ nullable: true })
  passwordHash: string;

  @Column()
  username: string;

  @Index({ unique: true })
  @Column({ unique: true })
  slug: string;

  @Column({ nullable: true })
  fullName: string;

  @Column({ nullable: true })
  avatarUrl: string;

  @Column({ nullable: true })
  bio: string;

  @Column({ nullable: true })
  location: string;

  @Column({ nullable: true })
  website: string;

  @Column({ nullable: true })
  twitterHandle: string;

  @Column({
    type: 'enum',
    enum: UserStatus,
    default: UserStatus.ACTIVE,
  })
  status: UserStatus;

  @Column({
    type: 'enum',
    enum: OnboardingStatus,
    default: OnboardingStatus.NOT_STARTED,
  })
  onboardingStatus: OnboardingStatus;

  @Column({ default: false })
  emailVerified: boolean;

  @Column({ nullable: true })
  emailVerificationToken: string;

  @Column({ nullable: true })
  emailVerificationExpiry: Date;

  @Exclude()
  @Column({ nullable: true })
  passwordResetToken: string;

  @Column({ nullable: true })
  passwordResetExpiry: Date;

  // GitHub OAuth
  @Column({ nullable: true, unique: true })
  githubId: string;

  @Column({ nullable: true })
  githubUsername: string;

  @Exclude()
  @Column({ nullable: true })
  githubAccessTokenEncrypted: string;

  @Column({ nullable: true })
  lastLoginAt: Date;

  @Column({ nullable: true })
  lastLoginIp: string;

  @Column({ default: false })
  isSuperAdmin: boolean;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown>;

  @OneToMany(() => UserRoleEntity, (userRole) => userRole.user, { eager: true })
  userRoles: UserRoleEntity[];

  @OneToMany(() => RefreshTokenEntity, (token) => token.user)
  refreshTokens: RefreshTokenEntity[];

  @OneToMany(() => SessionEntity, (session) => session.user)
  sessions: SessionEntity[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;

  // Computed helpers (not stored)
  get roles(): string[] {
    return this.userRoles?.map((ur) => ur.role?.name) ?? [];
  }

  get permissions(): string[] {
    const perms = new Set<string>();
    this.userRoles?.forEach((ur) => {
      ur.role?.permissions?.forEach((p) => perms.add(p.name));
    });
    return Array.from(perms);
  }
}
