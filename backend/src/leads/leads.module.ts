import { Module } from '@nestjs/common';

import { AdminAuditService } from '../admin/audit/admin-audit.service';
import { LeadsController } from './leads.controller';
import { LeadsService } from './leads.service';

@Module({
  controllers: [LeadsController],
  providers: [LeadsService, AdminAuditService],
})
export class LeadsModule {}
