import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { RedisService } from '../../database/redis.service';
import { Role } from '@prisma/client';

export interface BatchResult {
  userId: string;
  roundId: string;
  clickCount: number;
  success: boolean;
  error?: string;
}

@Injectable()
export class BatchService {
  private readonly logger = new Logger(BatchService.name);

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  /**
   * Save a batch of clicks to the database
   * This is called when Redis batching conditions are met
   */
  async saveBatch(roundId: string, userId: string, clickCount: number): Promise<BatchResult> {
    try {
      await this.prisma.clickBatch.create({
        data: {
          userId,
          roundId,
          clickCount,
          batchTimestamp: new Date(),
        },
      });

      this.logger.log(`Batch saved: User ${userId}, Round ${roundId}, Clicks ${clickCount}`);

      return {
        userId,
        roundId,
        clickCount,
        success: true,
      };
    } catch (error) {
      this.logger.error(`Failed to save batch for user ${userId}:`, error);

      return {
        userId,
        roundId,
        clickCount,
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get total clicks for a user in a round (from database batches + Redis pending)
   */
  async getUserTotalClicks(roundId: string, userId: string): Promise<number> {
    // Get saved batches from database
    const batchResult = await this.prisma.clickBatch.aggregate({
      _sum: {
        clickCount: true,
      },
      where: {
        roundId,
        userId,
      },
    });

    const dbClicks = batchResult._sum.clickCount || 0;

    // Get pending clicks from Redis
    const redisClicks = await this.redis.getClickCount(roundId, userId);

    return dbClicks + redisClicks;
  }

  /**
   * Calculate points for a user based on total clicks and role
   * Implements game logic: 1 point per click, 10 points for every 11th click
   */
  calculatePoints(totalClicks: number, userRole: Role): number {
    if (userRole === Role.nikita) {
      return 0; // Nikita always gets 0 points
    }

    // Base points: 1 per click
    let points = totalClicks;

    // Bonus points: 9 additional points for every 11th click (making it 10 total)
    const bonusClicks = Math.floor(totalClicks / 11);
    points += bonusClicks * 9;

    return points;
  }

  /**
   * Get comprehensive stats for a user in a round
   */
  async getUserRoundStats(
    roundId: string,
    userId: string,
  ): Promise<{
    totalClicks: number;
    points: number;
    pendingClicks: number;
    batchedClicks: number;
  }> {
    const [batchResult, userWithRole, pendingClicks] = await Promise.all([
      this.prisma.clickBatch.aggregate({
        _sum: { clickCount: true },
        where: { roundId, userId },
      }),
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { role: true },
      }),
      this.redis.getClickCount(roundId, userId),
    ]);

    const batchedClicks = batchResult._sum.clickCount || 0;
    const totalClicks = batchedClicks + pendingClicks;
    const points = this.calculatePoints(totalClicks, userWithRole?.role || Role.survivor);

    return {
      totalClicks,
      points,
      pendingClicks,
      batchedClicks,
    };
  }

  /**
   * Get leaderboard for a round
   */
  async getRoundLeaderboard(roundId: string): Promise<
    Array<{
      userId: string;
      username: string;
      totalClicks: number;
      points: number;
      role: Role;
    }>
  > {
    // Get all users who have batched clicks for this round
    const batchedUsers = await this.prisma.clickBatch.groupBy({
      by: ['userId'],
      _sum: {
        clickCount: true,
      },
      where: {
        roundId,
      },
    });

    // Get pending clicks from Redis for this round
    const pendingClicks = await this.redis.getRoundPendingClicks(roundId);

    // Combine all users (batched + pending)
    const allUserIds = new Set([
      ...batchedUsers.map(b => b.userId),
      ...Array.from(pendingClicks.keys()),
    ]);

    // Calculate stats for each user
    const leaderboard = await Promise.all(
      Array.from(allUserIds).map(async userId => {
        const batchedClickCount = batchedUsers.find(b => b.userId === userId)?._sum.clickCount || 0;
        const pendingClickCount = pendingClicks.get(userId) || 0;
        const totalClicks = batchedClickCount + pendingClickCount;

        const user = await this.prisma.user.findUnique({
          where: { id: userId },
          select: { username: true, role: true },
        });

        const points = this.calculatePoints(totalClicks, user?.role || Role.survivor);

        return {
          userId,
          username: user?.username || 'Unknown',
          totalClicks,
          points,
          role: user?.role || Role.survivor,
        };
      }),
    );

    // Sort by points descending
    return leaderboard.filter(entry => entry.totalClicks > 0).sort((a, b) => b.points - a.points);
  }

  /**
   * Force flush all pending clicks for a round (called when round ends)
   */
  async forceFlushRound(roundId: string): Promise<BatchResult[]> {
    this.logger.log(`Force flushing round ${roundId}`);

    // Get all pending clicks from Redis
    const pendingClicks = await this.redis.forceFlushRound(roundId);

    if (pendingClicks.size === 0) {
      this.logger.log(`No pending clicks to flush for round ${roundId}`);
      return [];
    }

    // Save all pending clicks as batches
    const results: BatchResult[] = [];

    for (const [userId, clickCount] of pendingClicks) {
      const result = await this.saveBatch(roundId, userId, clickCount);
      results.push(result);
    }

    this.logger.log(`Flushed ${results.length} batches for round ${roundId}`);
    return results;
  }
}
