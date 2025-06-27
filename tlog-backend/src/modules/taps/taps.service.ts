import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { TapCacheService } from '../../cache/tap-cache.service';
import { RoundsService } from '../rounds/rounds.service';
import { TapResponseDto } from './dto/tap-response.dto';
import { StatsResponseDto } from './dto/stats-response.dto';
import { LeaderboardEntryDto } from './dto/leaderboard-entry.dto';
import { Role } from '@prisma/client';

@Injectable()
export class TapsService {
  private readonly logger = new Logger(TapsService.name);

  constructor(
    private prisma: PrismaService,
    private tapCache: TapCacheService,
    private roundsService: RoundsService,
  ) {}

  /**
   * Process a tap with business logic for scoring
   */
  async processTap(roundId: string, userId: string, userRole: Role): Promise<TapResponseDto> {
    // Проверяем что раунд активный
    await this.roundsService.getActiveRound(roundId);

    // Определяем является ли пользователь nikita
    const isNikita = userRole === Role.nikita;

    // Атомарно обрабатываем тап с подсчетом очков
    const { tapCount, points } = await this.tapCache.addDelta(roundId, userId, isNikita);

    // Получаем текущие счетчики игрока
    const counters = await this.tapCache.getCounters(roundId, userId);

    return {
      success: true,
      playerPoints: counters.points,
      totalTaps: tapCount,
    };
  }

  /**
   * Get statistics for a round including player points and leaderboard
   */
  async getStats(roundId: string, userId?: string): Promise<StatsResponseDto> {
    let playerPoints = 0;

    // Если передан userId, получаем очки игрока
    if (userId) {
      const counters = await this.tapCache.getCounters(roundId, userId);
      playerPoints = counters.points;
    }

    // Получаем лидерборд из Redis (теперь содержит userIds)
    const leaderboardData = await this.tapCache.getLeaderboard(roundId, 10);

    // Конвертируем userIds в имена пользователей для ответа
    const leaderboard: LeaderboardEntryDto[] = [];
    for (let i = 0; i < leaderboardData.length; i += 2) {
      const userId = leaderboardData[i];
      const points = parseInt(leaderboardData[i + 1]);

      // Получаем имя пользователя из базы данных
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

    return {
      playerPoints,
      leaderboard,
    };
  }

  /**
   * Sync player stats to database - called by FlushWorker
   */
  async syncPlayerStats(roundId: string, userIds: string[]): Promise<void> {
    for (const userId of userIds) {
      const counters = await this.tapCache.getCounters(roundId, userId);

      if (counters.tapCount > 0 || counters.points > 0) {
        await this.prisma.playerRoundStats.upsert({
          where: {
            roundId_userId: {
              roundId,
              userId,
            },
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
  }
}
