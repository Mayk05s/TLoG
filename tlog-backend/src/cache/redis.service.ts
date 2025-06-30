import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Redis } from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);

  constructor(@Inject('REDIS_CLIENT') private readonly client: Redis) {}

  async onModuleInit() {
    this.client.on('error', err => {
      this.logger.error('Redis connection error:', err);
    });

    this.client.on('connect', () => {
      this.logger.log('Redis connected');
    });

    this.client.on('ready', () => {
      this.logger.log('Redis client ready');
    });
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.disconnect();
    }
  }

  // Thin wrapper methods
  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async delMultiple(...keys: string[]): Promise<number> {
    if (keys.length === 0) return 0;
    return this.client.del(...keys);
  }

  async keys(pattern: string): Promise<string[]> {
    return this.client.keys(pattern);
  }

  async evalsha(sha: string, numkeys: number, ...args: (string | number)[]): Promise<any> {
    return this.client.evalsha(sha, numkeys, ...args);
  }

  async scriptLoad(script: string): Promise<string> {
    return this.client.script('LOAD', script) as Promise<string>;
  }

  async zrevrange(
    key: string,
    start: number,
    stop: number,
    withScores?: 'WITHSCORES',
  ): Promise<string[]> {
    if (withScores === 'WITHSCORES') {
      return this.client.zrevrange(key, start, stop, 'WITHSCORES');
    }
    return this.client.zrevrange(key, start, stop);
  }

  async getRoundPendingClicks(roundId: string): Promise<Array<{ userId: string; clicks: number }>> {
    const pattern = `clicks:${roundId}:*`;
    const keys = await this.client.keys(pattern);
    const result: Array<{ userId: string; clicks: number }> = [];

    for (const key of keys) {
      const userId = key.split(':')[2];
      const clicks = await this.client.get(key);
      if (userId && clicks) {
        result.push({ userId, clicks: parseInt(clicks, 10) });
      }
    }

    return result;
  }

  // Direct access to Redis client for complex operations
  getClient(): Redis {
    return this.client;
  }
}
