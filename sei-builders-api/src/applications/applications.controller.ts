import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApplicationsService } from './applications.service';
import { CreateApplicationDto } from './dto/create-application.dto';
import { ReviewApplicationDto, CompleteApplicationDto } from './dto/review-application.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ParseUUIDPipe } from '../common/pipes/parse-uuid.pipe';
import { UserEntity } from '../users/entities/user.entity';

@ApiTags('Applications')
@UseGuards(JwtAuthGuard)
@Controller('applications')
export class ApplicationsController {
  constructor(private readonly appsService: ApplicationsService) {}

  @Post()
  @ApiOperation({ summary: 'Apply to an opportunity' })
  create(
    @Body() dto: CreateApplicationDto,
    @CurrentUser() user: UserEntity,
  ) {
    return this.appsService.create(dto, user.id);
  }

  @Get('my')
  @ApiOperation({ summary: "Get current user's applications" })
  getMyApplications(
    @CurrentUser() user: UserEntity,
    @Query() pagination: PaginationDto,
  ) {
    return this.appsService.findByApplicant(user.id, pagination);
  }

  @Get('opportunity/:opportunityId')
  @ApiOperation({ summary: 'Get applications for an opportunity' })
  getByOpportunity(
    @Param('opportunityId', ParseUUIDPipe) opportunityId: string,
    @Query() pagination: PaginationDto,
  ) {
    return this.appsService.findByOpportunity(opportunityId, pagination);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get application by ID' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.appsService.findById(id);
  }

  @Patch(':id/start-review')
  @ApiOperation({ summary: 'Mark an application as under review' })
  startReview(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReviewApplicationDto,
    @CurrentUser() user: UserEntity,
  ) {
    return this.appsService.startReview(id, user.id, dto.notes);
  }

  @Patch(':id/accept')
  @ApiOperation({ summary: 'Accept an application' })
  accept(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReviewApplicationDto,
    @CurrentUser() user: UserEntity,
  ) {
    return this.appsService.accept(id, user.id, dto.notes);
  }

  @Patch(':id/reject')
  @ApiOperation({ summary: 'Reject an application' })
  reject(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReviewApplicationDto,
    @CurrentUser() user: UserEntity,
  ) {
    return this.appsService.reject(id, user.id, dto.notes);
  }

  @Patch(':id/complete')
  @ApiOperation({ summary: 'Mark an accepted application as completed' })
  complete(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CompleteApplicationDto,
    @CurrentUser() user: UserEntity,
  ) {
    return this.appsService.complete(id, user.id, dto.prUrl, dto.notes);
  }

  @Patch(':id/withdraw')
  @ApiOperation({ summary: 'Withdraw your application' })
  withdraw(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: UserEntity,
  ) {
    return this.appsService.withdraw(id, user.id);
  }
}
