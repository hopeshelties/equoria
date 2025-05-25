import { getResultsByHorse } from '../models/resultModel.js';
import logger from '../utils/logger.js';

/**
 * Get competition history for a specific horse
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export async function getHorseHistory(req, res) {
  try {
    const { id } = req.params;

    // Validate horse ID
    const horseId = parseInt(id, 10);
    if (isNaN(horseId) || horseId <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid horse ID. Must be a positive integer.',
        data: null
      });
    }

    // Get competition results for the horse
    const results = await getResultsByHorse(horseId);

    // Transform results for frontend display
    const history = results.map(result => ({
      id: result.id,
      showName: result.showName,
      discipline: result.discipline,
      placement: result.placement,
      score: result.score,
      prize: result.prizeWon,
      statGain: result.statGains ? JSON.parse(result.statGains) : null,
      runDate: result.runDate,
      createdAt: result.createdAt
    }));

    logger.info(`[horseController.getHorseHistory] Retrieved ${history.length} competition results for horse ${horseId}`);

    res.status(200).json({
      success: true,
      message: `Found ${history.length} competition results for horse ${horseId}`,
      data: history
    });

  } catch (error) {
    logger.error('[horseController.getHorseHistory] Error retrieving horse history: %o', error);
    
    res.status(500).json({
      success: false,
      message: 'Internal server error while retrieving horse history',
      data: null
    });
  }
} 