import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { AnalyticsService, AnalyticsPeriod } from './analytics.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ParseUUIDPipe } from '../common/pipes/parse-uuid.pipe';
import { IsPublic } from '../common/decorators/is-public.decorator';

@ApiTags('Analytics')
@UseGuards(JwtAuthGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @IsPublic()
  @Get('platform')
  @ApiQuery({ name: 'period', enum: ['7d', '30d', '90d'], required: false })
  @ApiOperation({ summary: 'Get platform-wide analytics stats' })
  getPlatformStats(@Query('period') period?: AnalyticsPeriod) {
    return this.analyticsService.getPlatformStats(period ?? '30d');
  }

  @Get('organizations/:id')
  @ApiQuery({ name: 'period', enum: ['7d', '30d', '90d'], required: false })
  @ApiOperation({ summary: 'Get analytics for an organization' })
  getOrgStats(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('period') period?: AnalyticsPeriod,
  ) {
    return this.analyticsService.getOrganizationStats(id, period ?? '30d');
  }
}
