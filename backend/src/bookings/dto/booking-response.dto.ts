import { ApiProperty } from '@nestjs/swagger';
import { BookingStatus, Locale } from '@prisma/client';

class BookingSnapshotDayDto {
  @ApiProperty()
  dayNumber!: number;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  description!: string;
}

class BookingSnapshotDto {
  @ApiProperty()
  tourId!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty({ required: false, nullable: true })
  price!: string | null;

  @ApiProperty({ required: false, nullable: true })
  currency!: string | null;

  @ApiProperty({ type: [BookingSnapshotDayDto] })
  program!: BookingSnapshotDayDto[];

  @ApiProperty({ required: false, nullable: true })
  transport!: string | null;

  @ApiProperty({ required: false, nullable: true })
  hotels!: string | null;

  @ApiProperty({ type: [String] })
  includedServices!: string[];
}

class BookingIntegrationDto {
  @ApiProperty()
  enabled!: boolean;

  @ApiProperty()
  sent!: boolean;

  @ApiProperty({ required: false, nullable: true })
  skippedReason?: string;

  @ApiProperty({ required: false, nullable: true })
  claimNumber?: number;

  @ApiProperty({ required: false, nullable: true })
  confirmStatus?: string;

  @ApiProperty({ required: false, nullable: true })
  result?: number;

  @ApiProperty({ required: false, nullable: true })
  comment?: string;

  @ApiProperty({ required: false, nullable: true })
  message?: string;
}

export class BookingResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  bookingNumber!: string;

  @ApiProperty({ enum: BookingStatus, enumName: 'BookingStatus' })
  status!: BookingStatus;

  @ApiProperty({ enum: Locale, enumName: 'Locale' })
  locale!: Locale;

  @ApiProperty()
  firstName!: string;

  @ApiProperty()
  lastName!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty({ required: false, nullable: true })
  phone!: string | null;

  @ApiProperty({ required: false, nullable: true })
  sourcePage!: string | null;

  @ApiProperty({ required: false, nullable: true })
  specialRequests!: string | null;

  @ApiProperty({ type: BookingIntegrationDto, required: false, nullable: true })
  integration!: BookingIntegrationDto | null;

  @ApiProperty({ type: BookingSnapshotDto })
  snapshot!: BookingSnapshotDto;

  @ApiProperty()
  createdAt!: string;
}
