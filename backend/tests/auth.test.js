import request from 'supertest';
import app from '../app.js';
import { createTestUser, createLoginData } from './helpers/authHelper.js';
import prisma from '../db/index.js';

describe('Authentication Endpoints', () => {
  // Clean up test data before and after tests
  beforeEach(async () => {
    try {
      // Delete in order to avoid foreign key constraint violations
      // 1. Delete training logs first
      await prisma.trainingLog.deleteMany({
        where: {
          horse: {
            owner: {
              email: {
                contains: 'test'
              }
            }
          }
        }
      });
      
      // 2. Delete horses
      await prisma.horse.deleteMany({
        where: {
          owner: {
            email: {
              contains: 'test'
            }
          }
        }
      });
      
      // 3. Then delete users
      await prisma.user.deleteMany({
        where: {
          email: {
            contains: 'test'
          }
        }
      });
    } catch (error) {
      console.log('Database cleanup error (can be ignored if tables do not exist yet):', error.message);
    }
  });
  afterAll(async () => {
    try {
      // Delete in order to avoid foreign key constraint violations
      // 1. Delete training logs first
      await prisma.trainingLog.deleteMany({
        where: {
          horse: {
            owner: {
              email: {
                contains: 'test'
              }
            }
          }
        }
      });
      
      // 2. Delete horses
      await prisma.horse.deleteMany({
        where: {
          owner: {
            email: {
              contains: 'test'
            }
          }
        }
      });
      
      // 3. Then delete users
      await prisma.user.deleteMany({
        where: {
          email: {
            contains: 'test'
          }
        }
      });
    } catch (error) {
      console.log('Database cleanup error (can be ignored if tables do not exist yet):', error.message);
    } finally {
      await prisma.$disconnect();
    }
  });
  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const userData = createTestUser({
        email: 'newuser@example.com',
        username: 'newuser'
      });

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('User registered successfully');
      expect(response.body.data.user.email).toBe(userData.email);
      expect(response.body.data.user.firstName).toBe(userData.firstName);
      expect(response.body.data.user.lastName).toBe(userData.lastName);
      expect(response.body.data.accessToken).toBeDefined();
      expect(response.body.data.refreshToken).toBeDefined();
      expect(response.body.data.user.password).toBeUndefined(); // Password should not be returned
    });

    it('should reject registration with invalid email', async () => {
      const userData = createTestUser({
        email: 'invalid-email'
      });

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Validation failed');
    });

    it('should reject registration with weak password', async () => {
      const userData = createTestUser({
        password: 'weak'
      });

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Validation failed');
    });

    it('should reject duplicate email registration', async () => {
      const userData = createTestUser({
        email: 'duplicate@example.com'
      });

      // First registration
      await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      // Second registration with same email
      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Email already registered');
    });    it('should reject registration with invalid name', async () => {
      const userData = createTestUser({
        firstName: 'Test123', // Contains numbers
        lastName: 'User'
      });

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Validation failed');
    });
  });

  describe('POST /api/auth/login', () => {    beforeEach(async () => {
      // Create a test user for login tests
      const userData = createTestUser({
        email: 'logintest@example.com',
        username: 'logintest'
      });

      await request(app)
        .post('/api/auth/register')
        .send(userData);
    });

    it('should login successfully with valid credentials', async () => {
      const loginData = createLoginData({
        email: 'logintest@example.com'
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(200);      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Login successful');
      expect(response.body.data.user.email).toBe(loginData.email);
      expect(response.body.data.accessToken).toBeDefined();
      expect(response.body.data.refreshToken).toBeDefined();
      expect(response.body.data.user.password).toBeUndefined();
    });

    it('should reject login with invalid email', async () => {
      const loginData = createLoginData({
        email: 'nonexistent@example.com'
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid email or password');
    });

    it('should reject login with invalid password', async () => {
      const loginData = createLoginData({
        email: 'logintest@example.com',
        password: 'wrongpassword'
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid email or password');
    });

    it('should reject login with malformed email', async () => {
      const loginData = createLoginData({
        email: 'invalid-email'
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Validation failed');
    });
  });

  describe('POST /api/auth/refresh', () => {
    let refreshToken;    beforeEach(async () => {
      // Create user and get refresh token
      const userData = createTestUser({
        email: 'refreshtest@example.com',
        username: 'refreshtest'
      });
      
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send(userData);
      
      refreshToken = registerResponse.body.data.refreshToken;
    });

    it('should refresh token successfully with valid refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken })
        .expect(200);      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Token refreshed successfully');
      expect(response.body.data.accessToken).toBeDefined();
      expect(response.body.data.refreshToken).toBeDefined();
      expect(response.body.data.accessToken || response.body.data.token).not.toBe(refreshToken); // Should be a new token
    });

    it('should reject refresh with invalid token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: 'invalid-token' })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid or expired refresh token');
    });

    it('should reject refresh without token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Refresh token is required');
    });
  });

  describe('GET /api/auth/me', () => {
    let authToken;
    let testUser;    beforeEach(async () => {
      // Create user and get auth token
      const userData = createTestUser({
        email: 'profiletest@example.com',
        username: 'profiletest'
      });

      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send(userData);

      authToken = registerResponse.body.data.token || registerResponse.body.data.accessToken;
      testUser = registerResponse.body.data.user;
    });

    it('should get user profile successfully with valid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toBeDefined();
      expect(response.body.data.user.email).toBe(testUser.email);
      expect(response.body.data.user.firstName).toBe(testUser.firstName);
      expect(response.body.data.user.lastName).toBe(testUser.lastName);
      expect(response.body.data.user.password).toBeUndefined();
    });

    it('should reject profile request without token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Access token is required');
    });

    it('should reject profile request with invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid or expired token');
    });
  });

  describe('POST /api/auth/logout', () => {
    let authToken;    beforeEach(async () => {
      // Create user and get auth token
      const userData = createTestUser({
        email: 'logouttest@example.com',
        username: 'logouttest'
      });

      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send(userData);

      authToken = registerResponse.body.data.token || registerResponse.body.data.accessToken;
    });

    it('should logout successfully with valid token', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Logout successful');
    });

    it('should reject logout without token', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Access token is required');
    });
  });
});

