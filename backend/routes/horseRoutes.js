import express from 'express';
import { param, body, validationResult } from 'express-validator';
import { getTrainableHorses } from '../controllers/trainingController.js';
import { getHorseOverview } from '../controllers/horseController.js';

const router = express.Router();

/**
 * Validation middleware for horse ID parameter
 */
const validateHorseId = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Horse ID must be a positive integer'),

  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }
    next();
  }
];

/**
 * Validation middleware for player ID parameter
 */
const validatePlayerId = [
  param('playerId')
    .isLength({ min: 1, max: 50 })
    .withMessage('Player ID must be between 1 and 50 characters'),

  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }
    next();
  }
];

/**
 * GET /horses/trainable/:playerId
 * Get all horses owned by a player that are eligible for training
 */
router.get('/trainable/:playerId', validatePlayerId, async (req, res) => {
  try {
    const { playerId } = req.params;

    const trainableHorses = await getTrainableHorses(playerId);

    res.json({
      success: true,
      message: `Found ${trainableHorses.length} trainable horses`,
      data: trainableHorses
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
  }
});

/**
 * GET /horses/:id/history
 * Get competition history for a specific horse
 */
router.get('/:id/history', validateHorseId, async (req, res) => {
  try {
    // Dynamic import for ES module
    const { getHorseHistory } = await import('../controllers/horseController.js');
    await getHorseHistory(req, res);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
  }
});

/**
 * Validation middleware for foal creation
 */
const validateFoalCreation = [
  body('name')
    .isLength({ min: 1, max: 100 })
    .withMessage('Name must be between 1 and 100 characters'),
  body('breedId')
    .isInt({ min: 1 })
    .withMessage('Breed ID must be a positive integer'),
  body('sire_id')
    .isInt({ min: 1 })
    .withMessage('Sire ID must be a positive integer'),
  body('dam_id')
    .isInt({ min: 1 })
    .withMessage('Dam ID must be a positive integer'),
  body('sex')
    .optional()
    .isIn(['stallion', 'mare', 'gelding', 'filly', 'colt'])
    .withMessage('Sex must be one of: stallion, mare, gelding, filly, colt'),
  body('ownerId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Owner ID must be a positive integer'),
  body('playerId')
    .optional()
    .isLength({ min: 1, max: 50 })
    .withMessage('Player ID must be between 1 and 50 characters'),
  body('stableId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Stable ID must be a positive integer'),
  body('health_status')
    .optional()
    .isIn(['Excellent', 'Good', 'Fair', 'Poor', 'Critical'])
    .withMessage('Health status must be one of: Excellent, Good, Fair, Poor, Critical'),

  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }
    next();
  }
];

/**
 * POST /horses/foals
 * Create a new foal with epigenetic traits applied at birth
 */
router.post('/foals', validateFoalCreation, async (req, res) => {
  try {
    // Dynamic import for ES module
    const { createFoal } = await import('../controllers/horseController.js');
    await createFoal(req, res);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal server error during foal creation',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
  }
});

/**
 * GET /horses/:id/overview
 * Get comprehensive overview data for a specific horse
 */
router.get('/:id/overview', validateHorseId, async (req, res) => {
  try {
    await getHorseOverview(req, res);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
  }
});

export default router;