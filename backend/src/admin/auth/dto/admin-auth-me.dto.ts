import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

export class AdminAuthMeDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty()
  firstName!: string;

  @ApiProperty()
  lastName!: string;

  @ApiProperty()
  displayName!: string;

  @ApiProperty({ enum: UserRole, enumName: 'UserRole' })
  role!: UserRole;

  @ApiProperty()
  preferredLocale!: string;
}
