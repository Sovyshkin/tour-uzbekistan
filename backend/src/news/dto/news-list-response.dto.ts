import { ApiProperty } from '@nestjs/swagger';

import { NewsListItemDto } from './news-list-item.dto';

class PaginationMetaDto {
  @ApiProperty()
  page!: number;

  @ApiProperty()
  pageSize!: number;

  @ApiProperty()
  total!: number;

  @ApiProperty()
  totalPages!: number;
}

export class NewsListResponseDto {
  @ApiProperty({ type: [NewsListItemDto] })
  items!: NewsListItemDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta!: PaginationMetaDto;
}
