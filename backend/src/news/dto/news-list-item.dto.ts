import { ApiProperty } from '@nestjs/swagger';

export class NewsListItemDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  slug!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty({ required: false, nullable: true })
  excerpt!: string | null;

  @ApiProperty({ required: false, nullable: true })
  previewImage!: string | null;

  @ApiProperty({ required: false, nullable: true })
  publishedAt!: string | null;
}
