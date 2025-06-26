import * as request from 'supertest';
import { closeTestingApp, createTestingApp, prisma } from '../test-utils';
import { TEST_USERS } from '../data/test-users';
import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { RoundStatus } from '../../src/modules/rounds/enums/round-status.enum';

describe('Rounds (e2e)', () => {
  let app: NestFastifyApplication;

  // Extract test users for better readability
  const { admin, regularUser, nikita } = TEST_USERS;

  // Tokens for different user roles
  let adminTokens: { accessToken: string; refreshToken: string };
  let survivorTokens: { accessToken: string; refreshToken: string };
  let nikitaTokens: { accessToken: string; refreshToken: string };

  beforeAll(async () => {
    app = await createTestingApp();

    // Register and login users to get tokens
    await registerAndLoginUser(admin.username, admin.password).then(tokens => {
      adminTokens = tokens;
    });

    await registerAndLoginUser(regularUser.username, regularUser.password).then(tokens => {
      survivorTokens = tokens;
    });

    await registerAndLoginUser(nikita.username, nikita.password).then(tokens => {
      nikitaTokens = tokens;
    });
  });

  afterAll(async () => {
    await closeTestingApp(app);
    await prisma.$disconnect();
  });

  // Helper function to register and login a user
  async function registerAndLoginUser(username: string, password: string) {
    // Login to get tokens
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ username, password });

    return {
      accessToken: loginResponse.body.accessToken,
      refreshToken: loginResponse.body.refreshToken,
    };
  }

  // Helper function to create rounds with specific timing
  async function createRoundWithTiming(startsAt: Date, endsAt: Date) {
    const round = await prisma.round.create({
      data: {
        startsAt,
        endsAt,
      },
    });
    return round;
  }

  describe('GET /rounds - Filtering', () => {
    let upcomingRound: any;
    let activeRound: any;
    let completedRound: any;

    beforeEach(async () => {
      // Clean up existing rounds
      await prisma.round.deleteMany();

      const now = new Date();

      // Create upcoming round (starts in 1 hour, ends in 2 hours)
      upcomingRound = await createRoundWithTiming(
        new Date(now.getTime() + 60 * 60 * 1000),
        new Date(now.getTime() + 2 * 60 * 60 * 1000),
      );

      // Create active round (started 30 minutes ago, ends in 30 minutes)
      activeRound = await createRoundWithTiming(
        new Date(now.getTime() - 30 * 60 * 1000),
        new Date(now.getTime() + 30 * 60 * 1000),
      );

      // Create completed round (started 2 hours ago, ended 1 hour ago)
      completedRound = await createRoundWithTiming(
        new Date(now.getTime() - 2 * 60 * 60 * 1000),
        new Date(now.getTime() - 60 * 60 * 1000),
      );
    });

    it('should return all rounds when no status filter is applied', async () => {
      const response = await request(app.getHttpServer())
        .get('/rounds')
        .set('Authorization', `Bearer ${adminTokens.accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(3);

      const roundIds = response.body.map((round: any) => round.id);
      expect(roundIds).toContain(upcomingRound.id);
      expect(roundIds).toContain(activeRound.id);
      expect(roundIds).toContain(completedRound.id);
    });

    it('should return only active rounds when filtering by active status', async () => {
      const response = await request(app.getHttpServer())
        .get(`/rounds?status=${RoundStatus.ACTIVE}`)
        .set('Authorization', `Bearer ${adminTokens.accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].id).toBe(activeRound.id);
    });

    it('should return only upcoming rounds when filtering by upcoming status', async () => {
      const response = await request(app.getHttpServer())
        .get(`/rounds?status=${RoundStatus.UPCOMING}`)
        .set('Authorization', `Bearer ${adminTokens.accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].id).toBe(upcomingRound.id);
    });

    it('should return only completed rounds when filtering by completed status', async () => {
      const response = await request(app.getHttpServer())
        .get(`/rounds?status=${RoundStatus.COMPLETED}`)
        .set('Authorization', `Bearer ${adminTokens.accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].id).toBe(completedRound.id);
    });

    it('should return empty array when filtering by status with no matching rounds', async () => {
      // Clean up all rounds
      await prisma.round.deleteMany();

      const response = await request(app.getHttpServer())
        .get(`/rounds?status=${RoundStatus.ACTIVE}`)
        .set('Authorization', `Bearer ${adminTokens.accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(0);
    });

    it('should return 400 for invalid status filter', async () => {
      const response = await request(app.getHttpServer())
        .get('/rounds?status=invalid_status')
        .set('Authorization', `Bearer ${adminTokens.accessToken}`);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain(
        'status must be one of the following values: active, upcoming, completed',
      );
    });

    it('should return 400 for empty status filter', async () => {
      const response = await request(app.getHttpServer())
        .get('/rounds?status=')
        .set('Authorization', `Bearer ${adminTokens.accessToken}`);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message');
    });

    it('should work with filtering for all user roles', async () => {
      // Test survivor user
      const survivorResponse = await request(app.getHttpServer())
        .get(`/rounds?status=${RoundStatus.ACTIVE}`)
        .set('Authorization', `Bearer ${survivorTokens.accessToken}`);

      expect(survivorResponse.status).toBe(200);
      expect(survivorResponse.body).toHaveLength(1);
      expect(survivorResponse.body[0].id).toBe(activeRound.id);

      // Test nikita user
      const nikitaResponse = await request(app.getHttpServer())
        .get(`/rounds?status=${RoundStatus.UPCOMING}`)
        .set('Authorization', `Bearer ${nikitaTokens.accessToken}`);

      expect(nikitaResponse.status).toBe(200);
      expect(nikitaResponse.body).toHaveLength(1);
      expect(nikitaResponse.body[0].id).toBe(upcomingRound.id);
    });

    it('should maintain proper ordering when filtering', async () => {
      // Create multiple rounds of the same status
      const now = new Date();
      const oldCompletedRound = await createRoundWithTiming(
        new Date(now.getTime() - 4 * 60 * 60 * 1000),
        new Date(now.getTime() - 3 * 60 * 60 * 1000),
      );

      const response = await request(app.getHttpServer())
        .get(`/rounds?status=${RoundStatus.COMPLETED}`)
        .set('Authorization', `Bearer ${adminTokens.accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);

      // Should be ordered by createdAt desc (newest first)
      const createdAtTimes = response.body.map((round: any) => round.createdAt);
      expect(createdAtTimes[0]).toBeGreaterThan(createdAtTimes[1]);
    });

    it('should handle case-sensitive status values correctly', async () => {
      const response = await request(app.getHttpServer())
        .get('/rounds?status=ACTIVE')
        .set('Authorization', `Bearer ${adminTokens.accessToken}`);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain(
        'status must be one of the following values: active, upcoming, completed',
      );
    });
  });

  describe('GET /rounds', () => {
    it('should return all rounds for authenticated admin', async () => {
      const response = await request(app.getHttpServer())
        .get('/rounds')
        .set('Authorization', `Bearer ${adminTokens.accessToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should return all rounds for authenticated survivor', async () => {
      const response = await request(app.getHttpServer())
        .get('/rounds')
        .set('Authorization', `Bearer ${survivorTokens.accessToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should return all rounds for authenticated nikita', async () => {
      const response = await request(app.getHttpServer())
        .get('/rounds')
        .set('Authorization', `Bearer ${nikitaTokens.accessToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should return 401 for unauthenticated request', async () => {
      const response = await request(app.getHttpServer()).get('/rounds');

      expect(response.status).toBe(401);
    });

    it('should return 401 for invalid token', async () => {
      const response = await request(app.getHttpServer())
        .get('/rounds')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
    });

    it('should return empty array when no rounds exist', async () => {
      // Clean up any existing rounds
      await prisma.round.deleteMany();

      const response = await request(app.getHttpServer())
        .get('/rounds')
        .set('Authorization', `Bearer ${adminTokens.accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });
  });

  describe('POST /rounds', () => {
    it('should create a new round when user is admin', async () => {
      const response = await request(app.getHttpServer())
        .post('/rounds')
        .set('Authorization', `Bearer ${adminTokens.accessToken}`);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('startsAt');
      expect(response.body).toHaveProperty('endsAt');
      expect(response.body).toHaveProperty('createdAt');
      const startsAt = new Date(response.body.startsAt);
      const now = new Date();

      expect(response.body.startsAt).toBeGreaterThan(now.getTime());
      expect(response.body.endsAt).toBeGreaterThan(startsAt.getTime());
    });

    it('should return 403 when survivor tries to create round', async () => {
      const response = await request(app.getHttpServer())
        .post('/rounds')
        .set('Authorization', `Bearer ${survivorTokens.accessToken}`);

      expect(response.status).toBe(403);
    });

    it('should return 403 when nikita tries to create round', async () => {
      const response = await request(app.getHttpServer())
        .post('/rounds')
        .set('Authorization', `Bearer ${nikitaTokens.accessToken}`);

      expect(response.status).toBe(403);
    });

    it('should return 401 for unauthenticated request', async () => {
      const response = await request(app.getHttpServer()).post('/rounds');

      expect(response.status).toBe(401);
    });

    it('should return 401 for invalid token', async () => {
      const response = await request(app.getHttpServer())
        .post('/rounds')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
    });

    it('should create multiple rounds with correct timing', async () => {
      // Create first round
      const firstResponse = await request(app.getHttpServer())
        .post('/rounds')
        .set('Authorization', `Bearer ${adminTokens.accessToken}`);

      expect(firstResponse.status).toBe(201);

      // Wait a bit to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 100));

      // Create second round
      const secondResponse = await request(app.getHttpServer())
        .post('/rounds')
        .set('Authorization', `Bearer ${adminTokens.accessToken}`);

      expect(secondResponse.status).toBe(201);

      // Verify they have different IDs and timestamps
      expect(firstResponse.body.id).not.toBe(secondResponse.body.id);
      expect(new Date(firstResponse.body.createdAt).getTime()).toBeLessThan(
        new Date(secondResponse.body.createdAt).getTime(),
      );
    });
  });

  describe('GET /rounds/:id', () => {
    let testRoundId: string;

    beforeEach(async () => {
      // Create a test round for each test
      const createResponse = await request(app.getHttpServer())
        .post('/rounds')
        .set('Authorization', `Bearer ${adminTokens.accessToken}`);

      testRoundId = createResponse.body.id;
    });

    it('should return round details with user ID for admin', async () => {
      const response = await request(app.getHttpServer())
        .get(`/rounds/${testRoundId}`)
        .set('Authorization', `Bearer ${adminTokens.accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id', testRoundId);
      expect(response.body).toHaveProperty('startsAt');
      expect(response.body).toHaveProperty('endsAt');
      expect(response.body).toHaveProperty('createdAt');
      expect(response.body).toHaveProperty('userId');
    });

    it('should return round details with user ID for survivor', async () => {
      const response = await request(app.getHttpServer())
        .get(`/rounds/${testRoundId}`)
        .set('Authorization', `Bearer ${survivorTokens.accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id', testRoundId);
      expect(response.body).toHaveProperty('userId');
    });

    it('should return round details with user ID for nikita', async () => {
      const response = await request(app.getHttpServer())
        .get(`/rounds/${testRoundId}`)
        .set('Authorization', `Bearer ${nikitaTokens.accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id', testRoundId);
      expect(response.body).toHaveProperty('userId');
    });

    it('should return 404 when round does not exist', async () => {
      const nonExistentId = '123e4567-e89b-12d3-a456-426614174999';

      const response = await request(app.getHttpServer())
        .get(`/rounds/${nonExistentId}`)
        .set('Authorization', `Bearer ${adminTokens.accessToken}`);

      expect(response.status).toBe(404);
      expect(response.body.message).toContain('Round with ID');
    });

    it('should return 400 for invalid UUID format', async () => {
      const response = await request(app.getHttpServer())
        .get('/rounds/invalid-uuid')
        .set('Authorization', `Bearer ${adminTokens.accessToken}`);

      expect(response.status).toBe(400);
    });

    it('should return 401 for unauthenticated request', async () => {
      const response = await request(app.getHttpServer()).get(`/rounds/${testRoundId}`);

      expect(response.status).toBe(401);
    });

    it('should return 401 for invalid token', async () => {
      const response = await request(app.getHttpServer())
        .get(`/rounds/${testRoundId}`)
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
    });
  });

  describe('Round timing logic', () => {
    it('should create rounds with proper cooldown and duration timing', async () => {
      const beforeCreation = new Date();

      const response = await request(app.getHttpServer())
        .post('/rounds')
        .set('Authorization', `Bearer ${adminTokens.accessToken}`);

      expect(response.status).toBe(201);

      const startsAt = new Date(response.body.startsAt);
      const endsAt = new Date(response.body.endsAt);
      const afterCreation = new Date();

      // startsAt should be at least cooldown duration (30s) after creation
      const minStartTime = new Date(beforeCreation.getTime() + 30 * 1000);
      const maxStartTime = new Date(afterCreation.getTime() + 30 * 1000);

      expect(startsAt.getTime()).toBeGreaterThanOrEqual(minStartTime.getTime());
      expect(startsAt.getTime()).toBeLessThanOrEqual(maxStartTime.getTime());

      // endsAt should be round duration (60s) after startsAt
      const expectedEndTime = new Date(startsAt.getTime() + 60 * 1000);
      expect(endsAt.getTime()).toBe(expectedEndTime.getTime());
    });
  });
});
