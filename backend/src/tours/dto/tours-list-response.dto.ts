import { ApiProperty } from '@nestjs/swagger';

import { TourListItemDto } from './tour-list-item.dto';

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

export class ToursListResponseDto {
  @ApiProperty({ type: [TourListItemDto] })
  items!: TourListItemDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta!: PaginationMetaDto;
}
