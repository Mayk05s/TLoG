import { ApiProperty } from '@nestjs/swagger';
import { LeaderboardEntryDto } from './leaderboard-entry.dto';

export class StatsResponseDto {
  @ApiProperty({ description: 'Current player points in the round' })
  playerPoints: number;

  @ApiProperty({
    description: 'Top N players leaderboard',
    type: [LeaderboardEntryDto],
  })
  leaderboard: LeaderboardEntryDto[];
}
