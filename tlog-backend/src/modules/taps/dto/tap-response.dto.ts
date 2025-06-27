import { ApiProperty } from '@nestjs/swagger';

export class TapResponseDto {
  @ApiProperty({ description: 'Operation success status' })
  success: boolean;
}
