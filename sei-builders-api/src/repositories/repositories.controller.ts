import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { RepositoriesService } from './repositories.service';
import { ConnectRepositoryDto, DisconnectRepositoryDto } from './dto/connect-repository.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { ParseUUIDPipe } from '../common/pipes/parse-uuid.pipe';
import { IsPublic } from '../common/decorators/is-public.decorator';

@ApiTags('Repositories')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('repositories')
export class RepositoriesController {
  constructor(private readonly reposService: RepositoriesService) {}

  // ─── Public reads ──────────────────────────────────────────────────────────

  @IsPublic()
  @Get()
  @ApiQuery({ name: 'organizationId', required: false })
  @ApiOperation({ summary: 'List repositories' })
  findAll(
    @Query() pagination: PaginationDto,
    @Query('organizationId') organizationId?: string,
  ) {
    return this.reposService.findAll(pagination, organizationId);
  }

  @IsPublic()
  @Get(':id')
  @ApiOperation({ summary: 'Get repository by ID' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.reposService.findById(id);
  }

  @IsPublic()
  @Get(':id/issues')
  @ApiQuery({ name: 'state', required: false, description: 'open | closed' })
  @ApiOperation({ summary: 'Get synced issues for a repository' })
  getIssues(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('state') state?: string,
  ) {
    return this.reposService.getIssues(id, state ? { state } : {});
  }

  @IsPublic()
  @Get(':id/pull-requests')
  @ApiQuery({ name: 'state', required: false, description: 'open | closed | merged' })
  @ApiOperation({ summary: 'Get synced pull requests for a repository' })
  getPullRequests(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('state') state?: string,
  ) {
    return this.reposService.getPullRequests(id, state ? { state } : {});
  }

  @IsPublic()
  @Get(':id/languages')
  @ApiOperation({ summary: 'Get language breakdown for a repository' })
  getLanguages(@Param('id', ParseUUIDPipe) id: string) {
    return this.reposService.getLanguages(id);
  }

  @IsPublic()
  @Get(':id/contributors')
  @ApiQuery({ name: 'limit', required: false })
  @ApiOperation({ summary: 'Get top contributors for a repository' })
  getContributors(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('limit') limit?: number,
  ) {
    return this.reposService.getContributors(id, limit);
  }

  @IsPublic()
  @Get(':id/syncs')
  @ApiQuery({ name: 'limit', required: false })
  @ApiOperation({ summary: 'Get sync history for a repository' })
  getSyncHistory(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('limit') limit?: number,
  ) {
    return this.reposService.getSyncHistory(id, limit);
  }

  // ─── Mutations ────────────────────────────────────────────────────────────

  @Post()
  @ApiOperation({ summary: 'Connect a GitHub repository to the platform' })
  connect(@Body() dto: ConnectRepositoryDto) {
    return this.reposService.connect(dto);
  }

  @Post(':id/sync')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiQuery({ name: 'full', required: false, description: 'Force full sync' })
  @ApiOperation({ summary: 'Trigger a sync for a repository' })
  async triggerSync(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('full') full?: string,
  ) {
    await this.reposService.triggerSync(id, full === 'true');
    return { queued: true };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Disconnect a repository from the platform' })
  disconnect(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DisconnectRepositoryDto,
  ) {
    return this.reposService.disconnect(id, dto.purgeData ?? false);
  }
}
