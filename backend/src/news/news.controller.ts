import { Controller, Get, NotFoundException, Param, Query } from '@nestjs/common';
import {
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';

import { NewsDetailDto } from './dto/news-detail.dto';
import { NewsListResponseDto } from './dto/news-list-response.dto';
import { NewsQueryDto } from './dto/news-query.dto';
import { NewsService } from './news.service';

@ApiTags('news')
@Controller('news')
export class NewsController {
  constructor(private readonly newsService: NewsService) {}

  @Get()
  @ApiOperation({ summary: 'Get published news with pagination' })
  @ApiOkResponse({ type: NewsListResponseDto })
  getNews(@Query() query: NewsQueryDto) {
    return this.newsService.getNews(query.locale, query.page, query.pageSize);
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Get a published news item by slug' })
  @ApiParam({ name: 'slug', example: 'maldives-launch' })
  @ApiOkResponse({ type: NewsDetailDto })
  @ApiNotFoundResponse({ description: 'News item not found' })
  async getNewsBySlug(
    @Param('slug') slug: string,
    @Query() query: NewsQueryDto,
  ) {
    const news = await this.newsService.getNewsBySlug(slug, query.locale);

    if (!news) {
      throw new NotFoundException(`News item with slug "${slug}" not found`);
    }

    return news;
  }
}
