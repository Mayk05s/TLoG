import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { TapCacheService } from '../../cache/tap-cache.service';
import { PlayerStatsService } from '../rounds/player-stats.service';

/**
 * Service responsible for data synchronization between Redis and PostgreSQL
 * Handles checkpoints and stats syncing without blocking main API responses
 */
@Injectable()
export class TapsSyncService {
  private readonly logger = new Logger(TapsSyncService.name);

  constructor(
    private prisma: PrismaService,
    private tapCache: TapCacheService,
    private playerStatsService: PlayerStatsService,
  ) {}

  /**
   * Save checkpoint asynchronously (don't block API response)
   */
  async saveCheckpointAsync(roundId: string, userId: string, reason: string): Promise<void> {
    try {
      const counters = await this.tapCache.getCountersSinceCheckpoint(roundId, userId);

      if (counters.tapCount > 0) {
        // Save tap_batch checkpoint
        await this.prisma.tapBatch.create({
          data: {
            roundId,
            userId,
            clickCount: counters.tapCount,
            batchTimestamp: new Date(),
          },
        });

        // Update checkpoint markers
        await Promise.all([
          this.tapCache.setCheckpoint(roundId, userId, counters.lastCheckpoint + counters.tapCount),
          this.tapCache.updateCheckpointTime(roundId, userId),
        ]);

        this.logger.debug(
          `Checkpoint saved for user ${userId}: ${counters.tapCount} taps (${reason})`,
        );
      }
    } catch (error) {
      this.logger.error(`Failed to save checkpoint for user ${userId}:`, error);
    }
  }

  async syncSingleUserStats(roundId: string, userId: string): Promise<void> {
    try {
      await this.playerStatsService.syncUserStats(roundId, userId);
    } catch (error) {
      this.logger.error(`Failed to sync stats for user ${userId}:`, error);
    }
  }

  /**
   * Sync current Redis stats to player_round_stats table for multiple users
   */
  async syncRoundStats(roundId: string): Promise<void> {
    try {
      await this.playerStatsService.syncRoundStats(roundId);
      const userIds = await this.getUserIdsFromLeaderboard(roundId);
      this.logger.debug(`Synced stats for ${userIds.length} players in round ${roundId}`);
    } catch (error) {
      this.logger.error(`Failed to sync stats for round ${roundId}`, error);
    }
  }

  /**
   * Save checkpoint for entire round (all users with data)
   * Used by FlushWorker every 30 seconds
   */
  async saveCheckpointRound(roundId: string, reason: string): Promise<void> {
    try {
      const userIds = await this.getUserIdsFromLeaderboard(roundId);

      // Save checkpoints for all users with data
      for (const userId of userIds) {
        await this.saveCheckpointAsync(roundId, userId, reason);
      }

      this.logger.debug(
        `Saved checkpoints for ${userIds.length} users in round ${roundId} (${reason})`,
      );
    } catch (error) {
      this.logger.error(`Failed to save round checkpoint for round ${roundId}:`, error);
    }
  }

  /**
   * Helper: Extract userIds from Redis leaderboard
   */
  private async getUserIdsFromLeaderboard(roundId: string): Promise<string[]> {
    const leaderboardData = await this.tapCache.getLeaderboard(roundId, 100);
    const userIds: string[] = [];

    for (let i = 0; i < leaderboardData.length; i += 2) {
      userIds.push(leaderboardData[i]);
    }

    return userIds;
  }
}
