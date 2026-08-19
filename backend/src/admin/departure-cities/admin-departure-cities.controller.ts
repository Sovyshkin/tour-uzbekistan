import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { AdminDepartureCitiesService } from './admin-departure-cities.service';
import { AdminDepartureCityDto } from './dto/admin-departure-city.dto';

@ApiTags('admin-departure-cities')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.MANAGER)
@Controller('admin/departure-cities')
export class AdminDepartureCitiesController {
  constructor(private readonly citiesService: AdminDepartureCitiesService) {}

  @Get()
  list() {
    return this.citiesService.list();
  }

  @Post()
  create(@Body() dto: AdminDepartureCityDto) {
    return this.citiesService.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: AdminDepartureCityDto) {
    return this.citiesService.update(id, dto);
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.citiesService.delete(id);
  }
}
