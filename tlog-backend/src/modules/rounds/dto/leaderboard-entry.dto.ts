import { ApiProperty } from '@nestjs/swagger';

export class LeaderboardEntryDto {
  @ApiProperty({ description: 'Player username' })
  username: string;

  @ApiProperty({ description: 'Player points in the round' })
  points: number;
}
