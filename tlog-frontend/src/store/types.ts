export interface User {
  id: string;
  username: string;
  role: 'admin' | 'survivor' | 'nikita';
  createdAt: string;
  updatedAt: string;
}

export interface LoginResponse {
  user: User;
  accessToken: string;
  refreshToken?: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
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
