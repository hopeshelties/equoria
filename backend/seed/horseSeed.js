require('dotenv').config(); 
const { createHorse } = require('../models/horseModel');
const db = require('../db');

const sampleHorses = [
  {
    name: 'Midnight Comet',
    sex: 'Stallion',
    date_of_birth: '2020-05-10',
    breed_id: 1, // Assuming a breed with id 1 exists
    owner_id: 1, // Assuming a user with id 1 exists
    stable_id: 1, // Assuming a stable with id 1 exists
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
    breed_id: 2, // Assuming a breed with id 2 exists
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
    owner_id: 2, // Assuming a user with id 2 exists
    stable_id: 2, // Assuming a stable with id 2 exists
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
    sire_id: null, // Will be updated later if parents are added
    dam_id: null,  // Will be updated later if parents are added
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

async function seedHorses() {
  console.log('Starting to seed horses...');
  let successfulInserts = 0;
  let failedInserts = 0;

  for (const horseData of sampleHorses) {
    try {
      const horse = await createHorse(horseData);
      console.log(`Successfully inserted horse: ${horse.name} (ID: ${horse.id})`);
      successfulInserts++;
    } catch (error) {
      console.error(`Failed to insert horse ${horseData.name}:`, error.message);
      // console.error(error.stack); // Uncomment for more detailed error stack
      failedInserts++;
    }
  }

  console.log('--- Horse Seeding Summary ---');
  console.log(`Successfully inserted: ${successfulInserts} horses.`);
  console.log(`Failed to insert: ${failedInserts} horses.`);
  console.log('Horse seeding complete.');
}

(async () => {
  try {
    await seedHorses();
  } catch (error) {
    console.error('An unexpected error occurred during the seeding process:', error);
  } finally {
    console.log('Closing database connection...');
    await pool.end();
    console.log('Database connection closed.');
  }
})(); 