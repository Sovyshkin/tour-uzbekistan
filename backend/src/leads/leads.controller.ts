import { Body, Controller, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { CreateLeadDto } from './dto/create-lead.dto';
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
  createLead(@Body() dto: CreateLeadDto) {
    return this.leadsService.createLead(dto);
  }
}
