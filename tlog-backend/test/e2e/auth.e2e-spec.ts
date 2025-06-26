import * as request from 'supertest';
import { Role } from '@prisma/client';
import { closeTestingApp, createTestingApp, prisma } from '../test-utils';
import { TEST_USERS } from '../data/test-users';
import { NestFastifyApplication } from '@nestjs/platform-fastify';

describe('Authentication (e2e)', () => {
  let app: NestFastifyApplication;

  // Extract test users for better readability
  const { admin, regularUser, nikita } = TEST_USERS;

  beforeAll(async () => {
    app = await createTestingApp();
    // Database is already cleaned by global-setup.ts
  });

  afterAll(async () => {
    await closeTestingApp(app);
    await prisma.$disconnect();
  });

  // Helper function to register a user and return tokens
  async function registerUser(username: string, password: string) {
    const response = await request(app.getHttpServer())
      .post('/auth/signup')
      .send({ username, password });

    return {
      response,
      accessToken: response.body.accessToken,
      refreshToken: response.body.refreshToken,
      userId: response.body.user?.id,
    };
  }

  // Helper function to login and return tokens
  async function loginUser(username: string, password: string) {
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ username, password });

    return {
      response,
      accessToken: response.body.accessToken,
      refreshToken: response.body.refreshToken,
      userId: response.body.user?.id,
    };
  }

  describe('1. Registration', () => {
    it('should register a new user successfully', async () => {
      const newUser = { username: 'new_test_user', password: 'Password123!', role: Role.survivor };
      const { response } = await registerUser(newUser.username, newUser.password);

      expect(response.status).toBe(201);
      expect(response.body.accessToken).toBeDefined();
      expect(response.body.refreshToken).toBeDefined();
      expect(response.body.user).toBeDefined();
      expect(response.body.user.username).toBe(newUser.username);
      expect(response.body.user.role).toBe(newUser.role);
    });

    it('should fail registration with password validation errors', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/signup')
        .send({ username: 'usertest', password: 'password' });

      expect(response.status).toBe(400);
    });

    it('should fail registration with missing fields', async () => {
      // Test missing password
      const responseNoPassword = await request(app.getHttpServer())
        .post('/auth/signup')
        .send({ username: 'testuser' });

      expect(responseNoPassword.status).toBe(400);

      // Test missing username
      const responseNoUsername = await request(app.getHttpServer())
        .post('/auth/signup')
        .send({ password: 'Password123!' });

      expect(responseNoUsername.status).toBe(400);

      // Test empty request
      const responseEmpty = await request(app.getHttpServer()).post('/auth/signup').send({});

      expect(responseEmpty.status).toBe(400);
    });

    it('should assign correct role based on username', async () => {
      // Create admin user
      const adminResponse = await request(app.getHttpServer())
        .post('/auth/signup')
        .send({ username: 'admin', password: 'Password123!' });

      expect(adminResponse.status).toBe(201);
      expect(adminResponse.body.user.role).toBe('admin');

      // Create nikita user with lowercase
      const nikitaResponse = await request(app.getHttpServer())
        .post('/auth/signup')
        .send({ username: 'nikita', password: 'Password123!' });

      expect(nikitaResponse.status).toBe(201);
      expect(nikitaResponse.body.user.role).toBe('nikita');

      // Create regular user
      const regularResponse = await request(app.getHttpServer())
        .post('/auth/signup')
        .send({ username: 'admin_as_user', password: 'Password123!' });

      expect(regularResponse.status).toBe(201);
      expect(regularResponse.body.user.role).toBe('survivor');
    });

    it('should fail registration for duplicate username', async () => {
      const username = 'duplicate_user';
      await prisma.user.create({
        data: {
          username,
          password: 'somehashedpassword',
          role: Role.survivor,
        },
      });
      const response = await request(app.getHttpServer()).post('/auth/signup').send({
        username,
        password: 'Password123!',
      });

      expect(response.status).toBe(409);
      expect(response.body.message).toContain('already exists');
    });
  });

  describe('2. Login', () => {
    // Create a user for login tests
    beforeAll(async () => {});

    it('should login successfully with valid credentials', async () => {
      const { response } = await loginUser(regularUser.username, regularUser.password);

      expect(response.status).toBe(201);
      expect(response.body.accessToken).toBeDefined();
      expect(response.body.refreshToken).toBeDefined();
    });

    it('should login admin successfully', async () => {
      const { response } = await loginUser(admin.username, admin.password);

      expect(response.status).toBe(201);
      expect(response.body.accessToken).toBeDefined();
      expect(response.body.refreshToken).toBeDefined();
    });

    it('should login nikita user successfully', async () => {
      const { response } = await loginUser(nikita.username, nikita.password);

      expect(response.status).toBe(201);
      expect(response.body.accessToken).toBeDefined();
      expect(response.body.refreshToken).toBeDefined();
      expect(response.body.user.role).toBe('nikita');
    });

    it('should fail login with invalid credentials', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({ username: regularUser.username, password: 'wrongpassword' })
        .expect(401);
    });

    it('should fail login with missing fields', async () => {
      // Test missing password
      const responseNoPassword = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ username: regularUser.username });

      expect(responseNoPassword.status).toBe(400);

      // Test missing username
      const responseNoUsername = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ password: regularUser.password });

      expect(responseNoUsername.status).toBe(400);
    });
  });

  describe('3. Profile access', () => {
    it('should get user profile with valid token', async () => {
      // First login to get a token
      const { accessToken } = await loginUser(regularUser.username, regularUser.password);

      // Then access the profile with the token
      return request(app.getHttpServer())
        .get('/auth/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect(res => {
          expect(res.body.username).toBeDefined();
          expect(res.body.role).toBeDefined();
        });
    });

    it('should get complete and correct profile information', async () => {
      // First login to get a token
      const { accessToken } = await loginUser(regularUser.username, regularUser.password);

      // Then access the profile with the token
      const response = await request(app.getHttpServer())
        .get('/auth/profile')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBeDefined();
      expect(response.body.username).toBe(regularUser.username);
      expect(response.body.role).toBe(Role.survivor);
      expect(response.body.password).toBeUndefined();
    });

    it('should fail to get profile without token', () => {
      return request(app.getHttpServer()).get('/auth/profile').expect(401);
    });

    it('should fail to get profile with invalid token', () => {
      return request(app.getHttpServer())
        .get('/auth/profile')
        .set('Authorization', 'Bearer invalidtoken')
        .expect(401);
    });
  });

  describe('4. Token refresh', () => {
    it('should refresh token successfully', async () => {
      // First login to get a refresh token
      const { refreshToken } = await loginUser(regularUser.username, regularUser.password);

      // Then use the refresh token to get a new access token
      const refreshResponse = await request(app.getHttpServer())
        .post('/auth/refresh')
        .set('Authorization', `Bearer ${refreshToken}`)
        .expect(201);

      expect(refreshResponse.body.accessToken).toBeDefined();
      expect(refreshResponse.body.refreshToken).toBeDefined();

      // Verify the new token works
      const newAccessToken = refreshResponse.body.accessToken;
      await request(app.getHttpServer())
        .get('/auth/profile')
        .set('Authorization', `Bearer ${newAccessToken}`)
        .expect(200);
    });

    it('should fail with invalid refresh token', () => {
      return request(app.getHttpServer())
        .post('/auth/refresh')
        .set('Authorization', 'Bearer invalidrefreshtoken')
        .expect(401);
    });
  });

  describe('5. Admin-only user access', () => {
    it('should allow admin to get user by ID', async () => {
      const { userId } = await registerUser('user_to_query', 'Password123!');
      const { accessToken: adminToken } = await loginUser(admin.username, admin.password);

      return request(app.getHttpServer())
        .get(`/users/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .expect(res => {
          expect(res.body.username).toBeDefined();
          expect(res.body.role).toBeDefined();
        });
    });

    it('should deny regular user access to get user by ID', async () => {
      const { userId } = await registerUser('another_user', 'Password123!');
      const { accessToken: regularToken } = await loginUser(
        regularUser.username,
        regularUser.password,
      );
      return request(app.getHttpServer())
        .get(`/users/${userId}`)
        .set('Authorization', `Bearer ${regularToken}`)
        .expect(403);
    });

    it('should return 404 for non-existent user', async () => {
      const { accessToken: adminToken } = await loginUser(admin.username, admin.password);
      return request(app.getHttpServer())
        .get('/auth/users/999999')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });

  describe('6. Role-based access control', () => {
    it('should allow admin to create rounds', async () => {
      const { accessToken: adminToken } = await loginUser(admin.username, admin.password);
      return request(app.getHttpServer())
        .post('/rounds')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({})
        .expect(201);
    });

    it('should deny regular user from creating rounds', async () => {
      // Login as regular user
      const { accessToken: regularToken } = await loginUser(
        regularUser.username,
        regularUser.password,
      );

      // Try to create a round
      const response = await request(app.getHttpServer())
        .post('/rounds')
        .set('Authorization', `Bearer ${regularToken}`)
        .send({});

      expect([401, 403]).toContain(response.status); // Either unauthorized or forbidden
    });

    it('should deny nikita user from creating rounds', async () => {
      // Login as nikita user
      const { accessToken: nikitaToken } = await loginUser(nikita.username, nikita.password);

      // Try to create a round
      const response = await request(app.getHttpServer())
        .post('/rounds')
        .set('Authorization', `Bearer ${nikitaToken}`)
        .send({});

      expect([401, 403]).toContain(response.status); // Either unauthorized or forbidden
    });
  });
});
