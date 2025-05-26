import express from 'express';
import { body, param, validationResult } from 'express-validator';
import { authenticateToken, requireOwnership } from '../middleware/auth.js';
import { validateStatChanges, preventDuplication } from '../middleware/gameIntegrity.js';
import { auditLog } from '../middleware/auditLog.js';
import { getTrainableHorses } from '../controllers/trainingController.js';
import { getHorseById } from '../models/horseModel.js';
import logger from '../utils/logger.js';
import { ApiResponse } from '../utils/apiResponse.js';

const router = express.Router();

/**
 * GET /api/horses/trainable/:userId
 * Get all trainable horses for a specific user
 */
router.get('/trainable/:userId',
  // Validation middleware
  param('userId')
    .isInt({ min: 1 })
    .withMessage('User ID must be a positive integer'),
  
  // Security middleware
  auditLog('horse_query', 'medium'),
  
  async (req, res) => {
    try {
      // Check validation results
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json(ApiResponse.badRequest('Validation failed', {
          errors: errors.array()
        }));
      }

      const userId = parseInt(req.params.userId);
      
      logger.info(`[horseRoutes] Getting trainable horses for user: ${userId}`);
      
      // Get trainable horses
      const trainableHorses = await getTrainableHorses(userId);
      
      return res.status(200).json(ApiResponse.success(
        'Trainable horses retrieved successfully',
        trainableHorses
      ));
      
    } catch (error) {
      logger.error('[horseRoutes] Error getting trainable horses:', error);
      return res.status(500).json(ApiResponse.serverError('Failed to retrieve trainable horses'));
    }
  }
);

/**
 * GET /api/horses/:horseId
 * Get detailed information about a specific horse
 */
router.get('/:horseId',
  // Validation middleware
  param('horseId')
    .isInt({ min: 1 })
    .withMessage('Horse ID must be a positive integer'),
  
  // Security middleware
  auditLog('horse_detail_query', 'low'),
  
  async (req, res) => {
    try {
      // Check validation results
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json(ApiResponse.badRequest('Validation failed', {
          errors: errors.array()
        }));
      }

      const horseId = parseInt(req.params.horseId);
      
      logger.info(`[horseRoutes] Getting horse details for ID: ${horseId}`);
      
      // Get horse details
      const horse = await getHorseById(horseId);
      
      if (!horse) {
        return res.status(404).json(ApiResponse.notFound('Horse not found'));
      }
      
      return res.status(200).json(ApiResponse.success(
        'Horse details retrieved successfully',
        horse
      ));
      
    } catch (error) {
      logger.error('[horseRoutes] Error getting horse details:', error);
      return res.status(500).json(ApiResponse.serverError('Failed to retrieve horse details'));
    }
  }
);

/**
 * PUT /api/horses/:horseId
 * Update horse information (protected route)
 */
router.put('/:horseId',
  // Authentication required
  authenticateToken,
  
  // Validation middleware
  param('horseId')
    .isInt({ min: 1 })
    .withMessage('Horse ID must be a positive integer'),
  
  body('name')
    .optional()
    .isLength({ min: 2, max: 50 })
    .withMessage('Horse name must be between 2 and 50 characters'),
  
  // Security middleware
  requireOwnership('horse'),
  validateStatChanges([]), // No direct stat modifications allowed
  preventDuplication('horse_update'),
  auditLog('horse_update', 'high'),
  
  async (req, res) => {
    try {
      // Check validation results
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json(ApiResponse.badRequest('Validation failed', {
          errors: errors.array()
        }));
      }

      const horseId = parseInt(req.params.horseId);
      const updateData = req.body;
      
      logger.info(`[horseRoutes] Updating horse ${horseId} by user ${req.user.id}`);
      
      // TODO: Implement horse update logic
      // const updatedHorse = await updateHorse(horseId, updateData);
      
      return res.status(200).json(ApiResponse.success(
        'Horse updated successfully',
        { horseId, updateData }
      ));
      
    } catch (error) {
      logger.error('[horseRoutes] Error updating horse:', error);
      return res.status(500).json(ApiResponse.serverError('Failed to update horse'));
    }
  }
);

/**
 * GET /api/horses/:horseId/history
 * Get competition history for a specific horse
 */
router.get('/:horseId/history',
  // Validation middleware
  param('horseId')
    .isInt({ min: 1 })
    .withMessage('Horse ID must be a positive integer'),
  
  // Security middleware
  auditLog('horse_history_query', 'low'),
  
  async (req, res) => {
    try {
      // Check validation results
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json(ApiResponse.badRequest('Validation failed', {
          errors: errors.array()
        }));
      }

      const horseId = parseInt(req.params.horseId);
      
      logger.info(`[horseRoutes] Getting competition history for horse: ${horseId}`);
      
      // TODO: Implement horse history retrieval
      // const history = await getHorseHistory(horseId);
      
      return res.status(200).json(ApiResponse.success(
        'Horse history retrieved successfully',
        []
      ));
      
    } catch (error) {
      logger.error('[horseRoutes] Error getting horse history:', error);
      return res.status(500).json(ApiResponse.serverError('Failed to retrieve horse history'));
    }
  }
);

export default router; 