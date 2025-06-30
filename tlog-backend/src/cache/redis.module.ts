import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis, { Redis as RedisClient } from 'ioredis';
import { RedisService } from './redis.service';
import { TapCacheService } from './tap-cache.service';

@Global()
@Module({
  providers: [
    {
      provide: 'REDIS_CLIENT',
      inject: [ConfigService],
      useFactory(cfg: ConfigService): RedisClient {
        return new Redis({
          host: cfg.get<string>('redis.host'),
          port: cfg.get<number>('redis.port'),
          password: cfg.get<string>('redis.password'),
          db: cfg.get<number>('redis.db'),
          maxRetriesPerRequest: 5,
          retryStrategy(times) {
            return Math.min(times * 500, 2_000);
          },
        });
      },
    },
    RedisService,
    TapCacheService,
  ],
  exports: ['REDIS_CLIENT', RedisService, TapCacheService],
})
export class RedisModule {}
