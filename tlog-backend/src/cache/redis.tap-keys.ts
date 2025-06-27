/**
 * Redis keys for tap-related operations
 * Separate from general Redis keys to avoid domain mixing
 */

export class RedisTapKeys {
  /**
   * Hash key for user stats in a round (taps + points)
   */
  static userStatsKey(roundId: string, userId: string): string {
    return `round:${roundId}:user:${userId}`;
  }

  /**
   * Sorted set key for round leaderboard (by points)
   */
  static leaderboardKey(roundId: string): string {
    return `round:${roundId}:zset`;
  }

  /**
   * Set key for flush queue (users that need DB sync)
   */
  static flushQueueKey(): string {
    return 'flush:queue';
  }

  /**
   * Create flush queue member value
   */
  static flushQueueMember(roundId: string, userId: string): string {
    return `${roundId}:${userId}`;
  }

  /**
   * Extract roundId and userId from flush queue member
   */
  static parseFlushQueueMember(member: string): { roundId: string; userId: string } | null {
    const parts = member.split(':');
    if (parts.length >= 2) {
      return {
        roundId: parts[0],
        userId: parts[1],
      };
    }
    return null;
  }
}
