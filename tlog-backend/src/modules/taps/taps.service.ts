import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { TapCacheService } from '../../cache/tap-cache.service';
import { RoundsService } from '../rounds/rounds.service';

@Injectable()
export class TapsService {
  private readonly logger = new Logger(TapsService.name);

  constructor(
    private prisma: PrismaService,
    private tapCache: TapCacheService,
    private roundsService: RoundsService,
  ) {}

  async registerTap(roundId: string, userId: string): Promise<void> {
    // Проверяем что раунд активный
    await this.roundsService.getActiveRound(roundId);

    // Просто инкрементируем тапы в Redis
    await this.tapCache.incrementTap(roundId, userId);

    // Отдельно проверяем условия синхронизации
    await this.checkAndSync(roundId, userId);
  }

  private async checkAndSync(roundId: string, userId: string): Promise<void> {
    const currentTaps = await this.tapCache.getPendingTaps(roundId, userId);

    // Получаем время последней синхронизации
    const lastSync = await this.tapCache.getLastSync(roundId, userId);
    const now = Date.now();

    // Синхронизируем если:
    // - накопилось >= 50 тапов ИЛИ
    // - прошло >= 10 секунд с последней синхронизации И lastSync не равен 0 (не первый раз)
    const shouldSync = currentTaps >= 50 || (lastSync > 0 && now - lastSync >= 10000);

    if (shouldSync) {
      await this.syncTapsToDatabase(roundId, userId);
    }
  }

  private async syncTapsToDatabase(roundId: string, userId: string): Promise<void> {
    try {
      const { tapsToSync } = await this.tapCache.getAndResetTaps(roundId, userId);
      if (tapsToSync <= 0) return;
      await this.prisma.tapBatch.create({
        data: {
          roundId,
          userId,
          clickCount: tapsToSync,
          batchTimestamp: new Date(),
        },
      });
      await this.tapCache.updateLastSync(roundId, userId);

      this.logger.debug(
        `[SYNC] Successfully saved ${tapsToSync} taps to database for user ${userId} in round ${roundId}`,
      );
    } catch (error) {
      this.logger.error(
        `[SYNC] Failed to sync taps for user ${userId} in round ${roundId}:`,
        error,
      );
      throw error;
    }
  }
}
