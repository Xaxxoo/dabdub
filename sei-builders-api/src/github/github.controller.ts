import {
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  RawBodyRequest,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { GithubService } from './github.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { IsPublic } from '../common/decorators/is-public.decorator';

@ApiTags('GitHub')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('github')
export class GithubController {
  constructor(private readonly githubService: GithubService) {}

  /**
   * GitHub App webhook endpoint — must be public (no auth)
   */
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

  @Get('installations')
  @ApiOperation({ summary: 'Get GitHub App installations for an organization' })
  getInstallations(@Query('organizationId') organizationId: string) {
    return this.githubService.getInstallations(organizationId);
  }

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
