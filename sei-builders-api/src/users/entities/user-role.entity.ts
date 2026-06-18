import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { UserEntity } from './user.entity';
import { RoleEntity } from './role.entity';

@Entity('user_roles')
@Index(['userId', 'roleId'], { unique: true })
export class UserRoleEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column()
  roleId: string;

  @Column({ nullable: true })
  organizationId: string; // optional scope — role applies within this org

  @ManyToOne(() => UserEntity, (user) => user.userRoles, {
    onDelete: 'CASCADE',
  })
  user: UserEntity;

  @ManyToOne(() => RoleEntity, (role) => role.userRoles, { eager: true })
  role: RoleEntity;

  @CreateDateColumn()
  createdAt: Date;
}
