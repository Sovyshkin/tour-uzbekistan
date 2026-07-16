import { ApiPropertyOptional } from '@nestjs/swagger';
import { Locale } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';

export class ServicesQueryDto {
  @ApiPropertyOptional({ enum: Locale, enumName: 'Locale', default: Locale.ru })
  @IsOptional()
  @IsEnum(Locale)
  locale?: Locale = Locale.ru;

  @ApiPropertyOptional({ example: 1, default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 9, default: 9, minimum: 1, maximum: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  pageSize?: number = 9;
}
