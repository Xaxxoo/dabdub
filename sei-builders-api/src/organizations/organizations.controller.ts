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
import { OrganizationsService } from './organizations.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ParseUUIDPipe } from '../common/pipes/parse-uuid.pipe';
import { UserEntity } from '../users/entities/user.entity';
import { IsPublic } from '../common/decorators/is-public.decorator';

@ApiTags('Organizations')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly orgsService: OrganizationsService) {}

  @IsPublic()
  @Get()
  @ApiOperation({ summary: 'List all organizations' })
  findAll(@Query() pagination: PaginationDto) {
    return this.orgsService.findAll(pagination);
  }

  @IsPublic()
  @Get(':id')
  @ApiOperation({ summary: 'Get organization by ID' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.orgsService.findById(id);
  }

  @IsPublic()
  @Get('slug/:slug')
  @ApiOperation({ summary: 'Get organization by slug' })
  findBySlug(@Param('slug') slug: string) {
    return this.orgsService.findBySlug(slug);
  }

  @Post()
  @Roles('MAINTAINER', 'ADMIN')
  @ApiOperation({ summary: 'Create a new organization' })
  create(
    @Body() dto: CreateOrganizationDto,
    @CurrentUser() user: UserEntity,
  ) {
    return this.orgsService.create(dto, user.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update organization' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: Partial<CreateOrganizationDto>,
    @CurrentUser() user: UserEntity,
  ) {
    return this.orgsService.update(id, dto, user.id);
  }

  @Get(':id/members')
  @ApiOperation({ summary: 'Get organization members' })
  getMembers(@Param('id', ParseUUIDPipe) id: string) {
    return this.orgsService.getMembers(id);
  }

  @Patch(':id/suspend')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Suspend organization (admin)' })
  suspend(@Param('id', ParseUUIDPipe) id: string) {
    return this.orgsService.suspend(id);
  }

  @Patch(':id/reinstate')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Reinstate organization (admin)' })
  reinstate(@Param('id', ParseUUIDPipe) id: string) {
    return this.orgsService.reinstate(id);
  }
}
