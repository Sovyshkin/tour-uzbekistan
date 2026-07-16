import { ApiProperty } from '@nestjs/swagger';

export class TourImageDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  imageUrl!: string;

  @ApiProperty()
  isCover!: boolean;

  @ApiProperty({ required: false, nullable: true })
  altText!: string | null;

  @ApiProperty({ required: false, nullable: true })
  caption!: string | null;
}
