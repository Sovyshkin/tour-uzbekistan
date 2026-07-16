import { ApiProperty } from '@nestjs/swagger';

class CountryCityDto {
  @ApiProperty()
  code!: string;

  @ApiProperty()
  name!: string;
}

class CountrySectionItemDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty({ required: false, nullable: true })
  text!: string | null;
}

export class CountryDetailDto {
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

  @ApiProperty({ required: false, nullable: true })
  sidebarTitle!: string | null;

  @ApiProperty({ type: [CountryCityDto] })
  cities!: CountryCityDto[];

  @ApiProperty({ type: [CountrySectionItemDto] })
  toc!: CountrySectionItemDto[];

  @ApiProperty({ type: [CountrySectionItemDto] })
  sections!: CountrySectionItemDto[];

  @ApiProperty({ required: false, nullable: true })
  seoTitle!: string | null;

  @ApiProperty({ required: false, nullable: true })
  seoDescription!: string | null;
}
