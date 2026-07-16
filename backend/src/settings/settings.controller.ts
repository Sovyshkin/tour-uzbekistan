import { Controller, Get, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Locale } from '@prisma/client';

import { SettingsService } from './settings.service';

@ApiTags('settings')
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  @ApiOperation({ summary: 'Get public CMS text settings' })
  @ApiQuery({ name: 'locale', enum: Locale, required: false })
  @ApiOkResponse({ description: 'Public settings by key' })
  getPublicSettings(@Query('locale') locale: Locale = Locale.ru) {
    return this.settingsService.getPublicSettings(locale);
  }
}
