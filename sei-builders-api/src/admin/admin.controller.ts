import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { PaginationDto } from '../common/dto/pagination.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { ParseUUIDPipe } from '../common/pipes/parse-uuid.pipe';

@ApiTags('Admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Get platform dashboard stats' })
  getStats() {
    return this.adminService.getDashboardStats();
  }

  @Get('users')
  @ApiOperation({ summary: 'List all users' })
  listUsers(@Query() pagination: PaginationDto) {
    return this.adminService.listUsers(pagination);
  }

  @Get('projects')
  @ApiOperation({ summary: 'List all projects' })
  listProjects(@Query() pagination: PaginationDto) {
    return this.adminService.listProjects(pagination);
  }

  @Get('organizations')
  @ApiOperation({ summary: 'List all organizations' })
  listOrganizations(@Query() pagination: PaginationDto) {
    return this.adminService.listOrganizations(pagination);
  }

  @Patch('users/:id/suspend')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Suspend user' })
  suspendUser(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.suspendUser(id);
  }

  @Patch('users/:id/reinstate')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Reinstate user' })
  reinstateUser(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.reinstateUser(id);
  }

  @Patch('projects/:id/approve')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Approve project' })
  approveProject(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.approveProject(id);
  }

  @Patch('projects/:id/reject')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Reject project' })
  rejectProject(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.rejectProject(id);
  }

  @Patch('organizations/:id/suspend')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Suspend organization' })
  suspendOrganization(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.suspendOrganization(id);
  }

  @Patch('organizations/:id/reinstate')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Reinstate organization' })
  reinstateOrganization(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.reinstateOrganization(id);
  }
}
