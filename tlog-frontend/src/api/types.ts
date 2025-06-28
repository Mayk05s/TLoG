import { z } from 'zod';

// Auth types
export const LoginRequestSchema = z.object({
  username: z.string(),
  password: z.string(),
});

export const LoginResponseSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  user: z.object({
    id: z.string(),
    username: z.string(),
    role: z.enum(['admin', 'survivor', 'nikita']),
  }),
});

export const UserProfileSchema = z.object({
  id: z.string(),
  username: z.string(),
  role: z.enum(['admin', 'survivor', 'nikita']),
});

// Round types
export const RoundSchema = z.object({
  id: z.string(),
  created_at: z.string(),
  starts_at: z.string(),
  ends_at: z.string(),
  status: z.enum(['cooldown', 'active', 'completed']),
});

export const RoundsResponseSchema = z.array(RoundSchema);

export const CreateRoundRequestSchema = z.object({
  starts_at: z.string(),
  duration: z.number(),
});

// Tap types
export const TapResponseSchema = z.object({
  success: z.boolean(),
});

export const LeaderboardEntrySchema = z.object({
  username: z.string(),
  points: z.number(),
});

export const StatsResponseSchema = z.object({
  playerPoints: z.number(),
  leaderboard: z.array(LeaderboardEntrySchema),
});

// WebSocket types
export const WebSocketMessageSchema = z.object({
  points: z.number(),
  taps: z.number(),
});

// Export types
export type LoginRequest = z.infer<typeof LoginRequestSchema>;
export type LoginResponse = z.infer<typeof LoginResponseSchema>;
export type UserProfile = z.infer<typeof UserProfileSchema>;
export type Round = z.infer<typeof RoundSchema>;
export type RoundsResponse = z.infer<typeof RoundsResponseSchema>;
export type CreateRoundRequest = z.infer<typeof CreateRoundRequestSchema>;
export type TapResponse = z.infer<typeof TapResponseSchema>;
export type LeaderboardEntry = z.infer<typeof LeaderboardEntrySchema>;
export type StatsResponse = z.infer<typeof StatsResponseSchema>;
export type WebSocketMessage = z.infer<typeof WebSocketMessageSchema>;

// JWT payload type
export interface JWTPayload {
  sub: string;
  username: string;
  role: 'admin' | 'survivor' | 'nikita';
  iat: number;
  exp: number;
}
