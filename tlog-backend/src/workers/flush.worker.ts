import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../database/prisma.service';
import { TapCacheService } from '../cache/tap-cache.service';
import { TapsService } from '../modules/taps/taps.service';

@Injectable()
export class FlushWorker {
  private readonly logger = new Logger(FlushWorker.name);

  constructor(
    private prisma: PrismaService,
    private tapCacheService: TapCacheService,
    private tapsService: TapsService,
  ) {}

  @Cron(CronExpression.EVERY_30_SECONDS)
  async flushTapsToDatabase() {
    try {
      // Get all active rounds
      const now = new Date();
      const activeRounds = await this.prisma.round.findMany({
        where: {
          startsAt: { lte: now },
          endsAt: { gte: now },
        },
      });

      for (const round of activeRounds) {
        await this.flushRoundTaps(round.id);
        await this.syncRoundStats(round.id);
      }
    } catch (error) {
      this.logger.error('Failed to flush taps to database', error);
    }
  }

  private async flushRoundTaps(roundId: string) {
    const queueItems = await this.tapCacheService.getFlushQueue(roundId);

    if (queueItems.length === 0) {
      return;
    }

    const tapsToInsert = queueItems.map(item => {
      const data = JSON.parse(item);
      return {
        userId: data.user_id,
        roundId: roundId,
        points: data.points,
        timestamp: new Date(parseInt(data.timestamp) * 1000),
      };
    });

    try {
      await this.prisma.tapEvent.createMany({
        data: tapsToInsert,
        skipDuplicates: true,
      });

      this.logger.log(`Flushed ${tapsToInsert.length} tap events for round ${roundId}`);
    } catch (error) {
      this.logger.error(`Failed to flush tap events for round ${roundId}`, error);
    }
  }

  private async syncRoundStats(roundId: string) {
    try {
      // Get leaderboard to find all active users in this round
      const leaderboardData = await this.tapCacheService.getLeaderboard(roundId, 100); // Get more users
      const userIds: string[] = [];

      for (let i = 0; i < leaderboardData.length; i += 2) {
        userIds.push(leaderboardData[i]);
      }

      if (userIds.length > 0) {
        await this.tapsService.syncPlayerStats(roundId, userIds);
        this.logger.log(`Synced stats for ${userIds.length} players in round ${roundId}`);
      }
    } catch (error) {
      this.logger.error(`Failed to sync stats for round ${roundId}`, error);
    }
  }
}
