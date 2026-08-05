import { Body, Controller, Post, UseGuards } from '@nestjs/common';
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
  @ApiOperation({ summary: 'Run SAMO Incoming wizard search from admin panel' })
  @ApiOkResponse({ description: 'SAMO Incoming search diagnostic result' })
  search(@Body() dto: AdminIncomingSearchDto) {
    return this.incomingSearchService.search(dto);
  }
}
