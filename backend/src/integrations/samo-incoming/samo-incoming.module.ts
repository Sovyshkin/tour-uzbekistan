import { Module } from '@nestjs/common';

import { SamoIncomingService } from './samo-incoming.service';

@Module({
  providers: [SamoIncomingService],
  exports: [SamoIncomingService],
})
export class SamoIncomingModule {}
