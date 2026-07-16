import { ApiProperty } from '@nestjs/swagger';

export class ServiceDetailDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  slug!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ required: false, nullable: true })
  title!: string | null;

  @ApiProperty({ required: false, nullable: true })
  subtitle!: string | null;

  @ApiProperty({ required: false, nullable: true })
  shortDescription!: string | null;

  @ApiProperty({ required: false, nullable: true })
  heroImage!: string | null;

  @ApiProperty({ required: false, nullable: true })
  previewImage!: string | null;

  @ApiProperty({ type: [String] })
  content!: string[];

  @ApiProperty({ required: false, nullable: true })
  seoTitle!: string | null;

  @ApiProperty({ required: false, nullable: true })
  seoDescription!: string | null;

  @ApiProperty()
  leadFormEnabled!: boolean;
}
