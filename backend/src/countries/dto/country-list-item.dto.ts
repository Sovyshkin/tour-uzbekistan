import { ApiProperty } from '@nestjs/swagger';

export class CountryListItemDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  slug!: string;

  @ApiProperty({ required: false, nullable: true })
  isoCode!: string | null;

  @ApiProperty({ required: false, nullable: true })
  heroImage!: string | null;

  @ApiProperty({ required: false, nullable: true })
  flagImage!: string | null;

  @ApiProperty()
  name!: string;

  @ApiProperty({ required: false, nullable: true })
  welcomeTitle!: string | null;

  @ApiProperty({ required: false, nullable: true })
  intro!: string | null;

  @ApiProperty()
  isFeatured!: boolean;
}
