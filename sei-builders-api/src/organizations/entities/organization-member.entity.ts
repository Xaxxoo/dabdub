import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { OrganizationEntity } from './organization.entity';
import { UserEntity } from '../../users/entities/user.entity';

export enum OrganizationRole {
  OWNER = 'owner',
  ADMIN = 'admin',
  MAINTAINER = 'maintainer',
  MEMBER = 'member',
}

@Entity('organization_members')
@Index(['organizationId', 'userId'], { unique: true })
export class OrganizationMemberEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  organizationId: string;

  @Column()
  userId: string;

  @Column({
    type: 'enum',
    enum: OrganizationRole,
    default: OrganizationRole.MEMBER,
  })
  role: OrganizationRole;

  @Column({ default: true })
  isActive: boolean;

  @Column({ nullable: true })
  invitedById: string;

  @Column({ nullable: true })
  invitedAt: Date;

  @Column({ nullable: true })
  joinedAt: Date;

  @ManyToOne(() => OrganizationEntity, (org) => org.members, {
    onDelete: 'CASCADE',
  })
  organization: OrganizationEntity;

  @ManyToOne(() => UserEntity, { eager: true, onDelete: 'CASCADE' })
  user: UserEntity;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
