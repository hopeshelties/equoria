import prisma from '../db/index.js';

describe('Database Connection', () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('should connect to the database', async () => {
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    expect(result).toBeDefined();
    expect(result[0].test).toBe(1);
  });

  it('should be able to query the User table', async () => {
    const users = await prisma.user.findMany();
    expect(Array.isArray(users)).toBe(true);
  });
}); 