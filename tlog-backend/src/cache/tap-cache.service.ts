import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { RedisService } from './redis.service';
import { RedisTapKeys } from './redis.tap-keys';
import { readFileSync } from 'fs';
import { join } from 'path';

@Injectable()
export class TapCacheService implements OnModuleInit {
  private readonly logger = new Logger(TapCacheService.name);
  private tapIncSha: string;
  private tapIncrementWithCheckSha: string;
  private tapGetAndResetSha: string;

  constructor(private readonly redisService: RedisService) {}

  async onModuleInit() {
    // Load Lua scripts from files - use source directory, not dist
    const scriptsPath = join(process.cwd(), 'src', 'cache', 'scripts');
    const tapIncLua = readFileSync(join(scriptsPath, 'tap_inc.lua'), 'utf8');
    const tapIncrementWithCheckLua = readFileSync(
      join(scriptsPath, 'tap_increment_with_check.lua'),
      'utf8',
    );
    const tapGetAndResetLua = readFileSync(join(scriptsPath, 'tap_get_and_reset.lua'), 'utf8');

    // Load scripts once at startup
    this.tapIncSha = await this.redisService.scriptLoad(tapIncLua);
    this.tapIncrementWithCheckSha = await this.redisService.scriptLoad(tapIncrementWithCheckLua);
    this.tapGetAndResetSha = await this.redisService.scriptLoad(tapGetAndResetLua);
  }

  async incrementTap(roundId: string, userId: string): Promise<number> {
    const result = await this.redisService.evalsha(this.tapIncSha, 0, roundId, userId);
    return result as number;
  }

  async getAndResetTaps(
    roundId: string,
    userId: string,
  ): Promise<{ tapsToSync: number; currentTime: number }> {
    const result = await this.redisService.evalsha(
      this.tapGetAndResetSha,
      0, // KEYS len
      roundId,
      userId,
    );

    const [tapsToSync, currentTime] = result as number[];

    return { tapsToSync, currentTime };
  }

  async getPendingTaps(roundId: string, userId: string): Promise<number> {
    const tapsKey = RedisTapKeys.userStatsKey(roundId, userId);
    const taps = await this.redisService.hget(tapsKey, 'taps');
    return parseInt(taps || '0', 10);
  }

  async getLastSync(roundId: string, userId: string): Promise<number> {
    const lastSyncKey = RedisTapKeys.lastSyncKey(roundId, userId);
    const lastSync = await this.redisService.get(lastSyncKey);
    return parseInt(lastSync || '0', 10);
  }

  async updateLastSync(roundId: string, userId: string): Promise<void> {
    const lastSyncKey = RedisTapKeys.lastSyncKey(roundId, userId);
    const now = Date.now();
    await this.redisService.set(lastSyncKey, now.toString());
  }
}
