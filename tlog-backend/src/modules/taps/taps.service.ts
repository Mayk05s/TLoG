import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { TapCacheService } from '../../cache/tap-cache.service';
import { RoundsService } from '../rounds/rounds.service';
import { TapsSyncService } from './taps-sync.service';
import { TapResponseDto } from './dto/tap-response.dto';
import { LeaderboardEntryDto } from '../rounds/dto/leaderboard-entry.dto';
import { Role } from '@prisma/client';

/**
 * Main service for tap processing and statistics
 * Focuses on business logic and API responses
 */
@Injectable()
export class TapsService {
  private readonly logger = new Logger(TapsService.name);

  constructor(
    private prisma: PrismaService,
    private tapCache: TapCacheService,
    private roundsService: RoundsService,
    private tapsSyncService: TapsSyncService,
  ) {}

  /**
   * Process a tap with business logic for scoring
   */
  async processTap(roundId: string, userId: string, userRole: Role): Promise<TapResponseDto> {
    // Check that round is active
    await this.roundsService.isRoundActive(roundId);

    const isNikita = userRole === Role.nikita;
    const { tapCount } = await this.tapCache.addDelta(roundId, userId, isNikita);

    // Checkpoint logic: save every 50 taps automatically
    if (tapCount > 0 && tapCount % 50 === 0) {
      // Save checkpoint and sync stats for this user (non-blocking)
      Promise.all([
        this.tapsSyncService.saveCheckpointAsync(roundId, userId, `50 taps reached (${tapCount})`),
        this.tapsSyncService.syncSingleUserStats(roundId, userId),
      ]).catch(error => {
        this.logger.error(`Background sync failed for user ${userId}:`, error);
      });
    }

    return {
      success: true,
    };
  }

  /**
   * Delegate sync methods to TapsSyncService (used by FlushWorker)
   */
  async saveCheckpointRound(roundId: string, reason: string): Promise<void> {
    return this.tapsSyncService.saveCheckpointRound(roundId, reason);
  }

  async syncRoundStats(roundId: string): Promise<void> {
    return this.tapsSyncService.syncRoundStats(roundId);
  }

  /**
   * Get leaderboard for round (public method for RoundsService)
   */
  async getRoundLeaderboard(roundId: string, limit: number = 10): Promise<LeaderboardEntryDto[]> {
    return this.buildLeaderboard(roundId, limit);
  }

  /**
   * Check if round has cached data (active round)
   */
  async hasRoundInCache(roundId: string): Promise<boolean> {
    const leaderboardData = await this.tapCache.getLeaderboard(roundId, 1);
    return leaderboardData.length > 0;
  }

  /**
   * Helper: Build leaderboard with usernames from Redis data
   */
  private async buildLeaderboard(roundId: string, limit: number): Promise<LeaderboardEntryDto[]> {
    const leaderboardData = await this.tapCache.getLeaderboard(roundId, limit);
    const leaderboard: LeaderboardEntryDto[] = [];

    for (let i = 0; i < leaderboardData.length; i += 2) {
      const userId = leaderboardData[i];
      const points = parseInt(leaderboardData[i + 1]);

      // Get username from database
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { username: true },
      });

      if (user) {
        leaderboard.push({
          username: user.username,
          points,
        });
      }
    }

    return leaderboard;
  }
}
