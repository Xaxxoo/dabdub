import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  OpportunityType,
  OpportunityDifficulty,
} from '../entities/opportunity.entity';

export class CreateOpportunityDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(20000)
  description: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(10000)
  requirements?: string;

  @ApiProperty({ enum: OpportunityType })
  @IsEnum(OpportunityType)
  type: OpportunityType;

  @ApiProperty({ enum: OpportunityDifficulty })
  @IsEnum(OpportunityDifficulty)
  difficulty: OpportunityDifficulty;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  projectId?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  requiredSkills?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  hasBounty?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  bountyAmount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bountyCurrency?: string;

  @ApiPropertyOptional()
  @IsOptional()
  githubIssueUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  githubIssueNumber?: number;
}
