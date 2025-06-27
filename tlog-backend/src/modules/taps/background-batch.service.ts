import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../../database/redis.service';
import { BatchService } from '../taps/batch.service';
import { PrismaService } from '../../database/prisma.service';
import { RedisConfig } from '../../config/profiles/redis.config';

@Injectable()
export class BackgroundBatchService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BackgroundBatchService.name);
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;
  private config: RedisConfig;

  constructor(
    private configService: ConfigService,
    private redis: RedisService,
    private batchService: BatchService,
    private prisma: PrismaService,
  ) {
    this.config = this.configService.get<RedisConfig>('redis')!;
  }

  async onModuleInit() {
    // Start background batching process
    await this.startBackgroundBatching();
    this.logger.log('Background batch service initialized');
  }

  async onModuleDestroy() {
    await this.stopBackgroundBatching();
    this.logger.log('Background batch service destroyed');
  }

  /**
   * Start the background process that periodically checks for batches to flush
   */
  private async startBackgroundBatching() {
    if (this.isRunning) return;

    this.isRunning = true;

    // Run every 5 seconds to check for expired batches
    this.intervalId = setInterval(async () => {
      try {
        await this.processExpiredBatches();
      } catch (error) {
        this.logger.error('Error in background batching:', error);
      }
    }, 5000);

    this.logger.log('Background batching started (5s interval)');
  }

  /**
   * Stop the background batching process
   */
  private async stopBackgroundBatching() {
    this.isRunning = false;

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    this.logger.log('Background batching stopped');
  }

  /**
   * Process all batches that have expired by time
   */
  private async processExpiredBatches() {
    try {
      // Get all active rounds
      const activeRounds = await this.getActiveRounds();

      if (activeRounds.length === 0) {
        return; // No active rounds to process
      }

      let totalProcessed = 0;

      for (const round of activeRounds) {
        const processed = await this.processRoundExpiredBatches(round.id);
        totalProcessed += processed;
      }

      if (totalProcessed > 0) {
        this.logger.log(`Background batch: processed ${totalProcessed} expired batches`);
      }
    } catch (error) {
      this.logger.error('Error processing expired batches:', error);
    }
  }

  /**
   * Process expired batches for a specific round
   */
  private async processRoundExpiredBatches(roundId: string): Promise<number> {
    const pendingClicks = await this.redis.getRoundPendingClicks(roundId);

    if (pendingClicks.size === 0) {
      return 0;
    }

    let processed = 0;
    const currentTime = Date.now();
    const timeoutMs = this.config.batchTimeoutSeconds * 1000;

    for (const [userId] of pendingClicks) {
      try {
        // Check if this user's batch has expired by time
        const lastBatchTime = await this.getLastBatchTime(roundId, userId);
        const timeSinceLastBatch = currentTime - lastBatchTime;

        if (timeSinceLastBatch >= timeoutMs) {
          // Try to acquire lock and batch
          const result = await this.redis.incrementClickCount(roundId, userId);

          if (result.shouldBatch && result.batchData) {
            await this.batchService.saveBatch(roundId, userId, result.batchData.clickCount);
            processed++;
            this.logger.debug(
              `Time-based batch: User ${userId}, Round ${roundId}, Clicks ${result.batchData.clickCount}`,
            );
          }
        }
      } catch (error) {
        this.logger.warn(
          `Failed to process expired batch for user ${userId} in round ${roundId}:`,
          error,
        );
      }
    }

    return processed;
  }

  /**
   * Get last batch time for a user (helper method)
   */
  private async getLastBatchTime(roundId: string, userId: string): Promise<number> {
    try {
      const key = `last_batch:${roundId}:${userId}`;
      const timestamp = await this.redis['client'].get(key);
      return timestamp ? parseInt(timestamp, 10) : 0;
    } catch (error) {
      this.logger.warn(`Failed to get last batch time for ${userId}:`, error);
      return 0;
    }
  }

  /**
   * Get all currently active rounds
   */
  private async getActiveRounds(): Promise<Array<{ id: string }>> {
    const now = new Date();

    return this.prisma.round.findMany({
      where: {
        startsAt: { lte: now },
        endsAt: { gte: now },
      },
      select: { id: true },
    });
  }

  /**
   * Force flush all rounds that have ended
   */
  async flushEndedRounds(): Promise<void> {
    const now = new Date();

    const endedRounds = await this.prisma.round.findMany({
      where: {
        endsAt: { lt: now },
      },
      select: { id: true },
    });

    for (const round of endedRounds) {
      try {
        const results = await this.batchService.forceFlushRound(round.id);
        if (results.length > 0) {
          this.logger.log(`Force flushed ${results.length} batches for ended round ${round.id}`);
        }
      } catch (error) {
        this.logger.error(`Failed to flush ended round ${round.id}:`, error);
      }
    }
  }

  /**
   * Health check for the background service
   */
  async healthCheck(): Promise<{
    isRunning: boolean;
    redisHealthy: boolean;
    lastProcessedAt: string;
  }> {
    const redisHealthy = await this.redis.isHealthy();

    return {
      isRunning: this.isRunning,
      redisHealthy,
      lastProcessedAt: new Date().toISOString(),
    };
  }
}
