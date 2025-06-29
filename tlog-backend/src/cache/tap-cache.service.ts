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
      RedisTapKeys.activeRoundsKey(), // active rounds queue
    ];

    const args = [userId, isNikita ? '1' : '0'];
    if (roundEndTimestamp) {
      args.push(Math.floor(roundEndTimestamp / 1000).toString());
    } else {
      args.push('0');
    }
    args.push(roundId); // Добавляем roundId как последний аргумент

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

  /**
   * Получение раунда из Sorted Set для обработки воркером
   * Берет раунд с наименьшим временем завершения (ZPOPMIN)
   */
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

  /**
   * Проверка, завершен ли раунд по времени
   */
  async isRoundExpired(roundId: string, endTime: number): Promise<boolean> {
    const currentTime = Date.now();
    return currentTime > endTime;
  }

  /**
   * Удаление всех данных завершенного раунда из Redis
   */
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
