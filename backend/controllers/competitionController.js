import { getHorseById } from '../models/horseModel.js';
import { saveResult, getResultsByShow } from '../models/resultModel.js';
import { simulateCompetition } from '../logic/simulateCompetition.js';
import { isHorseEligibleForShow } from '../utils/isHorseEligible.js';
import { 
  calculatePrizeDistribution, 
  calculateStatGains, 
  calculateEntryFees, 
  hasValidRider 
} from '../utils/competitionRewards.js';
import { updateHorseRewards } from '../utils/horseUpdates.js';
import { transferEntryFees } from '../utils/playerUpdates.js';
import logger from '../utils/logger.js';

/**
 * Enter horses into a show and run the competition with enhanced features
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

    logger.info(`[competitionController.enterAndRunShow] Starting enhanced competition for show ${show.id} with ${horseIds.length} horses`);

    // Step 1: Fetch horse data and validate riders
    const horses = [];
    const failedFetches = [];
    
    for (const horseId of horseIds) {
      try {
        const horse = await getHorseById(horseId);
        if (horse) {
          // NEW: Check if horse has a valid rider (required for competition)
          if (!hasValidRider(horse)) {
            failedFetches.push({ horseId, reason: 'Horse must have a rider to compete' });
            continue;
          }
          horses.push(horse);
        } else {
          failedFetches.push({ horseId, reason: 'Horse not found' });
        }
      } catch (error) {
        failedFetches.push({ horseId, reason: error.message });
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

    // Calculate total skipped (includes failed fetches)
    const totalSkipped = horseIds.length - validHorses.length;

    // Step 4: Check if we have any valid horses
    if (validHorses.length === 0) {
      logger.warn(`[competitionController.enterAndRunShow] No valid horses available for competition`);
      return {
        success: false,
        message: 'No valid horses available for competition',
        results: [],
        failedFetches,
        summary: {
          totalEntries: horseIds.length,
          validEntries: 0,
          skippedEntries: totalSkipped,
          topThree: [],
          entryFeesCollected: 0,
          prizesAwarded: 0
        }
      };
    }

    // Step 5: NEW - Transfer entry fees to host player
    let entryFeesTransferred = 0;
    if (show.hostPlayer && show.entryFee > 0) {
      try {
        const totalFees = calculateEntryFees(show.entryFee, validHorses.length);
        await transferEntryFees(show.hostPlayer, show.entryFee, validHorses.length);
        entryFeesTransferred = totalFees;
        logger.info(`[competitionController.enterAndRunShow] Transferred $${totalFees} in entry fees to host player ${show.hostPlayer}`);
      } catch (error) {
        logger.error(`[competitionController.enterAndRunShow] Failed to transfer entry fees: ${error.message}`);
        // Continue with competition even if fee transfer fails
      }
    }

    // Step 6: Run the competition simulation
    let simulationResults;
    try {
      simulationResults = simulateCompetition(validHorses, show);
      logger.info(`[competitionController.enterAndRunShow] Competition simulation completed with ${simulationResults.length} results`);
    } catch (error) {
      logger.error(`[competitionController.enterAndRunShow] Competition simulation failed: ${error.message}`);
      throw new Error('Competition simulation error: ' + error.message);
    }

    // Step 7: NEW - Calculate prize distribution and stat gains
    const prizeDistribution = calculatePrizeDistribution(show.prize);
    const prizeMap = {
      '1st': prizeDistribution.first,
      '2nd': prizeDistribution.second,
      '3rd': prizeDistribution.third
    };

    let totalPrizesAwarded = 0;

    // Step 8: Save results and update horse rewards
    const savedResults = [];
    try {
      for (const simResult of simulationResults) {
        // Calculate prize and stat gains for winners
        const prizeWon = prizeMap[simResult.placement] || 0;
        const statGains = simResult.placement ? calculateStatGains(simResult.placement, show.discipline) : null;

        // Save competition result with enhanced data
        const resultData = {
          horseId: simResult.horseId,
          showId: show.id,
          score: simResult.score,
          placement: simResult.placement,
          discipline: show.discipline,
          runDate: show.runDate,
          showName: show.name,
          prizeWon,
          statGains
        };

        const savedResult = await saveResult(resultData);
        savedResults.push(savedResult);

        // NEW: Update horse earnings and stats if they won prizes
        if (prizeWon > 0) {
          try {
            await updateHorseRewards(simResult.horseId, prizeWon, statGains);
            totalPrizesAwarded += prizeWon;
            logger.info(`[competitionController.enterAndRunShow] Updated horse ${simResult.horseId} with $${prizeWon} prize${statGains ? ` and +1 ${statGains.stat}` : ''}`);
          } catch (error) {
            logger.error(`[competitionController.enterAndRunShow] Failed to update horse rewards for ${simResult.horseId}: ${error.message}`);
            // Continue with other horses even if one update fails
          }
        }
      }
      logger.info(`[competitionController.enterAndRunShow] Successfully saved ${savedResults.length} competition results`);
    } catch (error) {
      logger.error(`[competitionController.enterAndRunShow] Failed to save results: ${error.message}`);
      throw new Error('Failed to save competition results: ' + error.message);
    }

    // Step 9: Extract top three for summary
    const topThree = simulationResults
      .filter(result => result.placement !== null)
      .slice(0, 3)
      .map(result => ({
        horseId: result.horseId,
        name: result.name,
        score: result.score,
        placement: result.placement,
        prizeWon: prizeMap[result.placement] || 0
      }));

    // Step 10: Return enhanced results with summary
    const response = {
      success: true,
      message: 'Competition completed successfully with enhanced features',
      results: savedResults,
      failedFetches,
      summary: {
        totalEntries: horseIds.length,
        validEntries: validHorses.length,
        skippedEntries: totalSkipped,
        topThree,
        entryFeesCollected: entryFeesTransferred,
        prizesAwarded: totalPrizesAwarded,
        prizeDistribution
      }
    };

    logger.info(`[competitionController.enterAndRunShow] Enhanced competition completed: ${validHorses.length} valid entries, $${totalPrizesAwarded} in prizes, $${entryFeesTransferred} in fees`);
    return response;

  } catch (error) {
    logger.error('[competitionController.enterAndRunShow] Error: %o', error);
    throw new Error('Database error in enterAndRunShow: ' + error.message);
  }
}

export {
  enterAndRunShow
}; 