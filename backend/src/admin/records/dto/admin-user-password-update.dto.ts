import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';

export class AdminUserPasswordUpdateDto {
  @ApiPropertyOptional({ description: 'Required when changing your own administrator password' })
  @IsOptional()
  @IsString()
  currentPassword?: string;

  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8)
  password!: string;
}
