import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AdminAuditQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 50, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 50;

  @ApiPropertyOptional({ example: 'UPDATE' })
  @IsOptional()
  @IsString()
  action?: string;

  @ApiPropertyOptional({ example: 'content:tours' })
  @IsOptional()
  @IsString()
  entityType?: string;

  @ApiPropertyOptional({ example: 'admin@centrum-holidays.test' })
  @IsOptional()
  @IsString()
  userEmail?: string;

  @ApiPropertyOptional({ example: 'tour' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ example: '2026-07-01T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({ example: '2026-07-13T23:59:59.999Z' })
  @IsOptional()
  @IsDateString()
  dateTo?: string;
}

export class AdminAuditEventDto {
  @ApiProperty({ example: 'LOGOUT' })
  @IsString()
  action!: string;

  @ApiPropertyOptional({ example: 'auth' })
  @IsOptional()
  @IsString()
  entityType?: string;

  @ApiPropertyOptional({ example: 'User clicked logout button' })
  @IsOptional()
  @IsString()
  entityTitle?: string;
}
