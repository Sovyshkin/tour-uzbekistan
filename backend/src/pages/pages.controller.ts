import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Locale } from '@prisma/client';

import { PagesService } from './pages.service';

@ApiTags('pages')
@Controller('pages')
export class PagesController {
  constructor(private readonly pagesService: PagesService) {}

  @Get(':slug')
  @ApiOperation({ summary: 'Get published page by slug' })
  @ApiQuery({ name: 'locale', enum: Locale, required: false })
  @ApiOkResponse({ description: 'Published page content' })
  findBySlug(@Param('slug') slug: string, @Query('locale') locale: Locale = Locale.ru) {
    return this.pagesService.findBySlug(slug, locale);
  }
}
