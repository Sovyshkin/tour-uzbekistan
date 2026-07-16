import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Request } from 'express';

import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { AdminAuditService } from '../audit/admin-audit.service';
import { AdminContentService } from './admin-content.service';
import { AdminContentCreateDto } from './dto/admin-content-create.dto';
import { AdminContentQueryDto, AdminContentType } from './dto/admin-content-query.dto';
import { AdminContentUpdateDto } from './dto/admin-content-update.dto';

@ApiTags('admin-content')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.MANAGER)
@Controller('admin/content')
export class AdminContentController {
  constructor(
    private readonly adminContentService: AdminContentService,
    private readonly adminAuditService: AdminAuditService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List editable content records by type' })
  @ApiOkResponse({ description: 'Editable content records' })
  list(@Query() query: AdminContentQueryDto) {
    return this.adminContentService.list(query.type);
  }

  @Post(':type')
  @ApiOperation({ summary: 'Create editable content record' })
  @ApiOkResponse({ description: 'Created content record' })
  async create(
    @Param('type') type: AdminContentType,
    @Body() dto: AdminContentCreateDto,
    @Req() req: Request & { user: { sub: string; email: string; role: UserRole } },
  ) {
    const result = await this.adminContentService.create(type, dto);
    await this.adminAuditService.log({
      user: req.user,
      request: req,
      action: 'CREATE',
      entityType: `content:${type}`,
      entityId: result?.id,
      entityTitle: result?.title ?? dto.slug,
      metadata: { slug: dto.slug },
    });
    return result;
  }

  @Patch(':type/:id')
  @ApiOperation({ summary: 'Update editable content record and translations' })
  @ApiOkResponse({ description: 'Updated content record' })
  async update(
    @Param('type') type: AdminContentType,
    @Param('id') id: string,
    @Body() dto: AdminContentUpdateDto,
    @Req() req: Request & { user: { sub: string; email: string; role: UserRole } },
  ) {
    const result = await this.adminContentService.update(type, id, dto);
    await this.adminAuditService.log({
      user: req.user,
      request: req,
      action: 'UPDATE',
      entityType: `content:${type}`,
      entityId: id,
      entityTitle: result?.title ?? dto.slug,
      metadata: { slug: dto.slug },
    });
    return result;
  }

  @Delete(':type/:id')
  @ApiOperation({ summary: 'Archive, disable or delete editable content record' })
  @ApiOkResponse({ description: 'Updated content records list' })
  async archive(
    @Param('type') type: AdminContentType,
    @Param('id') id: string,
    @Req() req: Request & { user: { sub: string; email: string; role: UserRole } },
  ) {
    const result = await this.adminContentService.archive(type, id);
    await this.adminAuditService.log({
      user: req.user,
      request: req,
      action: 'ARCHIVE',
      entityType: `content:${type}`,
      entityId: id,
    });
    return result;
  }
}
