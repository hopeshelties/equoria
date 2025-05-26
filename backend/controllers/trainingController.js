import { getLastTrainingDate, getHorseAge, logTrainingSession, getAnyRecentTraining } from '../models/trainingModel.js';
import { incrementDisciplineScore, getHorseById } from '../models/horseModel.js';
import { getPlayerWithHorses, addXp } from '../models/playerModel.js';
import logger from '../utils/logger.js';

/**
 * Check if a horse is eligible to train in a specific discipline
 * @param {number} horseId - ID of the horse to check
 * @param {string} discipline - Discipline to train in
 * @returns {Object} - Eligibility result with eligible boolean and reason string
 * @throws {Error} - If validation fails or database error occurs
 */
async function canTrain(horseId, discipline) {
  try {
    // Validate input parameters
    if (horseId === undefined || horseId === null) {
      throw new Error('Horse ID is required');
    }

    if (!discipline) {
      throw new Error('Discipline is required');
    }

    // Validate horseId is a positive integer
    const parsedHorseId = parseInt(horseId, 10);
    if (isNaN(parsedHorseId) || parsedHorseId <= 0) {
      throw new Error('Horse ID must be a positive integer');
    }

    logger.info(`[trainingController.canTrain] Checking training eligibility for horse ${parsedHorseId} in ${discipline}`);

    // Check horse age requirement (must be 3+ years old)
    const age = await getHorseAge(parsedHorseId);

    if (age === null) {
      logger.warn(`[trainingController.canTrain] Horse ${parsedHorseId} not found`);
      return {
        eligible: false,
        reason: 'Horse not found'
      };
    }

    if (age < 3) {
      logger.info(`[trainingController.canTrain] Horse ${parsedHorseId} is too young (${age} years old)`);
      return {
        eligible: false,
        reason: 'Horse is under age'
      };
    }

    // Check cooldown period (7 days since last training in ANY discipline)
    const lastTrainingDate = await getAnyRecentTraining(parsedHorseId);

    if (lastTrainingDate) {
      const now = new Date();
      const diff = now - new Date(lastTrainingDate);
      const sevenDays = 1000 * 60 * 60 * 24 * 7; // 7 days in milliseconds

      if (diff < sevenDays) {
        const remainingTime = sevenDays - diff;
        const remainingDays = Math.ceil(remainingTime / (1000 * 60 * 60 * 24));

        logger.info(`[trainingController.canTrain] Horse ${parsedHorseId} still in cooldown for any training (${remainingDays} days remaining)`);
        return {
          eligible: false,
          reason: 'Training cooldown active for this horse'
        };
      }
    }

    // Horse is eligible to train
    logger.info(`[trainingController.canTrain] Horse ${parsedHorseId} is eligible to train in ${discipline}`);
    return {
      eligible: true,
      reason: null
    };

  } catch (error) {
    logger.error(`[trainingController.canTrain] Error checking training eligibility: ${error.message}`);
    throw new Error(`Training eligibility check failed: ${error.message}`);
  }
}

/**
 * Train a horse in a specific discipline (with eligibility validation)
 * @param {number} horseId - ID of the horse to train
 * @param {string} discipline - Discipline to train in
 * @returns {Object} - Training result with success status, updated horse, and next eligible date
 * @throws {Error} - If validation fails or training is not allowed
 */
async function trainHorse(horseId, discipline) {
  try {
    logger.info(`[trainingController.trainHorse] Attempting to train horse ${horseId} in ${discipline}`);

    // Check if horse is eligible to train
    const eligibilityCheck = await canTrain(horseId, discipline);

    if (!eligibilityCheck.eligible) {
      logger.warn(`[trainingController.trainHorse] Training rejected: ${eligibilityCheck.reason}`);
      return {
        success: false,
        reason: eligibilityCheck.reason,
        updatedHorse: null,
        message: `Training not allowed: ${eligibilityCheck.reason}`,
        nextEligible: null
      };
    }

    // Log the training session
    const trainingLog = await logTrainingSession({ horseId, discipline });

    // Update the horse's discipline score by +5
    const updatedHorse = await incrementDisciplineScore(horseId, discipline);

    // NEW: Award XP to horse owner for training
    try {
      if (updatedHorse && updatedHorse.ownerId) {
        const xpResult = await addXp(updatedHorse.ownerId, 5);
        logger.info(`[trainingController.trainHorse] Awarded 5 XP to player ${updatedHorse.ownerId} for training${xpResult.leveledUp ? ` - LEVEL UP to ${xpResult.level}!` : ''}`);
      }
    } catch (error) {
      logger.error(`[trainingController.trainHorse] Failed to award training XP: ${error.message}`);
      // Continue with training completion even if XP award fails
    }

    // Calculate next eligible training date (7 days from now)
    const nextEligible = new Date();
    nextEligible.setDate(nextEligible.getDate() + 7);

    logger.info(`[trainingController.trainHorse] Successfully trained horse ${horseId} in ${discipline} (Log ID: ${trainingLog.id})`);

    return {
      success: true,
      updatedHorse: updatedHorse,
      message: `Horse trained successfully in ${discipline}. +5 added.`,
      nextEligible: nextEligible.toISOString()
    };

  } catch (error) {
    logger.error(`[trainingController.trainHorse] Training failed: ${error.message}`);
    throw new Error(`Training failed: ${error.message}`);
  }
}

/**
 * Get training status for a horse in a specific discipline
 * @param {number} horseId - ID of the horse to check
 * @param {string} discipline - Discipline to check
 * @returns {Object} - Training status with eligibility, last training date, and cooldown info
 * @throws {Error} - If validation fails or database error occurs
 */
async function getTrainingStatus(horseId, discipline) {
  try {
    logger.info(`[trainingController.getTrainingStatus] Getting training status for horse ${horseId} in ${discipline}`);

    // Get eligibility check (now uses global cooldown)
    const eligibilityCheck = await canTrain(horseId, discipline);

    // Get additional status information
    const age = await getHorseAge(horseId);
    const lastTrainingDateInDiscipline = await getLastTrainingDate(horseId, discipline);
    const lastTrainingDateAny = await getAnyRecentTraining(horseId);

    let cooldownInfo = null;
    if (lastTrainingDateAny) {
      const now = new Date();
      const diff = now - new Date(lastTrainingDateAny);
      const sevenDays = 1000 * 60 * 60 * 24 * 7;

      if (diff < sevenDays) {
        const remainingTime = sevenDays - diff;
        const remainingDays = Math.ceil(remainingTime / (1000 * 60 * 60 * 24));
        const remainingHours = Math.ceil(remainingTime / (1000 * 60 * 60));

        cooldownInfo = {
          active: true,
          remainingDays: remainingDays,
          remainingHours: remainingHours,
          lastTrainingDate: lastTrainingDateAny
        };
      } else {
        cooldownInfo = {
          active: false,
          remainingDays: 0,
          remainingHours: 0,
          lastTrainingDate: lastTrainingDateAny
        };
      }
    }

    const status = {
      eligible: eligibilityCheck.eligible,
      reason: eligibilityCheck.reason,
      horseAge: age,
      lastTrainingDate: lastTrainingDateInDiscipline, // Still show discipline-specific for UI
      cooldown: cooldownInfo
    };

    logger.info(`[trainingController.getTrainingStatus] Training status retrieved for horse ${horseId}: eligible=${status.eligible}`);

    return status;

  } catch (error) {
    logger.error(`[trainingController.getTrainingStatus] Error getting training status: ${error.message}`);
    throw new Error(`Training status check failed: ${error.message}`);
  }
}

/**
 * Get all horses owned by a player that are eligible for training in at least one discipline
 * @param {string} playerId - UUID of the player
 * @returns {Array} - Array of horses with their trainable disciplines
 * @throws {Error} - If validation fails or database error occurs
 */
async function getTrainableHorses(playerId) {
  try {
    // Validate input parameters
    if (!playerId) {
      throw new Error('Player ID is required');
    }

    logger.info(`[trainingController.getTrainableHorses] Getting trainable horses for player ${playerId}`);

    // Get player with their horses
    const player = await getPlayerWithHorses(playerId);

    if (!player) {
      logger.warn(`[trainingController.getTrainableHorses] Player ${playerId} not found`);
      return [];
    }

    if (!player.horses || player.horses.length === 0) {
      logger.info(`[trainingController.getTrainableHorses] Player ${playerId} has no horses`);
      return [];
    }

    // Define all available disciplines
    const allDisciplines = ['Racing', 'Show Jumping', 'Dressage', 'Cross Country', 'Western'];

    const trainableHorses = [];

    // Check each horse for training eligibility
    for (const horse of player.horses) {
      // Skip horses under 3 years old
      if (horse.age < 3) {
        logger.debug(`[trainingController.getTrainableHorses] Horse ${horse.id} (${horse.name}) is too young (${horse.age} years)`);
        continue;
      }

      try {
        // Check if horse has trained in ANY discipline within the last 7 days
        const lastTrainingDate = await getAnyRecentTraining(horse.id);

        let isTrainable = false;

        if (!lastTrainingDate) {
          // Horse has never trained, so it's trainable in all disciplines
          isTrainable = true;
        } else {
          // Check if 7-day cooldown has passed
          const now = new Date();
          const diff = now - new Date(lastTrainingDate);
          const sevenDays = 1000 * 60 * 60 * 24 * 7; // 7 days in milliseconds

          if (diff >= sevenDays) {
            isTrainable = true;
          }
        }

        // If horse is trainable, it can train in all disciplines (since cooldown is global)
        if (isTrainable) {
          trainableHorses.push({
            horseId: horse.id,
            name: horse.name,
            age: horse.age,
            trainableDisciplines: allDisciplines // All disciplines available since cooldown is global
          });
        }

      } catch (error) {
        logger.warn(`[trainingController.getTrainableHorses] Error checking training eligibility for horse ${horse.id}: ${error.message}`);
        // Continue checking other horses even if one fails
      }
    }

    logger.info(`[trainingController.getTrainableHorses] Found ${trainableHorses.length} trainable horses for player ${playerId}`);
    return trainableHorses;

  } catch (error) {
    logger.error(`[trainingController.getTrainableHorses] Error getting trainable horses: ${error.message}`);
    throw new Error(`Failed to get trainable horses: ${error.message}`);
  }
}

/**
 * Route handler for POST /train endpoint
 * @param {Object} req - Express request object with horseId and discipline in body
 * @param {Object} res - Express response object
 */
async function trainRouteHandler(req, res) {
  try {
    const { horseId, discipline } = req.body;

    logger.info(`[trainingController.trainRouteHandler] Training request for horse ${horseId} in ${discipline}`);

    // Call the existing trainHorse function
    const result = await trainHorse(horseId, discipline);

    if (result.success) {
      // Extract the updated score for the specific discipline
      const disciplineScores = result.updatedHorse?.disciplineScores || {};
      const updatedScore = disciplineScores[discipline] || 0;

      // Format response according to Task 2.6 specifications
      res.json({
        success: true,
        message: `${result.updatedHorse.name} trained in ${discipline}. +5 added.`,
        updatedScore: updatedScore,
        nextEligibleDate: result.nextEligible
      });
    } else {
      // Return failure response for ineligible training
      res.status(400).json({
        success: false,
        message: result.message
      });
    }

  } catch (error) {
    logger.error(`[trainingController.trainRouteHandler] Error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Failed to train horse',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
}

export {
  canTrain,
  trainHorse,
  getTrainingStatus,
  getTrainableHorses,
  trainRouteHandler
};