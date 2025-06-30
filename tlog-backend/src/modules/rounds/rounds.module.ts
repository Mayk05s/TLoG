import { Module } from '@nestjs/common';
import { RoundsController } from './rounds.controller';
import { RoundsService } from './rounds.service';
import { PlayerStatsService } from './player-stats.service';
import { RedisModule } from '../../cache/redis.module';

@Module({
  imports: [RedisModule],
  controllers: [RoundsController],
  providers: [RoundsService, PlayerStatsService],
  exports: [RoundsService, PlayerStatsService],
})
export class RoundsModule {}
