import { Module } from '@nestjs/common';

import { DepartureCitiesController } from './departure-cities.controller';
import { DepartureCitiesService } from './departure-cities.service';

@Module({
  controllers: [DepartureCitiesController],
  providers: [DepartureCitiesService],
})
export class DepartureCitiesModule {}
