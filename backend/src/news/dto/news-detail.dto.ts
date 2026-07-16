import { ApiProperty } from '@nestjs/swagger';

export class NewsDetailDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  slug!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty({ required: false, nullable: true })
  excerpt!: string | null;

  @ApiProperty({ required: false, nullable: true })
  heroImage!: string | null;

  @ApiProperty({ required: false, nullable: true })
  previewImage!: string | null;

  @ApiProperty({ required: false, nullable: true })
  publishedAt!: string | null;

  @ApiProperty({ type: [String] })
  content!: string[];

  @ApiProperty({ required: false, nullable: true })
  seoTitle!: string | null;

  @ApiProperty({ required: false, nullable: true })
  seoDescription!: string | null;
}
