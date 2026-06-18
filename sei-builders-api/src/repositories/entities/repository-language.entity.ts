import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { RepositoryEntity } from './repository.entity';

@Entity('repository_languages')
@Index(['repositoryId', 'language'], { unique: true })
export class RepositoryLanguageEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  repositoryId: string;

  @Column()
  language: string;

  @Column({ type: 'bigint', default: 0 })
  bytes: number; // raw byte count from GitHub API

  @Column({ type: 'float', default: 0 })
  percentage: number; // computed percentage of total bytes

  @ManyToOne(() => RepositoryEntity, { onDelete: 'CASCADE' })
  repository: RepositoryEntity;

  @CreateDateColumn()
  createdAt: Date;
}
