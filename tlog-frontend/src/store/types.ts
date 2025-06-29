export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    username: string;
    role: 'admin' | 'survivor' | 'nikita';
  };
}

export interface Round {
  id: string;
  createdAt: number;
  startsAt: number;
  endsAt: number;
  status: 'cooldown' | 'active' | 'completed';
}

export interface RoundStatsDto {
  totalPoints: number;
  currentUserPoints: number;
  winner?: LeaderboardEntry;
}

export interface RoundDetailsResponse extends Round {
  stats?: RoundStatsDto;
  leaderboard?: LeaderboardEntry[];
}
export interface LeaderboardEntry {
  username: string;
  points: number;
}

export interface RoundWithStatus extends Round {
  timeLeft?: number;
}
