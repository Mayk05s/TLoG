import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class RoundDto {
  @Expose()
  @ApiProperty({ description: 'Round ID' })
  id: string;

  @Expose()
  @ApiProperty({ description: 'Round start time' })
  startsAt: Date;

  @Expose()
  @ApiProperty({ description: 'Round end time' })
  endsAt: Date;

  @Expose()
  @ApiProperty({ description: 'Round creation time' })
  createdAt: Date;

  constructor(partial: Partial<RoundDto>) {
    Object.assign(this, partial);
  }
}
