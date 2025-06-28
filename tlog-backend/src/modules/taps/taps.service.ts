import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { TapCacheService } from '../../cache/tap-cache.service';
import { RoundsService } from '../rounds/rounds.service';
import { TapsSyncService } from './taps-sync.service';
import { TapResponseDto } from './dto/tap-response.dto';
import { Role } from '@prisma/client';
import { PlayerStatsService } from '../rounds/player-stats.service';

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
    private playerStatsService: PlayerStatsService,
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
        this.playerStatsService.syncUserStats(roundId, userId),
      ]).catch(error => {
        this.logger.error(`Background sync failed for user ${userId}:`, error);
      });
    }

    return {
      success: true,
    };
  }
}
