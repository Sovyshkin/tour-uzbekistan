import { ApiProperty } from '@nestjs/swagger';

import { WhyUsFactDto } from './why-us-fact.dto';

export class WhyUsCategoryListItemDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  slug!: string;

  @ApiProperty({ required: false, nullable: true })
  heroImage!: string | null;

  @ApiProperty()
  title!: string;

  @ApiProperty({ required: false, nullable: true })
  subtitle!: string | null;

  @ApiProperty({ required: false, nullable: true })
  description!: string | null;

  @ApiProperty({ type: [WhyUsFactDto] })
  facts!: WhyUsFactDto[];
}
