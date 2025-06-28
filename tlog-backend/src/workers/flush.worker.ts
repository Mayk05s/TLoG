import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { RedisService } from '../cache/redis.service';
import { PlayerStatsService } from '../modules/rounds/player-stats.service';
import { TapsSyncService } from '../modules/taps/taps-sync.service';

@Injectable()
export class FlushWorker {
  private readonly logger = new Logger(FlushWorker.name);

  constructor(
    private tapsSyncService: TapsSyncService,
    private redisService: RedisService,
    private playerStatsService: PlayerStatsService,
  ) {}

  @Cron(CronExpression.EVERY_30_SECONDS)
  async flushTapsToDatabase() {
    try {
      const roundsWithData = await this.getActiveRoundsFromRedis();

      for (const roundId of roundsWithData) {
        // Save checkpoints for all users in round and sync their stats
        await Promise.all([
          this.tapsSyncService.saveCheckpointRound(roundId, '30 seconds flush'),
          this.playerStatsService.syncRoundStats(roundId),
        ]);
      }

      if (roundsWithData.length > 0) {
        this.logger.debug(`Processed ${roundsWithData.length} rounds with data`);
      }
    } catch (error) {
      this.logger.error('Failed to flush taps to database', error);
    }
  }

  /**
   * Get rounds that have data in Redis by checking leaderboard keys
   */
  private async getActiveRoundsFromRedis(): Promise<string[]> {
    try {
      const leaderboardPattern = 'round:*:leaderboard';
      const leaderboardKeys = await this.redisService.getClient().keys(leaderboardPattern);

      const roundIds = leaderboardKeys
        .map(key => key.split(':')[1])
        .filter(roundId => roundId && roundId.length > 0);

      return [...new Set(roundIds)];
    } catch (error) {
      this.logger.error('Failed to get active rounds from Redis:', error);
      return [];
    }
  }
}
