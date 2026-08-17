import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Locale } from '@prisma/client';
import {
  IsEmail,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateLeadDto {
  @ApiProperty({ example: 'Ivan Petrov' })
  @IsString()
  @MaxLength(120)
  name!: string;

  @ApiProperty({ example: 'ivan@example.com' })
  @IsEmail()
  email!: string;

  @ApiPropertyOptional({ example: '+79990001122' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  phone?: string;

  @ApiProperty({ example: 'Interested in the October departure and flight estimate.' })
  @IsString()
  @MaxLength(5000)
  message!: string;

  @ApiProperty({ example: '/tours/weekend-in-uzbekistan' })
  @IsString()
  @MaxLength(255)
  sourcePage!: string;

  @ApiPropertyOptional({ example: 'Weekend in Uzbekistan - Centrum Holidays' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  sourcePageTitle?: string;

  @ApiProperty({ enum: Locale, enumName: 'Locale', example: Locale.ru })
  @IsEnum(Locale)
  language!: Locale;

  @ApiPropertyOptional({ example: '4d6efef7-7fd7-4e0a-b78f-843034b9a301' })
  @IsOptional()
  @IsUUID()
  tourId?: string;

  @ApiPropertyOptional({ example: '2026-08-15' })
  @IsOptional()
  @IsDateString()
  travelDate?: string;

  @ApiPropertyOptional({ example: 2, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  adultCount?: number;

  @ApiPropertyOptional({ example: 1, minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  childCount?: number;

  @ApiPropertyOptional({ example: '9' })
  @IsOptional()
  @IsString()
  childAges?: string;

  @ApiPropertyOptional({ example: 'Москва' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  departureCity?: string;

  @ApiPropertyOptional({ example: '5fd173c4-74ff-41cd-98ef-d3b93a38d211' })
  @IsOptional()
  @IsUUID()
  countryId?: string;

  @ApiPropertyOptional({ example: 'd7782f4a-ef16-4a34-a9a0-5f67fbeea781' })
  @IsOptional()
  @IsUUID()
  serviceId?: string;
}

export class CreatePartnerRequestDto {
  @ApiProperty({ enum: Locale, enumName: 'Locale', example: Locale.ru })
  @IsEnum(Locale)
  language!: Locale;

  @ApiPropertyOptional({ example: '4d6efef7-7fd7-4e0a-b78f-843034b9a301' })
  @IsOptional()
  @IsUUID()
  tourId?: string;

  @ApiProperty({ example: '/tours/weekend-in-uzbekistan' })
  @IsString()
  @MaxLength(255)
  sourcePage!: string;

  @ApiPropertyOptional({ example: 'Weekend in Uzbekistan - Centrum Holidays' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  sourcePageTitle?: string;

  @ApiPropertyOptional({ example: '2026-08-15' })
  @IsOptional()
  @IsDateString()
  travelDate?: string;

  @ApiPropertyOptional({ example: 2, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  adultCount?: number;

  @ApiPropertyOptional({ example: 1, minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  childCount?: number;

  @ApiPropertyOptional({ example: '9' })
  @IsOptional()
  @IsString()
  childAges?: string;

  @ApiPropertyOptional({ example: 'Москва' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  departureCity?: string;

  @ApiPropertyOptional({ example: 'Need price for 15 adults.' })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  message?: string;
}
