import { Module } from '@nestjs/common';
import { TapsController } from './taps.controller';
import { TapsService } from './taps.service';
import { BatchService } from './batch.service';
import { BackgroundBatchService } from './background-batch.service';
import { DatabaseModule } from '../../database/database.module';
import { RedisModule } from '../../database/redis.module';
import { RoundsModule } from '../rounds/rounds.module';

const throttlerConfig = {
  name: 'tap-rate',
  ttl: 1000, // 1 second
  limit: 20, // 20 requests per second per user
};

@Module({
  imports: [
    // ThrottlerModule.forRoot([throttlerConfig]),
    DatabaseModule,
    RedisModule,
    RoundsModule,
  ],
  controllers: [TapsController],
  providers: [TapsService, BatchService, BackgroundBatchService],
  exports: [TapsService, BatchService],
})
export class TapsModule {}
