import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env file explicitly BEFORE importing any modules that depend on config
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Validate environment
if (!process.env.DATABASE_URL) {
  console.error('[seed] DATABASE_URL environment variable is required');
  process.exit(1);
}

console.log('[seed] Environment loaded successfully');

// Sample horse data
const sampleHorses = [
  {
    name: 'Midnight Comet',
    age: 4,
    breedName: 'Thoroughbred',
    ownerId: 1,
    stableId: 1,
    sex: 'Stallion',
    date_of_birth: new Date('2020-05-10'),
    genotype: { coat: 'EE/aa', dilution: 'nCr', markings: ['Tobiano'] },
    phenotypic_markings: { face: 'Blaze', legs: ['Sock', 'Stocking'] },
    final_display_color: 'Smoky Black Tobiano',
    shade: 'Dark',
    image_url: '/images/midnight_comet.jpg',
    trait: 'Agile',
    temperament: 'Spirited',
    precision: 75,
    strength: 80,
    speed: 85,
    agility: 90,
    endurance: 70,
    intelligence: 80,
    personality: 'Spirited',
    total_earnings: 15000,
    stud_status: 'Public Stud',
    stud_fee: 500,
    for_sale: false,
    health_status: 'Excellent',
    last_vetted_date: new Date('2024-05-01'),
    tack: { saddle: 'Western Pleasure', bridle: 'Standard', blanket: 'Show' }
  },
  {
    name: 'Golden Dawn',
    age: 5,
    breedName: 'Arabian',
    ownerId: 1,
    stableId: 1,
    sex: 'Mare',
    date_of_birth: new Date('2019-03-15'),
    genotype: { coat: 'ee/AA', dilution: 'ChCh', markings: ['Sabino'] },
    phenotypic_markings: { face: 'Star', legs: ['Coronet'] },
    final_display_color: 'Champagne Sabino',
    shade: 'Golden',
    image_url: '/images/golden_dawn.jpg',
    trait: 'Graceful',
    temperament: 'Calm',
    precision: 80,
    strength: 70,
    speed: 75,
    agility: 85,
    endurance: 80,
    intelligence: 88,
    personality: 'Calm',
    total_earnings: 25000,
    last_bred_date: new Date('2023-11-01'),
    for_sale: true,
    sale_price: 12000,
    health_status: 'Very Good',
    last_vetted_date: new Date('2024-04-20'),
    tack: { saddle: 'English All-Purpose', bridle: 'Snaffle', blanket: 'Stable' }
  },
  {
    name: 'Shadowfax Spirit',
    age: 1,
    breedName: 'Thoroughbred',
    ownerId: 2,
    stableId: 2,
    sex: 'Colt',
    date_of_birth: new Date('2023-07-22'),
    genotype: { coat: 'Ee/AA', dilution: 'nZ', markings: [] },
    phenotypic_markings: { face: 'None', legs: [] },
    final_display_color: 'Silver Bay',
    shade: 'Light',
    image_url: '/images/shadowfax_spirit.jpg',
    trait: 'Fast Learner',
    temperament: 'Curious',
    precision: 60,
    strength: 65,
    speed: 70,
    agility: 75,
    endurance: 60,
    intelligence: 70,
    personality: 'Curious',
    total_earnings: 500,
    stud_status: 'Not at Stud',
    stud_fee: 0,
    for_sale: false,
    health_status: 'Excellent',
    last_vetted_date: new Date('2024-05-10'),
    tack: { saddle: 'Training', bridle: 'Halter', blanket: 'Turnout' }
  }
];

// Helper to check if horse already exists
async function checkHorseExists(name) {
  const { default: prisma } = await import('../db/index.js');
  try {
    const existingHorse = await prisma.horse.findFirst({
      where: { name },
    });
    return existingHorse !== null;
  } catch (error) {
    console.warn(`[seed] Failed to check if horse "${name}" exists: ${error.message}`);
    return false; // Assume it doesn't exist and let creation handle any conflicts
  }
}

// Helper to find or create a breed
async function findOrCreateBreed(breedName) {
  const { default: prisma } = await import('../db/index.js');
  if (!breedName) {
    console.warn('[seed] Breed name is undefined or null. Skipping breed creation/connection.');
    return null;
  }
  try {
    let breed = await prisma.breed.findUnique({
      where: { name: breedName },
    });
    if (!breed) {
      console.log(`[seed] Breed "${breedName}" not found, creating new one.`);
      breed = await prisma.breed.create({
        data: { name: breedName, description: `Seed-created ${breedName}` },
      });
      console.log(`[seed] Created breed: ${breed.name} (ID: ${breed.id})`);
    } else {
      console.log(`[seed] Found existing breed: ${breed.name} (ID: ${breed.id})`);
    }
    return breed;
  } catch (error) {
    console.error(`[seed] Failed to find or create breed "${breedName}": ${error.message}`);
    throw error;
  }
}

// Ensure referenced records exist
async function ensureReferencedRecordsExist() {
  const { default: prisma } = await import('../db/index.js');
  try {
    await prisma.user.upsert({
      where: { id: 1 },
      update: { name: 'Default Owner' },
      create: { id: 1, name: 'Default Owner' },
    });
    console.log('[seed] Ensured User ID 1 exists.');
  } catch (e) {
    console.warn('[seed] Could not ensure User ID 1. Error:', e.message);
  }
  try {
    await prisma.user.upsert({
      where: { id: 2 },
      update: { name: 'Second Owner' },
      create: { id: 2, name: 'Second Owner' },
    });
    console.log('[seed] Ensured User ID 2 exists.');
  } catch (e) {
    console.warn('[seed] Could not ensure User ID 2. Error:', e.message);
  }
  try {
    await prisma.stable.upsert({
      where: { id: 1 },
      update: { name: 'Main Stable'},
      create: { id: 1, name: 'Main Stable' },
    });
    console.log('[seed] Ensured Stable ID 1 exists.');
  } catch (e) {
    console.warn('[seed] Could not ensure Stable ID 1. Error:', e.message);
  }
  try {
    await prisma.stable.upsert({
      where: { id: 2 },
      update: { name: 'Second Stable' },
      create: { id: 2, name: 'Second Stable' },
    });
    console.log('[seed] Ensured Stable ID 2 exists.');
  } catch (e) {
    console.warn('[seed] Could not ensure Stable ID 2. Error:', e.message);
  }
}

// Seed horses function
async function seedHorses() {
  const { createHorse } = await import('../models/horseModel.js');
  console.log('[seed] Starting to seed horses with Prisma...');
  await ensureReferencedRecordsExist();

  let successfulInserts = 0;
  let skippedDuplicates = 0;
  let failedInserts = 0;

  for (const horseData of sampleHorses) {
    try {
      const exists = await checkHorseExists(horseData.name);
      if (exists) {
        console.log(`[seed] Horse "${horseData.name}" already exists, skipping...`);
        skippedDuplicates++;
        continue;
      }

      const breed = await findOrCreateBreed(horseData.breedName);
      
      if (!breed) {
        console.error(`[seed] Failed to create/find breed for horse: ${horseData.name}`);
        failedInserts++;
        continue;
      }

      const horseCreateData = {
        name: horseData.name,
        age: horseData.age,
        breedId: breed.id,
        ownerId: horseData.ownerId,
        stableId: horseData.stableId,
        sex: horseData.sex,
        date_of_birth: horseData.date_of_birth,
        genotype: horseData.genotype,
        phenotypic_markings: horseData.phenotypic_markings,
        final_display_color: horseData.final_display_color,
        shade: horseData.shade,
        image_url: horseData.image_url,
        trait: horseData.trait,
        temperament: horseData.temperament,
        precision: horseData.precision,
        strength: horseData.strength,
        speed: horseData.speed,
        agility: horseData.agility,
        endurance: horseData.endurance,
        intelligence: horseData.intelligence,
        personality: horseData.personality,
        total_earnings: horseData.total_earnings,
        stud_status: horseData.stud_status,
        stud_fee: horseData.stud_fee,
        last_bred_date: horseData.last_bred_date,
        for_sale: horseData.for_sale,
        sale_price: horseData.sale_price,
        health_status: horseData.health_status,
        last_vetted_date: horseData.last_vetted_date,
        tack: horseData.tack
      };

      const horse = await createHorse(horseCreateData);
      console.log(`[seed] Successfully inserted horse: ${horse.name} (ID: ${horse.id})`);
      successfulInserts++;
    } catch (error) {
      console.error(`[seed] Failed to insert horse ${horseData.name}: ${error.message}`);
      console.error(`[seed] Error details for ${horseData.name}:`, error.stack);
      failedInserts++;
    }
  }

  console.log('[seed] --- Horse Seeding Summary ---');
  console.log(`[seed] Successfully inserted: ${successfulInserts} horses`);
  console.log(`[seed] Skipped duplicates: ${skippedDuplicates} horses`);
  console.log(`[seed] Failed to insert: ${failedInserts} horses`);
  
  if (failedInserts > 0) {
    console.error('[seed] Some horses failed to seed. Check logs above for details.');
    return false;
  }
  
  if (successfulInserts === 0 && skippedDuplicates === 0) {
    console.warn('[seed] No horses were processed. This might indicate a configuration issue.');
    return false;
  }
  
  console.log('[seed] Horse seeding completed successfully.');
  return true;
}

// Helper to check if player already exists
async function checkPlayerExists(email) {
  const { default: prisma } = await import('../db/index.js');
  try {
    const existingPlayer = await prisma.player.findUnique({
      where: { email },
    });
    return existingPlayer !== null;
  } catch (error) {
    console.warn(`[seed] Failed to check if player "${email}" exists: ${error.message}`);
    return false;
  }
}

// Helper to seed a Player with 2 Horses
async function seedPlayerWithHorses() {
  const { createHorse } = await import('../models/horseModel.js');
  const { createPlayer } = await import('../models/playerModel.js');
  
  console.log('[seed] Starting to seed Player with Horses...');
  
  const playerEmail = 'test@example.com';
  
  try {
    const playerExists = await checkPlayerExists(playerEmail);
    if (playerExists) {
      console.log(`[seed] Player "${playerEmail}" already exists, skipping player creation...`);
      return true;
    }

    const thoroughbredBreed = await findOrCreateBreed('Thoroughbred');
    const arabianBreed = await findOrCreateBreed('Arabian');
    
    if (!thoroughbredBreed || !arabianBreed) {
      console.error('[seed] Failed to create/find required breeds for player horses');
      return false;
    }

    const playerData = {
      id: 'test-player-uuid-123',
      name: 'Test Player',
      email: playerEmail,
      money: 500,
      level: 3,
      xp: 1000,
      settings: { 
        darkMode: true, 
        notifications: true,
        soundEnabled: false,
        autoSave: true
      }
    };

    const createdPlayer = await createPlayer(playerData);
    console.log(`[seed] Successfully created player: ${createdPlayer.name} (ID: ${createdPlayer.id})`);

    const horseData1 = {
      name: 'Starlight',
      age: 4,
      breedId: thoroughbredBreed.id,
      playerId: createdPlayer.id,
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

    const horseData2 = {
      name: 'Comet',
      age: 6,
      breedId: thoroughbredBreed.id,
      playerId: createdPlayer.id,
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

    const horse1 = await createHorse(horseData1);
    console.log(`[seed] Successfully created horse: ${horse1.name} (ID: ${horse1.id}) for player ${createdPlayer.name}`);
    
    const horse2 = await createHorse(horseData2);
    console.log(`[seed] Successfully created horse: ${horse2.name} (ID: ${horse2.id}) for player ${createdPlayer.name}`);

    console.log('[seed] Successfully seeded Player with 2 Horses');
    return true;

  } catch (error) {
    console.error(`[seed] Failed to seed Player with Horses: ${error.message}`);
    console.error(`[seed] Error details:`, error.stack);
    return false;
  }
}

// Main seeding function
async function main() {
  try {
    const { default: prisma } = await import('../db/index.js');
    
    console.log('[seed] Starting comprehensive seeding process...');
    
    const horseSuccess = await seedHorses();
    const playerSuccess = await seedPlayerWithHorses();
    
    if (!horseSuccess || !playerSuccess) {
      console.error('[seed] Seeding completed with issues. Exiting with error code.');
      process.exit(1);
    }
    
    console.log('[seed] All seeding operations completed successfully.');
    
    await prisma.$disconnect();
    console.log('[seed] Prisma client disconnected.');
    
  } catch (error) {
    console.error('[seed] Fatal error during seeding process:', error.message);
    console.error('[seed] Fatal error stack:', error.stack);
    process.exit(1);
  }
}

// Export functions for testing
export { sampleHorses, findOrCreateBreed, ensureReferencedRecordsExist, checkHorseExists, seedHorses, seedPlayerWithHorses, checkPlayerExists };

// Only run the main function if this script is executed directly (not imported)
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('horseSeed.js')) {
  main();
}