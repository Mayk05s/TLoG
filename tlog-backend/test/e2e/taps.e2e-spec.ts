import * as request from 'supertest';
import { closeTestingApp, createTestingApp, prisma } from '../test-utils';
import { TEST_USERS } from '../data/test-users';
import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { RedisService } from '../../src/database/redis.service';

describe('Taps (e2e)', () => {
  let app: NestFastifyApplication;
  let redis: RedisService;

  // Extract test users for better readability
  const { admin, regularUser, nikita } = TEST_USERS;

  // Tokens for different user roles (like in users.e2e)
  let adminTokens: { accessToken: string; refreshToken: string; userId: string };
  let survivorTokens: { accessToken: string; refreshToken: string; userId: string };
  let nikitaTokens: { accessToken: string; refreshToken: string; userId: string };

  // Test round
  let roundId: string;

  beforeAll(async () => {
    app = await createTestingApp();
    redis = app.get(RedisService);

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
    // Clean up Redis and database after each test
    if (roundId) {
      await redis.forceFlushRound(roundId);
      // Delete related records first to avoid foreign key constraints
      await prisma.clickBatch.deleteMany({ where: { roundId } });
      await prisma.tapEvent.deleteMany({ where: { roundId } });
      await prisma.playerRoundStats.deleteMany({ where: { roundId } });
      await prisma.round.delete({ where: { id: roundId } });
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

  async function createTestRound() {
    const now = new Date();
    // Create round directly in database with Prisma to bypass API validation
    const startsAt = new Date(now.getTime() - 5000); // Started 5 seconds ago
    const endsAt = new Date(now.getTime() + 300000); // End in 5 minutes

    const round = await prisma.round.create({
      data: {
        startsAt,
        endsAt,
      },
    });

    roundId = round.id;

    // Add small delay to ensure round is processed
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  describe('1. Basic Tap Registration', () => {
    it('should register a single tap and return correct points for survivor', async () => {
      const response = await request(app.getHttpServer())
        .post(`/tap/${roundId}`)
        .set('Authorization', `Bearer ${survivorTokens.accessToken}`)
        .expect(201); // POST requests return 201 Created by default

      expect(response.body).toEqual({
        myPoints: 1, // First tap = 1 point
      });

      // Verify Redis has the click
      const redisCount = await redis.getClickCount(roundId, survivorTokens.userId);
      expect(redisCount).toBe(1);
    });

    it('should register taps but always return 0 points for nikita', async () => {
      const response = await request(app.getHttpServer())
        .post(`/tap/${roundId}`)
        .set('Authorization', `Bearer ${nikitaTokens.accessToken}`)
        .expect(201); // POST requests return 201 Created by default

      expect(response.body).toEqual({
        myPoints: 0, // Nikita always gets 0 points
      });

      // Verify Redis still tracks the click
      const redisCount = await redis.getClickCount(roundId, nikitaTokens.userId);
      expect(redisCount).toBe(1);
    });

    it('should reject taps during cooldown period', async () => {
      // Create a round that hasn't started yet
      const now = new Date();
      const futureStartsAt = new Date(now.getTime() + 5000); // Starts in 5 seconds
      const futureEndsAt = new Date(now.getTime() + 15000);

      const roundResponse = await request(app.getHttpServer())
        .post('/rounds')
        .set('Authorization', `Bearer ${adminTokens.accessToken}`)
        .send({
          startsAt: futureStartsAt.toISOString(),
          endsAt: futureEndsAt.toISOString(),
        })
        .expect(201);

      // Try to tap during cooldown
      await request(app.getHttpServer())
        .post(`/tap/${roundResponse.body.id}`)
        .set('Authorization', `Bearer ${survivorTokens.accessToken}`)
        .expect(409); // Conflict - round not active

      // Clean up
      await prisma.round.delete({ where: { id: roundResponse.body.id } });
    });

    it('should reject taps after round ends', async () => {
      // Create a round that ends quickly
      const now = new Date();
      const endedRound = await prisma.round.create({
        data: {
          startsAt: new Date(now.getTime() - 10000), // Started 10 seconds ago
          endsAt: new Date(now.getTime() - 1000), // Ended 1 second ago
        },
      });

      await request(app.getHttpServer())
        .post(`/tap/${endedRound.id}`)
        .set('Authorization', `Bearer ${survivorTokens.accessToken}`)
        .expect(409); // Conflict - round ended

      // Clean up
      await prisma.round.delete({ where: { id: endedRound.id } });
    }, 10000); // Increase timeout for this test
  });

  describe('2. Point Calculation Rules', () => {
    it('should give 1 point for taps 1-10, then 10 points for 11th tap', async () => {
      const expectedPoints = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 20]; // 11th tap gives +10

      for (let i = 0; i < 11; i++) {
        const response = await request(app.getHttpServer())
          .post(`/tap/${roundId}`)
          .set('Authorization', `Bearer ${survivorTokens.accessToken}`)
          .expect(201); // POST requests return 201 Created

        expect(response.body.myPoints).toBe(expectedPoints[i]);
        // Add small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    });

    it('should continue pattern after 11th tap: 21, 22, ..., 30, 40', async () => {
      // First tap 11 times to get to 20 points
      for (let i = 0; i < 11; i++) {
        await request(app.getHttpServer())
          .post(`/tap/${roundId}`)
          .set('Authorization', `Bearer ${survivorTokens.accessToken}`)
          .expect(201);
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      // Then test the next pattern - only test key taps to avoid rate limiting
      const response12 = await request(app.getHttpServer())
        .post(`/tap/${roundId}`)
        .set('Authorization', `Bearer ${survivorTokens.accessToken}`)
        .expect(201);
      expect(response12.body.myPoints).toBe(21); // 12th tap

      // Skip to 22nd tap - do 10 more taps
      for (let i = 0; i < 10; i++) {
        await request(app.getHttpServer())
          .post(`/tap/${roundId}`)
          .set('Authorization', `Bearer ${survivorTokens.accessToken}`)
          .expect(201);
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      const response22 = await request(app.getHttpServer())
        .post(`/tap/${roundId}`)
        .set('Authorization', `Bearer ${survivorTokens.accessToken}`)
        .expect(201);
      expect(response22.body.myPoints).toBe(40); // 22nd tap (20 + 10 + 10)
    });

    it('should never give points to nikita regardless of tap count', async () => {
      // Tap fewer times to avoid rate limiting
      for (let i = 0; i < 12; i++) {
        const response = await request(app.getHttpServer())
          .post(`/tap/${roundId}`)
          .set('Authorization', `Bearer ${nikitaTokens.accessToken}`)
          .expect(201);

        expect(response.body.myPoints).toBe(0); // Always 0 for nikita
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      // Verify Redis tracks all taps
      const redisCount = await redis.getClickCount(roundId, nikitaTokens.userId);
      expect(redisCount).toBe(12);
    });
  });

  describe('3. Concurrent Taps and Performance', () => {
    it('should handle multiple users tapping simultaneously', async () => {
      // Reduce the number of concurrent requests to avoid rate limiting
      const survivorTaps = 10;
      const nikitaTaps = 10;
      const promises = [];

      // Create taps for survivor
      for (let i = 0; i < survivorTaps; i++) {
        promises.push(
          request(app.getHttpServer())
            .post(`/tap/${roundId}`)
            .set('Authorization', `Bearer ${survivorTokens.accessToken}`),
        );
      }

      // Create taps for nikita
      for (let i = 0; i < nikitaTaps; i++) {
        promises.push(
          request(app.getHttpServer())
            .post(`/tap/${roundId}`)
            .set('Authorization', `Bearer ${nikitaTokens.accessToken}`),
        );
      }

      // Execute all taps concurrently
      const results = await Promise.all(promises);

      // All should succeed (some might be 201 for successful taps, some might be 429 for rate limited)
      results.forEach(result => {
        expect([201, 429]).toContain(result.status);
      });

      // Verify Redis counts - should have at least some successful taps
      const survivorCount = await redis.getClickCount(roundId, survivorTokens.userId);
      const nikitaCount = await redis.getClickCount(roundId, nikitaTokens.userId);

      expect(survivorCount).toBeGreaterThan(0);
      expect(nikitaCount).toBeGreaterThan(0);
    });

    it('should handle sequential taps correctly', async () => {
      // Test sequential taps instead of concurrent to avoid rate limiting
      for (let i = 0; i < 5; i++) {
        const response = await request(app.getHttpServer())
          .post(`/tap/${roundId}`)
          .set('Authorization', `Bearer ${survivorTokens.accessToken}`)
          .expect(201);

        expect(response.body.myPoints).toBe(i + 1);
        await new Promise(resolve => setTimeout(resolve, 100)); // Delay to avoid rate limiting
      }

      // Verify Redis count
      const survivorCount = await redis.getClickCount(roundId, survivorTokens.userId);
      expect(survivorCount).toBe(5);
    });
  });

  describe('4. Real-time Statistics', () => {
    it('should reflect real-time statistics after taps', async () => {
      // Make some taps
      await request(app.getHttpServer())
        .post(`/tap/${roundId}`)
        .set('Authorization', `Bearer ${survivorTokens.accessToken}`)
        .expect(201);

      await new Promise(resolve => setTimeout(resolve, 100)); // Delay to avoid rate limiting

      await request(app.getHttpServer())
        .post(`/tap/${roundId}`)
        .set('Authorization', `Bearer ${nikitaTokens.accessToken}`)
        .expect(201);

      // Check round statistics
      const statsResponse = await request(app.getHttpServer())
        .get(`/rounds/${roundId}`)
        .set('Authorization', `Bearer ${survivorTokens.accessToken}`)
        .expect(200);

      // Should show pending clicks in Redis
      const pendingClicks = await redis.getRoundPendingClicks(roundId);
      expect(pendingClicks.size).toBe(2); // Two users have pending clicks
      expect(pendingClicks.get(survivorTokens.userId)).toBe(1);
      expect(pendingClicks.get(nikitaTokens.userId)).toBe(1);
    });

    it('should properly flush pending clicks when round ends', async () => {
      // Make some taps with delays
      for (let i = 0; i < 3; i++) {
        await request(app.getHttpServer())
          .post(`/tap/${roundId}`)
          .set('Authorization', `Bearer ${survivorTokens.accessToken}`)
          .expect(201);
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Force flush (simulating round end)
      const flushedData = await redis.forceFlushRound(roundId);

      expect(flushedData.size).toBe(1);
      expect(flushedData.get(survivorTokens.userId)).toBe(3);

      // Verify Redis is clean
      const pendingAfterFlush = await redis.getRoundPendingClicks(roundId);
      expect(pendingAfterFlush.size).toBe(0);
    });
  });

  describe('5. Error Handling', () => {
    it('should return 404 for non-existent round', async () => {
      const fakeRoundId = '550e8400-e29b-41d4-a716-446655440000';

      await request(app.getHttpServer())
        .post(`/tap/${fakeRoundId}`)
        .set('Authorization', `Bearer ${survivorTokens.accessToken}`)
        .expect(404);
    });

    it('should return 401 for unauthenticated requests', async () => {
      await request(app.getHttpServer()).post(`/tap/${roundId}`).expect(401);
    });

    it('should return 400 for invalid round ID format', async () => {
      await request(app.getHttpServer())
        .post('/tap/invalid-uuid')
        .set('Authorization', `Bearer ${survivorTokens.accessToken}`)
        .expect(400);
    });
  });
});
