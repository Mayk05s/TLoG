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

export interface StatsResponse {
  round: Round;
  stats: {
    totalPoints: number;
    currentUserPoints: number;
  };
  leaderboard: LeaderboardEntry[];
}

export interface LeaderboardEntry {
  username: string;
  points: number;
}

export interface RoundWithStatus extends Round {
  status: 'cooldown' | 'active' | 'completed';
  timeLeft?: number;
}

