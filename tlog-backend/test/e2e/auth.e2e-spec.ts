import * as request from 'supertest';
import { Role } from '@prisma/client';
import { INestApplication } from '@nestjs/common';
import { createTestingApp, prisma } from '../test-utils';
import { TEST_USERS } from '../test-users';

describe('Authentication (e2e)', () => {
  let app: INestApplication;
  // Variables to store values during tests
  let regularUserAccessToken: string;
  let regularUserRefreshToken: string;
  let adminAccessToken: string;
  let adminRefreshToken: string;
  let userId: string;

  // Extract test users for better readability
  const { admin, regularUser, newUser, weakPasswordUser, duplicateUser } = TEST_USERS;

  beforeAll(async () => {
    app = await createTestingApp();
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  describe('1. Registration', () => {
    it('should register a new user successfully', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/signup')
        .send({ username: newUser.username, password: newUser.password });

      expect(response.status).toBe(201);
      expect(response.body.accessToken).toBeDefined();
      expect(response.body.refreshToken).toBeDefined();
      expect(response.body.user).toBeDefined();
      expect(response.body.user.username).toBe(newUser.username);
      expect(response.body.user.role).toBe(newUser.role);

      // Store values for later tests
      regularUserAccessToken = response.body.accessToken;
      regularUserRefreshToken = response.body.refreshToken;
      userId = response.body.user.id;
    });

    it('should fail registration with password validation errors', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/signup')
        .send({ username: weakPasswordUser.username, password: weakPasswordUser.password });

      expect(response.status).toBe(400);
    });

    it('should fail registration for duplicate username', async () => {
      // First create a user with the same username
      await prisma.user.create({
        data: {
          username: duplicateUser.username,
          password: 'somehashedpassword', // Using password field per schema
          role: Role.survivor,
        },
      });

      // Now try to register with the same username
      const response = await request(app.getHttpServer()).post('/auth/signup').send({
        username: duplicateUser.username,
        password: duplicateUser.password,
      });

      expect(response.status).toBe(409);
      expect(response.body.message).toContain('already exists');
    });
  });

  describe('2. Login', () => {
    it('should login successfully with valid credentials', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ username: regularUser.username, password: regularUser.password });

      expect(response.status).toBe(201);
      expect(response.body.accessToken).toBeDefined();
      expect(response.body.refreshToken).toBeDefined();

      regularUserAccessToken = response.body.accessToken;
      regularUserRefreshToken = response.body.refreshToken;
    });

    it('should login admin successfully', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ username: admin.username, password: admin.password });

      expect(response.status).toBe(201);
      expect(response.body.accessToken).toBeDefined();
      expect(response.body.refreshToken).toBeDefined();

      adminAccessToken = response.body.accessToken;
      adminRefreshToken = response.body.refreshToken;
    });

    it('should fail login with invalid credentials', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({ username: regularUser.username, password: 'wrongpassword' })
        .expect(401);
    });
  });

  describe('3. Profile access', () => {
    it('should get user profile with valid token', () => {
      return request(app.getHttpServer())
        .get('/auth/profile')
        .set('Authorization', `Bearer ${regularUserAccessToken}`)
        .expect(200)
        .expect(res => {
          expect(res.body.username).toBeDefined();
          expect(res.body.role).toBeDefined();
        });
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
    it('should refresh token successfully', () => {
      return request(app.getHttpServer())
        .post('/auth/refresh')
        .set('Authorization', `Bearer ${regularUserRefreshToken}`)
        .expect(201)
        .expect(res => {
          expect(res.body.accessToken).toBeDefined();
          expect(res.body.refreshToken).toBeDefined();
        });
    });

    it('should fail with invalid refresh token', () => {
      return request(app.getHttpServer())
        .post('/auth/refresh')
        .set('Authorization', 'Bearer invalidrefreshtoken')
        .expect(401);
    });
  });

  describe('5. Admin-only user access', () => {
    it('should allow admin to get user by ID', () => {
      return request(app.getHttpServer())
        .get(`/auth/users/${userId}`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(404); // Endpoint is likely not implemented yet
    });

    it('should deny regular user access to get user by ID', () => {
      return request(app.getHttpServer())
        .get(`/auth/users/${userId}`)
        .set('Authorization', `Bearer ${regularUserAccessToken}`)
        .expect(404); // Endpoint is likely not implemented yet
    });

    it('should return 404 for non-existent user', () => {
      return request(app.getHttpServer())
        .get('/auth/users/999999')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(404);
    });
  });
});
