import prisma from '../db/index.js';
import logger from '../utils/logger.js';

async function createHorse(horseData) {
  try {
    const {
      name, 
      age, 
      breedId,
      breed,
      ownerId,
      stableId,
      sex,
      date_of_birth,
      genotype,
      phenotypic_markings,
      final_display_color,
      shade,
      image_url,
      trait,
      temperament,
      precision,
      strength,
      speed,
      agility,
      endurance,
      intelligence,
      personality,
      total_earnings,
      sire_id,
      dam_id,
      stud_status,
      stud_fee,
      last_bred_date,
      for_sale,
      sale_price,
      health_status,
      last_vetted_date,
      tack
    } = horseData;

    // Validate required fields
    if (!name) {
      throw new Error('Horse name is required');
    }
    if (age === undefined || age === null) {
      throw new Error('Horse age is required');
    }
    if (!breedId && !breed) {
      throw new Error('Either breedId or breed connection is required');
    }

    // Prepare breed relationship
    let breedRelation = {};
    if (breed && typeof breed === 'object' && breed.connect) {
      // Handle Prisma relation format: { connect: { id: 1 } }
      breedRelation = { breed };
    } else if (breedId) {
      // Handle direct breedId
      breedRelation = { breedId };
    } else if (breed && typeof breed === 'number') {
      // Handle case where breed is passed as a number (treat as breedId)
      breedRelation = { breedId: breed };
    } else {
      throw new Error('Invalid breed format. Use breedId (number) or breed: { connect: { id: number } }');
    }

    // Prepare owner relationship if provided
    let ownerRelation = {};
    if (ownerId) {
      ownerRelation = { ownerId };
    }

    // Prepare stable relationship if provided
    let stableRelation = {};
    if (stableId) {
      stableRelation = { stableId };
    }

    // Create horse with all provided fields
    const horse = await prisma.horse.create({
      data: {
        name,
        age,
        ...breedRelation,
        ...ownerRelation,
        ...stableRelation,
        ...(sex && { sex }),
        ...(date_of_birth && { date_of_birth: new Date(date_of_birth) }),
        ...(genotype && { genotype }),
        ...(phenotypic_markings && { phenotypic_markings }),
        ...(final_display_color && { final_display_color }),
        ...(shade && { shade }),
        ...(image_url && { image_url }),
        ...(trait && { trait }),
        ...(temperament && { temperament }),
        ...(precision !== undefined && { precision }),
        ...(strength !== undefined && { strength }),
        ...(speed !== undefined && { speed }),
        ...(agility !== undefined && { agility }),
        ...(endurance !== undefined && { endurance }),
        ...(intelligence !== undefined && { intelligence }),
        ...(personality && { personality }),
        ...(total_earnings !== undefined && { total_earnings }),
        ...(sire_id && { sire_id }),
        ...(dam_id && { dam_id }),
        ...(stud_status && { stud_status }),
        ...(stud_fee !== undefined && { stud_fee }),
        ...(last_bred_date && { last_bred_date: new Date(last_bred_date) }),
        ...(for_sale !== undefined && { for_sale }),
        ...(sale_price !== undefined && { sale_price }),
        ...(health_status && { health_status }),
        ...(last_vetted_date && { last_vetted_date: new Date(last_vetted_date) }),
        ...(tack && { tack })
      },
      include: {
        breed: true,
        owner: true,
        stable: true
      }
    });

    logger.info(`[horseModel.createHorse] Successfully created horse: ${horse.name} (ID: ${horse.id})`);
    return horse;
  } catch (error) {
    logger.error('[horseModel.createHorse] Database error: %o', error);
    throw new Error('Database error in createHorse: ' + error.message);
  }
}

async function getHorseById(id) {
  try {
    // Validate ID
    const numericId = parseInt(id, 10);
    if (isNaN(numericId) || numericId <= 0) {
      throw new Error('Invalid horse ID provided');
    }

    // Refactored to use Prisma client with relations
    const horse = await prisma.horse.findUnique({
      where: { id: numericId },
      include: {
        breed: true,
        owner: true,
        stable: true
      }
    });
    
    if (horse) {
      logger.info(`[horseModel.getHorseById] Successfully found horse: ${horse.name} (ID: ${horse.id})`);
    }
    
    return horse; // Returns null if not found, which is Prisma's default
  } catch (error) {
    logger.error('[horseModel.getHorseById] Database error: %o', error);
    throw new Error('Database error in getHorseById: ' + error.message);
  }
}

export { createHorse, getHorseById };