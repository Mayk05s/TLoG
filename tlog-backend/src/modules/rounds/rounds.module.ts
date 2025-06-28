import { Module } from '@nestjs/common';
import { RoundsController } from './rounds.controller';
import { RoundsService } from './rounds.service';
import { RoundsGateway } from './rounds.gateway';
import { RedisModule } from '../../cache/redis.module';

@Module({
  imports: [RedisModule],
  controllers: [RoundsController],
  providers: [RoundsService, RoundsGateway],
  exports: [RoundsService, RoundsGateway],
})
export class RoundsModule {}
