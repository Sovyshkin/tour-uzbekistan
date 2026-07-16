import { ApiProperty } from '@nestjs/swagger';
import { LeadStatus, LeadType, Locale } from '@prisma/client';

export class CreateLeadResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ enum: LeadType, enumName: 'LeadType' })
  type!: LeadType;

  @ApiProperty({ enum: LeadStatus, enumName: 'LeadStatus' })
  status!: LeadStatus;

  @ApiProperty({ enum: Locale, enumName: 'Locale' })
  language!: Locale;

  @ApiProperty()
  createdAt!: string;
}
