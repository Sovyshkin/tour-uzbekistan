import { ApiProperty } from '@nestjs/swagger';

class AdminDashboardStatsDto {
  @ApiProperty()
  users!: number;

  @ApiProperty()
  partners!: number;

  @ApiProperty()
  tours!: number;

  @ApiProperty()
  services!: number;

  @ApiProperty()
  news!: number;

  @ApiProperty()
  leads!: number;

  @ApiProperty()
  bookings!: number;

  @ApiProperty()
  newLeads!: number;

  @ApiProperty()
  pendingBookings!: number;

  @ApiProperty()
  pendingPartners!: number;
}

class AdminDashboardLeadDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty({ nullable: true })
  phone!: string | null;

  @ApiProperty()
  status!: string;

  @ApiProperty()
  createdAt!: string;
}

class AdminDashboardBookingDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  bookingNumber!: string;

  @ApiProperty()
  customer!: string;

  @ApiProperty()
  status!: string;

  @ApiProperty()
  createdAt!: string;
}

export class AdminDashboardDto {
  @ApiProperty({ type: AdminDashboardStatsDto })
  stats!: AdminDashboardStatsDto;

  @ApiProperty({ type: AdminDashboardLeadDto, isArray: true })
  recentLeads!: AdminDashboardLeadDto[];

  @ApiProperty({ type: AdminDashboardBookingDto, isArray: true })
  recentBookings!: AdminDashboardBookingDto[];
}
