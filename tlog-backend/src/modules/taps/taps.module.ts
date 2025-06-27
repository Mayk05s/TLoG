import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { TapsController } from './taps.controller';
import { TapsService } from './taps.service';
import { BatchService } from './batch.service';
import { BackgroundBatchService } from './background-batch.service';
import { RoundsService } from '../rounds/rounds.service';

@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        name: 'tap-rate',
        ttl: 1000, // 1 second
        limit: 20, // 20 requests per second per user
      },
    ]),
  ],
  controllers: [TapsController],
  providers: [TapsService, BatchService, BackgroundBatchService, RoundsService],
  exports: [TapsService, BatchService, BackgroundBatchService],
})
export class TapsModule {}
