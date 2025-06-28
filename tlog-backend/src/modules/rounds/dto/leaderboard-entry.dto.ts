import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class LeaderboardEntryDto {
  @ApiProperty({ description: 'Player username' })
  @Expose()
  username: string;

  @ApiProperty({ description: 'Player points in the round' })
  @Expose()
  points: number;

  constructor(username: string, points: number) {
    this.username = username;
    this.points = points;
  }
}
