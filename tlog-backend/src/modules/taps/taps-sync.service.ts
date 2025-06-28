import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { TapCacheService } from '../../cache/tap-cache.service';

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
  ) {}

  async saveCheckpointAsync(roundId: string, userId: string, reason: string): Promise<void> {
    try {
      const counters = await this.tapCache.getCountersSinceCheckpoint(roundId, userId);

      if (counters.tapCount > 0) {
        await this.prisma.tapBatch.create({
          data: { roundId, userId, clickCount: counters.tapCount, batchTimestamp: new Date() },
        });

        await Promise.all([
          this.tapCache.setCheckpoint(roundId, userId, counters.lastCheckpoint + counters.tapCount),
          this.tapCache.updateCheckpointTime(roundId, userId),
        ]);
      }
    } catch (error) {
      this.logger.error(`Failed to save checkpoint for user ${userId}:`, error);
    }
  }

  async saveCheckpointRound(roundId: string, reason: string): Promise<void> {
    try {
      const userIds = await this.getUserIdsFromLeaderboard(roundId);
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

  private async getUserIdsFromLeaderboard(roundId: string): Promise<string[]> {
    const leaderboardData = await this.tapCache.getLeaderboard(roundId, 100);
    const userIds: string[] = [];

    for (let i = 0; i < leaderboardData.length; i += 2) {
      userIds.push(leaderboardData[i]);
    }

    return userIds;
  }
}
