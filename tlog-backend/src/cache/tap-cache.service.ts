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
    const scriptsPath = join(__dirname, 'scripts');
    const tapDeltaLua = readFileSync(join(scriptsPath, 'tap_delta.lua'), 'utf8');
    this.tapDeltaSha = await this.redisService.scriptLoad(tapDeltaLua);
  }

  async addDelta(
    roundId: string,
    userId: string,
    isNikita: boolean,
    roundEndTimestamp: number,
  ): Promise<{ tapCount: number; points: number }> {
    const keys = [
      RedisTapKeys.userTapsKey(roundId, userId),
      RedisTapKeys.userPointsKey(roundId, userId),
      RedisTapKeys.leaderboardKey(roundId),
      RedisTapKeys.activeRoundsKey(),
    ];

    const args = [userId, isNikita ? '1' : '0', roundEndTimestamp, roundId];

    const [tapCount, points] = (await this.redisService.evalsha(
      this.tapDeltaSha,
      keys.length,
      ...keys,
      ...args,
    )) as [number, number];

    return { tapCount, points };
  }

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

  async getRoundFromQueue(): Promise<{ roundId: string; endTime: number } | null> {
    const result = await this.redisService.getClient().zpopmin(RedisTapKeys.activeRoundsKey());

    if (result && result.length >= 2) {
      return {
        roundId: result[0],
        endTime: parseInt(result[1]),
      };
    }

    return null;
  }

  async isRoundExpired(roundId: string, endTime: number): Promise<boolean> {
    const currentTime = Date.now();
    return currentTime > endTime;
  }

  async cleanupExpiredRound(roundId: string): Promise<void> {
    const pattern = `round:${roundId}:*`;
    const keys = await this.redisService.keys(pattern);

    if (keys.length > 0) {
      await this.redisService.delMultiple(...keys);
    }

    await this.redisService.getClient().zrem(RedisTapKeys.activeRoundsKey(), roundId);
    this.logger.log(`Cleaned up expired round: ${roundId}, deleted ${keys.length} keys`);
  }
}
