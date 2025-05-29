import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import logger from '../utils/logger.js';

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
const seedHorses = async (prisma, users) => {
  if (!users || users.length === 0) {
    logger.warn('No users provided for horse seeding. Skipping horse creation.');
    return [];
  }

  // Assuming the first user in the array is the one to own the horses for simplicity
  // In a real scenario, you might have more complex logic to assign horses.
  const owner = users[0]; 

  const breedsData = [
    { name: 'Thoroughbred', baseSpeed: 80, baseStamina: 70, baseStrength: 60, rarity: 'Common' },
    { name: 'Arabian', baseSpeed: 75, baseStamina: 80, baseStrength: 50, rarity: 'Rare' },
    { name: 'Quarter Horse', baseSpeed: 70, baseStamina: 60, baseStrength: 80, rarity: 'Common' },
    { name: 'Akhal-Teke', baseSpeed: 85, baseStamina: 75, baseStrength: 65, rarity: 'Epic' },
  ];

  const createdBreeds = [];
  for (const breedData of breedsData) {
    try {
      const breed = await prisma.breed.upsert({
        where: { name: breedData.name },
        update: breedData,
        create: breedData,
      });
      logger.info(`Upserted breed: ${breed.name}`);
      createdBreeds.push(breed);
    } catch (error) {
      logger.error(`Error seeding breed ${breedData.name}: ${error.message}`);
      // Decide if you want to throw or continue
    }
  }

  const horsesData = [
    {
      name: 'Lightning Bolt',
      age: 3,
      sex: 'Stallion',
      color: 'Bay',
      breedId: createdBreeds.find(b => b.name === 'Thoroughbred')?.id,
      ownerId: owner.id, // Link to the owner
      speed: 82,
      stamina: 72,
      strength: 62,
      agility: 70,
      endurance: 75,
      intelligence: 60,
      temperament: 'Spirited',
      health: 100,
      forSale: false,
    },
    {
      name: 'Desert Rose',
      age: 5,
      sex: 'Mare',
      color: 'Chestnut',
      breedId: createdBreeds.find(b => b.name === 'Arabian')?.id,
      ownerId: owner.id, // Link to the owner
      speed: 78,
      stamina: 83,
      strength: 52,
      agility: 75,
      endurance: 80,
      intelligence: 65,
      temperament: 'Gentle',
      health: 100,
      forSale: true,
      price: 15000,
    },
    // Add more horses as needed
  ];

  const createdHorses = [];
  for (const horseData of horsesData) {
    if (!horseData.breedId) {
      logger.warn(`Skipping horse ${horseData.name} due to missing breedId.`);
      continue;
    }
    try {
      const horse = await prisma.horse.create({
        data: horseData,
      });
      logger.info(`Created horse: ${horse.name} for user ID: ${owner.id}`);
      createdHorses.push(horse);
    } catch (error) {
      logger.error(`Error seeding horse ${horseData.name}: ${error.message}`);
      // Decide if you want to throw or continue
    }
  }
  return createdHorses;
};

// Main seeding function
async function main() {
  try {
    const { default: prisma } = await import('../db/index.js');
    
    console.log('[seed] Starting comprehensive seeding process...');
    
    const horseSuccess = await seedHorses(prisma, [ 
      { id: 1, name: 'Default Owner' }, 
      { id: 2, name: 'Second Owner' } 
    ]);
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