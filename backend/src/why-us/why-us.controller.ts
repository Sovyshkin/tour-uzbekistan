import { Controller, Get, NotFoundException, Param, Query } from '@nestjs/common';
import {
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';

import { WhyUsCategoryDetailDto } from './dto/why-us-category-detail.dto';
import { WhyUsCategoryListItemDto } from './dto/why-us-category-list-item.dto';
import { WhyUsQueryDto } from './dto/why-us-query.dto';
import { WhyUsService } from './why-us.service';

@ApiTags('why-us')
@Controller('why-us/categories')
export class WhyUsController {
  constructor(private readonly whyUsService: WhyUsService) {}

  @Get()
  @ApiOperation({ summary: 'Get published why-us categories with facts' })
  @ApiOkResponse({ type: WhyUsCategoryListItemDto, isArray: true })
  getCategories(@Query() query: WhyUsQueryDto) {
    return this.whyUsService.getCategories(query.locale);
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Get a published why-us category by slug with facts' })
  @ApiParam({ name: 'slug', example: 'destination-expertise' })
  @ApiOkResponse({ type: WhyUsCategoryDetailDto })
  @ApiNotFoundResponse({ description: 'Why-us category not found' })
  async getCategoryBySlug(
    @Param('slug') slug: string,
    @Query() query: WhyUsQueryDto,
  ) {
    const category = await this.whyUsService.getCategoryBySlug(slug, query.locale);

    if (!category) {
      throw new NotFoundException(`Why-us category with slug "${slug}" not found`);
    }

    return category;
  }
}
