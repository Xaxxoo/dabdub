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
import { InviteMemberDto } from './dto/invite-member.dto';
import { TransferOwnershipDto } from './dto/transfer-ownership.dto';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto';
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

  // ─── Public reads ──────────────────────────────────────────────────────────

  @IsPublic()
  @Get()
  @ApiOperation({ summary: 'List all organizations' })
  findAll(@Query() pagination: PaginationDto) {
    return this.orgsService.findAll(pagination);
  }

  @IsPublic()
  @Get('slug/:slug')
  @ApiOperation({ summary: 'Get organization by slug' })
  findBySlug(@Param('slug') slug: string) {
    return this.orgsService.findBySlug(slug);
  }

  @IsPublic()
  @Get(':id')
  @ApiOperation({ summary: 'Get organization by ID' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.orgsService.findById(id);
  }

  @IsPublic()
  @Get(':id/members')
  @ApiOperation({ summary: 'Get organization members' })
  getMembers(@Param('id', ParseUUIDPipe) id: string) {
    return this.orgsService.getMembers(id);
  }

  // ─── Mutations ────────────────────────────────────────────────────────────

  @Post()
  @ApiOperation({ summary: 'Create a new organization' })
  create(
    @Body() dto: CreateOrganizationDto,
    @CurrentUser() user: UserEntity,
  ) {
    return this.orgsService.create(dto, user.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update organization settings' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: Partial<CreateOrganizationDto>,
    @CurrentUser() user: UserEntity,
  ) {
    return this.orgsService.update(id, dto, user.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete organization (owner only)' })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: UserEntity,
  ) {
    return this.orgsService.softDelete(id, user.id);
  }

  // ─── Member management ─────────────────────────────────────────────────────

  @Post(':id/invites')
  @ApiOperation({ summary: 'Invite a user to the organization' })
  invite(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: InviteMemberDto,
    @CurrentUser() user: UserEntity,
  ) {
    return this.orgsService.inviteMember(id, dto, user.id);
  }

  @Get(':id/invites')
  @ApiOperation({ summary: 'List pending invites' })
  getPendingInvites(@Param('id', ParseUUIDPipe) id: string) {
    return this.orgsService.getPendingInvites(id);
  }

  @Delete(':id/invites/:inviteId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Revoke a pending invite' })
  revokeInvite(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('inviteId', ParseUUIDPipe) inviteId: string,
    @CurrentUser() user: UserEntity,
  ) {
    return this.orgsService.revokeInvite(inviteId, user.id);
  }

  @Patch(':id/members/:userId/role')
  @ApiOperation({ summary: 'Update a member\'s role' })
  updateMemberRole(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto: UpdateMemberRoleDto,
    @CurrentUser() user: UserEntity,
  ) {
    return this.orgsService.updateMemberRole(id, userId, dto.role, user.id);
  }

  @Delete(':id/members/:userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a member from the organization' })
  removeMember(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('userId', ParseUUIDPipe) userId: string,
  ) {
    return this.orgsService.removeMember(id, userId);
  }

  @Post(':id/transfer-ownership')
  @ApiOperation({ summary: 'Transfer organization ownership (owner only)' })
  transferOwnership(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: TransferOwnershipDto,
    @CurrentUser() user: UserEntity,
  ) {
    return this.orgsService.transferOwnership(id, dto.newOwnerId, user.id);
  }

  // ─── Invite accept/reject (public-ish: uses invite token) ─────────────────

  @Post('invites/:token/accept')
  @ApiOperation({ summary: 'Accept an organization invite' })
  acceptInvite(
    @Param('token') token: string,
    @CurrentUser() user: UserEntity,
  ) {
    return this.orgsService.acceptInvite(token, user.id);
  }

  @Post('invites/:token/reject')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Reject an organization invite' })
  rejectInvite(
    @Param('token') token: string,
    @CurrentUser() user: UserEntity,
  ) {
    return this.orgsService.rejectInvite(token, user.id);
  }

  // ─── Analytics ─────────────────────────────────────────────────────────────

  @Get(':id/analytics')
  @ApiOperation({ summary: 'Get organization analytics' })
  getAnalytics(@Param('id', ParseUUIDPipe) id: string) {
    return this.orgsService.getAnalytics(id);
  }

  // ─── Admin ─────────────────────────────────────────────────────────────────

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
