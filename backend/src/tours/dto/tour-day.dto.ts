import { ApiProperty } from '@nestjs/swagger';

export class TourDayDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  dayNumber!: number;

  @ApiProperty({ required: false, nullable: true })
  overnightAt!: string | null;

  @ApiProperty({ required: false, nullable: true })
  image!: string | null;

  @ApiProperty()
  title!: string;

  @ApiProperty({ required: false, nullable: true })
  shortTitle!: string | null;

  @ApiProperty()
  description!: string;

  @ApiProperty({ type: [String] })
  inclusions!: string[];
}
