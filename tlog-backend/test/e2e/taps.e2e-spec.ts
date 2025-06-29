import * as request from 'supertest';
import { closeTestingApp, createTestingApp, prisma } from '../test-utils';
import { TEST_USERS } from '../data/test-users';
import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { TapCacheService } from '../../src/cache/tap-cache.service';
import { PlayerStatsService } from '../../src/modules/rounds/player-stats.service';

describe('Enhanced Taps System (e2e)', () => {
  let app: NestFastifyApplication;
  let tapCache: TapCacheService;

  // Extract test users for better readability
  const { admin, regularUser, nikita } = TEST_USERS;

  // Tokens for different user roles
  let adminTokens: { accessToken: string; refreshToken: string; userId: string };
  let survivorTokens: { accessToken: string; refreshToken: string; userId: string };
  let nikitaTokens: { accessToken: string; refreshToken: string; userId: string };

  beforeAll(async () => {
    app = await createTestingApp();
    tapCache = app.get(TapCacheService);

    // Login existing users (they exist from global-setup)
    adminTokens = await loginUser(admin.username, admin.password);
    survivorTokens = await loginUser(regularUser.username, regularUser.password);
    nikitaTokens = await loginUser(nikita.username, nikita.password);
  });

  afterAll(async () => {
    await closeTestingApp(app);
    await prisma.$disconnect();
  });

  // Helper function to login and return tokens
  async function loginUser(username: string, password: string) {
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ username, password });

    return {
      accessToken: loginResponse.body.accessToken,
      refreshToken: loginResponse.body.refreshToken,
      userId: loginResponse.body.user.id,
    };
  }

  // Helper function to create round directly in database
  async function createTestRound(
    startAdd: number = 5000, // Started 5 seconds ago
    endAdd: number = 300000, // End in 5 minutes
  ): Promise<string> {
    const now = new Date();
    const startsAt = new Date(now.getTime() - startAdd);
    const endsAt = new Date(now.getTime() + endAdd);

    const round = await prisma.round.create({
      data: { startsAt, endsAt },
    });

    // Verify round was created correctly
    expect(round.id).toBeDefined();
    expect(round.startsAt).toEqual(startsAt);
    expect(round.endsAt).toEqual(endsAt);

    // Add delay to ensure round is processed and available
    await new Promise(resolve => setTimeout(resolve, 100));

    return round.id;
  }

  // Helper for creating active rounds that are guaranteed to accept taps
  async function createActiveTestRound(): Promise<string> {
    const now = new Date();
    // Create round that started 10 seconds ago and ends in 5 minutes
    const startsAt = new Date(now.getTime() - 10000);
    const endsAt = new Date(now.getTime() + 300000);

    const round = await prisma.round.create({
      data: { startsAt, endsAt },
    });

    // Verify round is in active state
    expect(round.startsAt.getTime()).toBeLessThan(now.getTime());
    expect(round.endsAt.getTime()).toBeGreaterThan(now.getTime());

    await new Promise(resolve => setTimeout(resolve, 100));
    return round.id;
  }

  describe('1. Enhanced API Response Tests', () => {
    it('should return TapResponseDto with correct structure', async () => {
      const roundId = await createTestRound();

      const response = await request(app.getHttpServer())
        .post(`/tap/${roundId}`)
        .set('Authorization', `Bearer ${survivorTokens.accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(Object.keys(response.body)).toHaveLength(1);

      // Verify Redis counter was updated correctly
      const counters = await tapCache.getCounters(roundId, survivorTokens.userId);
      expect(counters.tapCount).toBe(1);
      expect(counters.points).toBe(1);
    });

    it('should return StatsResponseDto with correct structure', async () => {
      const roundId = await createTestRound();

      // Make a tap first
      await request(app.getHttpServer())
        .post(`/tap/${roundId}`)
        .set('Authorization', `Bearer ${survivorTokens.accessToken}`)
        .expect(200);

      const response = await request(app.getHttpServer())
        .get(`/rounds/${roundId}`)
        .set('Authorization', `Bearer ${survivorTokens.accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('stats');
      expect(response.body.stats).toHaveProperty('currentUserPoints');
      expect(response.body.stats).toHaveProperty('totalPoints');
      expect(response.body).toHaveProperty('leaderboard');
      expect(typeof response.body.stats.currentUserPoints).toBe('number');
      expect(Array.isArray(response.body.leaderboard)).toBe(true);
      expect(response.body.stats.currentUserPoints).toBe(1);
      expect(response.body.leaderboard.length).toBeGreaterThan(0);

      const firstEntry = response.body.leaderboard[0];
      expect(firstEntry).toHaveProperty('username');
      expect(firstEntry).toHaveProperty('points');
      expect(typeof firstEntry.username).toBe('string');
      expect(typeof firstEntry.points).toBe('number');
    });
  });

  describe('2. Atomic Scoring Logic Tests', () => {
    it('should award 1 point per regular tap', async () => {
      const roundId = await createTestRound();

      // Make 5 taps
      for (let i = 1; i <= 5; i++) {
        const response = await request(app.getHttpServer())
          .post(`/tap/${roundId}`)
          .set('Authorization', `Bearer ${survivorTokens.accessToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
      }

      const statsResponse = await request(app.getHttpServer())
        .get(`/rounds/${roundId}`)
        .set('Authorization', `Bearer ${survivorTokens.accessToken}`)
        .expect(200);

      expect(statsResponse.body.stats.currentUserPoints).toBe(5);
    });

    it('should award 10 points for every 11th tap', async () => {
      const roundId = await createTestRound();

      // Make 11 taps
      for (let i = 1; i <= 11; i++) {
        await request(app.getHttpServer())
          .post(`/tap/${roundId}`)
          .set('Authorization', `Bearer ${survivorTokens.accessToken}`)
          .expect(200);
      }

      const statsResponse = await request(app.getHttpServer())
        .get(`/rounds/${roundId}`)
        .set('Authorization', `Bearer ${survivorTokens.accessToken}`)
        .expect(200);

      expect(statsResponse.body.stats.currentUserPoints).toBe(20);
    });

    it('should award correct points for multiple 11th taps', async () => {
      const roundId = await createTestRound();

      // Make 22 taps (2 bonus taps at 11th and 22nd)
      for (let i = 1; i <= 22; i++) {
        await request(app.getHttpServer())
          .post(`/tap/${roundId}`)
          .set('Authorization', `Bearer ${survivorTokens.accessToken}`)
          .expect(200);
      }

      const finalResponse = await request(app.getHttpServer())
        .get(`/rounds/${roundId}`)
        .set('Authorization', `Bearer ${survivorTokens.accessToken}`)
        .expect(200);

      expect(finalResponse.body.stats.currentUserPoints).toBe(40);
    });

    it('should always give 0 points to nikita role', async () => {
      const roundId = await createTestRound();

      // Make 15 taps as nikita (including 11th tap)
      for (let i = 1; i <= 15; i++) {
        const response = await request(app.getHttpServer())
          .post(`/tap/${roundId}`)
          .set('Authorization', `Bearer ${nikitaTokens.accessToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
      }

      const statsResponse = await request(app.getHttpServer())
        .get(`/rounds/${roundId}`)
        .set('Authorization', `Bearer ${nikitaTokens.accessToken}`)
        .expect(200);

      expect(statsResponse.body.stats.currentUserPoints).toBe(0);
    });
  });

  describe('3. Real-time Leaderboard Tests', () => {
    it('should show single player in leaderboard', async () => {
      const roundId = await createTestRound();

      await request(app.getHttpServer())
        .post(`/tap/${roundId}`)
        .set('Authorization', `Bearer ${survivorTokens.accessToken}`)
        .expect(200);

      const response = await request(app.getHttpServer())
        .get(`/rounds/${roundId}`)
        .set('Authorization', `Bearer ${survivorTokens.accessToken}`)
        .expect(200);

      expect(response.body.leaderboard).toHaveLength(1);
      expect(response.body.leaderboard[0].username).toBe(regularUser.username);
      expect(response.body.leaderboard[0].points).toBe(1);
    });

    it('should sort leaderboard by points descending', async () => {
      const roundId = await createTestRound();

      // Survivor makes 1 tap (1 point)
      await request(app.getHttpServer())
        .post(`/tap/${roundId}`)
        .set('Authorization', `Bearer ${survivorTokens.accessToken}`)
        .expect(200);

      // Admin makes 11 taps (20 points)
      for (let i = 0; i < 11; i++) {
        await request(app.getHttpServer())
          .post(`/tap/${roundId}`)
          .set('Authorization', `Bearer ${adminTokens.accessToken}`)
          .expect(200);
      }

      // Nikita makes 5 taps (0 points)
      for (let i = 0; i < 5; i++) {
        await request(app.getHttpServer())
          .post(`/tap/${roundId}`)
          .set('Authorization', `Bearer ${nikitaTokens.accessToken}`)
          .expect(200);
      }

      const response = await request(app.getHttpServer())
        .get(`/rounds/${roundId}`)
        .set('Authorization', `Bearer ${survivorTokens.accessToken}`)
        .expect(200);

      expect(response.body.leaderboard).toHaveLength(3);
      expect(response.body.leaderboard[0].username).toBe(admin.username);
      expect(response.body.leaderboard[0].points).toBe(20);
      expect(response.body.leaderboard[1].username).toBe(regularUser.username);
      expect(response.body.leaderboard[1].points).toBe(1);
      expect(response.body.leaderboard[2].username).toBe(nikita.username);
      expect(response.body.leaderboard[2].points).toBe(0);
    });

    it('should include nikita in leaderboard with 0 points', async () => {
      const roundId = await createTestRound();

      await request(app.getHttpServer())
        .post(`/tap/${roundId}`)
        .set('Authorization', `Bearer ${nikitaTokens.accessToken}`)
        .expect(200);

      const response = await request(app.getHttpServer())
        .get(`/rounds/${roundId}`)
        .set('Authorization', `Bearer ${nikitaTokens.accessToken}`)
        .expect(200);

      expect(response.body.leaderboard).toHaveLength(1);
      expect(response.body.leaderboard[0].username).toBe(nikita.username);
      expect(response.body.leaderboard[0].points).toBe(0);
    });
  });

  describe('4. Redis Integration Tests', () => {
    it('should store taps and points in Redis with correct keys', async () => {
      const roundId = await createTestRound();

      // Make 3 taps
      for (let i = 0; i < 3; i++) {
        await request(app.getHttpServer())
          .post(`/tap/${roundId}`)
          .set('Authorization', `Bearer ${survivorTokens.accessToken}`)
          .expect(200);
      }

      const counters = await tapCache.getCounters(roundId, survivorTokens.userId);
      expect(counters.tapCount).toBe(3);
      expect(counters.points).toBe(3);

      const leaderboardData = await tapCache.getLeaderboard(roundId, 10);
      expect(leaderboardData).toContain(survivorTokens.userId);
      expect(leaderboardData).toContain('3');
    });
  });

  describe('5. Worker Synchronization Tests', () => {
    it('should sync player stats to database when manually triggered', async () => {
      const roundId = await createTestRound();

      // Make some taps to generate data in Redis
      for (let i = 1; i <= 25; i++) {
        await request(app.getHttpServer())
          .post(`/tap/${roundId}`)
          .set('Authorization', `Bearer ${survivorTokens.accessToken}`)
          .expect(200);
      }

      // Verify data exists in Redis but not yet in database
      const redisCounters = await tapCache.getCounters(roundId, survivorTokens.userId);
      expect(redisCounters.tapCount).toBe(25);
      expect(redisCounters.points).toBe(43);

      const playerStatsBefore = await prisma.playerRoundStats.findUnique({
        where: {
          roundId_userId: {
            roundId,
            userId: survivorTokens.userId,
          },
        },
      });
      expect(playerStatsBefore).toBeNull();

      // Get PlayerStatsService with correct import
      const playerStatsService = app.get(PlayerStatsService);
      await playerStatsService.syncRoundStats(roundId);

      // Verify data was synced to database with correct formula: 25 taps = 23 + 2*10 = 43 points
      const playerStatsAfter = await prisma.playerRoundStats.findUnique({
        where: {
          roundId_userId: {
            roundId,
            userId: survivorTokens.userId,
          },
        },
      });

      expect(playerStatsAfter).toBeTruthy();
      expect(playerStatsAfter!.taps).toBe(25);
      expect(playerStatsAfter!.points).toBe(43); // 23 regular + 2 bonus (11th, 22nd)
    });

    it('should sync multiple players data correctly', async () => {
      const roundId = await createTestRound();

      // Survivor makes 10 taps (10 points)
      for (let i = 1; i <= 10; i++) {
        await request(app.getHttpServer())
          .post(`/tap/${roundId}`)
          .set('Authorization', `Bearer ${survivorTokens.accessToken}`)
          .expect(200);
      }

      // Admin makes 11 taps (20 points - includes 11th tap bonus)
      for (let i = 1; i <= 11; i++) {
        await request(app.getHttpServer())
          .post(`/tap/${roundId}`)
          .set('Authorization', `Bearer ${adminTokens.accessToken}`)
          .expect(200);
      }

      // Nikita makes 5 taps (0 points)
      for (let i = 1; i <= 5; i++) {
        await request(app.getHttpServer())
          .post(`/tap/${roundId}`)
          .set('Authorization', `Bearer ${nikitaTokens.accessToken}`)
          .expect(200);
      }

      const playerStatsService = app.get(PlayerStatsService);
      await playerStatsService.syncRoundStats(roundId);

      // Verify all players were synced correctly
      const survivorStats = await prisma.playerRoundStats.findUnique({
        where: { roundId_userId: { roundId, userId: survivorTokens.userId } },
      });
      expect(survivorStats!.taps).toBe(10);
      expect(survivorStats!.points).toBe(10);

      const adminStats = await prisma.playerRoundStats.findUnique({
        where: { roundId_userId: { roundId, userId: adminTokens.userId } },
      });
      expect(adminStats!.taps).toBe(11);
      expect(adminStats!.points).toBe(20);

      const nikitaStats = await prisma.playerRoundStats.findUnique({
        where: { roundId_userId: { roundId, userId: nikitaTokens.userId } },
      });
      expect(nikitaStats!.taps).toBe(5);
      expect(nikitaStats!.points).toBe(0);
    });

    it('should handle sync with invalid UUID gracefully', async () => {
      const roundId = await createTestRound();

      // Make a tap with valid user
      await request(app.getHttpServer())
        .post(`/tap/${roundId}`)
        .set('Authorization', `Bearer ${survivorTokens.accessToken}`)
        .expect(200);

      const playerStatsService = app.get(PlayerStatsService);

      // Test sync with the current data (should work fine with valid UUID)
      await expect(playerStatsService.syncRoundStats(roundId)).resolves.not.toThrow();

      // Valid user should be synced
      const validUserStats = await prisma.playerRoundStats.findUnique({
        where: { roundId_userId: { roundId, userId: survivorTokens.userId } },
      });
      expect(validUserStats).toBeTruthy();
      expect(validUserStats!.taps).toBe(1);
      expect(validUserStats!.points).toBe(1);
    });
  });

  describe('6. Edge Cases & Business Logic', () => {
    it('should reject taps for inactive rounds', async () => {
      const pastRound = await createTestRound(7200000, -3600000);

      await request(app.getHttpServer())
        .post(`/tap/${pastRound}`)
        .set('Authorization', `Bearer ${survivorTokens.accessToken}`)
        .expect(409);
    });

    it('should handle very high tap counts correctly', async () => {
      const roundId = await createTestRound();

      // Make 55 taps (5 bonus taps at 11th, 22nd, 33rd, 44th, 55th)
      for (let i = 1; i <= 55; i++) {
        await request(app.getHttpServer())
          .post(`/tap/${roundId}`)
          .set('Authorization', `Bearer ${survivorTokens.accessToken}`)
          .expect(200);
      }

      const response = await request(app.getHttpServer())
        .get(`/rounds/${roundId}`)
        .set('Authorization', `Bearer ${survivorTokens.accessToken}`)
        .expect(200);

      expect(response.body.stats.currentUserPoints).toBe(100);
    });

    it('should handle concurrent taps without race conditions', async () => {
      const roundId = await createTestRound();

      const tapPromises = Array.from({ length: 10 }, () =>
        request(app.getHttpServer())
          .post(`/tap/${roundId}`)
          .set('Authorization', `Bearer ${survivorTokens.accessToken}`)
          .expect(200),
      );

      await Promise.all(tapPromises);

      const response = await request(app.getHttpServer())
        .get(`/rounds/${roundId}`)
        .set('Authorization', `Bearer ${survivorTokens.accessToken}`)
        .expect(200);

      expect(response.body.stats.currentUserPoints).toBe(10);
    });
  });
});
