import express from 'express';
import { body, param, validationResult } from 'express-validator';
import { getFoalDevelopment, completeActivity, advanceDay } from '../models/foalModel.js';
import logger from '../utils/logger.js';

const router = express.Router();

/**
 * GET /api/foals/:foalId/development
 * Get foal development data including current status and activity history
 */
router.get('/:foalId/development', [
  param('foalId').isInt({ min: 1 }).withMessage('Foal ID must be a positive integer')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { foalId } = req.params;
    logger.info(`[foalRoutes] GET /api/foals/${foalId}/development`);

    const developmentData = await getFoalDevelopment(foalId);

    res.json({
      success: true,
      data: developmentData
    });

  } catch (error) {
    logger.error(`[foalRoutes] GET /api/foals/:foalId/development error: ${error.message}`);
    
    if (error.message.includes('not found') || error.message.includes('not a foal')) {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * POST /api/foals/:foalId/activity
 * Complete a foal enrichment activity
 */
router.post('/:foalId/activity', [
  param('foalId').isInt({ min: 1 }).withMessage('Foal ID must be a positive integer'),
  body('activityType').notEmpty().withMessage('Activity type is required')
    .isString().withMessage('Activity type must be a string')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { foalId } = req.params;
    const { activityType } = req.body;
    
    logger.info(`[foalRoutes] POST /api/foals/${foalId}/activity - ${activityType}`);

    const updatedData = await completeActivity(foalId, activityType);

    res.json({
      success: true,
      message: `Activity "${activityType}" completed successfully`,
      data: updatedData
    });

  } catch (error) {
    logger.error(`[foalRoutes] POST /api/foals/:foalId/activity error: ${error.message}`);
    
    if (error.message.includes('not found') || error.message.includes('not available')) {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }

    if (error.message.includes('already completed') || error.message.includes('not available')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * POST /api/foals/:foalId/advance-day
 * Advance foal to next day (admin/cron endpoint)
 */
router.post('/:foalId/advance-day', [
  param('foalId').isInt({ min: 1 }).withMessage('Foal ID must be a positive integer')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { foalId } = req.params;
    logger.info(`[foalRoutes] POST /api/foals/${foalId}/advance-day`);

    const updatedData = await advanceDay(foalId);

    res.json({
      success: true,
      message: `Foal advanced to day ${updatedData.development.currentDay}`,
      data: updatedData
    });

  } catch (error) {
    logger.error(`[foalRoutes] POST /api/foals/:foalId/advance-day error: ${error.message}`);
    
    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }

    if (error.message.includes('already completed')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

export default router; 