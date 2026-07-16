import { Controller, Get, NotFoundException, Param, Query } from '@nestjs/common';
import {
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';

import { ServiceDetailDto } from './dto/service-detail.dto';
import { ServicesListResponseDto } from './dto/services-list-response.dto';
import { ServicesQueryDto } from './dto/services-query.dto';
import { ServicesService } from './services.service';

@ApiTags('services')
@Controller('services')
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  @Get()
  @ApiOperation({ summary: 'Get published services with pagination' })
  @ApiOkResponse({ type: ServicesListResponseDto })
  getServices(@Query() query: ServicesQueryDto) {
    return this.servicesService.getServices(
      query.locale,
      query.page,
      query.pageSize,
    );
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Get a published service by slug' })
  @ApiParam({ name: 'slug', example: 'customized-itineraries' })
  @ApiOkResponse({ type: ServiceDetailDto })
  @ApiNotFoundResponse({ description: 'Service not found' })
  async getServiceBySlug(
    @Param('slug') slug: string,
    @Query() query: ServicesQueryDto,
  ) {
    const service = await this.servicesService.getServiceBySlug(slug, query.locale);

    if (!service) {
      throw new NotFoundException(`Service with slug "${slug}" not found`);
    }

    return service;
  }
}
