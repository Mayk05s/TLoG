import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { BatchService } from '../taps/batch.service';

@Injectable()
export class StatsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly batchService: BatchService,
  ) {}

  /**
   * Get points for a specific user in a round (hybrid: DB + Redis)
   */
  async myPoints(roundId: string, userId: string): Promise<number> {
    const stats = await this.batchService.getUserRoundStats(roundId, userId);
    return stats.points;
  }

  /**
   * Get leaderboard for a round (hybrid: DB + Redis)
   */
  async leaderboard(roundId: string, limit: number = 10) {
    const leaderboard = await this.batchService.getRoundLeaderboard(roundId);

    // Apply limit and return in the expected format
    return leaderboard.slice(0, limit).map(entry => ({
      userId: entry.userId,
      username: entry.username,
      role: entry.role,
      taps: entry.totalClicks,
      points: entry.points,
    }));
  }

  /**
   * Get comprehensive stats for a round
   */
  async roundStats(roundId: string) {
    const leaderboard = await this.batchService.getRoundLeaderboard(roundId);

    const totalTaps = leaderboard.reduce((sum, entry) => sum + entry.totalClicks, 0);
    const totalPlayers = leaderboard.length;
    const winner = leaderboard[0] || null;

    return {
      roundId,
      totalTaps,
      totalPlayers,
      winner: winner
        ? {
            userId: winner.userId,
            username: winner.username,
            points: winner.points,
            taps: winner.totalClicks,
          }
        : null,
      leaderboard: leaderboard.slice(0, 10), // Top 10
    };
  }

  /**
   * Get detailed user stats for a round
   */
  async userRoundStats(roundId: string, userId: string) {
    return this.batchService.getUserRoundStats(roundId, userId);
  }
}
