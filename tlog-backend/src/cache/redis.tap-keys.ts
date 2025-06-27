export class RedisTapKeys {
  static userTapsKey(roundId: string, userId: string): string {
    return `round:${roundId}:user:${userId}:taps`;
  }

  static lastSyncKey(roundId: string, userId: string): string {
    return `round:${roundId}:user:${userId}:last_sync`;
  }
}
