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

export interface RoundDetailsResponse {
  id: string;
  createdAt: number;
  startsAt: number;
  endsAt: number;
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
