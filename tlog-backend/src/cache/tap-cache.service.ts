import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { RedisService } from './redis.service';
import { RedisTapKeys } from './redis.tap-keys';
import { readFileSync } from 'fs';
import { join } from 'path';

@Injectable()
export class TapCacheService implements OnModuleInit {
  private readonly logger = new Logger(TapCacheService.name);
  private tapDeltaSha: string;

  constructor(private readonly redisService: RedisService) {}

  async onModuleInit() {
    // Load tap_delta.lua script
    const scriptsPath = join(process.cwd(), 'src', 'cache', 'scripts');
    const tapDeltaLua = readFileSync(join(scriptsPath, 'tap_delta.lua'), 'utf8');
    this.tapDeltaSha = await this.redisService.scriptLoad(tapDeltaLua);
  }

  /**
   * Process tap with atomic scoring logic
   * Returns both tap count and points earned
   */
  async addDelta(
    roundId: string,
    userId: string,
    isNikita: boolean,
  ): Promise<{ tapCount: number; points: number }> {
    const keys = [
      RedisTapKeys.userTapsKey(roundId, userId), // tap counter
      RedisTapKeys.userPointsKey(roundId, userId), // points counter
      RedisTapKeys.leaderboardKey(roundId), // leaderboard
      RedisTapKeys.flushQueueKey(roundId), // flush queue
    ];

    const args = [userId, isNikita ? '1' : '0'];

    const [tapCount, points] = (await this.redisService.evalsha(
      this.tapDeltaSha,
      keys.length,
      ...keys,
      ...args,
    )) as [number, number];

    return { tapCount, points };
  }

  /**
   * Get current counters for a user in a round
   */
  async getCounters(
    roundId: string,
    userId: string,
  ): Promise<{ tapCount: number; points: number }> {
    const [tapCount, points] = await Promise.all([
      this.redisService.get(RedisTapKeys.userTapsKey(roundId, userId)),
      this.redisService.get(RedisTapKeys.userPointsKey(roundId, userId)),
    ]);

    return {
      tapCount: parseInt(tapCount || '0'),
      points: parseInt(points || '0'),
    };
  }

  /**
   * Get leaderboard for a round
   */
  async getLeaderboard(roundId: string, limit: number = 10): Promise<string[]> {
    return this.redisService.zrevrange(
      RedisTapKeys.leaderboardKey(roundId),
      0,
      limit - 1,
      'WITHSCORES',
    );
  }

  /**
   * Get flush queue items for batch processing
   */
  async getFlushQueue(roundId: string): Promise<string[]> {
    const queueKey = RedisTapKeys.flushQueueKey(roundId);
    const items = await this.redisService.lrange(queueKey, 0, -1);
    if (items.length > 0) {
      await this.redisService.del(queueKey);
    }
    return items;
  }
}
