import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { RepositoriesService } from './repositories.service';
import { PaginationDto } from '../common/dto/pagination.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ParseUUIDPipe } from '../common/pipes/parse-uuid.pipe';
import { IsPublic } from '../common/decorators/is-public.decorator';

@ApiTags('Repositories')
@UseGuards(JwtAuthGuard)
@Controller('repositories')
export class RepositoriesController {
  constructor(private readonly reposService: RepositoriesService) {}

  @IsPublic()
  @Get()
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
}
