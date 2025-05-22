const path = require('path');
const dotenv = require('dotenv');
const { createHorse } = require('../models/horseModel');
const db = require('../db'); // Assumes db is a pg.Pool

// Load .env file explicitly
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
console.log('[seed] DATABASE_URL from env:', process.env.DATABASE_URL);

// Sample horse data
const sampleHorses = [
  {
    name: 'Midnight Comet',
    sex: 'Stallion',
    date_of_birth: '2020-05-10',
    breed_id: 1,
    owner_id: 1,
    stable_id: 1,
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
    personality: 78,
    total_earnings: 15000,
    sire_id: null,
    dam_id: null,
    stud_status: 'Public Stud',
    stud_fee: 500,
    last_bred_date: null,
    for_sale: false,
    sale_price: 0,
    health_status: 'Excellent',
    last_vetted_date: '2024-05-01',
    tack: { saddle: 'Western Pleasure', bridle: 'Standard', blanket: 'Show' }
  },
  {
    name: 'Golden Dawn',
    sex: 'Mare',
    date_of_birth: '2019-03-15',
    breed_id: 2,
    owner_id: 1,
    stable_id: 1,
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
    personality: 90,
    total_earnings: 25000,
    sire_id: null,
    dam_id: null,
    stud_status: 'Not at Stud',
    stud_fee: 0,
    last_bred_date: '2023-11-01',
    for_sale: true,
    sale_price: 12000,
    health_status: 'Very Good',
    last_vetted_date: '2024-04-20',
    tack: { saddle: 'English All-Purpose', bridle: 'Snaffle', blanket: 'Stable' }
  },
  {
    name: 'Shadowfax Spirit',
    sex: 'Colt',
    date_of_birth: '2023-07-22',
    breed_id: 1,
    owner_id: 2,
    stable_id: 2,
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
    personality: 72,
    total_earnings: 500,
    sire_id: null,
    dam_id: null,
    stud_status: 'Not at Stud',
    stud_fee: 0,
    last_bred_date: null,
    for_sale: false,
    sale_price: 0,
    health_status: 'Excellent',
    last_vetted_date: '2024-05-10',
    tack: { saddle: 'Training', bridle: 'Halter', blanket: 'Turnout' }
  }
];

// Validate referenced IDs (breed_id, owner_id, stable_id)
async function validateReferences(client) {
  const checks = [
    { table: 'breeds', ids: [...new Set(sampleHorses.map(h => h.breed_id))] },
    { table: 'users', ids: [...new Set(sampleHorses.map(h => h.owner_id))] },
    { table: 'stables', ids: [...new Set(sampleHorses.map(h => h.stable_id))] }
  ];

  console.log('[validateReferences] Checks to perform:', JSON.stringify(checks));

  for (const { table, ids } of checks) {
    console.log(`[validateReferences] Checking table: ${table}, for IDs: ${ids.join(', ')} (type of first ID: ${typeof ids[0]})`);
    try {
      const result = await client.query(
        `SELECT id FROM public.${table} WHERE id = ANY($1::bigint[])`,
        [ids]
      );
      const foundIds = result.rows.map(row => row.id);
      console.log(`[validateReferences] Found IDs in ${table}: ${foundIds.join(', ')} (type of first found ID: ${foundIds.length > 0 ? typeof foundIds[0] : 'N/A'})`);
      
      const numericIdsToFind = ids.map(id => BigInt(id));
      const numericFoundIds = foundIds.map(id => BigInt(id));
      const missingIds = numericIdsToFind.filter(idToFind => !numericFoundIds.some(foundId => foundId === idToFind));
      
      console.log(`[validateReferences] Missing IDs for ${table} after comparison: ${missingIds.join(', ')}`);

      if (missingIds.length > 0) {
        throw new Error(`Missing IDs in ${table}: ${missingIds.map(String).join(', ')}`);
      }
    } catch (queryError) {
      console.error(`[validateReferences] SQL Error for table ${table} with IDs ${ids.join(', ')}:`, queryError);
      throw queryError;
    }
  }
}

async function seedHorses() {
  let client;
  try {
    console.log('[seed] Connecting to database...');
    client = await db.connect(); // Get a client from the pool
    await client.query('BEGIN'); // Start transaction

    // Validate referenced IDs
    console.log('[seed] Validating referenced IDs...');
    await validateReferences(client);

    console.log('[seed] Starting to seed horses...');
    let successfulInserts = 0;
    let failedInserts = 0;

    for (const horseData of sampleHorses) {
      try {
        const horse = await createHorse(horseData); // Use db.query via createHorse
        console.log(`[seed] Successfully inserted horse: ${horse.name} (ID: ${horse.id})`);
        successfulInserts++;
      } catch (error) {
        console.error(`[seed] Failed to insert horse ${horseData.name}:`, error.message);
        console.error(error.stack);
        failedInserts++;
      }
    }

    if (failedInserts > 0) {
      throw new Error(`[seed] Failed to insert ${failedInserts} horses`);
    }

    await client.query('COMMIT'); // Commit transaction
    console.log('[seed] --- Horse Seeding Summary ---');
    console.log(`[seed] Successfully inserted: ${successfulInserts} horses`);
    console.log(`[seed] Failed to insert: ${failedInserts} horses`);
    console.log('[seed] Horse seeding complete.');
  } catch (error) {
    console.error('[seed] Error during seeding:', error.message);
    console.error(error.stack);
    if (client) await client.query('ROLLBACK'); // Rollback on error
    throw error;
  } finally {
    if (client) {
      console.log('[seed] Closing database connection...');
      client.release();
      console.log('[seed] Database connection closed.');
    }
  }
}

// Run seeding
(async () => {
  try {
    await seedHorses();
  } catch (error) {
    console.error('[seed] Fatal error during seeding:', error.message);
    process.exit(1);
  }
})();