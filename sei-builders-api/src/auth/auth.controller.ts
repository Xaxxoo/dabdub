import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Ip,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard';
import { GithubOAuthGuard } from './guards/github-oauth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { IsPublic } from '../common/decorators/is-public.decorator';
import { UserEntity } from '../users/entities/user.entity';
import { RefreshTokenEntity } from './entities/refresh-token.entity';
import { COOKIE_NAMES, TOKEN_TYPES } from '../common/constants/app.constants';
import { ConfigService } from '@nestjs/config';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
  ) {}

  @IsPublic()
  @Post('register')
  @ApiOperation({ summary: 'Register a new account' })
  async register(
    @Body() dto: RegisterDto,
    @Ip() ip: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.register(dto, ip);
    this.setRefreshTokenCookie(res, result.tokens.refreshToken);
    return { ...result, tokens: { ...result.tokens, refreshToken: undefined } };
  }

  @IsPublic()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email and password' })
  async login(
    @Body() dto: LoginDto,
    @Ip() ip: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(
      dto,
      ip,
      req.headers['user-agent'],
    );
    this.setRefreshTokenCookie(res, result.tokens.refreshToken);
    return { ...result, tokens: { ...result.tokens, refreshToken: undefined } };
  }

  @IsPublic()
  @Get('github')
  @UseGuards(GithubOAuthGuard)
  @ApiOperation({ summary: 'Initiate GitHub OAuth flow' })
  githubLogin() {
    // Handled by Passport
  }

  @IsPublic()
  @Get('github/callback')
  @UseGuards(GithubOAuthGuard)
  @ApiOperation({ summary: 'GitHub OAuth callback' })
  async githubCallback(
    @Req() req: Request,
    @Ip() ip: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.githubCallback(req.user as any, ip);
    this.setRefreshTokenCookie(res, result.tokens.refreshToken);

    // Redirect to frontend with access token as query param (or to a callback page)
    const frontendUrl = this.config.get<string>('app.frontendUrl') ?? 'http://localhost:3000';
    res.redirect(
      `${frontendUrl}/auth/callback?token=${result.tokens.accessToken}`,
    );
  }

  @UseGuards(JwtRefreshGuard)
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Rotate refresh token and issue new access token' })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { user, tokenEntity } = req.user as {
      user: UserEntity;
      tokenEntity: RefreshTokenEntity;
    };
    const tokens = await this.authService.refreshTokens(
      user,
      tokenEntity,
      req.ip,
      req.headers['user-agent'],
    );
    this.setRefreshTokenCookie(res, tokens.refreshToken);
    return { accessToken: tokens.accessToken, expiresIn: tokens.accessTokenExpiresIn };
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Logout current session' })
  async logout(
    @Req() req: Request,
    @CurrentUser() user: UserEntity,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = req.cookies?.[COOKIE_NAMES.REFRESH_TOKEN];
    // Extract tokenId from cookie if present — service handles revocation
    await this.authService.logout(user.id);
    this.clearRefreshTokenCookie(res);
  }

  @Post('logout-all')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Logout all sessions for current user' })
  async logoutAll(
    @CurrentUser() user: UserEntity,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.authService.logoutAll(user.id);
    this.clearRefreshTokenCookie(res);
  }

  @Get('me')
  @ApiOperation({ summary: 'Get current authenticated user' })
  getMe(@CurrentUser() user: UserEntity) {
    return user;
  }

  // ─── Cookie helpers ──────────────────────────────────────────────────────────

  private setRefreshTokenCookie(res: Response, token: string): void {
    const maxAge =
      (this.config.get<number>('jwt.refreshExpiresIn') ?? 604800) * 1000;
    res.cookie(COOKIE_NAMES.REFRESH_TOKEN, token, {
      httpOnly: true,
      secure: this.config.get<string>('app.env') === 'production',
      sameSite: 'lax',
      maxAge,
      path: '/api/v1/auth',
    });
  }

  private clearRefreshTokenCookie(res: Response): void {
    res.clearCookie(COOKIE_NAMES.REFRESH_TOKEN, { path: '/api/v1/auth' });
  }
}
