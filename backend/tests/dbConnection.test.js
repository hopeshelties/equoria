// File: backend/tests/dbConnection.test.js
import prisma from '../../packages/database/prismaClient.js';

describe('DB Connection', () => {
  afterAll(async() => {
    await prisma.$disconnect();
  });

  it('should connect to the database and fetch users', async() => {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true
      }
    });
    expect(Array.isArray(users)).toBe(true);
    // Optionally, assert that if users are returned, they have the selected fields
    if (users.length > 0) {
      expect(users.every(user => user.id && user.email)).toBe(true);
    }
  });
});
