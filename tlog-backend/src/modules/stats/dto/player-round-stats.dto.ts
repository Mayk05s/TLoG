import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class PlayerRoundStatsDto {
  @Expose()
  @ApiProperty({ description: 'User ID' })
  userId: string;

  @Expose()
  @ApiProperty({ description: 'Round ID' })
  roundId: string;

  @Expose()
  @ApiProperty({ description: 'Number of taps' })
  taps: number;

  @Expose()
  @ApiProperty({ description: 'Points earned' })
  points: number;

  constructor(partial: Partial<PlayerRoundStatsDto>) {
    Object.assign(this, partial);
  }
}
