import { ApiProperty } from '@nestjs/swagger';

import { ServiceListItemDto } from './service-list-item.dto';

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

export class ServicesListResponseDto {
  @ApiProperty({ type: [ServiceListItemDto] })
  items!: ServiceListItemDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta!: PaginationMetaDto;
}
