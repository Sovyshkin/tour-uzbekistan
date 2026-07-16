import { ApiProperty } from '@nestjs/swagger';

export class ServiceListItemDto {
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
  previewImage!: string | null;

  @ApiProperty()
  isFeatured!: boolean;
}
