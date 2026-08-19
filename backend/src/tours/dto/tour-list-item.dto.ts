import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { TourDayDto } from './tour-day.dto';
import { TourImageDto } from './tour-image.dto';

export class TourListItemDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  slug!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty({ required: false, nullable: true })
  subtitle!: string | null;

  @ApiProperty()
  route!: string;

  @ApiProperty()
  durationDays!: number;

  @ApiProperty()
  durationNights!: number;

  @ApiProperty({ required: false, nullable: true })
  departureCity!: string | null;

  @ApiProperty({ type: [Number] })
  departureWeekdays!: number[];

  @ApiProperty({ required: false, nullable: true })
  maxTouristCount!: number | null;

  @ApiProperty({ required: false, nullable: true })
  country!: string | null;

  @ApiProperty({ required: false, nullable: true })
  heroImage!: string | null;

  @ApiProperty({ required: false, nullable: true })
  mainImage!: string | null;

  @ApiProperty({ required: false, nullable: true })
  routeMapImage!: string | null;

  @ApiProperty({ required: false, nullable: true })
  comfortLevel!: number | null;

  @ApiPropertyOptional()
  priceFrom?: string;

  @ApiPropertyOptional()
  currency?: string;

  @ApiPropertyOptional()
  hasMatchingPlacement?: boolean;

  @ApiProperty({ required: false, nullable: true })
  transportInfo!: string | null;

  @ApiProperty({ required: false, nullable: true })
  hotelsInfo!: string | null;

  @ApiProperty({ type: [String] })
  included!: string[];

  @ApiProperty({ type: [TourImageDto] })
  images!: TourImageDto[];

  @ApiProperty({ type: [TourDayDto] })
  program!: TourDayDto[];
}
