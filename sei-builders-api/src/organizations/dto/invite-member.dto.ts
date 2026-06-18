import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { OrganizationRole } from '../entities/organization-member.entity';

export class InviteMemberDto {
  @ApiPropertyOptional({ description: 'Invite by platform user ID' })
  @IsUUID()
  @IsOptional()
  @ValidateIf((o) => !o.email)
  userId?: string;

  @ApiPropertyOptional({ description: 'Invite by email address' })
  @IsEmail()
  @IsOptional()
  @ValidateIf((o) => !o.userId)
  email?: string;

  @ApiProperty({ enum: OrganizationRole, default: OrganizationRole.MEMBER })
  @IsEnum(OrganizationRole)
  role: OrganizationRole = OrganizationRole.MEMBER;

  @ApiPropertyOptional({ description: 'Optional personal message' })
  @IsString()
  @MaxLength(500)
  @IsOptional()
  message?: string;
}
