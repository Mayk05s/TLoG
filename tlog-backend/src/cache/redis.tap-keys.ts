export class RedisTapKeys {
  static userTapsKey(roundId: string, userId: string): string {
    return `round:${roundId}:user:${userId}:taps`;
  }

  static lastSyncKey(roundId: string, userId: string): string {
    return `round:${roundId}:user:${userId}:last_sync`;
  }

  // New keys for scoring system
  static userPointsKey(roundId: string, userId: string): string {
    return `round:${roundId}:user:${userId}:points`;
  }

  static leaderboardKey(roundId: string): string {
    return `round:${roundId}:leaderboard`;
  }

  static flushQueueKey(roundId: string): string {
    return `round:${roundId}:flush_queue`;
  }

  // Checkpoint keys for reliability
  static userCheckpointKey(roundId: string, userId: string): string {
    return `round:${roundId}:user:${userId}:checkpoint`;
  }

  static userCheckpointTimeKey(roundId: string, userId: string): string {
    return `round:${roundId}:user:${userId}:checkpoint_time`;
  }
}
