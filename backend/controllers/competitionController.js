import { getHorseById } from '../models/horseModel.js';
import { saveResult, getResultsByShow } from '../models/resultModel.js';
import { simulateCompetition } from '../logic/simulateCompetition.js';
import { isHorseEligibleForShow } from '../utils/isHorseEligible.js';
import logger from '../utils/logger.js';

/**
 * Enter horses into a show and run the competition
 * @param {Array} horseIds - Array of horse IDs to enter
 * @param {Object} show - Show object with competition details
 * @returns {Object} - Competition results with summary
 */
async function enterAndRunShow(horseIds, show) {
  try {
    // Validate inputs
    if (!horseIds) {
      throw new Error('Horse IDs array is required');
    }
    if (!Array.isArray(horseIds)) {
      throw new Error('Horse IDs must be an array');
    }
    if (horseIds.length === 0) {
      throw new Error('At least one horse ID is required');
    }
    if (!show) {
      throw new Error('Show object is required');
    }

    logger.info(`[competitionController.enterAndRunShow] Starting competition for show ${show.id} with ${horseIds.length} horses`);

    // Step 1: Fetch horse data for each horseId
    const horses = [];
    for (const horseId of horseIds) {
      try {
        const horse = await getHorseById(horseId);
        if (horse) {
          horses.push(horse);
        } else {
          logger.warn(`[competitionController.enterAndRunShow] Horse ${horseId} not found, skipping`);
        }
      } catch (error) {
        logger.error(`[competitionController.enterAndRunShow] Error fetching horse ${horseId}: ${error.message}`);
        throw error; // Re-throw to be caught by outer try-catch
      }
    }

    // Step 2: Get existing results to check for duplicate entries
    const existingResults = await getResultsByShow(show.id);
    const previousEntries = existingResults.map(result => result.horseId);

    // Step 3: Filter out horses that are not eligible or already entered
    const validHorses = [];
    let skippedCount = 0;

    for (const horse of horses) {
      // Check if horse already entered this show
      if (previousEntries.includes(horse.id)) {
        logger.info(`[competitionController.enterAndRunShow] Horse ${horse.id} (${horse.name}) already entered this show, skipping`);
        skippedCount++;
        continue;
      }

      // Check eligibility
      if (!isHorseEligibleForShow(horse, show, previousEntries)) {
        logger.info(`[competitionController.enterAndRunShow] Horse ${horse.id} (${horse.name}) is not eligible for this show, skipping`);
        skippedCount++;
        continue;
      }

      validHorses.push(horse);
    }

    // Calculate skipped entries (includes non-existent horses)
    const totalSkipped = horseIds.length - validHorses.length;

    // Step 4: Check if we have any valid horses
    if (validHorses.length === 0) {
      logger.warn(`[competitionController.enterAndRunShow] No valid horses available for competition`);
      return {
        success: false,
        message: 'No valid horses available for competition',
        results: [],
        summary: {
          totalEntries: horseIds.length,
          validEntries: 0,
          skippedEntries: totalSkipped,
          topThree: []
        }
      };
    }

    // Step 5: Run the competition simulation
    let simulationResults;
    try {
      simulationResults = simulateCompetition(validHorses, show);
      logger.info(`[competitionController.enterAndRunShow] Competition simulation completed with ${simulationResults.length} results`);
    } catch (error) {
      logger.error(`[competitionController.enterAndRunShow] Competition simulation failed: ${error.message}`);
      throw new Error('Competition simulation error: ' + error.message);
    }

    // Step 6: Save results to database
    const savedResults = [];
    try {
      for (const simResult of simulationResults) {
        const resultData = {
          horseId: simResult.horseId,
          showId: show.id,
          score: simResult.score,
          placement: simResult.placement,
          discipline: show.discipline,
          runDate: show.runDate
        };

        const savedResult = await saveResult(resultData);
        savedResults.push(savedResult);
      }
      logger.info(`[competitionController.enterAndRunShow] Successfully saved ${savedResults.length} competition results`);
    } catch (error) {
      logger.error(`[competitionController.enterAndRunShow] Failed to save results: ${error.message}`);
      throw new Error('Failed to save competition results: ' + error.message);
    }

    // Step 7: Extract top three for summary
    const topThree = simulationResults
      .filter(result => result.placement !== null)
      .slice(0, 3)
      .map(result => ({
        horseId: result.horseId,
        name: result.name,
        score: result.score,
        placement: result.placement
      }));

    // Step 8: Return results with summary
    const response = {
      success: true,
      message: 'Competition completed successfully',
      results: savedResults,
      summary: {
        totalEntries: horseIds.length,
        validEntries: validHorses.length,
        skippedEntries: totalSkipped,
        topThree
      }
    };

    logger.info(`[competitionController.enterAndRunShow] Competition completed successfully: ${validHorses.length} valid entries, ${totalSkipped} skipped`);
    return response;

  } catch (error) {
    logger.error('[competitionController.enterAndRunShow] Error: %o', error);
    throw new Error('Database error in enterAndRunShow: ' + error.message);
  }
}

export {
  enterAndRunShow
}; 