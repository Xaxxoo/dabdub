import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ContributorsService } from './contributors.service';
import { PaginationDto } from '../common/dto/pagination.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ParseUUIDPipe } from '../common/pipes/parse-uuid.pipe';
import { UserEntity } from '../users/entities/user.entity';
import { IsPublic } from '../common/decorators/is-public.decorator';
import { IsNotEmpty, IsString } from 'class-validator';

class AddSkillDto {
  @IsString()
  @IsNotEmpty()
  skill: string;
}

@ApiTags('Contributors')
@UseGuards(JwtAuthGuard)
@Controller('contributors')
export class ContributorsController {
  constructor(private readonly contributorsService: ContributorsService) {}

  @IsPublic()
  @Get()
  @ApiOperation({ summary: 'List contributors' })
  findAll(@Query() pagination: PaginationDto) {
    return this.contributorsService.findAll(pagination);
  }

  @Get('me')
  @ApiOperation({ summary: 'Get my contributor profile' })
  getMyProfile(@CurrentUser() user: UserEntity) {
    return this.contributorsService.getOrCreateProfile(user.id);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update my contributor profile' })
  updateMyProfile(
    @CurrentUser() user: UserEntity,
    @Body() dto: any,
  ) {
    return this.contributorsService.update(user.id, dto);
  }

  @Post('me/skills')
  @ApiOperation({ summary: 'Add a skill to my profile' })
  addSkill(
    @CurrentUser() user: UserEntity,
    @Body() dto: AddSkillDto,
  ) {
    return this.contributorsService.addSkill(user.id, dto.skill);
  }

  @Delete('me/skills/:skillId')
  @ApiOperation({ summary: 'Remove a skill from my profile' })
  removeSkill(
    @CurrentUser() user: UserEntity,
    @Param('skillId', ParseUUIDPipe) skillId: string,
  ) {
    return this.contributorsService.removeSkill(user.id, skillId);
  }

  @IsPublic()
  @Get('skills')
  @ApiOperation({ summary: 'List available skills' })
  getSkills(@Query('search') search?: string) {
    return this.contributorsService.getSkills(search);
  }

  @IsPublic()
  @Get(':userId')
  @ApiOperation({ summary: 'Get contributor profile by user ID' })
  findOne(@Param('userId', ParseUUIDPipe) userId: string) {
    return this.contributorsService.findByUserId(userId);
  }
}
