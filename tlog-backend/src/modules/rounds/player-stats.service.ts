import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { TapCacheService } from '../../cache/tap-cache.service';
import { LeaderboardEntryDto } from '../rounds/dto';
import { RoundStatsData } from './interfaces/round-stats-data.interface';

@Injectable()
export class PlayerStatsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tapCache: TapCacheService,
  ) {}

  async getPlayerPoints(roundId: string, userId: string): Promise<number> {
    const playerStats = await this.prisma.playerRoundStats.findUnique({
      where: { roundId_userId: { roundId, userId } },
    });

    return playerStats?.points || 0;
  }

  async getTotalPoints(roundId: string): Promise<number> {
    const aggregateResult = await this.prisma.playerRoundStats.aggregate({
      where: { roundId },
      _sum: { points: true },
    });

    return aggregateResult._sum.points || 0;
  }

  async getLeaderboard(roundId: string): Promise<LeaderboardEntryDto[]> {
    const topPlayers = await this.prisma.playerRoundStats.findMany({
      where: { roundId },
      orderBy: { points: 'desc' },
      take: 10,
      include: { user: { select: { username: true } } },
    });

    return topPlayers.map(entry => new LeaderboardEntryDto(entry.user.username, entry.points));
  }

  async getStatsFromCache(roundId: string, userId: string): Promise<RoundStatsData> {
    const allLeaderboardData = await this.tapCache.getLeaderboard(roundId, -1);

    let totalPoints = 0;
    let playerPoints = 0;
    const topEntries: { userId: string; points: number }[] = [];

    for (let i = 0; i < allLeaderboardData.length; i += 2) {
      const currentUserId = allLeaderboardData[i];
      const points = parseInt(allLeaderboardData[i + 1]);

      totalPoints += points;

      if (currentUserId === userId) {
        playerPoints = points;
      }

      if (topEntries.length < 10) {
        topEntries.push({ userId: currentUserId, points });
      }
    }

    const leaderboard = await this.buildLeaderboardWithUsernames(topEntries);

    return { playerPoints, totalPoints, leaderboard };
  }

  private async buildLeaderboardWithUsernames(
    topEntries: { userId: string; points: number }[],
  ): Promise<LeaderboardEntryDto[]> {
    const userIds = topEntries.map(entry => entry.userId);
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, username: true },
    });

    const userMap = new Map(users.map(user => [user.id, user.username]));

    return topEntries
      .map(entry => {
        const username = userMap.get(entry.userId);
        return username ? new LeaderboardEntryDto(username, entry.points) : null;
      })
      .filter(entry => entry !== null);
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
    const leaderboardData = await this.tapCache.getLeaderboard(roundId, -1);
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
    const leaderboard: { userId: string; points: number }[] = [];

    for (let i = 0; i < leaderboardData.length; i += 2) {
      const userId = leaderboardData[i];
      const points = parseInt(leaderboardData[i + 1]);
      leaderboard.push({ userId, points });
    }

    return leaderboard;
  }
}
