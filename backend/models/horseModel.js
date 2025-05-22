const db = require('../db');

async function createHorse(horseData) {
  const {
    name, sex, date_of_birth, breed_id, owner_id, stable_id,
    genotype, phenotypic_markings, final_display_color, shade, image_url,
    trait, temperament, precision, strength, speed, agility,
    endurance, intelligence, personality, total_earnings,
    sire_id, dam_id, stud_status, stud_fee, last_bred_date,
    for_sale, sale_price, health_status, last_vetted_date, tack
  } = horseData;

  const result = await db.query(`
    insert into public.horses (
      name, sex, date_of_birth, breed_id, owner_id, stable_id,
      genotype, phenotypic_markings, final_display_color, shade, image_url,
      trait, temperament, precision, strength, speed, agility,
      endurance, intelligence, personality, total_earnings,
      sire_id, dam_id, stud_status, stud_fee, last_bred_date,
      for_sale, sale_price, health_status, last_vetted_date, tack
    ) values (
      $1,$2,$3,$4,$5,$6,
      $7,$8,$9,$10,$11,
      $12,$13,$14,$15,$16,$17,
      $18,$19,$20,$21,
      $22,$23,$24,$25,$26,
      $27,$28,$29,$30,$31
    ) returning *;
  `, [
    name, sex, date_of_birth, breed_id, owner_id, stable_id,
    genotype, phenotypic_markings, final_display_color, shade, image_url,
    trait, temperament, precision, strength, speed, agility,
    endurance, intelligence, personality, total_earnings,
    sire_id, dam_id, stud_status, stud_fee, last_bred_date,
    for_sale, sale_price, health_status, last_vetted_date, tack
  ]);

  return result.rows[0];
}

async function getHorseById(id) {
  const result = await db.query(`select * from public.horses where id = $1`, [id]);
  return result.rows[0];
}

module.exports = {
  createHorse,
  getHorseById
}; 