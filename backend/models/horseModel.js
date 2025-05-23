const db = require('../db');
const logger = require('../utils/logger');

async function createHorse(horseData) {
  try {
    const {
      name, sex, date_of_birth, breed_id, owner_id, stable_id,
      genotype, phenotypic_markings, final_display_color, shade, image_url,
      trait, temperament, precision, strength, speed, agility,
      endurance, intelligence, personality, total_earnings,
      sire_id, dam_id, stud_status, stud_fee, last_bred_date,
      for_sale, sale_price, health_status, last_vetted_date, tack
    } = horseData;

    const result = await db.query(`
      INSERT INTO public.horses (
        name, sex, date_of_birth, breed_id, owner_id, stable_id,
        genotype, phenotypic_markings, final_display_color, shade, image_url,
        trait, temperament, precision, strength, speed, agility,
        endurance, intelligence, personality, total_earnings,
        sire_id, dam_id, stud_status, stud_fee, last_bred_date,
        for_sale, sale_price, health_status, last_vetted_date, tack
      ) VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9, $10, $11,
        $12, $13, $14, $15, $16, $17,
        $18, $19, $20, $21,
        $22, $23, $24, $25, $26,
        $27, $28, $29, $30, $31
      ) RETURNING *;
    `, [
      name, sex, date_of_birth, breed_id, owner_id, stable_id,
      genotype, phenotypic_markings, final_display_color, shade, image_url,
      trait, temperament, precision, strength, speed, agility,
      endurance, intelligence, personality, total_earnings,
      sire_id, dam_id, stud_status, stud_fee, last_bred_date,
      for_sale, sale_price, health_status, last_vetted_date, tack
    ]);

    return result.rows[0];
  } catch (error) {
    logger.error('[horseModel.createHorse] Database error: %o', error);
    throw new Error('Database error in createHorse: ' + error.message);
  }
}

async function getHorseById(id) {
  try {
    const result = await db.query(`SELECT * FROM public.horses WHERE id = $1`, [id]);
    return result.rows[0]; // Returns undefined if not found, which is acceptable
  } catch (error) {
    logger.error('[horseModel.getHorseById] Database error: %o', error);
    throw new Error('Database error in getHorseById: ' + error.message);
  }
}

module.exports = {
  createHorse,
  getHorseById
};