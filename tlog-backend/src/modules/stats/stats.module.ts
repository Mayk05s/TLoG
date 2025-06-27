import { Module } from '@nestjs/common';
import { StatsController } from './stats.controller';
import { StatsService } from './stats.service';
import { TapsModule } from '../taps/taps.module';
import { RedisModule } from '../../cache/redis.module';

@Module({
  imports: [TapsModule, RedisModule],
  controllers: [StatsController],
  providers: [StatsService],
  exports: [StatsService],
})
export class StatsModule {}
