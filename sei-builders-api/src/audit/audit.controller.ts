import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuditService } from './audit.service';
import { AuditAction } from './entities/audit-log.entity';
import { PaginationDto } from '../common/dto/pagination.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @ApiOperation({ summary: 'Get audit logs (admin)' })
  findAll(
    @Query() pagination: PaginationDto,
    @Query('actorId') actorId?: string,
    @Query('resource') resource?: string,
    @Query('action') action?: AuditAction,
    @Query('organizationId') organizationId?: string,
  ) {
    return this.auditService.findAll(pagination, {
      actorId,
      resource,
      action,
      organizationId,
    });
  }
}
