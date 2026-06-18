import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { OrganizationCategory } from '../entities/organization.entity';

export class CreateOrganizationDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @Transform(({ value }) => value?.trim())
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  website?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  githubOrganization?: string;

  @ApiPropertyOptional({ enum: OrganizationCategory })
  @IsOptional()
  @IsEnum(OrganizationCategory)
  category?: OrganizationCategory;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  twitterHandle?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  discordUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  telegramUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  linkedinUrl?: string;
}
