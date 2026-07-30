import { Module } from '@nestjs/common';

import { AdminAuditService } from '../admin/audit/admin-audit.service';
import { SamoIncomingModule } from '../integrations/samo-incoming/samo-incoming.module';
import { LeadsController } from './leads.controller';
import { LeadsService } from './leads.service';

@Module({
  imports: [SamoIncomingModule],
  controllers: [LeadsController],
  providers: [LeadsService, AdminAuditService],
})
export class LeadsModule {}
