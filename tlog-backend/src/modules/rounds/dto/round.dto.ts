import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose, Transform } from 'class-transformer';
import { RoundStatus } from '../enums/round-status.enum';

@Exclude()
export class RoundDto {
  @Expose()
  @ApiProperty({ description: 'Round ID' })
  id: string;

  @Expose()
  @Transform(({ value }) => (value instanceof Date ? value.getTime() : value))
  @ApiProperty({ description: 'Round start time (timestamp)' })
  startsAt: number;

  @Expose()
  @Transform(({ value }) => (value instanceof Date ? value.getTime() : value))
  @ApiProperty({ description: 'Round end time (timestamp)' })
  endsAt: number;

  @Expose()
  @Transform(({ value }) => (value instanceof Date ? value.getTime() : value))
  @ApiProperty({ description: 'Round creation time (timestamp)' })
  createdAt: number;

  @Expose()
  get status(): RoundStatus {
    const now = new Date().getTime();
    if (now < this.startsAt) {
      return RoundStatus.UPCOMING;
    } else if (now >= this.startsAt && now <= this.endsAt) {
      return RoundStatus.ACTIVE;
    } else {
      return RoundStatus.COMPLETED;
    }
  }

  constructor(partial: any) {
    Object.assign(this, partial);
  }
}
