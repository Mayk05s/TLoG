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

  async set(key: string, value: string, ttl?: number): Promise<'OK'> {
    if (ttl) {
      return this.client.setex(key, ttl, value);
    }
    return this.client.set(key, value);
  }

  async incr(key: string): Promise<number> {
    return this.client.incr(key);
  }

  async hincrby(key: string, field: string, increment: number): Promise<number> {
    return this.client.hincrby(key, field, increment);
  }

  async hgetall(key: string): Promise<Record<string, string>> {
    return this.client.hgetall(key);
  }

  async hget(key: string, field: string): Promise<string | null> {
    return this.client.hget(key, field);
  }

  async hset(key: string, field: string, value: string): Promise<number> {
    return this.client.hset(key, field, value);
  }

  async del(key: string): Promise<number> {
    return this.client.del(key);
  }

  async delMultiple(...keys: string[]): Promise<number> {
    if (keys.length === 0) return 0;
    return this.client.del(...keys);
  }

  async keys(pattern: string): Promise<string[]> {
    return this.client.keys(pattern);
  }

  async zincrby(key: string, increment: number, member: string): Promise<string> {
    return this.client.zincrby(key, increment, member);
  }

  async sadd(key: string, ...members: string[]): Promise<number> {
    return this.client.sadd(key, ...members);
  }

  async expire(key: string, seconds: number): Promise<number> {
    return this.client.expire(key, seconds);
  }

  async evalsha(sha: string, numkeys: number, ...args: (string | number)[]): Promise<any> {
    return this.client.evalsha(sha, numkeys, ...args);
  }

  async scriptLoad(script: string): Promise<string> {
    return this.client.script('LOAD', script) as Promise<string>;
  }

  // Legacy methods for backward compatibility with existing taps module
  async getClickCount(roundId: string, userId: string): Promise<number> {
    const key = `clicks:${roundId}:${userId}`;
    const count = await this.client.get(key);
    return parseInt(count || '0', 10);
  }

  async incrementClickCount(roundId: string, userId: string): Promise<number> {
    const key = `clicks:${roundId}:${userId}`;
    return this.client.incr(key);
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

  async forceFlushRound(roundId: string): Promise<Array<{ userId: string; clicks: number }>> {
    const pendingClicks = await this.getRoundPendingClicks(roundId);

    // Clear the Redis keys after getting the data
    const pattern = `clicks:${roundId}:*`;
    const keys = await this.client.keys(pattern);
    if (keys.length > 0) {
      await this.client.del(...keys);
    }

    return pendingClicks;
  }

  /**
   * Health check for Redis connection
   */
  async isHealthy(): Promise<boolean> {
    try {
      const pong = await this.client.ping();
      return pong === 'PONG';
    } catch (error) {
      this.logger.error('Redis health check failed:', error);
      return false;
    }
  }

  // Direct access to Redis client for complex operations
  getClient(): Redis {
    return this.client;
  }

  async zrevrange(
    key: string,
    start: number,
    stop: number,
    withScores?: string,
  ): Promise<string[]> {
    if (withScores === 'WITHSCORES') {
      return this.client.zrevrange(key, start, stop, 'WITHSCORES');
    }
    return this.client.zrevrange(key, start, stop);
  }

  async zadd(key: string, score: number, member: string): Promise<number> {
    return this.client.zadd(key, score, member);
  }

  async lpush(key: string, ...values: string[]): Promise<number> {
    return this.client.lpush(key, ...values);
  }

  async lrange(key: string, start: number, stop: number): Promise<string[]> {
    return this.client.lrange(key, start, stop);
  }
}
