import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
  ValidateNested,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ContentStatus, Locale } from '@prisma/client';

class AdminContentTranslationUpdateDto {
  @ApiPropertyOptional({ enum: Locale })
  @IsEnum(Locale)
  locale!: Locale;

  @ApiPropertyOptional({
    description: 'Translation fields to update. Existing fields only are supported.',
  })
  @IsObject()
  fields!: Record<string, unknown>;
}

class AdminWhyFactTranslationUpdateDto {
  @ApiPropertyOptional({ enum: Locale })
  @IsEnum(Locale)
  locale!: Locale;

  @ApiPropertyOptional()
  @IsObject()
  fields!: Record<string, unknown>;
}

class AdminWhyFactUpdateDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  id?: string;

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

  @ApiPropertyOptional({ type: [AdminWhyFactTranslationUpdateDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AdminWhyFactTranslationUpdateDto)
  translations?: AdminWhyFactTranslationUpdateDto[];
}

export class AdminContentUpdateDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  slug?: string;

  @ApiPropertyOptional({ enum: ContentStatus })
  @IsOptional()
  @IsEnum(ContentStatus)
  status?: ContentStatus;

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
  heroImage?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  mainImage?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  previewImage?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  path?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fileName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  url?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  mimeType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  altText?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  group?: string;

  @ApiPropertyOptional({ type: [AdminContentTranslationUpdateDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AdminContentTranslationUpdateDto)
  translations?: AdminContentTranslationUpdateDto[];

  @ApiPropertyOptional({ type: [AdminWhyFactUpdateDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AdminWhyFactUpdateDto)
  whyFacts?: AdminWhyFactUpdateDto[];
}
