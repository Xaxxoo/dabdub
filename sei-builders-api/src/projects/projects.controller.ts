import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { ConnectProjectRepositoryDto } from './dto/connect-repository.dto';
import { UpdateContributionSettingsDto } from './dto/update-contribution-settings.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ParseUUIDPipe } from '../common/pipes/parse-uuid.pipe';
import { UserEntity } from '../users/entities/user.entity';
import { IsPublic } from '../common/decorators/is-public.decorator';

@ApiTags('Projects')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  // ─── Public reads ──────────────────────────────────────────────────────────

  @IsPublic()
  @Get()
  @ApiOperation({ summary: 'List all active projects' })
  findAll(@Query() pagination: PaginationDto) {
    return this.projectsService.findAll(pagination);
  }

  @IsPublic()
  @Get('slug/:slug')
  @ApiOperation({ summary: 'Get project by slug' })
  findBySlug(@Param('slug') slug: string) {
    return this.projectsService.findBySlug(slug);
  }

  @IsPublic()
  @Get(':id')
  @ApiOperation({ summary: 'Get project by ID' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.projectsService.findById(id);
  }

  @IsPublic()
  @Get(':id/repositories')
  @ApiOperation({ summary: 'List repositories connected to this project' })
  getRepositories(@Param('id', ParseUUIDPipe) id: string) {
    return this.projectsService.getRepositories(id);
  }

  // ─── Mutations ────────────────────────────────────────────────────────────

  @Post()
  @Roles('MAINTAINER', 'ADMIN')
  @ApiOperation({ summary: 'Create a new project' })
  create(
    @Body() dto: CreateProjectDto,
    @CurrentUser() user: UserEntity,
  ) {
    return this.projectsService.create(dto, user.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update project' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: Partial<CreateProjectDto>,
    @CurrentUser() user: UserEntity,
  ) {
    return this.projectsService.update(id, dto, user.id);
  }

  @Patch(':id/contribution-settings')
  @ApiOperation({ summary: 'Update contribution settings' })
  updateContributionSettings(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateContributionSettingsDto,
    @CurrentUser() user: UserEntity,
  ) {
    return this.projectsService.updateContributionSettings(id, dto, user.id);
  }

  @Patch(':id/publish')
  @ApiOperation({ summary: 'Publish project' })
  publish(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: UserEntity,
  ) {
    return this.projectsService.publish(id, user.id);
  }

  @Patch(':id/archive')
  @ApiOperation({ summary: 'Archive project' })
  archive(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: UserEntity,
  ) {
    return this.projectsService.archive(id, user.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete project' })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: UserEntity,
  ) {
    return this.projectsService.softDelete(id, user.id);
  }

  // ─── Repository connections ────────────────────────────────────────────────

  @Post(':id/repositories')
  @ApiOperation({ summary: 'Connect a repository to this project' })
  connectRepository(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ConnectProjectRepositoryDto,
    @CurrentUser() user: UserEntity,
  ) {
    return this.projectsService.connectRepository(id, dto, user.id);
  }

  @Delete(':id/repositories/:repositoryId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Disconnect a repository from this project' })
  disconnectRepository(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('repositoryId', ParseUUIDPipe) repositoryId: string,
    @CurrentUser() user: UserEntity,
  ) {
    return this.projectsService.disconnectRepository(id, repositoryId, user.id);
  }
}
