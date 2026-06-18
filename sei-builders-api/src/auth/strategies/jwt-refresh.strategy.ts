import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtRefreshPayload } from '../interfaces/jwt-payload.interface';
import { RefreshTokenEntity } from '../entities/refresh-token.entity';
import { UserEntity, UserStatus } from '../../users/entities/user.entity';
import { COOKIE_NAMES } from '../../common/constants/app.constants';
import { hashToken } from '../../common/utils/crypto.util';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(
    config: ConfigService,
    @InjectRepository(RefreshTokenEntity)
    private readonly tokenRepo: Repository<RefreshTokenEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        // Prefer httpOnly cookie
        (req: Request) => req?.cookies?.[COOKIE_NAMES.REFRESH_TOKEN] ?? null,
        // Fall back to request body (for mobile clients)
        ExtractJwt.fromBodyField('refreshToken'),
      ]),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('jwt.refreshSecret'),
      passReqToCallback: true,
    });
  }

  async validate(
    req: Request,
    payload: JwtRefreshPayload,
  ): Promise<{ user: UserEntity; tokenEntity: RefreshTokenEntity }> {
    const rawJwt =
      req.cookies?.[COOKIE_NAMES.REFRESH_TOKEN] ?? req.body?.refreshToken;

    if (!rawJwt) {
      throw new UnauthorizedException('Refresh token not provided');
    }

    const tokenEntity = await this.tokenRepo.findOne({
      where: { id: payload.tokenId },
    });

    if (!tokenEntity) {
      throw new UnauthorizedException('Refresh token not found');
    }

    // Verify the stored hash matches this JWT (prevents DB token substitution)
    if (tokenEntity.tokenHash !== hashToken(rawJwt)) {
      throw new UnauthorizedException('Refresh token mismatch');
    }

    if (!tokenEntity.isValid) {
      throw new UnauthorizedException('Refresh token is revoked or expired');
    }

    if (tokenEntity.userId !== payload.sub) {
      throw new UnauthorizedException('Token user mismatch');
    }

    const user = await this.userRepo.findOne({
      where: { id: payload.sub },
      relations: ['userRoles', 'userRoles.role', 'userRoles.role.permissions'],
    });

    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('User not found or inactive');
    }

    return { user, tokenEntity };
  }
}
