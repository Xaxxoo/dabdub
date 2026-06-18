import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  RawBodyRequest,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { GithubService } from './github.service';
import { ConnectInstallationDto, SyncOrganizationDto } from './dto/connect-installation.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ParseUUIDPipe } from '../common/pipes/parse-uuid.pipe';
import { UserEntity } from '../users/entities/user.entity';
import { IsPublic } from '../common/decorators/is-public.decorator';

@ApiTags('GitHub')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('github')
export class GithubController {
  constructor(private readonly githubService: GithubService) {}

  // ─── Webhook (public) ────────────────────────────────────────────────────

  @IsPublic()
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Receive GitHub App webhook' })
  async receiveWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-github-delivery') deliveryId: string,
    @Headers('x-github-event') eventType: string,
    @Headers('x-hub-signature-256') signature: string,
  ) {
    const rawBody = req.rawBody?.toString('utf-8') ?? JSON.stringify(req.body);
    const payload = req.body as Record<string, unknown>;

    await this.githubService.receiveWebhook(
      deliveryId,
      eventType,
      payload,
      signature,
      rawBody,
    );

    return { received: true };
  }

  // ─── Account connection ───────────────────────────────────────────────────

  @Post('connect')
  @ApiOperation({ summary: 'Connect a GitHub account via OAuth token' })
  connectAccount(
    @Body('token') token: string,
    @CurrentUser() user: UserEntity,
  ) {
    return this.githubService.connectAccount(token, user.id);
  }

  @Delete('connect')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Disconnect the connected GitHub account' })
  disconnectAccount(@CurrentUser() user: UserEntity) {
    return this.githubService.disconnectAccount(user.id);
  }

  @Get('account')
  @ApiOperation({ summary: "Get current user's connected GitHub account" })
  getAccount(@CurrentUser() user: UserEntity) {
    return this.githubService.getAccountForUser(user.id);
  }

  // ─── User GitHub data ────────────────────────────────────────────────────

  @Get('repositories')
  @ApiOperation({ summary: "List the authenticated user's GitHub repositories" })
  getUserRepositories(@CurrentUser() user: UserEntity) {
    return this.githubService.getUserRepositories(user.id);
  }

  @Get('organizations')
  @ApiOperation({ summary: "List the authenticated user's GitHub organizations" })
  getUserOrganizations(@CurrentUser() user: UserEntity) {
    return this.githubService.getUserOrganizations(user.id);
  }

  // ─── Installations ────────────────────────────────────────────────────────

  @Get('installations')
  @ApiOperation({ summary: 'Get GitHub App installations for an organization' })
  getInstallations(@Query('organizationId') organizationId: string) {
    return this.githubService.getInstallations(organizationId);
  }

  @Post('installations/connect')
  @ApiOperation({ summary: 'Connect a GitHub App installation to a platform organization' })
  connectInstallation(@Body() dto: ConnectInstallationDto) {
    return this.githubService.upsertInstallation({
      installationId: dto.installationId,
      organizationId: dto.organizationId,
      status: 'active',
    } as any);
  }

  // ─── Org sync ─────────────────────────────────────────────────────────────

  @Post('orgs/sync')
  @ApiOperation({ summary: 'Sync a GitHub organization to the platform' })
  syncOrganization(
    @Body() dto: SyncOrganizationDto,
    @CurrentUser() user: UserEntity,
  ) {
    return this.githubService.syncOrganization(
      dto.orgLogin,
      dto.organizationId,
    );
  }

  @Post('orgs/:githubOrgId/teams/sync')
  @ApiOperation({ summary: 'Sync GitHub teams for an organization' })
  async syncTeams(
    @Param('githubOrgId') githubOrgId: string,
    @Body('orgLogin') orgLogin: string,
    @Body('token') token: string,
  ) {
    return this.githubService.syncOrganizationTeams(orgLogin, githubOrgId, token);
  }

  // ─── Webhook events (admin) ──────────────────────────────────────────────

  @Get('webhook-events')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'List webhook events (admin)' })
  getWebhookEvents(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('status') status?: string,
  ) {
    return this.githubService.getWebhookEvents({
      skip: (page - 1) * limit,
      take: limit,
      status: status as any,
    });
  }
}
