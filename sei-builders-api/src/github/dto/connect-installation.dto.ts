import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class ConnectInstallationDto {
  @ApiProperty({ description: 'GitHub App installation ID' })
  @IsString()
  @IsNotEmpty()
  installationId: string;

  @ApiPropertyOptional({ description: 'Platform organization ID to link' })
  @IsString()
  @IsOptional()
  organizationId?: string;
}

export class SyncOrganizationDto {
  @ApiProperty({ description: 'GitHub organization login' })
  @IsString()
  @IsNotEmpty()
  orgLogin: string;

  @ApiProperty({ description: 'Platform organization ID to sync into' })
  @IsString()
  @IsNotEmpty()
  organizationId: string;
}
