import { IsBoolean, IsIn, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class AdminIncomingMappingDto {
  @IsIn(['room', 'placement'])
  type!: string;

  @IsString()
  @MaxLength(255)
  cmsKey!: string;

  @IsString()
  @MaxLength(255)
  cmsLabel!: string;

  @IsString()
  @MaxLength(80)
  samoCode!: string;

  @IsString()
  @MaxLength(255)
  samoName!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  adultCount?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  childCount?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsInt()
  sortOrder?: number;
}
