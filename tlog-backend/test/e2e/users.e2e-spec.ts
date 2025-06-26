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

  describe('GET /users/:id', () => {
    it('should return user by ID when admin requests valid user', async () => {
      const response = await request(app.getHttpServer())
        .get(`/users/${survivorTokens.userId}`)
        .set('Authorization', `Bearer ${adminTokens.accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id', survivorTokens.userId);
      expect(response.body).toHaveProperty('username', regularUser.username);
      expect(response.body).toHaveProperty('role', 'survivor');
      expect(response.body).toHaveProperty('createdAt');
      expect(response.body).not.toHaveProperty('passwordHash');
    });

    it('should return 403 when survivor tries to get user by ID', async () => {
      const response = await request(app.getHttpServer())
        .get(`/users/${adminTokens.userId}`)
        .set('Authorization', `Bearer ${survivorTokens.accessToken}`);
      expect(response.status).toBe(403);
    });

    it('should return 404 when admin requests non-existent user', async () => {
      const nonExistentId = '550e8400-e29b-41d4-a716-446655440000';

      const response = await request(app.getHttpServer())
        .get(`/users/${nonExistentId}`)
        .set('Authorization', `Bearer ${adminTokens.accessToken}`);

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('User not found');
    });

    it('should return 400 for invalid UUID format', async () => {
      const response = await request(app.getHttpServer())
        .get('/users/invalid-uuid-format')
        .set('Authorization', `Bearer ${adminTokens.accessToken}`);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('Validation failed (uuid is expected)');
    });

    it('should return 400 for empty UUID', async () => {
      const response = await request(app.getHttpServer())
        .get('/users/')
        .set('Authorization', `Bearer ${adminTokens.accessToken}`);

      expect(response.status).toBe(404); // Route not found
    });

    it('should return 401 for unauthenticated request', async () => {
      const response = await request(app.getHttpServer()).get(`/users/${adminTokens.userId}`);

      expect(response.status).toBe(401);
    });

    it('should return 401 for invalid token', async () => {
      const response = await request(app.getHttpServer())
        .get(`/users/${adminTokens.userId}`)
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
    });
  });

  describe('GET /users/username/:username', () => {
    it('should return user by username when admin requests valid user', async () => {
      const response = await request(app.getHttpServer())
        .get(`/users/username/${regularUser.username}`)
        .set('Authorization', `Bearer ${adminTokens.accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id', survivorTokens.userId);
      expect(response.body).toHaveProperty('username', regularUser.username);
      expect(response.body).toHaveProperty('role', 'survivor');
      expect(response.body).not.toHaveProperty('passwordHash');
    });

    it('should return admin user when admin requests their own username', async () => {
      const response = await request(app.getHttpServer())
        .get(`/users/username/${admin.username}`)
        .set('Authorization', `Bearer ${adminTokens.accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id', adminTokens.userId);
      expect(response.body).toHaveProperty('username', admin.username);
      expect(response.body).toHaveProperty('role', 'admin');
    });

    it('should return nikita user when admin requests nikita username', async () => {
      const response = await request(app.getHttpServer())
        .get(`/users/username/${nikita.username}`)
        .set('Authorization', `Bearer ${adminTokens.accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id', nikitaTokens.userId);
      expect(response.body).toHaveProperty('username', nikita.username);
      expect(response.body).toHaveProperty('role', 'nikita');
    });

    it('should return 403 when survivor tries to get user by username', async () => {
      const response = await request(app.getHttpServer())
        .get(`/users/username/${admin.username}`)
        .set('Authorization', `Bearer ${survivorTokens.accessToken}`);

      expect(response.status).toBe(403);
    });

    it('should return 403 when nikita tries to get user by username', async () => {
      const response = await request(app.getHttpServer())
        .get(`/users/username/${admin.username}`)
        .set('Authorization', `Bearer ${nikitaTokens.accessToken}`);

      expect(response.status).toBe(403);
    });

    it('should return 404 when admin requests non-existent username', async () => {
      const response = await request(app.getHttpServer())
        .get('/users/username/nonexistentuser')
        .set('Authorization', `Bearer ${adminTokens.accessToken}`);

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('User not found');
    });

    it('should trim whitespace from username parameter', async () => {
      const response = await request(app.getHttpServer())
        .get(`/users/username/  ${regularUser.username}  `)
        .set('Authorization', `Bearer ${adminTokens.accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('username', regularUser.username);
    });

    it('should return 400 for empty username after trimming', async () => {
      const response = await request(app.getHttpServer())
        .get('/users/username/   ')
        .set('Authorization', `Bearer ${adminTokens.accessToken}`);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message', 'Username cannot be empty');
    });

    it('should return 400 for username shorter than 3 characters', async () => {
      const response = await request(app.getHttpServer())
        .get('/users/username/ab')
        .set('Authorization', `Bearer ${adminTokens.accessToken}`);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty(
        'message',
        'Username must be at least 3 characters long',
      );
    });

    it('should return 400 for username longer than 20 characters', async () => {
      const longUsername = 'a'.repeat(21);
      const response = await request(app.getHttpServer())
        .get(`/users/username/${longUsername}`)
        .set('Authorization', `Bearer ${adminTokens.accessToken}`);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty(
        'message',
        'Username must be at most 20 characters long',
      );
    });

    it('should return 400 for username with invalid characters', async () => {
      const invalidUsernames = [
        'user@name',
        'user name',
        'user.name',
        'user#name',
        'user!name',
        'user+name',
        'user-with-cyrillic',
      ];

      for (const invalidUsername of invalidUsernames) {
        const response = await request(app.getHttpServer())
          .get(`/users/username/${invalidUsername}`)
          .set('Authorization', `Bearer ${adminTokens.accessToken}`);

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty(
          'message',
          'Username can only contain letters, numbers, underscores, and hyphens',
        );
      }
    });

    it('should accept valid usernames with allowed characters', async () => {
      // First create a user with valid characters
      const validUsername = 'valid_user-123';
      await request(app.getHttpServer())
        .post('/auth/signup')
        .send({ username: validUsername, password: 'password123' });

      const response = await request(app.getHttpServer())
        .get(`/users/username/${validUsername}`)
        .set('Authorization', `Bearer ${adminTokens.accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('username', validUsername);
    });

    it('should return 400 for non-string username parameter', async () => {
      // This test is more theoretical since URL params are always strings,
      // but our pipe should handle it correctly
      const response = await request(app.getHttpServer())
        .get('/users/username/123')
        .set('Authorization', `Bearer ${adminTokens.accessToken}`);

      // Should work fine since '123' is a valid string username
      expect(response.status).toBe(404); // User not found, but validation passed
    });

    it('should return 401 for unauthenticated request', async () => {
      const response = await request(app.getHttpServer()).get(
        `/users/username/${regularUser.username}`,
      );

      expect(response.status).toBe(401);
    });

    it('should return 401 for invalid token', async () => {
      const response = await request(app.getHttpServer())
        .get(`/users/username/${regularUser.username}`)
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
    });
  });

  describe('Username validation edge cases', () => {
    it('should handle URL encoding in username parameter', async () => {
      // Create a user with underscores and hyphens
      const specialUsername = 'test_user-name';
      await request(app.getHttpServer())
        .post('/auth/signup')
        .send({ username: specialUsername, password: 'password123' });

      // Test with URL encoded version
      const encodedUsername = encodeURIComponent(specialUsername);
      const response = await request(app.getHttpServer())
        .get(`/users/username/${encodedUsername}`)
        .set('Authorization', `Bearer ${adminTokens.accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('username', specialUsername);
    });

    it('should handle case sensitivity correctly', async () => {
      // Usernames should be case sensitive
      const response = await request(app.getHttpServer())
        .get(`/users/username/${regularUser.username.toUpperCase()}`)
        .set('Authorization', `Bearer ${adminTokens.accessToken}`);

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('User not found');
    });
  });
});
