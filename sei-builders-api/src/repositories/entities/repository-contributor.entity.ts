import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { RepositoryEntity } from './repository.entity';

@Entity('repository_contributors')
@Index(['repositoryId', 'githubLogin'], { unique: true })
export class RepositoryContributorEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  repositoryId: string;

  @Column()
  githubLogin: string;

  @Column({ nullable: true })
  githubId: string;

  @Column({ nullable: true })
  avatarUrl: string;

  @Column({ nullable: true })
  htmlUrl: string;

  @Column({ default: 0 })
  contributions: number; // total commit count

  @Column({ nullable: true })
  platformUserId: string; // linked platform user if known

  @ManyToOne(() => RepositoryEntity, { onDelete: 'CASCADE' })
  repository: RepositoryEntity;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
