import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { RedisService } from './redis.service';
import { RedisTapKeys } from './redis.tap-keys';
import { readFileSync } from 'fs';
import { join } from 'path';

@Injectable()
export class TapCacheService implements OnModuleInit {
  private readonly logger = new Logger(TapCacheService.name);
  private tapDeltaSha: string;
  private tapIncSha: string;

  constructor(private readonly redisService: RedisService) {}

  async onModuleInit() {
    // Load Lua scripts from files - use source directory, not dist
    const scriptsPath = join(process.cwd(), 'src', 'cache', 'scripts');
    const tapDeltaLua = readFileSync(join(scriptsPath, 'tap_delta.lua'), 'utf8');
    const tapIncLua = readFileSync(join(scriptsPath, 'tap_inc.lua'), 'utf8');

    // Load scripts once at startup
    this.tapDeltaSha = await this.redisService.scriptLoad(tapDeltaLua);
    this.tapIncSha = await this.redisService.scriptLoad(tapIncLua);
  }

  /**
   * Add taps and points delta for a user in a round
   * @param roundId Round identifier
   * @param userId User identifier
   * @param tapsInc Number of taps to add
   * @param pointsInc Number of points to add
   * @returns Updated user stats as array from HGETALL
   */
  async addDelta(
    roundId: string,
    userId: string,
    tapsInc: number,
    pointsInc: number,
  ): Promise<string[]> {
    const result = await this.redisService.evalsha(
      this.tapDeltaSha,
      0, // KEYS len
      roundId,
      userId,
      tapsInc,
      pointsInc,
    );
    return result as string[];
  }

  /**
   * Increment taps by 1 for a user in a round (no points)
   * @param roundId Round identifier
   * @param userId User identifier
   * @returns Updated user stats as array from HGETALL
   */
  async incrementTap(roundId: string, userId: string): Promise<string[]> {
    const result = await this.redisService.evalsha(
      this.tapIncSha,
      0, // KEYS len
      roundId,
      userId,
    );
    return result as string[];
  }

  /**
   * Get current counters for a user in a round
   * @param roundId Round identifier
   * @param userId User identifier
   * @returns Object with taps and points counts
   */
  async getCounters(roundId: string, userId: string): Promise<{ taps: number; points: number }> {
    const hkey = RedisTapKeys.userStatsKey(roundId, userId);
    const stats = await this.redisService.hgetall(hkey);
    return {
      taps: parseInt(stats.taps || '0', 10),
      points: parseInt(stats.points || '0', 10),
    };
  }

  /**
   * Get only tap count for a user in a round
   * @param roundId Round identifier
   * @param userId User identifier
   * @returns Current tap count
   */
  async getTapCount(roundId: string, userId: string): Promise<number> {
    const { taps } = await this.getCounters(roundId, userId);
    return taps;
  }
}
