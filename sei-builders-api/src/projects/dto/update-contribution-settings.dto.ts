import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { ProjectDifficulty } from '../entities/project.entity';

export class UpdateContributionSettingsDto {
  @ApiPropertyOptional()
  @IsString()
  @MaxLength(10000)
  @IsOptional()
  contributionGuidelines?: string;

  @ApiPropertyOptional()
  @IsString()
  @MaxLength(2000)
  @IsOptional()
  welcomeMessage?: string;

  @ApiPropertyOptional({ enum: ProjectDifficulty })
  @IsEnum(ProjectDifficulty)
  @IsOptional()
  difficultyPreference?: ProjectDifficulty;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  supportsBounties?: boolean;

  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  requiredSkills?: string[];
}
