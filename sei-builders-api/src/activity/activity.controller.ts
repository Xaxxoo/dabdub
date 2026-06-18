import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ActivityService } from './activity.service';
import { PaginationDto } from '../common/dto/pagination.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { IsPublic } from '../common/decorators/is-public.decorator';

@ApiTags('Activity')
@UseGuards(JwtAuthGuard)
@Controller('activity')
export class ActivityController {
  constructor(private readonly activityService: ActivityService) {}

  @IsPublic()
  @Get()
  @ApiOperation({ summary: 'Get global activity feed' })
  findAll(
    @Query() pagination: PaginationDto,
    @Query('eventType') eventType?: string,
    @Query('organizationId') organizationId?: string,
    @Query('projectId') projectId?: string,
  ) {
    return this.activityService.findAll(pagination, {
      eventType,
      organizationId,
      projectId,
    });
  }
}
