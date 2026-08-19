import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { DepartureCitiesService } from './departure-cities.service';

@ApiTags('departure-cities')
@Controller('departure-cities')
export class DepartureCitiesController {
  constructor(private readonly departureCitiesService: DepartureCitiesService) {}

  @Get()
  @ApiOperation({ summary: 'Get active departure cities' })
  @ApiOkResponse({ description: 'Departure cities list' })
  list() {
    return this.departureCitiesService.listActive();
  }
}
