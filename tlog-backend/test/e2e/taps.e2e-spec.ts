import * as request from 'supertest';
import { closeTestingApp, createTestingApp, prisma } from '../test-utils';
import { TEST_USERS } from '../data/test-users';
import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { TapCacheService } from '../../src/cache/tap-cache.service';

describe('Enhanced Taps System (e2e)', () => {
  let app: NestFastifyApplication;
  let tapCache: TapCacheService;

  // Extract test users for better readability
  const { admin, regularUser, nikita } = TEST_USERS;

  // Tokens for different user roles
  let adminTokens: { accessToken: string; refreshToken: string; userId: string };
  let survivorTokens: { accessToken: string; refreshToken: string; userId: string };
  let nikitaTokens: { accessToken: string; refreshToken: string; userId: string };

  // Test round
  let roundId: string;

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

  beforeEach(async () => {
    // Create fresh test round for each test
    await createTestRound();
  });

  afterEach(async () => {
    // Clean up after each test
    if (roundId) {
      // Clean up database records
      await prisma.tapBatch.deleteMany({ where: { roundId } });
      await prisma.playerRoundStats.deleteMany({ where: { roundId } });
      await prisma.round.delete({ where: { id: roundId } });

      // Clean up Redis data
      await tapCache.clearRoundData(roundId);
    }
    // Add delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 200));
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
  async function createRoundInDb(startsAt: Date, endsAt: Date): Promise<string> {
    const round = await prisma.round.create({
      data: {
        startsAt,
        endsAt,
      },
    });

    return round.id;
  }

  async function createTestRound() {
    const now = new Date();
    // Create round directly in database with Prisma to bypass API validation
    const startsAt = new Date(now.getTime() - 5000); // Started 5 seconds ago
    const endsAt = new Date(now.getTime() + 300000); // End in 5 minutes

    roundId = await createRoundInDb(startsAt, endsAt);

    // Add small delay to ensure round is processed
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  describe('1. Enhanced API Response Tests', () => {
    it('should return TapResponseDto with correct structure', async () => {
      const response = await request(app.getHttpServer())
        .post(`/tap/${roundId}`)
        .set('Authorization', `Bearer ${survivorTokens.accessToken}`)
        .expect(200);

      // Verify new TapResponseDto structure (simplified)
      expect(response.body).toHaveProperty('success', true);
      expect(Object.keys(response.body)).toHaveLength(1);

      // Verify Redis counter was updated correctly
      const counters = await tapCache.getCounters(roundId, survivorTokens.userId);
      expect(counters.tapCount).toBe(1);
      expect(counters.points).toBe(1);
    });

    it('should return StatsResponseDto with correct structure', async () => {
      // Make a tap first
      await request(app.getHttpServer())
        .post(`/tap/${roundId}`)
        .set('Authorization', `Bearer ${survivorTokens.accessToken}`)
        .expect(200);

      // Small delay for Redis consistency
      await new Promise(resolve => setTimeout(resolve, 100));

      const response = await request(app.getHttpServer())
        .get(`/stats/${roundId}`)
        .set('Authorization', `Bearer ${survivorTokens.accessToken}`)
        .expect(200);

      // Verify StatsResponseDto structure
      expect(response.body).toHaveProperty('playerPoints');
      expect(response.body).toHaveProperty('leaderboard');
      expect(typeof response.body.playerPoints).toBe('number');
      expect(Array.isArray(response.body.leaderboard)).toBe(true);
      expect(response.body.playerPoints).toBe(1);
      expect(response.body.leaderboard.length).toBeGreaterThan(0);

      // Verify LeaderboardEntryDto structure
      const firstEntry = response.body.leaderboard[0];
      expect(firstEntry).toHaveProperty('username');
      expect(firstEntry).toHaveProperty('points');
      expect(typeof firstEntry.username).toBe('string');
      expect(typeof firstEntry.points).toBe('number');
    });
  });

  describe('2. Atomic Scoring Logic Tests', () => {
    it('should award 1 point per regular tap', async () => {
      // Make 5 taps
      for (let i = 1; i <= 5; i++) {
        const response = await request(app.getHttpServer())
          .post(`/tap/${roundId}`)
          .set('Authorization', `Bearer ${survivorTokens.accessToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
      }

      // Check points via stats API
      const statsResponse = await request(app.getHttpServer())
        .get(`/stats/${roundId}`)
        .set('Authorization', `Bearer ${survivorTokens.accessToken}`)
        .expect(200);

      expect(statsResponse.body.playerPoints).toBe(5); // 1 point per tap
    });

    it('should award 10 points for every 11th tap', async () => {
      // Make 11 taps
      for (let i = 1; i <= 11; i++) {
        await request(app.getHttpServer())
          .post(`/tap/${roundId}`)
          .set('Authorization', `Bearer ${survivorTokens.accessToken}`)
          .expect(200);
      }

      // Check final points via stats API
      const statsResponse = await request(app.getHttpServer())
        .get(`/stats/${roundId}`)
        .set('Authorization', `Bearer ${survivorTokens.accessToken}`)
        .expect(200);

      // 10 regular taps (10 points) + 1 bonus tap (10 points) = 20 points
      expect(statsResponse.body.playerPoints).toBe(20);
    });

    it('should award correct points for multiple 11th taps', async () => {
      // Make 22 taps (2 bonus taps at 11th and 22nd)
      for (let i = 1; i <= 22; i++) {
        await request(app.getHttpServer())
          .post(`/tap/${roundId}`)
          .set('Authorization', `Bearer ${survivorTokens.accessToken}`)
          .expect(200);
      }

      // Final check: 20 regular taps (20 points) + 2 bonus taps (20 points) = 40 points
      const finalResponse = await request(app.getHttpServer())
        .get(`/stats/${roundId}`)
        .set('Authorization', `Bearer ${survivorTokens.accessToken}`)
        .expect(200);

      expect(finalResponse.body.playerPoints).toBe(40);
    });

    it('should always give 0 points to nikita role', async () => {
      // Make 15 taps as nikita (including 11th tap)
      for (let i = 1; i <= 15; i++) {
        const response = await request(app.getHttpServer())
          .post(`/tap/${roundId}`)
          .set('Authorization', `Bearer ${nikitaTokens.accessToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
      }

      // Verify via stats API
      const statsResponse = await request(app.getHttpServer())
        .get(`/stats/${roundId}`)
        .set('Authorization', `Bearer ${nikitaTokens.accessToken}`)
        .expect(200);

      expect(statsResponse.body.playerPoints).toBe(0); // Always 0 for nikita
    });
  });

  describe('3. Real-time Leaderboard Tests', () => {
    it('should show single player in leaderboard', async () => {
      // Make 1 tap
      await request(app.getHttpServer())
        .post(`/tap/${roundId}`)
        .set('Authorization', `Bearer ${survivorTokens.accessToken}`)
        .expect(200);

      const response = await request(app.getHttpServer())
        .get(`/stats/${roundId}`)
        .set('Authorization', `Bearer ${survivorTokens.accessToken}`)
        .expect(200);

      expect(response.body.leaderboard).toHaveLength(1);
      expect(response.body.leaderboard[0].username).toBe(regularUser.username);
      expect(response.body.leaderboard[0].points).toBe(1);
    });

    it('should sort leaderboard by points descending', async () => {
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
        .get(`/stats/${roundId}`)
        .set('Authorization', `Bearer ${survivorTokens.accessToken}`)
        .expect(200);

      // Leaderboard should be sorted: Admin (20) → Survivor (1) → Nikita (0)
      expect(response.body.leaderboard).toHaveLength(3);
      expect(response.body.leaderboard[0].username).toBe(admin.username);
      expect(response.body.leaderboard[0].points).toBe(20);
      expect(response.body.leaderboard[1].username).toBe(regularUser.username);
      expect(response.body.leaderboard[1].points).toBe(1);
      expect(response.body.leaderboard[2].username).toBe(nikita.username);
      expect(response.body.leaderboard[2].points).toBe(0);
    });

    it('should include nikita in leaderboard with 0 points', async () => {
      // Only nikita makes taps
      await request(app.getHttpServer())
        .post(`/tap/${roundId}`)
        .set('Authorization', `Bearer ${nikitaTokens.accessToken}`)
        .expect(200);

      const response = await request(app.getHttpServer())
        .get(`/stats/${roundId}`)
        .set('Authorization', `Bearer ${nikitaTokens.accessToken}`)
        .expect(200);

      expect(response.body.leaderboard).toHaveLength(1);
      expect(response.body.leaderboard[0].username).toBe(nikita.username);
      expect(response.body.leaderboard[0].points).toBe(0);
    });
  });

  describe('4. Redis Integration Tests', () => {
    it('should store taps and points in Redis with correct keys', async () => {
      // Make 3 taps
      for (let i = 0; i < 3; i++) {
        await request(app.getHttpServer())
          .post(`/tap/${roundId}`)
          .set('Authorization', `Bearer ${survivorTokens.accessToken}`)
          .expect(200);
      }

      // Verify Redis counters directly
      const counters = await tapCache.getCounters(roundId, survivorTokens.userId);
      expect(counters.tapCount).toBe(3);
      expect(counters.points).toBe(3);

      // Verify leaderboard in Redis
      const leaderboardData = await tapCache.getLeaderboard(roundId, 10);
      expect(leaderboardData).toContain(survivorTokens.userId);
      expect(leaderboardData).toContain('3');
    });
  });

  describe('5. Background Processing & Checkpoint Tests', () => {
    it('should trigger checkpoint save every 50 taps', async () => {
      // Make exactly 50 taps to trigger checkpoint
      for (let i = 1; i <= 50; i++) {
        await request(app.getHttpServer())
          .post(`/tap/${roundId}`)
          .set('Authorization', `Bearer ${survivorTokens.accessToken}`)
          .expect(200);
      }

      // Wait for async checkpoint processing
      await new Promise(resolve => setTimeout(resolve, 500));

      // Verify checkpoint was saved to database
      const tapBatches = await prisma.tapBatch.findMany({
        where: { roundId, userId: survivorTokens.userId },
      });

      expect(tapBatches.length).toBeGreaterThan(0);
      expect(tapBatches[0].clickCount).toBe(50);
    });

    it('should sync player stats to database on checkpoint', async () => {
      // Make 50 taps to trigger checkpoint and sync
      for (let i = 1; i <= 50; i++) {
        await request(app.getHttpServer())
          .post(`/tap/${roundId}`)
          .set('Authorization', `Bearer ${survivorTokens.accessToken}`)
          .expect(200);
      }

      // Wait for async processing
      await new Promise(resolve => setTimeout(resolve, 500));

      // Verify player stats were synced to database
      const playerStats = await prisma.playerRoundStats.findUnique({
        where: {
          roundId_userId: {
            roundId,
            userId: survivorTokens.userId,
          },
        },
      });

      expect(playerStats).toBeTruthy();
      expect(playerStats).not.toBeNull();
      expect(playerStats!.taps).toBe(50);
      // Correct calculation: 46 regular taps (46 points) + 4 bonus taps at 11th, 22nd, 33rd, 44th positions (4 × 10 = 40 points) = 86 points total
      expect(playerStats!.points).toBe(86);
    });
  });

  describe('6. Edge Cases & Business Logic', () => {
    it('should reject taps for inactive rounds', async () => {
      // Create inactive round (ended 1 hour ago)
      const now = new Date();
      const pastRound = await createRoundInDb(
        new Date(now.getTime() - 7200000), // Started 2 hours ago
        new Date(now.getTime() - 3600000), // Ended 1 hour ago
      );

      await request(app.getHttpServer())
        .post(`/tap/${pastRound}`)
        .set('Authorization', `Bearer ${survivorTokens.accessToken}`)
        .expect(409);
    });

    it('should handle very high tap counts correctly', async () => {
      // Make 55 taps (5 bonus taps at 11th, 22nd, 33rd, 44th, 55th)
      for (let i = 1; i <= 55; i++) {
        await request(app.getHttpServer())
          .post(`/tap/${roundId}`)
          .set('Authorization', `Bearer ${survivorTokens.accessToken}`)
          .expect(200);
      }

      const response = await request(app.getHttpServer())
        .get(`/stats/${roundId}`)
        .set('Authorization', `Bearer ${survivorTokens.accessToken}`)
        .expect(200);

      // 50 regular taps (50 points) + 5 bonus taps (50 points) = 100 points
      expect(response.body.playerPoints).toBe(100);
    });

    it('should handle concurrent taps without race conditions', async () => {
      // Make concurrent taps
      const tapPromises = Array.from({ length: 10 }, () =>
        request(app.getHttpServer())
          .post(`/tap/${roundId}`)
          .set('Authorization', `Bearer ${survivorTokens.accessToken}`)
          .expect(200),
      );

      await Promise.all(tapPromises);

      // Verify final count is correct
      const response = await request(app.getHttpServer())
        .get(`/stats/${roundId}`)
        .set('Authorization', `Bearer ${survivorTokens.accessToken}`)
        .expect(200);

      expect(response.body.playerPoints).toBe(10); // Should be exactly 10 points
    });
  });
});
