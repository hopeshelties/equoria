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
  app.post(
    '/register',
    body('username').notEmpty(), // Changed from 'name'
    body('email').isEmail(),
    body('password').isLength({ min: 8 }),
    body('firstName').notEmpty(), // Added
    body('lastName').notEmpty(), // Added
    register
  );

  // Simple login route
  app.post('/login', body('email').isEmail(), body('password').notEmpty(), login);

  return app;
};

describe('Authentication Controller (Simple)', () => {
  let app;

  beforeAll(() => {
    app = createTestApp();
  });

  beforeEach(async () => {
    // Delete in order to avoid foreign key constraint violations
    // 1. Delete training logs first
    await prisma.trainingLog.deleteMany({
      where: {
        horse: {
          owner: {
            email: {
              contains: 'test',
            },
          },
        },
      },
    });

    // 2. Delete horses
    await prisma.horse.deleteMany({
      where: {
        owner: {
          email: {
            contains: 'test',
          },
        },
      },
    });

    // 3. Then delete users
    await prisma.user.deleteMany({
      where: {
        email: {
          contains: 'test',
        },
      },
    });
  });

  afterAll(async () => {
    // Delete in order to avoid foreign key constraint violations
    // 1. Delete training logs first
    await prisma.trainingLog.deleteMany({
      where: {
        horse: {
          owner: {
            email: {
              contains: 'test',
            },
          },
        },
      },
    });

    // 2. Delete horses
    await prisma.horse.deleteMany({
      where: {
        owner: {
          email: {
            contains: 'test',
          },
        },
      },
    });

    // 3. Then delete users
    await prisma.user.deleteMany({
      where: {
        email: {
          contains: 'test',
        },
      },
    });
    await prisma.$disconnect();
  });

  it('should register a new user', async () => {
    const userData = {
      username: 'testuser', // Changed from name: 'Test User'
      email: 'test@example.com',
      password: 'TestPassword123!',
      firstName: 'Test', // Added
      lastName: 'User', // Added
    };

    const response = await request(app).post('/register').send(userData).expect(201);

    expect(response.body.success).toBe(true); // Changed from response.body.status
    expect(response.body.data.user.email).toBe(userData.email);
    expect(response.body.data.token).toBeDefined();
  }, 10000);

  it('should login with valid credentials', async () => {
    // First register a user
    const userData = {
      username: 'logintestuser', // Changed from name: 'Test User'
      email: 'login-test@example.com',
      password: 'TestPassword123!',
      firstName: 'LoginTest', // Added
      lastName: 'User', // Added
    };

    await request(app).post('/register').send(userData);

    // Then login
    const loginData = {
      email: 'login-test@example.com',
      password: 'TestPassword123!',
    };

    const response = await request(app).post('/login').send(loginData).expect(200);

    expect(response.body.success).toBe(true); // Changed from response.body.status
    expect(response.body.data.user.email).toBe(loginData.email);
    expect(response.body.data.token).toBeDefined();
  }, 10000);
});
