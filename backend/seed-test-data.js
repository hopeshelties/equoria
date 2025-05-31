import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load test environment variables
dotenv.config({ path: join(__dirname, '.env.test') });

// Import required modules
const { default: prisma } = await import('./db/index.js');
const { createUser } = await import('./models/userModel.js');
const { createHorse } = await import('./models/horseModel.js');

async function seedTestData() {
  // eslint-disable-next-line no-console
  console.log('🧪 Seeding test database...');
  try {
    // Create breeds first
    const thoroughbredBreed = await prisma.breed.upsert({
      where: { name: 'Thoroughbred' },
      update: {},
      create: { name: 'Thoroughbred', description: 'Test Thoroughbred breed' }
    });
    // eslint-disable-next-line no-console
    console.log(`✅ Breed: ${thoroughbredBreed.name} (ID: ${thoroughbredBreed.id})`);

    // Create test player
    const existingPlayer = await prisma.user.findUnique({ where: { email: 'test-player@example.com' } });

    let testPlayer;
    if (existingPlayer) {
      // eslint-disable-next-line no-console
      console.log(`✅ Player already exists: ${existingPlayer.name} (ID: ${existingPlayer.id})`);
      testPlayer = existingPlayer;
    } else {
      // Create player using the userModel function
      const playerData = {
        name: 'Test Player',
        email: 'test-player@example.com',
        password: 'hashedpassword123',
        money: 1000,
        level: 5,
        xp: 2500,
        settings: { darkMode: true, notifications: true }
      };

      testPlayer = await createUser(playerData);
      // eslint-disable-next-line no-console
      console.log(`✅ Created Player: ${testPlayer.name} (ID: ${testPlayer.id})`);
    }

    // Create test horses with IDs 6 and 7 (what the tests expect)
    const horse1Data = {
      name: 'Starlight',
      age: 4,
      breed: { connect: { id: thoroughbredBreed.id } },
      ownerId: testPlayer.id,
      sex: 'Mare',
      date_of_birth: new Date('2020-08-15'),
      genotype: { coat: 'EE/AA', dilution: 'nCr', markings: ['Star'] },
      phenotypic_markings: { face: 'Star', legs: ['Sock'] },
      final_display_color: 'Bay',
      shade: 'Dark',
      trait: 'Elegant',
      temperament: 'Gentle',
      precision: 85,
      strength: 75,
      speed: 80,
      agility: 88,
      endurance: 82,
      intelligence: 90,
      personality: 'Gentle',
      total_earnings: 8500,
      for_sale: false,
      health_status: 'Excellent',
      last_vetted_date: new Date('2024-06-01')
    };

    const horse2Data = {
      name: 'Comet',
      age: 6,
      breed: { connect: { id: thoroughbredBreed.id } },
      ownerId: testPlayer.id,
      sex: 'Stallion',
      date_of_birth: new Date('2018-04-22'),
      genotype: { coat: 'ee/AA', dilution: 'ChCh', markings: ['Blaze'] },
      phenotypic_markings: { face: 'Blaze', legs: ['Stocking', 'Sock'] },
      final_display_color: 'Champagne',
      shade: 'Golden',
      trait: 'Swift',
      temperament: 'Spirited',
      precision: 78,
      strength: 85,
      speed: 92,
      agility: 80,
      endurance: 88,
      intelligence: 85,
      personality: 'Spirited',
      total_earnings: 15200,
      stud_status: 'Private Stud',
      stud_fee: 750,
      for_sale: false,
      health_status: 'Very Good',
      last_vetted_date: new Date('2024-05-20')
    };

    // Check if horses already exist
    const existingHorse1 = await prisma.horse.findUnique({ where: { id: 6 } });
    const existingHorse2 = await prisma.horse.findUnique({ where: { id: 7 } });

    let horse1, horse2;

    if (existingHorse1) {
      // eslint-disable-next-line no-console
      console.log(`✅ Horse ID 6 already exists: ${existingHorse1.name}`);
      horse1 = existingHorse1;
    } else {
      horse1 = await createHorse(horse1Data);
      // eslint-disable-next-line no-console
      console.log(`✅ Created Horse: ${horse1.name} (ID: ${horse1.id})`);
    }

    if (existingHorse2) {
      // eslint-disable-next-line no-console
      console.log(`✅ Horse ID 7 already exists: ${existingHorse2.name}`);
      horse2 = existingHorse2;
    } else {
      horse2 = await createHorse(horse2Data);
      // eslint-disable-next-line no-console
      console.log(`✅ Created Horse: ${horse2.name} (ID: ${horse2.id})`);
    }

    // eslint-disable-next-line no-console
    console.log('\\n🎉 Test database seeding completed successfully!');
    // eslint-disable-next-line no-console
    console.log(`📊 Player ID: ${testPlayer.id}`);
    // eslint-disable-next-line no-console
    console.log(`🐎 Horse IDs: ${horse1.id}, ${horse2.id}`);

    return { testPlayer, horse1, horse2 };
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('❌ Error seeding test data:', error.message);
    if (error.stack) {
      // eslint-disable-next-line no-console
      console.error(error.stack);
    }
    throw error;
  }
}

export { seedTestData };
