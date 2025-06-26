import * as request from 'supertest';
import { closeTestingApp, createTestingApp, prisma } from '../test-utils';
import { TEST_USERS } from '../data/test-users';
import { NestFastifyApplication } from '@nestjs/platform-fastify';

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
      expect(response.body).toHaveProperty('starts_at');
      expect(response.body).toHaveProperty('ends_at');
      expect(response.body).toHaveProperty('createdAt');

      // Verify timing logic: starts_at should be in the future (cooldown period)
      const startsAt = new Date(response.body.starts_at);
      const endsAt = new Date(response.body.ends_at);
      const now = new Date();

      expect(startsAt.getTime()).toBeGreaterThan(now.getTime());
      expect(endsAt.getTime()).toBeGreaterThan(startsAt.getTime());
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
      expect(response.body).toHaveProperty('starts_at');
      expect(response.body).toHaveProperty('ends_at');
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

      const startsAt = new Date(response.body.starts_at);
      const endsAt = new Date(response.body.ends_at);
      const afterCreation = new Date();

      // starts_at should be at least cooldown duration (30s) after creation
      const minStartTime = new Date(beforeCreation.getTime() + 30 * 1000);
      const maxStartTime = new Date(afterCreation.getTime() + 30 * 1000);

      expect(startsAt.getTime()).toBeGreaterThanOrEqual(minStartTime.getTime());
      expect(startsAt.getTime()).toBeLessThanOrEqual(maxStartTime.getTime());

      // ends_at should be round duration (60s) after starts_at
      const expectedEndTime = new Date(startsAt.getTime() + 60 * 1000);
      expect(endsAt.getTime()).toBe(expectedEndTime.getTime());
    });
  });
});
