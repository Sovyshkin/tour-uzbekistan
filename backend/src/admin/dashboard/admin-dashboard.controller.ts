import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { AdminDashboardDto } from './dto/admin-dashboard.dto';
import { AdminDashboardService } from './admin-dashboard.service';

@ApiTags('admin-dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.MANAGER)
@Controller('admin/dashboard')
export class AdminDashboardController {
  constructor(private readonly adminDashboardService: AdminDashboardService) {}

  @Get()
  @ApiOperation({ summary: 'Get admin dashboard summary' })
  @ApiOkResponse({ type: AdminDashboardDto })
  getDashboard() {
    return this.adminDashboardService.getSummary();
  }
}
