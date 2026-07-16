import { ApiProperty } from '@nestjs/swagger';

export class WhyUsFactDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ required: false, nullable: true })
  imageUrl!: string | null;

  @ApiProperty()
  title!: string;

  @ApiProperty({ required: false, nullable: true })
  subtitle!: string | null;

  @ApiProperty()
  description!: string;
}
