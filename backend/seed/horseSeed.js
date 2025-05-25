import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import prisma from '../db/index.js';
import { createHorse } from '../models/horseModel.js';

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env file explicitly
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

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
    sex: 'Stallion',
    date_of_birth: new Date('2020-05-10'),
    breedName: 'Thoroughbred',
    ownerId: 1,
    stableId: 1,
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
    sex: 'Mare',
    date_of_birth: new Date('2019-03-15'),
    breedName: 'Arabian',
    ownerId: 1,
    stableId: 1,
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
    sex: 'Colt',
    date_of_birth: new Date('2023-07-22'),
    breedName: 'Thoroughbred',
    ownerId: 2,
    stableId: 2,
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

// For User and Stable, we'll assume they exist for this seed script for now.
// In a real scenario, you might want findOrCreate logic for them too, or ensure they are pre-seeded.
// For simplicity, this seed will fail if User ID 1 or Stable ID 1 don't exist.
// You should pre-seed User 1 and Stable 1 manually or add findOrCreate logic.
async function ensureReferencedRecordsExist() {
  // Example: Ensure User 1 and Stable 1 exist, create if not.
  // This is a placeholder. A robust seeder would handle this more gracefully.
  try {
    await prisma.user.upsert({
      where: { id: 1 },
      update: { name: 'Default Owner' }, // Ensure name is updated if exists
      create: { id: 1, name: 'Default Owner' },
    });
    console.log('[seed] Ensured User ID 1 exists.');
  } catch (e) {
    console.warn('[seed] Could not ensure User ID 1. If horses rely on it, they may fail to seed or have null ownerId. Error:', e.message);
  }
  try {
    await prisma.user.upsert({
      where: { id: 2 }, // For Shadowfax Spirit owner
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
      update: { name: 'Main Stable'}, // Ensure name is updated if exists
      create: { id: 1, name: 'Main Stable' },
    });
    console.log('[seed] Ensured Stable ID 1 exists.');
  } catch (e) {
    console.warn('[seed] Could not ensure Stable ID 1. If horses rely on it, they may fail to seed or have null stableId. Error:', e.message);
  }
  try {
    await prisma.stable.upsert({
      where: { id: 2 }, // For Shadowfax Spirit stable
      update: { name: 'Second Stable' },
      create: { id: 2, name: 'Second Stable' },
    });
    console.log('[seed] Ensured Stable ID 2 exists.');
  } catch (e) {
    console.warn('[seed] Could not ensure Stable ID 2. Error:', e.message);
  }
}

async function seedHorses() {
  console.log('[seed] Starting to seed horses with Prisma...');
  await ensureReferencedRecordsExist(); // Ensure owner/stable exist

    let successfulInserts = 0;
  let skippedDuplicates = 0;
    let failedInserts = 0;

    for (const horseData of sampleHorses) {
      try {
      // Check if horse already exists
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

      // Prepare data for horseModel.createHorse function
      const horseCreateData = {
        name: horseData.name,
        age: horseData.age,
        breedId: breed.id, // Use the breed ID directly
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

      // Use horseModel.createHorse function for consistent validation and error handling
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
    return false; // Indicate partial failure
  }
  
  if (successfulInserts === 0 && skippedDuplicates === 0) {
    console.warn('[seed] No horses were processed. This might indicate a configuration issue.');
    return false;
  }
  
  console.log('[seed] Horse seeding completed successfully.');
  return true; // Indicate success
}

// Helper to check if player already exists
async function checkPlayerExists(email) {
  try {
    const existingPlayer = await prisma.player.findFirst({
      where: { email },
    });
    return existingPlayer !== null;
  } catch (error) {
    console.warn(`[seed] Failed to check if player "${email}" exists: ${error.message}`);
    return false; // Assume it doesn't exist and let creation handle any conflicts
  }
}

// Function to seed a player with horses
async function seedPlayerWithHorses() {
  console.log('[seed] Starting to seed player with horses...');
  
  const playerEmail = 'test@example.com';
  
  try {
    // Check if player already exists
    const exists = await checkPlayerExists(playerEmail);
    if (exists) {
      console.log(`[seed] Player "${playerEmail}" already exists, skipping...`);
      return true;
    }

    // Ensure breeds exist before creating horses
    const thoroughbredBreed = await findOrCreateBreed('Thoroughbred');
    if (!thoroughbredBreed) {
      console.error('[seed] Failed to create/find Thoroughbred breed for player horses');
      return false;
    }

    // Create player with horses using nested create
    const player = await prisma.player.create({
      data: {
        id: '123e4567-e89b-12d3-a456-426614174000', // Fixed UUID for testing
        name: 'Test Player',
        email: 'test@example.com',
        money: 500,
        level: 3,
        xp: 1000,
        settings: { darkMode: true, notifications: true },
        horses: {
          create: [
            { 
              name: 'Starlight', 
              age: 4, 
              breed: { connect: { id: thoroughbredBreed.id } }
            },
            { 
              name: 'Comet', 
              age: 6, 
              breed: { connect: { id: thoroughbredBreed.id } }
            }
          ]
        }
      },
      include: {
        horses: {
          include: {
            breed: true
          }
        }
      }
    });

    console.log(`[seed] Successfully created player: ${player.name} (ID: ${player.id})`);
    console.log(`[seed] Player has ${player.horses.length} horses:`);
    player.horses.forEach(horse => {
      console.log(`[seed]   - ${horse.name} (${horse.age} years old, ${horse.breed.name})`);
    });
    
    return true;
  } catch (error) {
    console.error(`[seed] Failed to create player with horses: ${error.message}`);
    console.error(`[seed] Error details:`, error.stack);
    return false;
  }
}

// Run seeding
(async () => {
  try {
    // First seed horses
    const horseSeedingSuccess = await seedHorses();
    
    // Then seed player with horses
    const playerSeedingSuccess = await seedPlayerWithHorses();
    
    if (!horseSeedingSuccess || !playerSeedingSuccess) {
      console.error('[seed] Seeding completed with issues. Exiting with error code.');
      process.exit(1);
    }
    
    console.log('[seed] All seeding operations completed successfully.');
  } catch (error) {
    console.error('[seed] Fatal error during seeding process:', error.message);
    console.error('[seed] Fatal error stack:', error.stack);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    console.log('[seed] Prisma client disconnected.');
  }
})();

// Export functions for testing
export { findOrCreateBreed, ensureReferencedRecordsExist, checkHorseExists, checkPlayerExists, seedHorses, seedPlayerWithHorses };