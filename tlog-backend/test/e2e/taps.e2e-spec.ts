import * as request from 'supertest';
import { closeTestingApp, createTestingApp, prisma } from '../test-utils';
import { TEST_USERS } from '../data/test-users';
import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { TapCacheService } from '../../src/cache/tap-cache.service';

describe('Taps (e2e)', () => {
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

  describe('1. Basic Tap Registration - Redis Cache Test', () => {
    it('should register a single tap and store it in Redis cache', async () => {
      // Before tap - verify no pending taps
      const pendingTapsBefore = await tapCache.getPendingTaps(roundId, survivorTokens.userId);
      expect(pendingTapsBefore).toBe(0);

      // Make the tap
      await request(app.getHttpServer())
        .post(`/tap/${roundId}`)
        .set('Authorization', `Bearer ${survivorTokens.accessToken}`)
        .expect(201);

      // After tap - verify tap was stored in Redis
      const pendingTapsAfter = await tapCache.getPendingTaps(roundId, survivorTokens.userId);
      expect(pendingTapsAfter).toBe(1);
    });

    it('should register multiple taps and accumulate them in Redis', async () => {
      // Make 3 taps
      for (let i = 0; i < 3; i++) {
        await request(app.getHttpServer())
          .post(`/tap/${roundId}`)
          .set('Authorization', `Bearer ${survivorTokens.accessToken}`)
          .expect(201);
      }

      // Verify all taps were stored in Redis
      const pendingTaps = await tapCache.getPendingTaps(roundId, survivorTokens.userId);
      expect(pendingTaps).toBe(3);
    });

    it('should register taps for nikita user', async () => {
      // Make tap for nikita
      await request(app.getHttpServer())
        .post(`/tap/${roundId}`)
        .set('Authorization', `Bearer ${nikitaTokens.accessToken}`)
        .expect(201);

      // Verify tap was stored in Redis
      const pendingTaps = await tapCache.getPendingTaps(roundId, nikitaTokens.userId);
      expect(pendingTaps).toBe(1);
    });
  });

  describe('2. Points Calculation via Stats API', () => {
    it('should calculate correct points for survivor user', async () => {
      // Make 5 taps
      for (let i = 0; i < 5; i++) {
        await request(app.getHttpServer())
          .post(`/tap/${roundId}`)
          .set('Authorization', `Bearer ${survivorTokens.accessToken}`)
          .expect(201);
      }

      // Check points via stats API - should be 5 points (5 x 1 point each)
      const response = await request(app.getHttpServer())
        .get(`/stats/my-points/${roundId}`)
        .set('Authorization', `Bearer ${survivorTokens.accessToken}`)
        .expect(200);

      expect(response.body).toBe(5);
    });

    it('should give 0 points to nikita user regardless of taps', async () => {
      // Make 3 taps for nikita
      for (let i = 0; i < 3; i++) {
        await request(app.getHttpServer())
          .post(`/tap/${roundId}`)
          .set('Authorization', `Bearer ${nikitaTokens.accessToken}`)
          .expect(201);
      }

      // Check points via stats API - should be 0 points for nikita
      const response = await request(app.getHttpServer())
        .get(`/stats/my-points/${roundId}`)
        .set('Authorization', `Bearer ${nikitaTokens.accessToken}`)
        .expect(200);

      expect(response.body).toBe(0);
    });

    it('should give bonus points for 11th tap', async () => {
      // Make 11 taps (10 normal + 1 bonus)
      for (let i = 0; i < 11; i++) {
        await request(app.getHttpServer())
          .post(`/tap/${roundId}`)
          .set('Authorization', `Bearer ${survivorTokens.accessToken}`)
          .expect(201);
      }

      // Check points via stats API
      // Expected: 1+1+1+1+1+1+1+1+1+1+10 = 20 points
      const response = await request(app.getHttpServer())
        .get(`/stats/my-points/${roundId}`)
        .set('Authorization', `Bearer ${survivorTokens.accessToken}`)
        .expect(200);

      expect(response.body).toBe(20);
    });
  });
});
