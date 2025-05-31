import prisma from './db/index.js';

async function checkDatabase() {
  try {
    console.log('🔍 Checking database contents...');

    const breeds = await prisma.breed.findMany();
    console.log(`📊 Breeds: ${breeds.length}`);
    if (breeds.length > 0) {
      console.log('First breed:', breeds[0]);
    }

    const users = await prisma.user.findMany();
    console.log(`👥 Users: ${users.length}`);

    const horses = await prisma.horse.findMany();
    console.log(`🐎 Horses: ${horses.length}`);

    const shows = await prisma.show.findMany();
    console.log(`🏆 Shows: ${shows.length}`);

  } catch (error) {
    console.error('❌ Database error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabase();
