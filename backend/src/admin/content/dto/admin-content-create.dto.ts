import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ContentStatus, Locale, TourType } from '@prisma/client';

class AdminContentTranslationCreateDto {
  @ApiPropertyOptional({ enum: Locale })
  @IsEnum(Locale)
  locale!: Locale;

  @ApiPropertyOptional()
  @IsObject()
  fields!: Record<string, unknown>;
}

export class AdminContentCreateDto {
  @ApiPropertyOptional()
  @IsString()
  slug!: string;

  @ApiPropertyOptional({ enum: ContentStatus })
  @IsOptional()
  @IsEnum(ContentStatus)
  status?: ContentStatus;

  @ApiPropertyOptional({ enum: TourType })
  @IsOptional()
  @IsEnum(TourType)
  type?: TourType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  countryId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  durationDays?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  durationNights?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sortOrder?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  group?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  heroImage?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  mainImage?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  previewImage?: string;

  @ApiPropertyOptional({ type: [AdminContentTranslationCreateDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AdminContentTranslationCreateDto)
  translations!: AdminContentTranslationCreateDto[];
}
