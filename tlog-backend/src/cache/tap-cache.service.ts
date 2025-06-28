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
   * Get counters since last checkpoint for batching
   */
  async getCountersSinceCheckpoint(
    roundId: string,
    userId: string,
  ): Promise<{ tapCount: number; points: number; lastCheckpoint: number }> {
    const [tapCount, points, lastCheckpoint] = await Promise.all([
      this.redisService.get(RedisTapKeys.userTapsKey(roundId, userId)),
      this.redisService.get(RedisTapKeys.userPointsKey(roundId, userId)),
      this.redisService.get(RedisTapKeys.userCheckpointKey(roundId, userId)),
    ]);

    const currentTaps = parseInt(tapCount || '0');
    const currentPoints = parseInt(points || '0');
    const checkpointTaps = parseInt(lastCheckpoint || '0');

    return {
      tapCount: currentTaps - checkpointTaps, // Тапы с последнего checkpoint
      points: currentPoints, // Общие очки (пересчитаем delta)
      lastCheckpoint: checkpointTaps,
    };
  }

  /**
   * Set checkpoint after successful batch save
   */
  async setCheckpoint(roundId: string, userId: string, tapCount: number): Promise<void> {
    await this.redisService.set(
      RedisTapKeys.userCheckpointKey(roundId, userId),
      tapCount.toString(),
    );
  }

  /**
   * Check if user needs checkpoint (50+ taps or 10+ seconds)
   */
  async needsCheckpoint(
    roundId: string,
    userId: string,
    tapThreshold: number = 50,
    timeThreshold: number = 10000,
  ): Promise<{ needsCheckpoint: boolean; reason: string }> {
    const [tapCount, lastCheckpointTime] = await Promise.all([
      this.redisService.get(RedisTapKeys.userTapsKey(roundId, userId)),
      this.redisService.get(RedisTapKeys.userCheckpointTimeKey(roundId, userId)),
    ]);

    const currentTaps = parseInt(tapCount || '0');
    const lastTime = parseInt(lastCheckpointTime || '0');
    const now = Date.now();

    // Проверяем количество тапов
    if (currentTaps >= tapThreshold) {
      return { needsCheckpoint: true, reason: `${currentTaps} taps reached` };
    }

    // Проверяем время
    if (lastTime > 0 && now - lastTime >= timeThreshold) {
      return { needsCheckpoint: true, reason: `${(now - lastTime) / 1000}s elapsed` };
    }

    return { needsCheckpoint: false, reason: 'threshold not reached' };
  }

  /**
   * Update checkpoint timestamp
   */
  async updateCheckpointTime(roundId: string, userId: string): Promise<void> {
    await this.redisService.set(
      RedisTapKeys.userCheckpointTimeKey(roundId, userId),
      Date.now().toString(),
    );
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

  /**
   * Clear all Redis data for a round (used in tests)
   */
  async clearRoundData(roundId: string): Promise<void> {
    const pattern = `round:${roundId}:*`;
    const keys = await this.redisService.keys(pattern);

    if (keys.length > 0) {
      await this.redisService.delMultiple(...keys);
    }
  }
}
