import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { AdminAuditService } from '../admin/audit/admin-audit.service';
import { SamoIncomingModule } from '../integrations/samo-incoming/samo-incoming.module';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';

@Module({
  imports: [AuthModule, SamoIncomingModule],
  controllers: [BookingsController],
  providers: [BookingsService, AdminAuditService],
})
export class BookingsModule {}
