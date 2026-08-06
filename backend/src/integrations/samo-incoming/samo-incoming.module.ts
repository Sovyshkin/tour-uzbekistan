import { Module } from '@nestjs/common';

import { PrismaModule } from '../../prisma/prisma.module';
import { SamoIncomingService } from './samo-incoming.service';

@Module({
  imports: [PrismaModule],
  providers: [SamoIncomingService],
  exports: [SamoIncomingService],
})
export class SamoIncomingModule {}
