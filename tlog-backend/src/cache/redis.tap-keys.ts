export class RedisTapKeys {
  static userStatsKey(roundId: string, userId: string): string {
    return `round:${roundId}:user:${userId}`;
  }

  static lastSyncKey(roundId: string, userId: string): string {
    return `round:${roundId}:user:${userId}:last_sync`;
  }
}
