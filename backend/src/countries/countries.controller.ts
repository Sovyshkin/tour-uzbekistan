import { Controller, Get, NotFoundException, Param, Query } from '@nestjs/common';
import {
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';

import { CountriesService } from './countries.service';
import { CountriesQueryDto } from './dto/countries-query.dto';
import { CountryDetailDto } from './dto/country-detail.dto';
import { CountryListItemDto } from './dto/country-list-item.dto';

@ApiTags('countries')
@Controller('countries')
export class CountriesController {
  constructor(private readonly countriesService: CountriesService) {}

  @Get()
  @ApiOperation({ summary: 'Get published countries' })
  @ApiOkResponse({ type: CountryListItemDto, isArray: true })
  getCountries(@Query() query: CountriesQueryDto) {
    return this.countriesService.getCountries(query.locale);
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Get a published country by slug' })
  @ApiParam({ name: 'slug', example: 'uzbekistan' })
  @ApiOkResponse({ type: CountryDetailDto })
  @ApiNotFoundResponse({ description: 'Country not found' })
  async getCountryBySlug(
    @Param('slug') slug: string,
    @Query() query: CountriesQueryDto,
  ) {
    const country = await this.countriesService.getCountryBySlug(slug, query.locale);

    if (!country) {
      throw new NotFoundException(`Country with slug "${slug}" not found`);
    }

    return country;
  }
}
