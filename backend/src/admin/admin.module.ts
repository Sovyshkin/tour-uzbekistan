import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { AdminAuditController } from './audit/admin-audit.controller';
import { AdminAuditService } from './audit/admin-audit.service';
import { AdminAuthController } from './auth/admin-auth.controller';
import { AdminAuthService } from './auth/admin-auth.service';
import { AdminContentController } from './content/admin-content.controller';
import { AdminContentService } from './content/admin-content.service';
import { AdminDashboardController } from './dashboard/admin-dashboard.controller';
import { AdminDashboardService } from './dashboard/admin-dashboard.service';
import { AdminMediaController } from './media/admin-media.controller';
import { AdminMediaService } from './media/admin-media.service';
import { AdminRecordsController } from './records/admin-records.controller';
import { AdminRecordsService } from './records/admin-records.service';

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [
    AdminAuthController,
    AdminAuditController,
    AdminContentController,
    AdminDashboardController,
    AdminMediaController,
    AdminRecordsController,
  ],
  providers: [
    AdminAuthService,
    AdminAuditService,
    AdminContentService,
    AdminDashboardService,
    AdminMediaService,
    AdminRecordsService,
  ],
})
export class AdminModule {}
