import { Body, Controller, Get, HttpCode, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { AdminIncomingSearchService } from './admin-incoming-search.service';
import { AdminIncomingSearchDto } from './dto/admin-incoming-search.dto';

@ApiTags('admin-incoming-search')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.MANAGER)
@Controller('admin/incoming-search')
export class AdminIncomingSearchController {
  constructor(private readonly incomingSearchService: AdminIncomingSearchService) {}

  @Post('search')
  @HttpCode(200)
  @ApiOperation({ summary: 'Run SAMO XMLGate reference request from admin panel' })
  @ApiOkResponse({ description: 'SAMO XMLGate diagnostic result' })
  search(@Body() dto: AdminIncomingSearchDto) {
    return this.incomingSearchService.search(dto);
  }

  @Get('reference/:type')
  @ApiOperation({ summary: 'Load SAMO XMLGate reference by type' })
  @ApiOkResponse({ description: 'SAMO XMLGate reference result' })
  reference(@Param('type') type: string, @Query('extraParams') extraParams?: string) {
    return this.incomingSearchService.reference(type, extraParams);
  }

  @Get('hotel/:hotelCode')
  @ApiOperation({ summary: 'Resolve replicated technical hotel and price from SAMO XMLGate' })
  @ApiOkResponse({ description: 'SAMO XMLGate hotel resolve result' })
  hotel(@Param('hotelCode') hotelCode: string) {
    return this.incomingSearchService.resolveHotel(hotelCode);
  }
}
