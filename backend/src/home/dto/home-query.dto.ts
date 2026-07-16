import { ApiPropertyOptional } from '@nestjs/swagger';
import { Locale } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';

export class HomeQueryDto {
  @ApiPropertyOptional({ enum: Locale, enumName: 'Locale', default: Locale.ru })
  @IsOptional()
  @IsEnum(Locale)
  locale?: Locale = Locale.ru;
}
