import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class ConnectRepositoryDto {
  @ApiProperty({ description: 'GitHub full name (owner/repo)', example: 'sei-protocol/sei-chain' })
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @ApiPropertyOptional({ description: 'Organization to associate this repo with' })
  @IsUUID()
  @IsOptional()
  organizationId?: string;

  @ApiPropertyOptional({ description: 'Trigger initial sync after connecting' })
  @IsBoolean()
  @IsOptional()
  syncOnConnect?: boolean = true;
}

export class DisconnectRepositoryDto {
  @ApiPropertyOptional({ description: 'Also remove all synced data' })
  @IsBoolean()
  @IsOptional()
  purgeData?: boolean = false;
}
