import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ContributorProfileEntity } from './entities/contributor-profile.entity';
import { SkillEntity } from './entities/skill.entity';
import { PaginationDto } from '../common/dto/pagination.dto';
import { buildPaginatedResult } from '../common/utils/pagination.util';
import { CacheService } from '../cache/cache.service';
import { CACHE_KEYS, CACHE_TTL } from '../common/constants/cache.constants';
import { generateSlug } from '../common/utils/slug.util';

@Injectable()
export class ContributorsService {
  constructor(
    @InjectRepository(ContributorProfileEntity)
    private readonly profileRepo: Repository<ContributorProfileEntity>,
    @InjectRepository(SkillEntity)
    private readonly skillRepo: Repository<SkillEntity>,
    private readonly cache: CacheService,
  ) {}

  async getOrCreateProfile(userId: string): Promise<ContributorProfileEntity> {
    let profile = await this.profileRepo.findOne({
      where: { userId },
      relations: ['skills', 'user'],
    });

    if (!profile) {
      profile = await this.profileRepo.save(
        this.profileRepo.create({ userId }),
      );
    }

    return profile;
  }

  async findAll(pagination: PaginationDto) {
    const qb = this.profileRepo
      .createQueryBuilder('profile')
      .leftJoinAndSelect('profile.user', 'user')
      .leftJoinAndSelect('profile.skills', 'skills')
      .where('user.deletedAt IS NULL');

    if (pagination.search) {
      qb.andWhere(
        '(user.username ILIKE :search OR user.fullName ILIKE :search)',
        { search: `%${pagination.search}%` },
      );
    }

    qb.orderBy('profile.reputationScore', 'DESC')
      .skip(pagination.skip)
      .take(pagination.limit);

    const [data, total] = await qb.getManyAndCount();
    return buildPaginatedResult(data, total, pagination);
  }

  async findByUserId(userId: string): Promise<ContributorProfileEntity> {
    return this.cache.getOrSet(
      CACHE_KEYS.CONTRIBUTOR(userId),
      async () => {
        const profile = await this.profileRepo.findOne({
          where: { userId },
          relations: ['skills', 'user'],
        });
        if (!profile) throw new NotFoundException(`Contributor profile not found`);
        return profile;
      },
      CACHE_TTL.CONTRIBUTOR,
    );
  }

  async update(
    userId: string,
    dto: Partial<ContributorProfileEntity>,
  ): Promise<ContributorProfileEntity> {
    await this.getOrCreateProfile(userId);
    const { skills, user, ...updateData } = dto as any;
    await this.profileRepo.update({ userId }, updateData);
    await this.cache.del(CACHE_KEYS.CONTRIBUTOR(userId));
    return this.findByUserId(userId);
  }

  async getSkills(search?: string): Promise<SkillEntity[]> {
    const qb = this.skillRepo
      .createQueryBuilder('skill')
      .orderBy('skill.usageCount', 'DESC');

    if (search) {
      qb.where('skill.name ILIKE :search', { search: `%${search}%` });
    }

    return qb.limit(50).getMany();
  }

  async addSkill(userId: string, skillName: string): Promise<ContributorProfileEntity> {
    const profile = await this.getOrCreateProfile(userId);
    const slug = generateSlug(skillName);

    let skill = await this.skillRepo.findOne({ where: { slug } });
    if (!skill) {
      skill = await this.skillRepo.save(
        this.skillRepo.create({ name: skillName, slug }),
      );
    }

    const alreadyHas = profile.skills?.some((s) => s.id === skill.id);
    if (!alreadyHas) {
      profile.skills = [...(profile.skills ?? []), skill];
      await this.profileRepo.save(profile);
      await this.skillRepo.increment({ id: skill.id }, 'usageCount', 1);
    }

    await this.cache.del(CACHE_KEYS.CONTRIBUTOR(userId));
    return this.findByUserId(userId);
  }

  async removeSkill(userId: string, skillId: string): Promise<void> {
    const profile = await this.getOrCreateProfile(userId);
    profile.skills = profile.skills?.filter((s) => s.id !== skillId) ?? [];
    await this.profileRepo.save(profile);
    await this.skillRepo.decrement({ id: skillId }, 'usageCount', 1);
    await this.cache.del(CACHE_KEYS.CONTRIBUTOR(userId));
  }
}
