import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';

export enum AdminRecordType {
  USERS = 'users',
  PARTNERS = 'partners',
  LEADS = 'leads',
  BOOKINGS = 'bookings',
}

export class AdminRecordsQueryDto {
  @ApiProperty({ enum: AdminRecordType })
  @IsEnum(AdminRecordType)
  type!: AdminRecordType;
}
