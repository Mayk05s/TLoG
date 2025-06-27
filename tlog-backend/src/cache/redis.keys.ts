/**
 * Centralized Redis key management
 * All Redis keys are defined here to avoid duplication and ensure consistency
 */

export class RedisKeys {
  /**
   * Click count key for a user in a round
   */
  static clickKey(roundId: string, userId: string): string {
    return `clicks:${roundId}:${userId}`;
  }

  /**
   * Last click timestamp key for a user in a round
   */
  static timestampKey(roundId: string, userId: string): string {
    return `timestamp:${roundId}:${userId}`;
  }

  /**
   * Last batch timestamp key for a user in a round
   */
  static lastBatchKey(roundId: string, userId: string): string {
    return `last_batch:${roundId}:${userId}`;
  }

  /**
   * Distributed batch lock key for a user in a round
   */
  static batchLockKey(roundId: string, userId: string): string {
    return `batch_lock:${roundId}:${userId}`;
  }

  /**
   * Pattern for getting all click keys for a round
   */
  static clickPattern(roundId: string): string {
    return `clicks:${roundId}:*`;
  }

  /**
   * Extract user ID from a Redis key
   */
  static extractUserIdFromKey(key: string): string | null {
    const parts = key.split(':');
    if (parts.length >= 3 && parts[0] === 'clicks') {
      return parts[2];
    }
    return null;
  }
}
