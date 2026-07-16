import { Controller, Get, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { HomeQueryDto } from './dto/home-query.dto';
import { HomeResponseDto } from './dto/home-response.dto';
import { HomeService } from './home.service';

@ApiTags('home')
@Controller('home')
export class HomeController {
  constructor(private readonly homeService: HomeService) {}

  @Get()
  @ApiOperation({ summary: 'Get all home page data' })
  @ApiOkResponse({ type: HomeResponseDto })
  getHome(@Query() query: HomeQueryDto) {
    return this.homeService.getHome(query.locale);
  }
}
