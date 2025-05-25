import express from 'express';
import { param, validationResult } from 'express-validator';
import { getTrainableHorses } from '../controllers/trainingController.js';

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

export default router; 