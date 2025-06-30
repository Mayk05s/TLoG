import { LeaderboardEntryDto } from '../dto';

export interface RoundStatsData {
  playerPoints: number;
  totalPoints: number;
  leaderboard: LeaderboardEntryDto[];
}
