import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { AdminIncomingMappingDto } from './dto/admin-incoming-mapping.dto';
import { AdminIncomingMappingsService } from './admin-incoming-mappings.service';

@ApiTags('admin-incoming-mappings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.MANAGER)
@Controller('admin/incoming-mappings')
export class AdminIncomingMappingsController {
  constructor(private readonly mappingsService: AdminIncomingMappingsService) {}

  @Get()
  list(@Query('type') type?: string) {
    return this.mappingsService.list(type);
  }

  @Post()
  create(@Body() dto: AdminIncomingMappingDto) {
    return this.mappingsService.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: AdminIncomingMappingDto) {
    return this.mappingsService.update(id, dto);
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.mappingsService.delete(id);
  }
}
