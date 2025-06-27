import { ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { TapCacheService } from '../../cache/tap-cache.service';
import { Role } from '@prisma/client';

@Injectable()
export class TapsService {
  private readonly logger = new Logger(TapsService.name);

  constructor(
    private prisma: PrismaService,
    private tapCache: TapCacheService,
  ) {}

  async registerTap(roundId: string, userId: string, userRole: Role) {
    // Step 1: Validate round is active
    const round = await this.prisma.round.findUnique({
      where: { id: roundId },
    });

    if (!round) {
      throw new NotFoundException('Round not found');
    }

    const now = new Date();
    if (now < round.startsAt || now > round.endsAt) {
      throw new ConflictException('Round is not active');
    }

    try {
      // Step 2: Calculate points for this tap based on role and current count
      const currentTapCount = await this.tapCache.getTapCount(roundId, userId);
      const newTapCount = currentTapCount + 1;
      const pointsDelta = this.calculatePointsDelta(newTapCount, userRole);

      // Step 3: Atomically increment taps and points in Redis using Lua script
      await this.tapCache.addDelta(roundId, userId, 1, pointsDelta);

      // Step 4: Create tap event for audit trail
      await this.prisma.tapEvent.create({
        data: {
          roundId: roundId,
          userId: userId,
          createdAt: now,
        },
      });

      // Step 5: Get current totals and return points
      const { points } = await this.tapCache.getCounters(roundId, userId);

      return {
        myPoints: points,
      };
    } catch (error) {
      this.logger.error('Error during tap registration:', error);

      // Fallback to direct database save if cache fails
      return this.fallbackDirectSave(roundId, userId, userRole);
    }
  }

  /**
   * Calculate points delta for current tap based on tap count and user role
   */
  private calculatePointsDelta(tapCount: number, userRole: Role): number {
    if (userRole === 'nikita') {
      return 0; // Nikita always gets 0 points
    }

    // Every 11th tap gets 10 points, otherwise 1 point
    return tapCount % 11 === 0 ? 10 : 1;
  }

  /**
   * Calculate total points based on total tap count and user role
   */
  private calculateTotalPoints(totalTaps: number, userRole: Role): number {
    if (userRole === 'nikita') {
      return 0;
    }

    let points = 0;
    for (let tap = 1; tap <= totalTaps; tap++) {
      points += tap % 11 === 0 ? 10 : 1;
    }
    return points;
  }

  /**
   * Fallback method for direct database saves when cache is unavailable
   */
  private async fallbackDirectSave(roundId: string, userId: string, userRole: Role) {
    this.logger.warn(`Using fallback direct save for user ${userId} in round ${roundId}`);

    return this.prisma.$transaction(async tx => {
      // Create individual tap event
      await tx.tapEvent.create({
        data: {
          roundId: roundId,
          userId: userId,
          createdAt: new Date(),
        },
      });

      // Get total taps from tap_events
      const tapCount = await tx.tapEvent.count({
        where: {
          roundId,
          userId,
        },
      });

      // Calculate total points using the same logic
      const points = this.calculateTotalPoints(tapCount, userRole);

      return {
        myPoints: points,
      };
    });
  }

  /**
   * Get user statistics for a round
   */
  async getUserStats(roundId: string, userId: string) {
    try {
      // Try to get from cache first
      const taps = await this.tapCache.getTapCount(roundId, userId);

      // Get user role for points calculation
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { role: true },
      });

      if (!user) {
        throw new Error('User not found');
      }

      const points = this.calculateTotalPoints(taps, user.role);

      return {
        totalClicks: taps,
        points: points,
        pendingClicks: 0, // No longer relevant with simplified approach
        batchedClicks: taps, // All taps are immediately processed
      };
    } catch (error) {
      this.logger.error(`Failed to get user stats for ${userId} in round ${roundId}:`, error);

      // Fallback to database
      const tapCount = await this.prisma.tapEvent.count({
        where: { roundId, userId },
      });

      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { role: true },
      });

      const points = user ? this.calculateTotalPoints(tapCount, user.role) : 0;

      return {
        totalClicks: tapCount,
        points: points,
        pendingClicks: 0,
        batchedClicks: tapCount,
      };
    }
  }
}
