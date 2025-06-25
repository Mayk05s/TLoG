import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class StatsService {
  constructor(private readonly prisma: PrismaService) {}

  async getRoundStats(roundId: string, userId: string) {
    const round = await this.prisma.round.findUnique({
      where: { id: roundId },
    });

    if (!round) {
      return { error: 'Round not found' };
    }

    // Get stats for all players in this round
    const allStats = await this.prisma.playerRoundStats.findMany({
      where: { roundId: roundId },
      orderBy: { points: 'desc' },
      include: {
        user: {
          select: {
            username: true,
            role: true,
          },
        },
      },
    });

    // Get the current user's stats
    const myStats = await this.prisma.playerRoundStats.findUnique({
      where: {
        roundId_userId: {
          roundId: roundId,
          userId: userId,
        },
      },
    });

    const now = new Date();
    const isActive = now >= round.starts_at && now <= round.ends_at;
    const isFinished = now > round.ends_at;

    // Find the winner (player with most points)
    const winner = allStats.length > 0 ? allStats[0] : null;

    return {
      round,
      stats: allStats,
      myStats: myStats || { taps: 0, points: 0 },
      isActive,
      isFinished,
      winner: isFinished ? winner : null,
    };
  }
}
