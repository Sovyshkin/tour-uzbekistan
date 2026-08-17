import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { SamoIncomingModule } from '../integrations/samo-incoming/samo-incoming.module';
import { ToursController } from './tours.controller';
import { ToursService } from './tours.service';

@Module({
  imports: [AuthModule, SamoIncomingModule],
  controllers: [ToursController],
  providers: [ToursService],
})
export class ToursModule {}
