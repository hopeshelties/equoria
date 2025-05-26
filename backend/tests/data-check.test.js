import prisma from '../db/index.js';

describe('Database Data Check', () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('should check what users exist', async () => {
    const users = await prisma.user.findMany();
    console.log('Users in database:', JSON.stringify(users, null, 2));
    expect(Array.isArray(users)).toBe(true);
  });

  it('should check what players exist', async () => {
    const players = await prisma.player.findMany();
    console.log('Players in database:', JSON.stringify(players, null, 2));
    expect(Array.isArray(players)).toBe(true);
  });

  it('should check what horses exist', async () => {
    const horses = await prisma.horse.findMany({
      include: {
        player: true,
        owner: true
      }
    });
    console.log('Horses in database:', JSON.stringify(horses, null, 2));
    expect(Array.isArray(horses)).toBe(true);
  });
}); 