import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class AdminIncomingSearchDto {
  @ApiPropertyOptional({ example: 'hotel' })
  @IsOptional()
  @IsString()
  referenceType?: string;

  @ApiPropertyOptional({ example: '2026-10-10' })
  @IsOptional()
  @IsString()
  checkIn?: string;

  @ApiPropertyOptional({ example: 3 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  nights?: number;

  @ApiPropertyOptional({ example: 2 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  adults?: number;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  children?: number;

  @ApiPropertyOptional({ example: 'USD' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ example: '123' })
  @IsOptional()
  @IsString()
  tourId?: string;

  @ApiPropertyOptional({ example: '456' })
  @IsOptional()
  @IsString()
  hotelCode?: string;

  @ApiPropertyOptional({ example: 'tashkent' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({
    description: 'Additional SAMO query params as a JSON object',
    example: '{"STATEINC":"1","TOWNFROMINC":"1"}',
  })
  @IsOptional()
  @IsString()
  extraParams?: string;
}
