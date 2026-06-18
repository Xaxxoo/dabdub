import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsUUID } from 'class-validator';

export class ConnectProjectRepositoryDto {
  @ApiProperty({ description: 'Repository ID to connect' })
  @IsUUID()
  repositoryId: string;

  @ApiPropertyOptional({ description: 'Set as the primary repository for this project' })
  @IsBoolean()
  @IsOptional()
  setPrimary?: boolean = false;
}
