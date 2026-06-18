import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ContributorProfileEntity } from './contributor-profile.entity';

@Entity('skills')
export class SkillEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;

  @Column({ unique: true })
  slug: string;

  @Column({ nullable: true })
  category: string; // language, framework, tool, concept

  @Column({ default: 0 })
  usageCount: number;

  @ManyToMany(() => ContributorProfileEntity, (profile) => profile.skills)
  contributors: ContributorProfileEntity[];

  @CreateDateColumn()
  createdAt: Date;
}
