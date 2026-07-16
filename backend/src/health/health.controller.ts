import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';

import { HealthService } from './health.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOkResponse({
    description: 'Health check endpoint',
    schema: {
      example: {
        status: 'ok',
        service: 'tour-uzbekistan-backend',
        timestamp: '2026-07-11T00:00:00.000Z',
      },
    },
  })
  getHealth() {
    return this.healthService.getHealth();
  }
}
