import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Request } from 'express';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateLeadDto, CreatePartnerRequestDto } from './dto/create-lead.dto';
import { CreateLeadResponseDto } from './dto/create-lead-response.dto';
import { LeadsService } from './leads.service';

@ApiTags('leads')
@Controller('leads')
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a lead from public forms' })
  @ApiCreatedResponse({ type: CreateLeadResponseDto })
  @ApiBadRequestResponse({ description: 'Validation failed or related entity not found' })
  createLead(@Body() dto: CreateLeadDto, @Req() req: Request) {
    return this.leadsService.createLead(dto, req);
  }

  @Post('partner-request')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Create a partner tour request without manual contact fields' })
  @ApiCreatedResponse({ type: CreateLeadResponseDto })
  createPartnerRequest(
    @Body() dto: CreatePartnerRequestDto,
    @Req() req: Request & { user: { sub: string; role: string } },
  ) {
    return this.leadsService.createPartnerRequest(dto, req.user.sub, req.user.role, req);
  }
}
