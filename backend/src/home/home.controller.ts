import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';

import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { HomeQueryDto } from './dto/home-query.dto';
import { HomeResponseDto } from './dto/home-response.dto';
import { HomeService } from './home.service';

type RequestWithOptionalUser = Request & {
  user?: {
    sub: string;
    email: string;
    role: string;
  } | null;
};

@ApiTags('home')
@Controller('home')
@UseGuards(OptionalJwtAuthGuard)
export class HomeController {
  constructor(private readonly homeService: HomeService) {}

  @Get()
  @ApiOperation({ summary: 'Get all home page data' })
  @ApiOkResponse({ type: HomeResponseDto })
  getHome(@Query() query: HomeQueryDto, @Req() req: RequestWithOptionalUser) {
    return this.homeService.getHome(query.locale, req.user);
  }
}
