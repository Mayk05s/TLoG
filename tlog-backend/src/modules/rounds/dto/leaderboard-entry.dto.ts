import { ApiProperty } from '@nestjs/swagger';

export class LeaderboardEntryDto {
  @ApiProperty({ description: 'Player id' })
  userId: string;

  @ApiProperty({ description: 'Player points in the round' })
  points: number;

  constructor(userId: string, points: number) {
    this.userId = userId;
    this.points = points;
  }
}
