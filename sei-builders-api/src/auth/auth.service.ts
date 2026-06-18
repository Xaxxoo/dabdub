import {
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { UserEntity, OnboardingStatus, UserStatus } from '../users/entities/user.entity';
import { RefreshTokenEntity } from './entities/refresh-token.entity';
import { SessionEntity } from './entities/session.entity';
import { RoleEntity } from '../users/entities/role.entity';
import { UserRoleEntity } from '../users/entities/user-role.entity';
import {
  hashPassword,
  comparePassword,
  encrypt,
  hashToken,
} from '../common/utils/crypto.util';
import { generateUniqueSlug } from '../common/utils/slug.util';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AuthTokens, AuthResponse } from './types/auth-tokens.type';
import { JwtPayload, JwtRefreshPayload } from './interfaces/jwt-payload.interface';
import { GithubOAuthUser } from './strategies/github.strategy';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
    @InjectRepository(RefreshTokenEntity)
    private readonly refreshTokenRepo: Repository<RefreshTokenEntity>,
    @InjectRepository(SessionEntity)
    private readonly sessionRepo: Repository<SessionEntity>,
    @InjectRepository(RoleEntity)
    private readonly roleRepo: Repository<RoleEntity>,
    @InjectRepository(UserRoleEntity)
    private readonly userRoleRepo: Repository<UserRoleEntity>,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly dataSource: DataSource,
  ) {}

  async register(dto: RegisterDto, ip?: string): Promise<AuthResponse> {
    const existingEmail = await this.userRepo.findOne({ where: { email: dto.email } });
    if (existingEmail) throw new ConflictException('Email already registered');

    const existingUsername = await this.userRepo.findOne({ where: { username: dto.username } });
    if (existingUsername) throw new ConflictException('Username already taken');

    const slug = await generateUniqueSlug(dto.username, async (s) =>
      !!(await this.userRepo.findOne({ where: { slug: s } })),
    );

    const passwordHash = await hashPassword(dto.password);
    const defaultRole = await this.roleRepo.findOne({ where: { isDefault: true } });

    return this.dataSource.transaction(async (manager) => {
      const user = manager.create(UserEntity, {
        email: dto.email,
        username: dto.username,
        slug,
        fullName: dto.fullName,
        passwordHash,
        onboardingStatus: OnboardingStatus.NOT_STARTED,
      });
      await manager.save(UserEntity, user);

      if (defaultRole) {
        await manager.save(UserRoleEntity,
          manager.create(UserRoleEntity, { userId: user.id, roleId: defaultRole.id }),
        );
      }

      const savedUser = await manager.findOneOrFail(UserEntity, {
        where: { id: user.id },
        relations: ['userRoles', 'userRoles.role', 'userRoles.role.permissions'],
      });

      const tokens = await this.generateTokens(savedUser, { ip });
      return this.buildAuthResponse(savedUser, tokens);
    });
  }

  async login(dto: LoginDto, ip?: string, userAgent?: string): Promise<AuthResponse> {
    const user = await this.userRepo.findOne({
      where: { email: dto.email },
      relations: ['userRoles', 'userRoles.role', 'userRoles.role.permissions'],
    });

    if (!user || !(await comparePassword(dto.password, user.passwordHash ?? ''))) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException(`Account is ${user.status}`);
    }

    await this.userRepo.update(user.id, {
      lastLoginAt: new Date(),
      ...(ip && { lastLoginIp: ip }),
    });

    const tokens = await this.generateTokens(user, { ip, userAgent });
    return this.buildAuthResponse(user, tokens);
  }

  async githubCallback(githubUser: GithubOAuthUser, ip?: string): Promise<AuthResponse> {
    let user: UserEntity | null = await this.userRepo.findOne({
      where: { githubId: githubUser.githubId },
      relations: ['userRoles', 'userRoles.role', 'userRoles.role.permissions'],
    });

    if (!user && githubUser.email) {
      user = await this.userRepo.findOne({
        where: { email: githubUser.email },
        relations: ['userRoles', 'userRoles.role', 'userRoles.role.permissions'],
      });
    }

    const encryptedToken = githubUser.accessToken
      ? encrypt(
          githubUser.accessToken,
          this.config.get<string>('encryption.key') ?? '',
          this.config.get<string>('encryption.iv') ?? '',
        )
      : undefined;

    if (!user) {
      const username = await this.resolveUniqueUsername(githubUser.githubUsername);
      const slug = await generateUniqueSlug(username, async (s) =>
        !!(await this.userRepo.findOne({ where: { slug: s } })),
      );
      const defaultRole = await this.roleRepo.findOne({ where: { isDefault: true } });

      user = await this.dataSource.transaction(async (manager) => {
        const newUser = manager.create(UserEntity, {
          email: githubUser.email ?? undefined,
          username,
          slug,
          fullName: githubUser.fullName ?? undefined,
          avatarUrl: githubUser.avatarUrl ?? undefined,
          githubId: githubUser.githubId,
          githubUsername: githubUser.githubUsername,
          githubAccessTokenEncrypted: encryptedToken,
          emailVerified: !!githubUser.email,
          onboardingStatus: OnboardingStatus.NOT_STARTED,
        });
        await manager.save(UserEntity, newUser);

        if (defaultRole) {
          await manager.save(UserRoleEntity,
            manager.create(UserRoleEntity, { userId: newUser.id, roleId: defaultRole.id }),
          );
        }

        return manager.findOneOrFail(UserEntity, {
          where: { id: newUser.id },
          relations: ['userRoles', 'userRoles.role', 'userRoles.role.permissions'],
        });
      });
    } else {
      await this.userRepo.update(user.id, {
        githubId: githubUser.githubId,
        githubUsername: githubUser.githubUsername,
        ...(encryptedToken && { githubAccessTokenEncrypted: encryptedToken }),
        lastLoginAt: new Date(),
        ...(ip && { lastLoginIp: ip }),
      });
    }

    const tokens = await this.generateTokens(user, { ip });
    return this.buildAuthResponse(user, tokens);
  }

  async refreshTokens(
    user: UserEntity,
    tokenEntity: RefreshTokenEntity,
    ip?: string,
    userAgent?: string,
  ): Promise<AuthTokens> {
    await this.refreshTokenRepo.update(tokenEntity.id, {
      isRevoked: true,
      revokedAt: new Date(),
    });
    return this.generateTokens(user, { ip, userAgent });
  }

  async logout(userId: string): Promise<void> {
    await this.refreshTokenRepo.update(
      { userId, isRevoked: false },
      { isRevoked: true, revokedAt: new Date() },
    );
  }

  async logoutAll(userId: string): Promise<void> {
    await this.refreshTokenRepo.update(
      { userId },
      { isRevoked: true, revokedAt: new Date() },
    );
    await this.sessionRepo.update(
      { userId, isActive: true },
      { isActive: false, terminatedAt: new Date(), terminationReason: 'logout_all' },
    );
  }

  // ─── Private ─────────────────────────────────────────────────────────────────

  private async generateTokens(
    user: UserEntity,
    options: { ip?: string; userAgent?: string } = {},
  ): Promise<AuthTokens> {
    const accessExpiresIn = this.config.get<number>('jwt.accessExpiresIn') ?? 900;
    const refreshExpiresIn = this.config.get<number>('jwt.refreshExpiresIn') ?? 604800;
    const jwtSecret = this.config.get<string>('jwt.secret') ?? '';
    const refreshSecret = this.config.get<string>('jwt.refreshSecret') ?? '';

    // Create placeholder entity to get an ID for the JWT payload
    const expiresAt = new Date(Date.now() + refreshExpiresIn * 1000);
    const tokenEntity = await this.refreshTokenRepo.save(
      this.refreshTokenRepo.create({
        userId: user.id,
        tokenHash: 'pending',
        expiresAt,
        ipAddress: options.ip,
        userAgent: options.userAgent,
      }),
    );

    const accessPayload: JwtPayload = {
      sub: user.id,
      email: user.email ?? '',
      username: user.username,
      roles: user.roles,
    };

    const refreshPayload: JwtRefreshPayload = {
      sub: user.id,
      tokenId: tokenEntity.id,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(accessPayload, {
        expiresIn: `${accessExpiresIn}s`,
        secret: jwtSecret,
      }),
      this.jwtService.signAsync(refreshPayload, {
        expiresIn: `${refreshExpiresIn}s`,
        secret: refreshSecret,
      }),
    ]);

    // Replace placeholder with actual hash of the signed refresh JWT
    await this.refreshTokenRepo.update(tokenEntity.id, {
      tokenHash: hashToken(refreshToken),
    });

    return {
      accessToken,
      refreshToken,
      accessTokenExpiresIn: accessExpiresIn,
      refreshTokenExpiresIn: refreshExpiresIn,
    };
  }

  private buildAuthResponse(user: UserEntity, tokens: AuthTokens): AuthResponse {
    return {
      user: {
        id: user.id,
        email: user.email ?? '',
        username: user.username,
        fullName: user.fullName ?? '',
        avatarUrl: user.avatarUrl ?? '',
        roles: user.roles,
        onboardingStatus: user.onboardingStatus,
      },
      tokens,
    };
  }

  private async resolveUniqueUsername(base: string): Promise<string> {
    let candidate = base.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 25);
    let suffix = 0;
    while (await this.userRepo.findOne({ where: { username: candidate } })) {
      suffix++;
      candidate = `${base.slice(0, 22)}_${suffix}`;
    }
    return candidate;
  }
}
