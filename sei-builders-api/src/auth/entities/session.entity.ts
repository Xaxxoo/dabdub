import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UserEntity } from '../../users/entities/user.entity';

@Entity('sessions')
export class SessionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  userId: string;

  @Column({ nullable: true })
  refreshTokenId: string;

  @Column({ nullable: true })
  userAgent: string;

  @Column({ nullable: true })
  ipAddress: string;

  @Column({ nullable: true })
  deviceName: string;

  @Column({ nullable: true })
  deviceType: string; // desktop, mobile, tablet

  @Column({ nullable: true })
  location: string;

  @Column({ nullable: true })
  lastActiveAt: Date;

  @Column({ default: true })
  isActive: boolean;

  @Column({ nullable: true })
  terminatedAt: Date;

  @Column({ nullable: true })
  terminationReason: string; // logout, revoked, expired

  @ManyToOne(() => UserEntity, (user) => user.sessions, {
    onDelete: 'CASCADE',
  })
  user: UserEntity;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
