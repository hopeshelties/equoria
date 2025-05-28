import request from 'supertest';
import express from 'express';
import { body } from 'express-validator';
import { register, login, refreshToken, logout, getProfile } from '../controllers/authController.js';
import { authenticateToken } from '../middleware/auth.js';
import prisma from '../db/index.js';

// Create a minimal test app without problematic middleware
const createTestApp = () => {
  const app = express();

  // Basic middleware only
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Auth routes with minimal validation
  app.post('/api/auth/register',
    body('name').trim().isLength({ min: 2, max: 50 }),
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8, max: 128 }),
    register
  );

  app.post('/api/auth/login',
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty(),
    login
  );

  app.post('/api/auth/refresh',
    body('refreshToken').notEmpty(),
    refreshToken
  );

  app.post('/api/auth/logout',
    authenticateToken,
    logout
  );

  app.get('/api/auth/me',
    authenticateToken,
    getProfile
  );

  return app;
};

describe('Authentication System (Working)', () => {
  let app;

  beforeAll(() => {
    app = createTestApp();
  });

  beforeEach(async() => {
    // Clean up test users
    await prisma.user.deleteMany({
      where: {
        email: {
          contains: 'authtest'
        }
      }
    });
  });

  afterAll(async() => {
    await prisma.user.deleteMany({
      where: {
        email: {
          contains: 'authtest'
        }
      }
    });
    await prisma.$disconnect();
  });

  describe('User Registration', () => {
    it('should register a new user successfully', async() => {
      const userData = {
        name: 'Auth Test User',
        email: 'authtest-register@example.com',
        password: 'TestPassword123!'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('User registered successfully');
      expect(response.body.data.user.email).toBe(userData.email);
      expect(response.body.data.user.name).toBe(userData.name);
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.refreshToken).toBeDefined();
      expect(response.body.data.user.password).toBeUndefined();
    });

    it('should reject duplicate email registration', async() => {
      const userData = {
        name: 'Auth Test User',
        email: 'authtest-duplicate@example.com',
        password: 'TestPassword123!'
      };

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
    });
  });

  describe('User Login', () => {
    beforeEach(async() => {
      // Create a test user for login tests
      const userData = {
        name: 'Auth Test User',
        email: 'authtest-login@example.com',
        password: 'TestPassword123!'
      };

      await request(app)
        .post('/api/auth/register')
        .send(userData);
    });

    it('should login successfully with valid credentials', async() => {
      const loginData = {
        email: 'authtest-login@example.com',
        password: 'TestPassword123!'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Login successful');
      expect(response.body.data.user.email).toBe(loginData.email);
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.refreshToken).toBeDefined();
      expect(response.body.data.user.password).toBeUndefined();
    });

    it('should reject login with invalid credentials', async() => {
      const loginData = {
        email: 'authtest-login@example.com',
        password: 'wrongpassword'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid email or password');
    });
  });

  describe('Token Management', () => {
    let refreshToken;

    beforeEach(async() => {
      // Create user and get refresh token
      const userData = {
        name: 'Auth Test User',
        email: 'authtest-token@example.com',
        password: 'TestPassword123!'
      };

      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send(userData);

      refreshToken = registerResponse.body.data.refreshToken;
    });

    it('should refresh token successfully', async() => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Token refreshed successfully');
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.refreshToken).toBeDefined();
    });

    it('should reject invalid refresh token', async() => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: 'invalid-token' })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid or expired refresh token');
    });
  });

  describe('Protected Routes', () => {
    let authToken;
    let testUser;

    beforeEach(async() => {
      // Create user and get auth token
      const userData = {
        name: 'Auth Test User',
        email: 'authtest-protected@example.com',
        password: 'TestPassword123!'
      };

      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send(userData);

      authToken = registerResponse.body.data.token;
      testUser = registerResponse.body.data.user;
    });

    it('should get user profile with valid token', async() => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Profile retrieved successfully');
      expect(response.body.data.email).toBe(testUser.email);
      expect(response.body.data.name).toBe(testUser.name);
      expect(response.body.data.password).toBeUndefined();
    });

    it('should reject profile request without token', async() => {
      const response = await request(app)
        .get('/api/auth/me')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Access token required');
    });

    it('should logout successfully', async() => {
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Logout successful');
    });
  });
});
