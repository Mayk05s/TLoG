import { Exclude, Expose, Type } from 'class-transformer';
import { LeaderboardEntryDto } from './round-details.dto';
import { RoundStatsDto } from './round-stats.dto';

@Exclude()
export class RealtimeStatsDto {
  @Expose()
  @Type(() => LeaderboardEntryDto)
  leaderboard: LeaderboardEntryDto[];

  @Expose()
  @Type(() => RoundStatsDto)
  stats: RoundStatsDto;

  @Expose()
  timestamp: number;

  constructor(partial: Partial<RealtimeStatsDto>) {
    Object.assign(this, partial);
  }
}
