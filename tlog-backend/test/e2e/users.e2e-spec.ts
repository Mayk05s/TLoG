import * as request from 'supertest';
import { closeTestingApp, createTestingApp, prisma } from '../test-utils';
import { TEST_USERS } from '../data/test-users';
import { NestFastifyApplication } from '@nestjs/platform-fastify';

describe('Users (e2e)', () => {
  let app: NestFastifyApplication;

  // Extract test users for better readability
  const { admin, regularUser, nikita } = TEST_USERS;

  // Tokens for different user roles
  let adminTokens: { accessToken: string; refreshToken: string; userId: string };
  let survivorTokens: { accessToken: string; refreshToken: string; userId: string };
  let nikitaTokens: { accessToken: string; refreshToken: string; userId: string };

  beforeAll(async () => {
    app = await createTestingApp();

    adminTokens = await loginUser(admin.username, admin.password);
    survivorTokens = await loginUser(regularUser.username, regularUser.password);
    nikitaTokens = await loginUser(nikita.username, nikita.password);
  });

  afterAll(async () => {
    await closeTestingApp(app);
    await prisma.$disconnect();
  });

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

  describe('GET /users - Admin access', () => {
    it('should return all users when admin requests', async () => {
      const response = await request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${adminTokens.accessToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThanOrEqual(3);

      // Verify user structure
      response.body.forEach((user: any) => {
        expect(user).toHaveProperty('id');
        expect(user).toHaveProperty('username');
        expect(user).toHaveProperty('role');
        expect(user).toHaveProperty('createdAt');
        expect(user).not.toHaveProperty('passwordHash');
      });

      // Check that our test users are present
      const usernames = response.body.map((user: any) => user.username);
      expect(usernames).toContain(admin.username);
      expect(usernames).toContain(regularUser.username);
      expect(usernames).toContain(nikita.username);
    });
  });

  describe('GET /users/:id - Admin access', () => {
    it('should return user by valid UUID', async () => {
      const response = await request(app.getHttpServer())
        .get(`/users/${survivorTokens.userId}`)
        .set('Authorization', `Bearer ${adminTokens.accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id', survivorTokens.userId);
      expect(response.body).toHaveProperty('username', regularUser.username);
      expect(response.body).toHaveProperty('role', 'survivor');
      expect(response.body).not.toHaveProperty('passwordHash');
    });

    it('should return 404 for non-existent UUID', async () => {
      const nonExistentId = '550e8400-e29b-41d4-a716-446655440000';
      const response = await request(app.getHttpServer())
        .get(`/users/${nonExistentId}`)
        .set('Authorization', `Bearer ${adminTokens.accessToken}`);

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('User not found');
    });

    it('should return 400 for invalid UUID format', async () => {
      const response = await request(app.getHttpServer())
        .get('/users/invalid-uuid')
        .set('Authorization', `Bearer ${adminTokens.accessToken}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Validation failed (uuid is expected)');
    });
  });

  describe('GET /users/username/:username - Admin access', () => {
    it('should return user by valid username', async () => {
      const response = await request(app.getHttpServer())
        .get(`/users/username/${regularUser.username}`)
        .set('Authorization', `Bearer ${adminTokens.accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('username', regularUser.username);
      expect(response.body).toHaveProperty('role', 'survivor');
      expect(response.body).not.toHaveProperty('passwordHash');
    });

    it('should return 404 for non-existent username', async () => {
      const response = await request(app.getHttpServer())
        .get('/users/username/nonexistentuser')
        .set('Authorization', `Bearer ${adminTokens.accessToken}`);

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('User not found');
    });

    it('should trim whitespace from username', async () => {
      const response = await request(app.getHttpServer())
        .get(`/users/username/  ${regularUser.username}  `)
        .set('Authorization', `Bearer ${adminTokens.accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('username', regularUser.username);
    });

    it('should validate username length - too short', async () => {
      const response = await request(app.getHttpServer())
        .get('/users/username/ab')
        .set('Authorization', `Bearer ${adminTokens.accessToken}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Username must be at least 3 characters long');
    });

    it('should validate username length - too long', async () => {
      const longUsername = 'a'.repeat(21);
      const response = await request(app.getHttpServer())
        .get(`/users/username/${longUsername}`)
        .set('Authorization', `Bearer ${adminTokens.accessToken}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Username must not exceed 20 characters');
    });

    it('should validate empty username after trimming', async () => {
      // Use URL encoding to ensure the spaces are preserved in the URL path
      const response = await request(app.getHttpServer())
        .get('/users/username/%20%20%20') // URL encoded spaces
        .set('Authorization', `Bearer ${adminTokens.accessToken}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Username cannot be empty');
    });
  });

  describe('Access Control - Survivor denied', () => {
    it('should deny survivor access to GET /users', async () => {
      const response = await request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${survivorTokens.accessToken}`);

      expect(response.status).toBe(403);
    });

    it('should deny survivor access to GET /users/:id', async () => {
      const response = await request(app.getHttpServer())
        .get(`/users/${adminTokens.userId}`)
        .set('Authorization', `Bearer ${survivorTokens.accessToken}`);

      expect(response.status).toBe(403);
    });

    it('should deny survivor access to GET /users/username/:username', async () => {
      const response = await request(app.getHttpServer())
        .get(`/users/username/${admin.username}`)
        .set('Authorization', `Bearer ${survivorTokens.accessToken}`);

      expect(response.status).toBe(403);
    });
  });

  describe('Authentication required', () => {
    it('should return 401 for unauthenticated requests', async () => {
      const endpoints = [
        '/users',
        `/users/${adminTokens.userId}`,
        `/users/username/${admin.username}`,
      ];

      for (const endpoint of endpoints) {
        const response = await request(app.getHttpServer()).get(endpoint);
        expect(response.status).toBe(401);
      }
    });
  });
});
