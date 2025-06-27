import { ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { RedisService } from '../../database/redis.service';
import { RoundsService } from '../rounds/rounds.service';
import { BatchService } from './batch.service';
import { Role } from '@prisma/client';

@Injectable()
export class TapsService {
  private readonly logger = new Logger(TapsService.name);

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private roundsService: RoundsService,
    private batchService: BatchService,
  ) {}

  async registerTap(roundId: string, userId: string, userRole: Role) {
    // Step 1: Validate round is active
    const round = await this.prisma.round.findUnique({
      where: { id: roundId },
    });

    if (!round) {
      throw new NotFoundException('Round not found');
    }

    // Check if round is active (started but not ended)
    const now = new Date();
    if (now < round.startsAt || now > round.endsAt) {
      throw new ConflictException('Round is not active');
    }

    // Step 2: Try Redis first for high performance
    try {
      const result = await this.redis.incrementClickCount(roundId, userId);

      // If batching occurred, save to database
      if (result.shouldBatch && result.batchData) {
        await this.batchService.saveBatch(roundId, userId, result.batchData.clickCount);
        this.logger.log(`Auto-batched ${result.batchData.clickCount} clicks for user ${userId}`);
      }

      // Get current total points for response
      const stats = await this.batchService.getUserRoundStats(roundId, userId);

      return {
        myPoints: stats.points,
      };
    } catch (redisError) {
      this.logger.error('Redis error, falling back to direct database save:', redisError);

      // Fallback to direct database save if Redis is unavailable
      return this.fallbackDirectSave(roundId, userId, userRole);
    }
  }

  /**
   * Fallback method for direct database saves when Redis is unavailable
   * Uses the original transactional approach
   */
  private async fallbackDirectSave(roundId: string, userId: string, userRole: Role) {
    this.logger.warn(`Using fallback direct save for user ${userId} in round ${roundId}`);

    return this.prisma.$transaction(async tx => {
      // Create individual tap event for fallback
      await tx.tapEvent.create({
        data: {
          roundId: roundId,
          userId: userId,
          createdAt: new Date(),
        },
      });

      // Get total taps from tap_events for this fallback calculation
      const tapCount = await tx.tapEvent.count({
        where: {
          roundId,
          userId,
        },
      });

      // Calculate points using the same logic as BatchService
      const points = this.batchService.calculatePoints(tapCount, userRole);

      return {
        myPoints: points,
      };
    });
  }

  /**
   * Get user statistics for a round (hybrid: DB + Redis)
   */
  async getUserStats(roundId: string, userId: string) {
    const stats = await this.batchService.getUserRoundStats(roundId, userId);

    return {
      totalClicks: stats.totalClicks,
      points: stats.points,
      pendingClicks: stats.pendingClicks,
      batchedClicks: stats.batchedClicks,
    };
  }

  /**
   * Force batch all pending clicks for a user
   */
  async forceBatchUser(roundId: string, userId: string) {
    const pendingClicks = await this.redis.getClickCount(roundId, userId);

    if (pendingClicks > 0) {
      // Manually trigger batch
      const clickCount = await this.redis.getAndResetClickCount(roundId, userId);
      await this.batchService.saveBatch(roundId, userId, clickCount);

      this.logger.log(`Force batched ${clickCount} clicks for user ${userId}`);
      return { batchedClicks: clickCount };
    }

    return { batchedClicks: 0 };
  }
}
