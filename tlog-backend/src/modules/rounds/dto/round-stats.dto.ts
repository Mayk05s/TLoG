import { Exclude, Expose, Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { LeaderboardEntryDto } from './leaderboard-entry.dto';

@Exclude()
export class RoundStatsDto {
  @Expose()
  @ApiProperty({ description: 'Total points awarded in the round' })
  totalPoints: number;

  @Expose()
  currentUserPoints?: number;

  @Expose()
  @Type(() => LeaderboardEntryDto)
  winner?: LeaderboardEntryDto;

  constructor(partial: Partial<RoundStatsDto>) {
    Object.assign(this, partial);
  }
}
