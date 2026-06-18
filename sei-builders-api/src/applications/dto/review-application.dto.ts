import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';

export class ReviewApplicationDto {
  @ApiPropertyOptional({ description: 'Review notes visible to applicant' })
  @IsString()
  @MaxLength(2000)
  @IsOptional()
  notes?: string;
}

export class CompleteApplicationDto {
  @ApiPropertyOptional({ description: 'Link to the PR that completed the work' })
  @IsUrl()
  @IsOptional()
  prUrl?: string;

  @ApiPropertyOptional()
  @IsString()
  @MaxLength(2000)
  @IsOptional()
  notes?: string;
}
