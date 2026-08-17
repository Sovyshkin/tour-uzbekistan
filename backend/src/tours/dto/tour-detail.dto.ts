import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { TourDayDto } from './tour-day.dto';
import { TourImageDto } from './tour-image.dto';

export class TourDetailDto {
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
  description!: string;

  @ApiProperty({ required: false, nullable: true })
  detailsInfo!: string | null;

  @ApiProperty({ required: false, nullable: true })
  routesInfo!: string | null;

  @ApiProperty({ required: false, nullable: true })
  reviewsInfo!: string | null;

  @ApiProperty()
  durationDays!: number;

  @ApiProperty()
  durationNights!: number;

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

  @ApiProperty({ required: false, nullable: true })
  minGroupSize!: number | null;

  @ApiProperty({ required: false, nullable: true })
  maxGroupSize!: number | null;

  @ApiProperty({ required: false, nullable: true })
  minAdultCount!: number | null;

  @ApiProperty({ required: false, nullable: true })
  maxAdultCount!: number | null;

  @ApiProperty({ required: false, nullable: true })
  minChildCount!: number | null;

  @ApiProperty({ required: false, nullable: true })
  maxChildCount!: number | null;

  @ApiProperty({ required: false, nullable: true })
  maxTouristCount!: number | null;

  @ApiProperty({ required: false, nullable: true })
  departureCity!: string | null;

  @ApiPropertyOptional()
  priceFrom?: string;

  @ApiPropertyOptional()
  currency?: string;

  @ApiProperty({ required: false, nullable: true })
  transportInfo!: string | null;

  @ApiProperty({ required: false, nullable: true })
  hotelsInfo!: string | null;

  @ApiProperty({ required: false, nullable: true })
  countriesInfo!: string | null;

  @ApiProperty({ type: [String] })
  included!: string[];

  @ApiProperty({ type: [String] })
  excluded!: string[];

  @ApiProperty({ type: [TourImageDto] })
  images!: TourImageDto[];

  @ApiProperty({ type: [TourDayDto] })
  program!: TourDayDto[];
}
