import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class AssignOpportunityDto {
  @ApiProperty({ description: 'User ID to assign this opportunity to' })
  @IsUUID()
  userId: string;
}
