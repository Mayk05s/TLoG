import { Exclude, Expose, Type } from 'class-transformer';
import { LeaderboardEntryDto } from './round-details.dto';
import { ApiProperty } from '@nestjs/swagger';

@Exclude()
export class RoundStatsDto {
  @Expose()
  @Type(() => LeaderboardEntryDto)
  winner?: LeaderboardEntryDto;

  @Expose()
  @ApiProperty({ description: 'Total points awarded in the round' })
  totalPoints: number;

  @Expose()
  currentUserPoints?: number;
}
