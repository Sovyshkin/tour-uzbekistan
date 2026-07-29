import { ApiProperty } from '@nestjs/swagger';

class HomeBannerDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  slug!: string;

  @ApiProperty()
  imageUrl!: string;

  @ApiProperty({ required: false, nullable: true })
  mobileImageUrl!: string | null;

  @ApiProperty({ required: false, nullable: true })
  linkUrl!: string | null;

  @ApiProperty()
  title!: string;

  @ApiProperty({ required: false, nullable: true })
  subtitle!: string | null;

  @ApiProperty({ required: false, nullable: true })
  buttonLabel!: string | null;

  @ApiProperty({ required: false, nullable: true })
  altText!: string | null;
}

class HomeCountryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  slug!: string;

  @ApiProperty({ required: false, nullable: true })
  heroImage!: string | null;

  @ApiProperty({ required: false, nullable: true })
  flagImage!: string | null;

  @ApiProperty()
  name!: string;

  @ApiProperty({ required: false, nullable: true })
  intro!: string | null;
}

class HomeTourDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  slug!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty({ required: false, nullable: true })
  subtitle!: string | null;

  @ApiProperty()
  route!: string;

  @ApiProperty({ required: false, nullable: true })
  image!: string | null;

  @ApiProperty()
  durationDays!: number;

  @ApiProperty()
  durationNights!: number;

  @ApiProperty({ required: false, nullable: true })
  priceFrom!: string | null;

  @ApiProperty({ required: false, nullable: true })
  currency!: string | null;
}

class HomeServiceDto {
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
}

class HomeWhyFactDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty({ required: false, nullable: true })
  subtitle!: string | null;

  @ApiProperty()
  description!: string;

  @ApiProperty({ required: false, nullable: true })
  imageUrl!: string | null;
}

class HomeWhyCategoryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  slug!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty({ required: false, nullable: true })
  subtitle!: string | null;

  @ApiProperty({ required: false, nullable: true })
  description!: string | null;

  @ApiProperty({ type: [HomeWhyFactDto] })
  facts!: HomeWhyFactDto[];
}

class HomeNewsDto {
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

export class HomeResponseDto {
  @ApiProperty({ type: [HomeBannerDto] })
  banners!: HomeBannerDto[];

  @ApiProperty({ type: [HomeCountryDto] })
  countries!: HomeCountryDto[];

  @ApiProperty({ type: [HomeTourDto] })
  recommendedTours!: HomeTourDto[];

  @ApiProperty({ type: [HomeServiceDto] })
  services!: HomeServiceDto[];

  @ApiProperty({ type: [HomeWhyCategoryDto] })
  whyWe!: HomeWhyCategoryDto[];

  @ApiProperty({ type: [HomeNewsDto] })
  latestNews!: HomeNewsDto[];
}
