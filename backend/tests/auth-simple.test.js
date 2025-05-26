import request from 'supertest';
import express from 'express';
import { register, login } from '../controllers/authController.js';
import { body } from 'express-validator';
import prisma from '../db/index.js';

// Create a simple test app without all the middleware
const createTestApp = () => {
  const app = express();
  app.use(express.json());
  
  // Simple registration route
  app.post('/register',
    body('name').notEmpty(),
    body('email').isEmail(),
    body('password').isLength({ min: 8 }),
    register
  );
  
  // Simple login route
  app.post('/login',
    body('email').isEmail(),
    body('password').notEmpty(),
    login
  );
  
  return app;
};

describe('Authentication Controller (Simple)', () => {
  let app;
  
  beforeAll(() => {
    app = createTestApp();
  });

  beforeEach(async () => {
    // Clean up test users
    await prisma.user.deleteMany({
      where: {
        email: {
          contains: 'test'
        }
      }
    });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: {
        email: {
          contains: 'test'
        }
      }
    });
    await prisma.$disconnect();
  });

  it('should register a new user', async () => {
    const userData = {
      name: 'Test User',
      email: 'test@example.com',
      password: 'TestPassword123!'
    };

    const response = await request(app)
      .post('/register')
      .send(userData)
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.data.user.email).toBe(userData.email);
    expect(response.body.data.token).toBeDefined();
  }, 10000);

  it('should login with valid credentials', async () => {
    // First register a user
    const userData = {
      name: 'Test User',
      email: 'login-test@example.com',
      password: 'TestPassword123!'
    };

    await request(app)
      .post('/register')
      .send(userData);

    // Then login
    const loginData = {
      email: 'login-test@example.com',
      password: 'TestPassword123!'
    };

    const response = await request(app)
      .post('/login')
      .send(loginData)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.user.email).toBe(loginData.email);
    expect(response.body.data.token).toBeDefined();
  }, 10000);
}); 