import { Module } from '@nestjs/common';
import { TapsController } from './taps.controller';
import { TapsService } from './taps.service';
import { RoundsService } from '../rounds/rounds.service';

@Module({
  controllers: [TapsController],
  providers: [TapsService, RoundsService],
})
export class TapsModule {}
