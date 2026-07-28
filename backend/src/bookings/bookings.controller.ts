import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Request } from 'express';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { BookingResponseDto } from './dto/booking-response.dto';
import { CreateBookingDto } from './dto/create-booking.dto';
import { BookingsService } from './bookings.service';

type AuthenticatedRequest = Request & {
  user: {
    sub: string;
    email: string;
    role: string;
  };
};

@ApiTags('bookings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a booking as an authenticated partner' })
  @ApiCreatedResponse({ type: BookingResponseDto })
  createBooking(@Body() dto: CreateBookingDto, @Req() req: AuthenticatedRequest) {
    return this.bookingsService.createBooking(dto, req.user.sub, req.user.role, req);
  }

  @Get('me')
  @ApiOperation({ summary: 'Get bookings of the current authenticated partner' })
  @ApiOkResponse({ type: BookingResponseDto, isArray: true })
  getMyBookings(@Req() req: AuthenticatedRequest) {
    return this.bookingsService.getMyBookings(req.user.sub, req.user.role);
  }
}
