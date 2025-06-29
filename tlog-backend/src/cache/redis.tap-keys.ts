export class RedisTapKeys {
  static userTapsKey(roundId: string, userId: string): string {
    return `round:${roundId}:user:${userId}:taps`;
  }

  static userPointsKey(roundId: string, userId: string): string {
    return `round:${roundId}:user:${userId}:points`;
  }

  static leaderboardKey(roundId: string): string {
    return `round:${roundId}:leaderboard`;
  }

  static activeRoundsKey(): string {
    return 'round:active';
  }
}
