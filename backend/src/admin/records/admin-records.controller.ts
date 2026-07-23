import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Request } from 'express';

import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { AdminAuditService } from '../audit/admin-audit.service';
import { AdminRecordCreateDto } from './dto/admin-record-create.dto';
import { AdminRecordUpdateDto } from './dto/admin-record-update.dto';
import { AdminRecordType, AdminRecordsQueryDto } from './dto/admin-records-query.dto';
import { AdminUserPasswordUpdateDto } from './dto/admin-user-password-update.dto';
import { AdminRecordsService } from './admin-records.service';

@ApiTags('admin-records')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.MANAGER)
@Controller('admin/records')
export class AdminRecordsController {
  constructor(
    private readonly adminRecordsService: AdminRecordsService,
    private readonly adminAuditService: AdminAuditService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List admin operational records' })
  @ApiOkResponse({ description: 'Admin records list' })
  list(@Query() query: AdminRecordsQueryDto) {
    return this.adminRecordsService.list(query.type);
  }

  @Post(':type')
  @ApiOperation({ summary: 'Create admin operational record' })
  @ApiOkResponse({ description: 'Created records list' })
  async create(
    @Param('type') type: AdminRecordType,
    @Body() dto: AdminRecordCreateDto,
    @Req() req: Request & { user: { sub: string; email: string; role: UserRole } },
  ) {
    const result = await this.adminRecordsService.create(type, dto);
    await this.adminAuditService.log({
      user: req.user,
      request: req,
      action: 'CREATE',
      entityType: `record:${type}`,
      entityTitle: dto.email ?? dto.name ?? dto.slug,
    });
    return result;
  }

  @Patch('users/:id/password')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Change user password. Super admin only' })
  @ApiOkResponse({ description: 'Updated users list' })
  async updateUserPassword(
    @Param('id') id: string,
    @Body() dto: AdminUserPasswordUpdateDto,
    @Req() req: Request & { user: { sub: string; email: string; role: UserRole } },
  ) {
    const result = await this.adminRecordsService.updateUserPassword(id, dto.password, req.user);
    await this.adminAuditService.log({
      user: req.user,
      request: req,
      action: 'UPDATE',
      entityType: 'record:users',
      entityId: id,
      metadata: { passwordChanged: true },
    });
    return result;
  }

  @Delete('users/:id/permanent')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Permanently delete user. Super admin only' })
  @ApiOkResponse({ description: 'Updated users list' })
  async deleteUser(
    @Param('id') id: string,
    @Req() req: Request & { user: { sub: string; email: string; role: UserRole } },
  ) {
    const result = await this.adminRecordsService.deleteUser(id, req.user);
    await this.adminAuditService.log({
      user: req.user,
      request: req,
      action: 'ARCHIVE',
      entityType: 'record:users',
      entityId: id,
      metadata: { permanentlyDeleted: true },
    });
    return result;
  }

  @Patch(':type/:id')
  @ApiOperation({ summary: 'Update admin operational record' })
  @ApiOkResponse({ description: 'Updated records list' })
  async update(
    @Param('type') type: AdminRecordType,
    @Param('id') id: string,
    @Body() dto: AdminRecordUpdateDto,
    @Req() req: Request & { user: { sub: string; email: string; role: UserRole } },
  ) {
    const result = await this.adminRecordsService.update(type, id, dto);
    await this.adminAuditService.log({
      user: req.user,
      request: req,
      action: 'UPDATE',
      entityType: `record:${type}`,
      entityId: id,
      metadata: dto,
    });
    return result;
  }

  @Delete(':type/:id')
  @ApiOperation({ summary: 'Archive or disable admin operational record' })
  @ApiOkResponse({ description: 'Updated records list' })
  async archive(
    @Param('type') type: AdminRecordType,
    @Param('id') id: string,
    @Req() req: Request & { user: { sub: string; email: string; role: UserRole } },
  ) {
    const result = await this.adminRecordsService.archive(type, id);
    await this.adminAuditService.log({
      user: req.user,
      request: req,
      action: 'ARCHIVE',
      entityType: `record:${type}`,
      entityId: id,
    });
    return result;
  }
}
