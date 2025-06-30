import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { TapCacheService } from '../cache/tap-cache.service';
import { PlayerStatsService } from '../modules/rounds/player-stats.service';
import { RedisService } from '../cache/redis.service';
import { RedisTapKeys } from '../cache/redis.tap-keys';

@Injectable()
export class FlushWorker {
  private readonly logger = new Logger(FlushWorker.name);
  private readonly MAX_RETRY_ATTEMPTS = 3;
  private readonly RETRY_DELAY_BASE = 1000;

  constructor(
    private readonly tapCache: TapCacheService,
    private readonly playerStats: PlayerStatsService,
    private readonly redisService: RedisService,
  ) {}

  @Cron(CronExpression.EVERY_30_SECONDS)
  async processActiveRounds(): Promise<void> {
    try {
      const BATCH_SIZE = 5;
      const processedRounds: Array<{ roundId: string; endTime: number }> = [];

      // Take batch of rounds from Sorted Set (ZPOPMIN - atomic operation, no race conditions)
      for (let i = 0; i < BATCH_SIZE; i++) {
        const round = await this.tapCache.getRoundFromQueue();
        if (round) {
          processedRounds.push(round);
        } else {
          break; // Sorted Set is empty
        }
      }

      if (processedRounds.length === 0) {
        // this.logger.debug('No rounds available in active rounds sorted set');
        return;
      }

      this.logger.log(
        `Worker processing ${processedRounds.length} rounds: ${processedRounds.map(r => r.roundId).join(', ')}`,
      );

      const processingPromises = processedRounds.map(({ roundId, endTime }) =>
        this.processRoundWithRetry(roundId, endTime),
      );

      const results = await Promise.allSettled(processingPromises);

      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      this.logger.log(`Batch processing completed: ${successful} successful, ${failed} failed`);
    } catch (error) {
      this.logger.error('Failed to process rounds from active rounds sorted set:', error);
    }
  }

  private async processRoundWithRetry(roundId: string, endTime: number): Promise<void> {
    try {
      // СНАЧАЛА синхронизируем данные, независимо от истечения
      await this.retryWithBackoff(
        () => this.playerStats.syncRoundStats(roundId),
        this.MAX_RETRY_ATTEMPTS,
      );

      this.logger.debug(`Successfully synced round ${roundId}`);

      // Check expiration and cleanup after successful sync
      const isExpired = await this.tapCache.isRoundExpired(roundId, endTime);
      if (isExpired) {
        this.logger.log(`Round ${roundId} has expired, cleaning up after sync...`);
        await this.tapCache.cleanupExpiredRound(roundId);
      }
    } catch (error) {
      this.logger.error(
        `Failed to sync round ${roundId} after ${this.MAX_RETRY_ATTEMPTS} attempts:`,
        error,
      );
      // Return round back to Sorted Set on error
      await this.redisService.getClient().zadd(RedisTapKeys.activeRoundsKey(), endTime, roundId);
      this.logger.warn(`Returned round ${roundId} back to active rounds sorted set due to error`);
    }
  }

  private async retryWithBackoff(
    operation: () => Promise<void>,
    maxAttempts: number,
  ): Promise<void> {
    let attempt = 1;

    while (attempt <= maxAttempts) {
      try {
        await operation();
        return;
      } catch (error) {
        if (attempt === maxAttempts) {
          throw error;
        }

        const delay = this.RETRY_DELAY_BASE * Math.pow(2, attempt - 1);
        this.logger.warn(`Attempt ${attempt} failed, retrying in ${delay}ms...`);

        await this.sleep(delay);
        attempt++;
      }
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
