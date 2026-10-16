import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query, Req, UseGuards, BadRequestException } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Request } from 'express';

import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { AdminAuditService } from './admin-audit.service';
import { AdminAuditEventDto, AdminAuditQueryDto } from './dto/admin-audit-query.dto';

type AuthenticatedRequest = Request & {
  user: {
    sub: string;
    email: string;
    role: UserRole;
  };
};

@ApiTags('admin-audit')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER)
@Controller('admin/audit-logs')
export class AdminAuditController {
  constructor(private readonly adminAuditService: AdminAuditService) {}

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'List admin audit logs' })
  @ApiOkResponse({ description: 'Admin audit log list' })
  list(@Query() query: AdminAuditQueryDto) {
    return this.adminAuditService.list(query);
  }

  @Post('events')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Write admin audit event' })
  @ApiOkResponse({ description: 'Admin audit event written' })
  async event(@Body() dto: AdminAuditEventDto, @Req() req: AuthenticatedRequest) {
    if (dto.action !== 'LOGOUT' || (dto.entityType && dto.entityType !== 'auth')) {
      throw new BadRequestException('Only logout events may be submitted by clients');
    }
    await this.adminAuditService.log({
      user: req.user,
      request: req,
      action: 'LOGOUT',
      entityType: 'auth',
      entityTitle: req.user.email,
    });
  }
}
