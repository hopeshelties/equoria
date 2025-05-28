import express from 'express';
import { body, validationResult } from 'express-validator';
import { getHorseById } from '../models/horseModel.js';
import logger from '../utils/logger.js';

const router = express.Router();

// Validation middleware for entering a show
const validateEnterShow = [
  body('showId')
    .isInt({ min: 1 })
    .withMessage('Show ID must be a positive integer'),
  body('horseIds')
    .isArray({ min: 1 })
    .withMessage('Horse IDs must be a non-empty array'),
  body('horseIds.*')
    .isInt({ min: 1 })
    .withMessage('Each horse ID must be a positive integer')
];

/**
 * POST /enter-show
 * Enter horses into a show and run the competition
 *
 * Request body:
 * {
 *   "showId": 1,
 *   "horseIds": [1, 2, 3, 4, 5]
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "message": "Competition completed successfully",
 *   "results": [...],
 *   "summary": {
 *     "totalEntries": 5,
 *     "validEntries": 5,
 *     "skippedEntries": 0,
 *     "topThree": [...]
 *   }
 * }
 */
router.post('/enter-show', validateEnterShow, async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn(`[competitionRoutes.POST /enter-show] Validation errors: ${JSON.stringify(errors.array())}`);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { showId, horseIds } = req.body;

    logger.info(`[competitionRoutes.POST /enter-show] Entering ${horseIds.length} horses into show ${showId}`);

    // First, we need to get the show details
    // For now, we'll create a mock show object since we don't have a Show model yet
    // In a real implementation, you would fetch this from the database
    const mockShow = {
      id: showId,
      name: `Show ${showId}`,
      discipline: 'Racing', // This should come from the database
      levelMin: 1,
      levelMax: 10,
      entryFee: 100,
      prize: 1000,
      runDate: new Date()
    };

    // Dynamic import for ES module
    const { enterAndRunShow } = await import('../controllers/competitionController.js');

    // Call the controller function
    const result = await enterAndRunShow(horseIds, mockShow);

    // Log the result
    if (result.success) {
      logger.info(`[competitionRoutes.POST /enter-show] Competition completed successfully: ${result.summary.validEntries} entries, ${result.summary.skippedEntries} skipped`);
    } else {
      logger.warn(`[competitionRoutes.POST /enter-show] Competition failed: ${result.message}`);
    }

    // Return appropriate status code based on success
    const statusCode = result.success ? 200 : 400;
    res.status(statusCode).json(result);

  } catch (error) {
    logger.error(`[competitionRoutes.POST /enter-show] Error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
  }
});

/**
 * GET /show/:showId/results
 * Get all results for a specific show
 */
router.get('/show/:showId/results', async (req, res) => {
  try {
    const showId = parseInt(req.params.showId, 10);

    if (isNaN(showId) || showId <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid show ID'
      });
    }

    // Import here to avoid circular dependency issues
    const { getResultsByShow } = await import('../models/resultModel.js');
    const results = await getResultsByShow(showId);

    logger.info(`[competitionRoutes.GET /show/${showId}/results] Retrieved ${results.length} results`);

    res.json({
      success: true,
      showId,
      results,
      count: results.length
    });

  } catch (error) {
    logger.error(`[competitionRoutes.GET /show/:showId/results] Error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
  }
});

/**
 * GET /horse/:horseId/results
 * Get all competition results for a specific horse
 */
router.get('/horse/:horseId/results', async (req, res) => {
  try {
    const horseId = parseInt(req.params.horseId, 10);

    if (isNaN(horseId) || horseId <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid horse ID'
      });
    }

    // Import here to avoid circular dependency issues
    const { getResultsByHorse } = await import('../models/resultModel.js');
    const results = await getResultsByHorse(horseId);

    logger.info(`[competitionRoutes.GET /horse/${horseId}/results] Retrieved ${results.length} results`);

    res.json({
      success: true,
      horseId,
      results,
      count: results.length
    });

  } catch (error) {
    logger.error(`[competitionRoutes.GET /horse/:horseId/results] Error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
  }
});

export default router;