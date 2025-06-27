import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { RedisConfig } from '../config/profiles/redis.config';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis;
  private config: RedisConfig;

  constructor(private configService: ConfigService) {
    this.config = this.configService.get<RedisConfig>('redis')!;
  }

  async onModuleInit() {
    this.client = new Redis({
      host: this.config.host,
      port: this.config.port,
      password: this.config.password,
      db: this.config.db,
      enableReadyCheck: true,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });

    this.client.on('error', err => {
      this.logger.error('Redis connection error:', err);
    });

    this.client.on('connect', () => {
      this.logger.log(`Redis connected [Instance: ${this.config.instanceId}]`);
    });

    this.client.on('ready', () => {
      this.logger.log('Redis client ready');
    });

    await this.client.connect();
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.disconnect();
    }
  }

  /**
   * Atomically increment click count for a user in a round
   * Returns the new click count and whether batching should occur
   */
  async incrementClickCount(
    roundId: string,
    userId: string,
  ): Promise<{
    clickCount: number;
    shouldBatch: boolean;
    batchData?: { clickCount: number };
  }> {
    const clickKey = this.getClickKey(roundId, userId);
    const timestampKey = this.getTimestampKey(roundId, userId);
    const now = Date.now();

    // Use pipeline for atomic operations
    const pipeline = this.client.pipeline();
    pipeline.incr(clickKey);
    pipeline.set(timestampKey, now.toString());
    pipeline.expire(clickKey, 86400); // 24 hours TTL
    pipeline.expire(timestampKey, 86400);

    const results = await pipeline.exec();
    if (!results || results.length === 0) {
      throw new Error('Pipeline execution failed');
    }

    const newClickCount = results[0]?.[1] as number;
    if (typeof newClickCount !== 'number') {
      throw new Error('Failed to increment click count');
    }

    // Check if we should batch
    const shouldBatch = await this.shouldBatch(roundId, userId, newClickCount);

    if (shouldBatch) {
      // Try to acquire distributed lock for batching
      const batchData = await this.tryBatch(roundId, userId);
      return {
        clickCount: newClickCount,
        shouldBatch: true,
        batchData: batchData || undefined,
      };
    }

    return {
      clickCount: newClickCount,
      shouldBatch: false,
    };
  }

  /**
   * Try to acquire lock and perform batch operation
   * Returns batch data if successful, null if another instance is already batching
   */
  private async tryBatch(roundId: string, userId: string): Promise<{ clickCount: number } | null> {
    const lockKey = this.getBatchLockKey(roundId, userId);
    const lockValue = this.config.instanceId;

    // Try to acquire distributed lock
    const lockResult = await this.client.set(lockKey, lockValue, 'PX', this.config.lockTtlMs, 'NX');

    if (!lockResult) {
      // Another instance is already batching
      return null;
    }

    try {
      // We have the lock, perform batching
      const clickCount = await this.getAndResetClickCount(roundId, userId);

      if (clickCount > 0) {
        // Update last batch timestamp
        await this.setLastBatchTime(roundId, userId, Date.now());

        return { clickCount };
      }

      return null;
    } finally {
      // Always release the lock
      await this.releaseLock(lockKey, lockValue);
    }
  }

  /**
   * Release distributed lock safely (only if we own it)
   */
  private async releaseLock(lockKey: string, lockValue: string): Promise<void> {
    const script = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
      else
        return 0
      end
    `;

    await this.client.eval(script, 1, lockKey, lockValue);
  }

  /**
   * Check if user should be batched based on click count or time
   */
  private async shouldBatch(
    roundId: string,
    userId: string,
    currentCount?: number,
  ): Promise<boolean> {
    const clickCount = currentCount ?? (await this.getClickCount(roundId, userId));

    // Check click count threshold
    if (clickCount >= this.config.batchSize) {
      return true;
    }

    // Check time threshold
    const lastBatchTime = await this.getLastBatchTime(roundId, userId);
    const currentTime = Date.now();
    const timeSinceLastBatch = currentTime - lastBatchTime;

    return timeSinceLastBatch >= this.config.batchTimeoutSeconds * 1000 && clickCount > 0;
  }

  /**
   * Get current click count for a user in a round
   */
  async getClickCount(roundId: string, userId: string): Promise<number> {
    const key = this.getClickKey(roundId, userId);
    const count = await this.client.get(key);
    return count ? parseInt(count, 10) : 0;
  }

  /**
   * Get timestamp of last batch for a user in a round
   */
  private async getLastBatchTime(roundId: string, userId: string): Promise<number> {
    const key = this.getLastBatchKey(roundId, userId);
    const timestamp = await this.client.get(key);
    return timestamp ? parseInt(timestamp, 10) : 0;
  }

  /**
   * Set timestamp of last batch for a user in a round
   */
  private async setLastBatchTime(
    roundId: string,
    userId: string,
    timestamp: number,
  ): Promise<void> {
    const key = this.getLastBatchKey(roundId, userId);
    await this.client.setex(key, 86400, timestamp.toString());
  }

  /**
   * Atomically get and reset click count for batching
   */
  async getAndResetClickCount(roundId: string, userId: string): Promise<number> {
    const key = this.getClickKey(roundId, userId);
    const count = await this.client.getdel(key);
    return count ? parseInt(count, 10) : 0;
  }

  /**
   * Get all pending click counts for a round (for statistics)
   */
  async getRoundPendingClicks(roundId: string): Promise<Map<string, number>> {
    const pattern = this.getClickKey(roundId, '*');
    const keys = await this.client.keys(pattern);

    if (keys.length === 0) {
      return new Map();
    }

    const values = await this.client.mget(...keys);
    const result = new Map<string, number>();

    keys.forEach((key, index) => {
      const userId = this.extractUserIdFromKey(key);
      const count = values[index] ? parseInt(values[index], 10) : 0;
      if (userId && count > 0) {
        result.set(userId, count);
      }
    });

    return result;
  }

  /**
   * Force flush all pending clicks for a round (when round ends)
   */
  async forceFlushRound(roundId: string): Promise<Map<string, number>> {
    const pattern = this.getClickKey(roundId, '*');
    const keys = await this.client.keys(pattern);

    const flushedData = new Map<string, number>();

    if (keys.length === 0) {
      return flushedData;
    }

    // Get all counts before deletion
    const values = await this.client.mget(...keys);

    // Delete all round-related keys
    const pipeline = this.client.pipeline();
    keys.forEach(key => {
      const userId = this.extractUserIdFromKey(key);
      if (userId) {
        pipeline.del(key);
        pipeline.del(this.getTimestampKey(roundId, userId));
        pipeline.del(this.getLastBatchKey(roundId, userId));
        pipeline.del(this.getBatchLockKey(roundId, userId));
      }
    });

    await pipeline.exec();

    // Build result map
    keys.forEach((key, index) => {
      const userId = this.extractUserIdFromKey(key);
      const count = values[index] ? parseInt(values[index], 10) : 0;
      if (userId && count > 0) {
        flushedData.set(userId, count);
      }
    });

    return flushedData;
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

  // Private key generation methods
  private getClickKey(roundId: string, userId: string): string {
    return `clicks:${roundId}:${userId}`;
  }

  private getTimestampKey(roundId: string, userId: string): string {
    return `timestamp:${roundId}:${userId}`;
  }

  private getLastBatchKey(roundId: string, userId: string): string {
    return `last_batch:${roundId}:${userId}`;
  }

  private getBatchLockKey(roundId: string, userId: string): string {
    return `batch_lock:${roundId}:${userId}`;
  }

  private extractUserIdFromKey(key: string): string | null {
    const parts = key.split(':');
    return parts.length === 3 ? parts[2] : null;
  }
}
