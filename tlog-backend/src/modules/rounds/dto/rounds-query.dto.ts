import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';
import { RoundStatus } from '../enums/round-status.enum';

export class RoundsQueryDto {
  @ApiPropertyOptional({
    description: 'Filter rounds by status',
    enum: RoundStatus,
    example: RoundStatus.ACTIVE,
  })
  @IsOptional()
  @IsIn(Object.values(RoundStatus))
  status?: RoundStatus;
}
