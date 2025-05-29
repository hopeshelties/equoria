import prisma from '../db/index.js';

describe('Database Data Check', () => {
  afterAll(async() => {
    await prisma.$disconnect();
  });

  it('should check what users exist', async() => {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        money: true,
        level: true,
        xp: true
      }
    });
    console.log('Users in database:', JSON.stringify(users, null, 2));
    expect(Array.isArray(users)).toBe(true);
    if (users.length > 0) {
      const firstUser = users[0];
      expect(firstUser.id).toBeDefined();
      expect(firstUser.username).toBeDefined();
      expect(firstUser.email).toBeDefined();
      expect(firstUser.firstName).toBeDefined();
      expect(firstUser.lastName).toBeDefined();
      expect(firstUser.role).toBeDefined();
      expect(firstUser.money).toBeDefined();
      expect(firstUser.level).toBeDefined();
      expect(firstUser.xp).toBeDefined();
    }
  });

  it('should check what players exist (using user table)', async() => {
    const players = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        money: true,
        level: true,
        xp: true
      }
    });
    console.log('Players in database (from user table):', JSON.stringify(players, null, 2));
    expect(Array.isArray(players)).toBe(true);
    if (players.length > 0) {
      const firstPlayer = players[0];
      expect(firstPlayer.id).toBeDefined();
      expect(firstPlayer.username).toBeDefined();
      expect(firstPlayer.email).toBeDefined();
      expect(firstPlayer.firstName).toBeDefined();
      expect(firstPlayer.lastName).toBeDefined();
      expect(firstPlayer.role).toBeDefined();
      expect(firstPlayer.money).toBeDefined();
      expect(firstPlayer.level).toBeDefined();
      expect(firstPlayer.xp).toBeDefined();
    }
  });

  it('should check what horses exist', async() => {
    const horses = await prisma.horse.findMany({
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true
          }
        }
      }
    });
    console.log('Horses in database:', JSON.stringify(horses, null, 2));
    expect(Array.isArray(horses)).toBe(true);
    if (horses.length > 0) {
      const firstHorse = horses[0];
      expect(firstHorse.id).toBeDefined();
      expect(firstHorse.user).toBeDefined();
      if (firstHorse.user) {
        expect(firstHorse.user.id).toBeDefined();
        expect(firstHorse.user.username).toBeDefined();
        expect(firstHorse.user.email).toBeDefined();
      }
    }
  });
});
