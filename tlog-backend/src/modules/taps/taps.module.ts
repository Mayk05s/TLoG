import { Module } from '@nestjs/common';
import { TapsController } from './taps.controller';
import { TapsService } from './taps.service';
import { TapCacheService } from '../../cache/tap-cache.service';
import { DatabaseModule } from '../../database/database.module';
import { RedisModule } from '../../cache/redis.module';
import { RoundsModule } from '../rounds/rounds.module';
import { FlushWorker } from '../../workers/flush.worker';

@Module({
  imports: [DatabaseModule, RedisModule, RoundsModule],
  controllers: [TapsController],
  providers: [TapsService, TapCacheService, FlushWorker],
  exports: [TapsService, TapCacheService],
})
export class TapsModule {}
