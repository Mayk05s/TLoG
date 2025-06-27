import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { TapCacheService } from '../../cache/tap-cache.service';
import { Role } from '@prisma/client';

@Injectable()
export class StatsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tapCache: TapCacheService,
  ) {}

  /**
   * Подсчет очков по формуле: 1 клик = 1 очко, каждый 11-й клик = 10 очков
   * Роль nikita всегда получает 0 очков
   */
  private calculatePoints(taps: number, role: Role): number {
    if (role === Role.nikita) {
      return 0;
    }

    let points = 0;
    for (let i = 1; i <= taps; i++) {
      if (i % 11 === 0) {
        points += 10; // Каждый 11-й клик = 10 очков
      } else {
        points += 1; // Обычный клик = 1 очко
      }
    }
    return points;
  }

  /**
   * Получить общее количество кликов пользователя (DB + Redis)
   */
  private async getUserTotalTaps(roundId: string, userId: string): Promise<number> {
    // Получаем сохраненные в DB клики
    const dbTaps = await this.prisma.tapBatch.aggregate({
      where: { roundId, userId },
      _sum: { clickCount: true },
    });

    const redisCounters = await this.tapCache.getCounters(roundId, userId);

    return (dbTaps._sum.clickCount || 0) + redisCounters.tapCount;
  }

  /**
   * Get points for a specific user in a round (hybrid: DB + Redis)
   */
  async myPoints(roundId: string, userId: string): Promise<number> {
    // Получаем пользователя для определения роли
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Получаем общее количество кликов
    const totalTaps = await this.getUserTotalTaps(roundId, userId);

    // Рассчитываем очки
    return this.calculatePoints(totalTaps, user.role);
  }

  /**
   * Get leaderboard for a round (hybrid: DB + Redis)
   */
  async leaderboard(roundId: string, limit: number = 10) {
    const participants = await this.prisma.tapBatch.findMany({
      where: { roundId },
      select: {
        userId: true,
        user: {
          select: {
            username: true,
            role: true,
          },
        },
      },
      distinct: ['userId'],
    });

    // Для каждого участника рассчитываем статистику
    const leaderboardData = await Promise.all(
      participants.map(async participant => {
        const totalTaps = await this.getUserTotalTaps(roundId, participant.userId);
        const points = this.calculatePoints(totalTaps, participant.user.role);

        return {
          userId: participant.userId,
          username: participant.user.username,
          role: participant.user.role,
          points: points,
          taps: totalTaps,
        };
      }),
    );

    return leaderboardData.sort((a, b) => b.points - a.points).slice(0, limit);
  }

  /**
   * Get comprehensive stats for a round
   */
  async roundStats(roundId: string) {
    const leaderboard = await this.leaderboard(roundId, 10);
    const totalTaps = leaderboard.reduce((sum, entry) => sum + entry.taps, 0);
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
            taps: winner.taps,
          }
        : null,
      leaderboard,
    };
  }
}
