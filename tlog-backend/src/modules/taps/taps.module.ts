import { Module } from '@nestjs/common';
import { TapsController } from './taps.controller';
import { TapsService } from './taps.service';
import { TapCacheService } from '../../cache/tap-cache.service';
import { DatabaseModule } from '../../database/database.module';
import { RedisModule } from '../../cache/redis.module';
import { RoundsModule } from '../rounds/rounds.module';

// If we need to use throttling, we can uncomment the following lines and import ThrottlerModule
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
  providers: [TapsService, TapCacheService],
  exports: [TapsService, TapCacheService],
})
export class TapsModule {}
