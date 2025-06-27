import { ApiProperty } from '@nestjs/swagger';

export class TapResponseDto {
  @ApiProperty({ description: 'Operation success status' })
  success: boolean;

  @ApiProperty({ description: 'Current player points in the round' })
  playerPoints: number;

  @ApiProperty({ description: 'Total taps count for the player' })
  totalTaps: number;
}
