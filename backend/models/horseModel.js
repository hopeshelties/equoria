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
      playerId,
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

    // Prepare player relationship if provided
    let playerRelation = {};
    if (playerId) {
      playerRelation = { playerId };
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
        ...playerRelation,
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
        stable: true,
        player: true
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

/**
 * Update a horse's discipline score by adding points
 * @param {number} horseId - ID of the horse to update
 * @param {string} discipline - Discipline to update (e.g., "Dressage", "Show Jumping")
 * @param {number} pointsToAdd - Points to add to the discipline score
 * @returns {Object} - Updated horse object with relations
 * @throws {Error} - If validation fails or database error occurs
 */
async function updateDisciplineScore(horseId, discipline, pointsToAdd) {
  try {
    // Validate input parameters
    const numericId = parseInt(horseId, 10);
    if (isNaN(numericId) || numericId <= 0) {
      throw new Error('Invalid horse ID provided');
    }

    if (!discipline || typeof discipline !== 'string') {
      throw new Error('Discipline must be a non-empty string');
    }

    if (typeof pointsToAdd !== 'number' || pointsToAdd <= 0) {
      throw new Error('Points to add must be a positive number');
    }

    logger.info(`[horseModel.updateDisciplineScore] Updating ${discipline} score for horse ${numericId} by +${pointsToAdd}`);

    // First, get the current horse to check if it exists and get current scores
    const currentHorse = await prisma.horse.findUnique({
      where: { id: numericId },
      select: { disciplineScores: true }
    });

    if (!currentHorse) {
      throw new Error(`Horse with ID ${numericId} not found`);
    }

    // Get current discipline scores or initialize empty object
    const currentScores = currentHorse.disciplineScores || {};

    // Update the specific discipline score
    const currentScore = currentScores[discipline] || 0;
    const newScore = currentScore + pointsToAdd;

    const updatedScores = {
      ...currentScores,
      [discipline]: newScore
    };

    // Update the horse with new discipline scores
    const updatedHorse = await prisma.horse.update({
      where: { id: numericId },
      data: {
        disciplineScores: updatedScores
      },
      include: {
        breed: true,
        owner: true,
        stable: true,
        player: true
      }
    });

    logger.info(`[horseModel.updateDisciplineScore] Successfully updated ${discipline} score for horse ${numericId}: ${currentScore} -> ${newScore}`);
    return updatedHorse;

  } catch (error) {
    logger.error('[horseModel.updateDisciplineScore] Database error: %o', error);
    throw new Error('Database error in updateDisciplineScore: ' + error.message);
  }
}

/**
 * Get a horse's discipline scores
 * @param {number} horseId - ID of the horse
 * @returns {Object} - Discipline scores object or empty object if none exist
 * @throws {Error} - If validation fails or database error occurs
 */
async function getDisciplineScores(horseId) {
  try {
    const numericId = parseInt(horseId, 10);
    if (isNaN(numericId) || numericId <= 0) {
      throw new Error('Invalid horse ID provided');
    }

    const horse = await prisma.horse.findUnique({
      where: { id: numericId },
      select: { disciplineScores: true }
    });

    if (!horse) {
      throw new Error(`Horse with ID ${numericId} not found`);
    }

    return horse.disciplineScores || {};

  } catch (error) {
    logger.error('[horseModel.getDisciplineScores] Database error: %o', error);
    throw new Error('Database error in getDisciplineScores: ' + error.message);
  }
}

/**
 * Increment a horse's discipline score by a specified amount (convenience function for training)
 * @param {number} horseId - ID of the horse to update
 * @param {string} discipline - Discipline to increment (e.g., "Dressage", "Show Jumping")
 * @param {number} amount - Amount to increment (defaults to 5 for backward compatibility)
 * @returns {Object} - Updated horse object with relations
 * @throws {Error} - If validation fails or database error occurs
 */
async function incrementDisciplineScore(horseId, discipline, amount = 5) {
  try {
    logger.info(`[horseModel.incrementDisciplineScore] Incrementing ${discipline} score for horse ${horseId} by +${amount}`);

    // Use the existing updateDisciplineScore function with specified amount
    const updatedHorse = await updateDisciplineScore(horseId, discipline, amount);

    logger.info(`[horseModel.incrementDisciplineScore] Successfully incremented ${discipline} score for horse ${horseId}`);
    return updatedHorse;

  } catch (error) {
    logger.error('[horseModel.incrementDisciplineScore] Error: %o', error);
    throw error; // Re-throw the error from updateDisciplineScore (already has proper error message)
  }
}

export { createHorse, getHorseById, updateDisciplineScore, getDisciplineScores, incrementDisciplineScore };