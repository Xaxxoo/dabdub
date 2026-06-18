import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity, UserStatus } from './entities/user.entity';
import { UpdateUserDto } from './dto/update-user.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { buildPaginatedResult } from '../common/utils/pagination.util';
import { CacheService } from '../cache/cache.service';
import { CACHE_KEYS, CACHE_TTL } from '../common/constants/cache.constants';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
    private readonly cache: CacheService,
  ) {}

  async findAll(pagination: PaginationDto) {
    const qb = this.userRepo
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.userRoles', 'userRole')
      .leftJoinAndSelect('userRole.role', 'role')
      .where('user.deletedAt IS NULL');

    if (pagination.search) {
      qb.andWhere(
        '(user.username ILIKE :search OR user.email ILIKE :search OR user.fullName ILIKE :search)',
        { search: `%${pagination.search}%` },
      );
    }

    const sortField = pagination.sortBy ?? 'createdAt';
    const sortOrder = pagination.sortOrder ?? 'DESC';
    qb.orderBy(`user.${sortField}`, sortOrder as 'ASC' | 'DESC');
    qb.skip(pagination.skip).take(pagination.limit);

    const [data, total] = await qb.getManyAndCount();
    return buildPaginatedResult(data, total, pagination);
  }

  async findById(id: string): Promise<UserEntity> {
    const cacheKey = CACHE_KEYS.USER(id);
    return this.cache.getOrSet(
      cacheKey,
      async () => {
        const user = await this.userRepo.findOne({
          where: { id },
          relations: ['userRoles', 'userRoles.role', 'userRoles.role.permissions'],
        });
        if (!user) throw new NotFoundException(`User ${id} not found`);
        return user;
      },
      CACHE_TTL.USER,
    );
  }

  async findBySlug(slug: string): Promise<UserEntity> {
    const user = await this.userRepo.findOne({
      where: { slug },
      relations: ['userRoles', 'userRoles.role'],
    });
    if (!user) throw new NotFoundException(`User @${slug} not found`);
    return user;
  }

  async update(id: string, dto: UpdateUserDto): Promise<UserEntity> {
    const user = await this.findById(id);
    Object.assign(user, dto);
    const saved = await this.userRepo.save(user);
    await this.cache.del(CACHE_KEYS.USER(id));
    return saved;
  }

  async suspend(id: string): Promise<UserEntity> {
    const user = await this.findById(id);
    if (user.isSuperAdmin) {
      throw new ConflictException('Cannot suspend a super admin');
    }
    await this.userRepo.update(id, { status: UserStatus.SUSPENDED });
    await this.cache.del(CACHE_KEYS.USER(id));
    return this.findById(id);
  }

  async reinstate(id: string): Promise<UserEntity> {
    await this.userRepo.update(id, { status: UserStatus.ACTIVE });
    await this.cache.del(CACHE_KEYS.USER(id));
    return this.findById(id);
  }

  async softDelete(id: string): Promise<void> {
    await this.userRepo.softDelete(id);
    await this.cache.del(CACHE_KEYS.USER(id));
  }
}
