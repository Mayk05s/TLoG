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
    roundEndTimestamp?: number,
  ): Promise<{ tapCount: number; points: number }> {
    const keys = [
      RedisTapKeys.userTapsKey(roundId, userId), // tap counter
      RedisTapKeys.userPointsKey(roundId, userId), // points counter
      RedisTapKeys.leaderboardKey(roundId), // leaderboard
    ];

    const args = [userId, isNikita ? '1' : '0'];
    if (roundEndTimestamp) {
      args.push(Math.floor(roundEndTimestamp / 1000).toString());
    }

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
    if (limit === -1) {
      return this.redisService.zrevrange(RedisTapKeys.leaderboardKey(roundId), 0, -1, 'WITHSCORES');
    }

    return this.redisService.zrevrange(
      RedisTapKeys.leaderboardKey(roundId),
      0,
      limit - 1,
      'WITHSCORES',
    );
  }
}
