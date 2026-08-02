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

import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { NewsDetailDto } from './dto/news-detail.dto';
import { NewsListResponseDto } from './dto/news-list-response.dto';
import { NewsQueryDto } from './dto/news-query.dto';
import { NewsService } from './news.service';

type RequestWithOptionalUser = Request & {
  user?: {
    sub: string;
    email: string;
    role: string;
  } | null;
};

@ApiTags('news')
@Controller('news')
@UseGuards(OptionalJwtAuthGuard)
@ApiBearerAuth()
export class NewsController {
  constructor(private readonly newsService: NewsService) {}

  @Get()
  @ApiOperation({ summary: 'Get published news with pagination' })
  @ApiOkResponse({ type: NewsListResponseDto })
  getNews(@Query() query: NewsQueryDto, @Req() req: RequestWithOptionalUser) {
    return this.newsService.getNews(query.locale, query.page, query.pageSize, req.user);
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Get a published news item by slug' })
  @ApiParam({ name: 'slug', example: 'maldives-launch' })
  @ApiOkResponse({ type: NewsDetailDto })
  @ApiNotFoundResponse({ description: 'News item not found' })
  async getNewsBySlug(
    @Param('slug') slug: string,
    @Query() query: NewsQueryDto,
    @Req() req: RequestWithOptionalUser,
  ) {
    const news = await this.newsService.getNewsBySlug(slug, query.locale, req.user);

    if (!news) {
      throw new NotFoundException(`News item with slug "${slug}" not found`);
    }

    return news;
  }
}
