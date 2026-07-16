import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Locale } from '@prisma/client';
import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateBookingDto {
  @ApiProperty({ example: '4d6efef7-7fd7-4e0a-b78f-843034b9a301' })
  @IsUUID()
  tourId!: string;

  @ApiPropertyOptional({ enum: Locale, enumName: 'Locale', default: Locale.ru })
  @IsOptional()
  @IsEnum(Locale)
  locale?: Locale = Locale.ru;

  @ApiProperty({ example: 'John' })
  @IsString()
  @MaxLength(120)
  firstName!: string;

  @ApiProperty({ example: 'Smith' })
  @IsString()
  @MaxLength(120)
  lastName!: string;

  @ApiProperty({ example: 'john.smith@example.com' })
  @IsEmail()
  email!: string;

  @ApiPropertyOptional({ example: '+447700900123' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  phone?: string;

  @ApiPropertyOptional({ example: 'male' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  sex?: string;

  @ApiPropertyOptional({ example: '1990-04-16' })
  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @ApiPropertyOptional({ example: 'British' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  nationality?: string;

  @ApiPropertyOptional({ example: 'Passport' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  documentType?: string;

  @ApiPropertyOptional({ example: 'AA' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  documentSeries?: string;

  @ApiPropertyOptional({ example: '1234567' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  documentNumber?: string;

  @ApiPropertyOptional({ example: '2021-05-01' })
  @IsOptional()
  @IsDateString()
  documentIssuedAt?: string;

  @ApiPropertyOptional({ example: '2031-05-01' })
  @IsOptional()
  @IsDateString()
  documentValidUntil?: string;

  @ApiPropertyOptional({ example: '2026-10-10' })
  @IsOptional()
  @IsDateString()
  travelDate?: string;

  @ApiPropertyOptional({ example: 2, minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  groupSize?: number;

  @ApiPropertyOptional({ example: 'Silk Road Hotel' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  hotelName?: string;

  @ApiPropertyOptional({ example: '/booking/weekend-in-uzbekistan' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  sourcePage?: string;

  @ApiPropertyOptional({ example: 'Early check-in requested.' })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  specialRequests?: string;
}
