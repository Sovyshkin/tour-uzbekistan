import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { Request } from 'express';
import { UserRole } from '@prisma/client';

import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { TourDetailDto } from './dto/tour-detail.dto';
import { ToursListResponseDto } from './dto/tours-list-response.dto';
import { ToursQueryDto } from './dto/tours-query.dto';
import { ToursService } from './tours.service';

type RequestWithOptionalUser = Request & {
  user?: {
    sub: string;
    email: string;
    role: string;
  } | null;
};

const isB2BUser = (req: RequestWithOptionalUser) => req.user?.role === UserRole.PARTNER;

@ApiTags('tours')
@Controller('tours')
@UseGuards(OptionalJwtAuthGuard)
@ApiBearerAuth()
export class ToursController {
  constructor(private readonly toursService: ToursService) {}

  @Get()
  @ApiOperation({ summary: 'Get published tours with filters and pagination' })
  @ApiOkResponse({ type: ToursListResponseDto })
  getTours(@Query() query: ToursQueryDto, @Req() req: RequestWithOptionalUser) {
    return this.toursService.getTours(query, isB2BUser(req));
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Get a published tour by slug' })
  @ApiParam({ name: 'slug', example: 'weekend-in-uzbekistan' })
  @ApiOkResponse({ type: TourDetailDto })
  @ApiNotFoundResponse({ description: 'Tour not found' })
  async getTourBySlug(
    @Param('slug') slug: string,
    @Query() query: ToursQueryDto,
    @Req() req: RequestWithOptionalUser,
  ) {
    const tour = await this.toursService.getTourBySlug(
      slug,
      query.locale,
      isB2BUser(req),
    );

    if (!tour) {
      throw new NotFoundException(`Tour with slug "${slug}" not found`);
    }

    return tour;
  }
}
