import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { OrganizationMemberEntity } from './organization-member.entity';

export enum OrganizationStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  PENDING = 'pending',
}

export enum OrganizationCategory {
  DEFI = 'defi',
  NFT = 'nft',
  GAMING = 'gaming',
  INFRASTRUCTURE = 'infrastructure',
  TOOLING = 'tooling',
  SOCIAL = 'social',
  MARKETPLACE = 'marketplace',
  OTHER = 'other',
}

@Entity('organizations')
export class OrganizationEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Index({ unique: true })
  @Column({ unique: true })
  slug: string;

  @Column({ nullable: true, type: 'text' })
  description: string;

  @Column({ nullable: true })
  website: string;

  @Column({ nullable: true })
  logoUrl: string;

  @Column({ nullable: true })
  primaryColor: string; // hex color for branding

  @Column({ nullable: true })
  twitterHandle: string;

  @Column({ nullable: true })
  discordUrl: string;

  @Column({ nullable: true })
  telegramUrl: string;

  @Column({ nullable: true })
  linkedinUrl: string;

  @Column({ nullable: true })
  githubOrganization: string;

  @Column({
    type: 'enum',
    enum: OrganizationCategory,
    nullable: true,
  })
  category: OrganizationCategory;

  @Column({
    type: 'enum',
    enum: OrganizationStatus,
    default: OrganizationStatus.ACTIVE,
  })
  status: OrganizationStatus;

  @Column({ nullable: true })
  suspendedAt: Date;

  @Column({ nullable: true })
  suspendedReason: string;

  @Column({ nullable: true })
  githubInstallationId: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown>;

  @OneToMany(() => OrganizationMemberEntity, (m) => m.organization)
  members: OrganizationMemberEntity[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;
}
