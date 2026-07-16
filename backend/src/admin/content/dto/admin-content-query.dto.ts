import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';

export enum AdminContentType {
  PAGES = 'pages',
  SITE_SETTINGS = 'siteSettings',
  MEDIA = 'media',
  HOME_BANNERS = 'homeBanners',
  COUNTRIES = 'countries',
  TOURS = 'tours',
  SERVICES = 'services',
  WHY_CATEGORIES = 'whyCategories',
  NEWS = 'news',
}

export class AdminContentQueryDto {
  @ApiProperty({ enum: AdminContentType })
  @IsEnum(AdminContentType)
  type!: AdminContentType;
}
