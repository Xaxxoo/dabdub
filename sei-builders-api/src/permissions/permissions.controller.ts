import {
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PermissionsService } from './permissions.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { ParseUUIDPipe } from '../common/pipes/parse-uuid.pipe';
import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

class AssignRoleDto {
  @IsString()
  @IsNotEmpty()
  roleId: string;

  @IsString()
  @IsOptional()
  organizationId?: string;
}

@ApiTags('Permissions')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('permissions')
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  @Get('roles')
  @ApiOperation({ summary: 'List all roles' })
  getRoles() {
    return this.permissionsService.getRoles();
  }

  @Get('roles/:id')
  @ApiOperation({ summary: 'Get role by ID' })
  getRole(@Param('id', ParseUUIDPipe) id: string) {
    return this.permissionsService.getRoleById(id);
  }

  @Get()
  @ApiOperation({ summary: 'List all permissions' })
  getPermissions() {
    return this.permissionsService.getPermissions();
  }

  @Get('users/:userId')
  @ApiOperation({ summary: "Get user's resolved permissions" })
  getUserPermissions(@Param('userId', ParseUUIDPipe) userId: string) {
    return this.permissionsService.getUserPermissions(userId);
  }

  @Post('users/:userId/roles')
  @ApiOperation({ summary: 'Assign role to user' })
  assignRole(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto: AssignRoleDto,
  ) {
    return this.permissionsService.assignRoleToUser(
      userId,
      dto.roleId,
      dto.organizationId,
    );
  }

  @Delete('users/:userId/roles/:roleId')
  @ApiOperation({ summary: 'Remove role from user' })
  removeRole(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Param('roleId', ParseUUIDPipe) roleId: string,
  ) {
    return this.permissionsService.removeRoleFromUser(userId, roleId);
  }
}
