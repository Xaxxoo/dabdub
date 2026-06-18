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
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { OpportunitiesService } from './opportunities.service';
import { CreateOpportunityDto } from './dto/create-opportunity.dto';
import { AssignOpportunityDto } from './dto/assign-opportunity.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ParseUUIDPipe } from '../common/pipes/parse-uuid.pipe';
import { UserEntity } from '../users/entities/user.entity';
import { IsPublic } from '../common/decorators/is-public.decorator';

@ApiTags('Opportunities')
@UseGuards(JwtAuthGuard)
@Controller('opportunities')
export class OpportunitiesController {
  constructor(private readonly oppsService: OpportunitiesService) {}

  @IsPublic()
  @Get()
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'projectId', required: false })
  @ApiOperation({ summary: 'List opportunities' })
  findAll(
    @Query() pagination: PaginationDto,
    @Query('type') type?: string,
    @Query('status') status?: string,
    @Query('projectId') projectId?: string,
  ) {
    return this.oppsService.findAll(pagination, { type, status, projectId });
  }

  @IsPublic()
  @Get(':id')
  @ApiOperation({ summary: 'Get opportunity by ID' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.oppsService.findById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create an opportunity' })
  create(
    @Body() dto: CreateOpportunityDto,
    @CurrentUser() user: UserEntity,
  ) {
    return this.oppsService.create(dto, user.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update opportunity' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: Partial<CreateOpportunityDto>,
    @CurrentUser() user: UserEntity,
  ) {
    return this.oppsService.update(id, dto, user.id);
  }

  @Patch(':id/close')
  @ApiOperation({ summary: 'Close opportunity' })
  close(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: UserEntity,
  ) {
    return this.oppsService.close(id, user.id);
  }

  @Patch(':id/reopen')
  @ApiOperation({ summary: 'Reopen opportunity' })
  reopen(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: UserEntity,
  ) {
    return this.oppsService.reopen(id, user.id);
  }

  @Post(':id/assign')
  @ApiOperation({ summary: 'Assign opportunity to a user' })
  assign(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignOpportunityDto,
    @CurrentUser() user: UserEntity,
  ) {
    return this.oppsService.assign(id, dto, user.id);
  }

  @Post(':id/unassign')
  @ApiOperation({ summary: 'Unassign opportunity (back to open)' })
  unassign(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: UserEntity,
  ) {
    return this.oppsService.unassign(id, user.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete opportunity' })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: UserEntity,
  ) {
    return this.oppsService.softDelete(id, user.id);
  }
}
