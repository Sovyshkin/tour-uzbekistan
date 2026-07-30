import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsEnum,
  IsInt,
  IsNumber,
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

class AdminImageSettingsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  positionX?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  positionY?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  scale?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  frameSize?: number;
}

class AdminWhyFactTranslationCreateDto {
  @ApiPropertyOptional({ enum: Locale })
  @IsEnum(Locale)
  locale!: Locale;

  @ApiPropertyOptional()
  @IsObject()
  fields!: Record<string, unknown>;
}

class AdminWhyFactCreateDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sortOrder?: number;

  @ApiPropertyOptional({ enum: ContentStatus })
  @IsOptional()
  @IsEnum(ContentStatus)
  status?: ContentStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => AdminImageSettingsDto)
  imageSettings?: AdminImageSettingsDto;

  @ApiPropertyOptional({ type: [AdminWhyFactTranslationCreateDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AdminWhyFactTranslationCreateDto)
  translations?: AdminWhyFactTranslationCreateDto[];
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
  minGroupSize?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  maxGroupSize?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  comfortLevel?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  priceFrom?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  incomingTourId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  incomingHotelCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  incomingHotelName?: string;

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
  @IsBoolean()
  syncToB2B?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  syncToB2C?: boolean;

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
  routeMapImage?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  previewImage?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => AdminImageSettingsDto)
  imageSettings?: AdminImageSettingsDto;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => AdminImageSettingsDto)
  heroImageSettings?: AdminImageSettingsDto;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => AdminImageSettingsDto)
  mainImageSettings?: AdminImageSettingsDto;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => AdminImageSettingsDto)
  routeMapImageSettings?: AdminImageSettingsDto;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => AdminImageSettingsDto)
  previewImageSettings?: AdminImageSettingsDto;

  @ApiPropertyOptional({ type: [AdminWhyFactCreateDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AdminWhyFactCreateDto)
  whyFacts?: AdminWhyFactCreateDto[];

  @ApiPropertyOptional({ type: [AdminContentTranslationCreateDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AdminContentTranslationCreateDto)
  translations!: AdminContentTranslationCreateDto[];
}
