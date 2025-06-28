import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { TapCacheService } from '../../cache/tap-cache.service';
import { LeaderboardEntryDto } from '../rounds/dto';

@Injectable()
export class PlayerStatsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tapCache: TapCacheService,
  ) {}

  private async checkRoundInCache(roundId: string): Promise<boolean> {
    const leaderboardData = await this.tapCache.getLeaderboard(roundId, 1);
    return leaderboardData.length > 0;
  }

  async getPlayerPoints(roundId: string, userId: string): Promise<number> {
    let { points } = await this.tapCache.getCounters(roundId, userId);
    if (!points) {
      const playerStats = await this.prisma.playerRoundStats.findUnique({
        where: { roundId_userId: { roundId, userId } },
      });
      points = playerStats?.points || 0;
    }

    return points || 0;
  }

  async getTotalPoints(roundId: string): Promise<number> {
    const leaderboard = await this.buildLeaderboardFromCache(roundId, 100);
    if (leaderboard && leaderboard.length > 0) {
      return leaderboard.reduce((sum, entry) => sum + entry.points, 0);
    }

    const aggregateResult = await this.prisma.playerRoundStats.aggregate({
      where: { roundId },
      _sum: { points: true },
    });

    return aggregateResult._sum.points || 0;
  }

  async getLeaderboard(roundId: string): Promise<LeaderboardEntryDto[]> {
    const leaderboars = this.buildLeaderboardFromCache(roundId, 10);
    if (hasCache) {
      return this.buildLeaderboardFromCache(roundId, 10);
    }

    const topPlayers = await this.prisma.playerRoundStats.findMany({
      where: { roundId },
      orderBy: { points: 'desc' },
      take: 10,
      include: { user: { select: { username: true } } },
    });

    return topPlayers.map(entry => ({
      username: entry.user.username,
      points: entry.points,
    }));
  }

  async syncUserStats(roundId: string, userId: string): Promise<void> {
    const counters = await this.tapCache.getCounters(roundId, userId);

    if (counters.tapCount > 0 || counters.points > 0) {
      await this.prisma.playerRoundStats.upsert({
        where: {
          roundId_userId: { roundId, userId },
        },
        update: {
          taps: counters.tapCount,
          points: counters.points,
        },
        create: {
          userId,
          roundId,
          taps: counters.tapCount,
          points: counters.points,
        },
      });
    }
  }

  async syncRoundStats(roundId: string): Promise<void> {
    const userIds = await this.getUserIdsFromLeaderboard(roundId);

    for (const userId of userIds) {
      await this.syncUserStats(roundId, userId);
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

  private async buildLeaderboardFromCache(
    roundId: string,
    limit: number,
  ): Promise<{ userId: string; points: number }[]> {
    const leaderboardData = await this.tapCache.getLeaderboard(roundId, limit);
    const leaderboard: LeaderboardEntryDto[] = [];

    for (let i = 0; i < leaderboardData.length; i += 2) {
      const userId = leaderboardData[i];
      const points = parseInt(leaderboardData[i + 1]);
      leaderboard.push({ userId, points });
    }

    return leaderboard;
  }
}
