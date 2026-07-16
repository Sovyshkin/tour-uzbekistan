import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Locale, PartnerType } from '@prisma/client';
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  IsUrl,
  MinLength,
} from 'class-validator';

export class RegisterPartnerDto {
  @ApiProperty({ example: 'Abdulaziz' })
  @IsString()
  firstName!: string;

  @ApiProperty({ example: 'Abdurakhmanov' })
  @IsString()
  lastName!: string;

  @ApiProperty({ example: 'partner@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ minLength: 6, example: 'strongPassword123' })
  @IsString()
  @MinLength(6)
  password!: string;

  @ApiProperty({ example: 'Centrum Travel Agency' })
  @IsString()
  companyName!: string;

  @ApiProperty({ enum: PartnerType, enumName: 'PartnerType', example: PartnerType.AGENCY })
  @IsEnum(PartnerType)
  partnerType!: PartnerType;

  @ApiPropertyOptional({ example: '+998900001122' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: 'Tashkent' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ example: '309887776' })
  @IsOptional()
  @IsString()
  tin?: string;

  @ApiPropertyOptional({ example: 'https://example.com' })
  @IsOptional()
  @IsUrl()
  website?: string;

  @ApiPropertyOptional({ example: 'DMC and group tours specialist' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: Locale, enumName: 'Locale', example: Locale.en, default: Locale.en })
  @IsOptional()
  @IsEnum(Locale)
  preferredLocale: Locale = Locale.en;
}
