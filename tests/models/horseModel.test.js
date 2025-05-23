const { createHorse } = require('../../backend/models/horseModel');
const pool = require('../../backend/db'); // Using 'pool' as that is what db/index.js exports

describe('Horse Model - Validation', () => {
  afterAll(async () => {
    await pool.end(); // Ensure the pool is closed after tests
  });

  it('should throw an error when creating a horse without a name', async () => {
    const horseDataWithoutName = {
      // name is omitted
      sex: 'Mare',
      date_of_birth: '2020-05-10',
      breed_id: null,
      owner_id: null,
      stable_id: null,
      genotype: {},
      phenotypic_markings: null,
      final_display_color: null,
      shade: null,
      image_url: null,
      trait: null,
      temperament: null,
      precision: 0,
      strength: 0,
      speed: 0,
      agility: 0,
      endurance: 0,
      intelligence: 0,
      personality: null,
      total_earnings: 0,
      sire_id: null,
      dam_id: null,
      stud_status: null,
      stud_fee: null,
      last_bred_date: null,
      for_sale: null,
      sale_price: null,
      health_status: 'Healthy',
      last_vetted_date: null,
      tack: null,
    };
    await expect(createHorse(horseDataWithoutName)).rejects.toThrow(/^Database error in createHorse: .*/);
  });

  it('should throw an error when a CHECK constraint is violated (e.g., invalid precision)', async () => {
    const horseDataWithInvalidPrecision = {
      name: 'CheckConstraintViolatorHorse',
      sex: 'Stallion',
      date_of_birth: '2021-01-15',
      breed_id: null,
      owner_id: null,
      stable_id: null,
      genotype: {},
      phenotypic_markings: null,
      final_display_color: null,
      shade: null,
      image_url: null,
      trait: null,
      temperament: null,
      precision: -5,
      strength: 50,
      speed: 50,
      agility: 50,
      endurance: 50,
      intelligence: 50,
      personality: null,
      total_earnings: 0,
      sire_id: null,
      dam_id: null,
      stud_status: null,
      stud_fee: null,
      last_bred_date: null,
      for_sale: null,
      sale_price: null,
      health_status: 'Healthy',
      last_vetted_date: null,
      tack: null,
    };
    await expect(createHorse(horseDataWithInvalidPrecision)).rejects.toThrow(/^Database error in createHorse: .*/);
  });

  // TODO: Add a test that successfully creates a horse with all required fields
  // This would require proper setup of breed_id, owner_id, stable_id or making them nullable in test data.
}); 