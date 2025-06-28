import { ApiPropertyOptional } from '@nestjs/swagger';
import { Exclude, Expose, Type } from 'class-transformer';
import { RoundDto } from './round.dto';
import { LeaderboardEntryDto } from './leaderboard-entry.dto';
import { RoundStatsDto } from './round-stats.dto';

@Exclude()
export class RoundDetailsDto extends RoundDto {
  @Expose()
  @Type(() => RoundStatsDto)
  stats?: RoundStatsDto;

  @Expose()
  @ApiPropertyOptional({ description: 'Top players leaderboard', type: [LeaderboardEntryDto] })
  @Type(() => LeaderboardEntryDto)
  leaderboard?: LeaderboardEntryDto[];

  constructor(partial: any) {
    super(partial);
  }
}
