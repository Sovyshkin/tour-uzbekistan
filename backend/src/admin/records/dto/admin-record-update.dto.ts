import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { BookingStatus, LeadStatus, Locale, PartnerType, UserRole, UserStatus } from '@prisma/client';

export class AdminRecordUpdateDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ enum: Locale })
  @IsOptional()
  @IsEnum(Locale)
  language?: Locale;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  partnerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  slug?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  tin?: string;

  @ApiPropertyOptional({ enum: PartnerType })
  @IsOptional()
  @IsEnum(PartnerType)
  type?: PartnerType;

  @ApiPropertyOptional({ enum: UserRole })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @ApiPropertyOptional({ enum: UserStatus })
  @IsOptional()
  @IsEnum(UserStatus)
  userStatus?: UserStatus;

  @ApiPropertyOptional({ enum: LeadStatus })
  @IsOptional()
  @IsEnum(LeadStatus)
  leadStatus?: LeadStatus;

  @ApiPropertyOptional({ enum: BookingStatus })
  @IsOptional()
  @IsEnum(BookingStatus)
  bookingStatus?: BookingStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  internalNotes?: string;
}
