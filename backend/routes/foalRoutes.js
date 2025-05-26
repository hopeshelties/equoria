import express from 'express';
import { body, param, validationResult } from 'express-validator';
import { authenticateToken, requireOwnership } from '../middleware/auth.js';
import { validateTraining, preventDuplication } from '../middleware/gameIntegrity.js';
import { auditLog } from '../middleware/auditLog.js';
import logger from '../utils/logger.js';
import { ApiResponse } from '../utils/apiResponse.js';
import prisma from '../db/index.js';

const router = express.Router();

/**
 * GET /api/foals/:foalId/development
 * Get development progress for a foal
 */
router.get('/:foalId/development',
  // Validation middleware
  param('foalId')
    .isInt({ min: 1 })
    .withMessage('Foal ID must be a positive integer'),
  
  // Security middleware
  auditLog('foal_development_query', 'low'),
  
  async (req, res) => {
    try {
      // Check validation results
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json(ApiResponse.badRequest('Validation failed', {
          errors: errors.array()
        }));
      }

      const foalId = parseInt(req.params.foalId);
      
      logger.info(`[foalRoutes] Getting development progress for foal ${foalId}`);
      
      // Get foal information
      const foal = await prisma.horse.findUnique({
        where: { id: foalId },
        include: {
          breed: true,
          player: {
            select: {
              id: true,
              name: true
            }
          }
        }
      });
      
      if (!foal) {
        return res.status(404).json(ApiResponse.notFound('Foal not found'));
      }
      
      // Verify it's actually a foal
      if (foal.age > 1) {
        return res.status(400).json(ApiResponse.badRequest('Horse is not a foal (age > 1 year)'));
      }
      
      // Mock development progress
      const developmentProgress = {
        foalId: foalId,
        foalName: foal.name,
        currentDay: Math.floor(Math.random() * 7),
        totalDays: 7,
        bondingLevel: foal.bond_score || 50,
        stressLevel: foal.stress_level || 50,
        completedActivities: [
          'Feeding Assistance',
          'Gentle Touch',
          'Leading Practice'
        ],
        availableActivities: [
          'Halter Introduction',
          'Basic Commands',
          'Grooming Introduction'
        ],
        developmentStage: foal.age === 0 ? 'Newborn' : 'Yearling',
        estimatedCompletion: new Date(Date.now() + (7 - 3) * 24 * 60 * 60 * 1000).toISOString()
      };
      
      return res.status(200).json(ApiResponse.success(
        'Foal development progress retrieved successfully',
        developmentProgress
      ));
      
    } catch (error) {
      logger.error('[foalRoutes] Error getting foal development:', error);
      return res.status(500).json(ApiResponse.serverError('Failed to retrieve foal development'));
    }
  }
);

/**
 * GET /api/foals/:foalId/activities
 * Get available enrichment activities for a foal's current development day
 */
router.get('/:foalId/activities',
  // Validation middleware
  param('foalId')
    .isInt({ min: 1 })
    .withMessage('Foal ID must be a positive integer'),
  
  // Security middleware
  auditLog('foal_activities_query', 'low'),
  
  async (req, res) => {
    try {
      // Check validation results
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json(ApiResponse.badRequest('Validation failed', {
          errors: errors.array()
        }));
      }

      const foalId = parseInt(req.params.foalId);
      
      logger.info(`[foalRoutes] Getting available activities for foal ${foalId}`);
      
      // Get foal information
      const foal = await prisma.horse.findUnique({
        where: { id: foalId },
        select: {
          id: true,
          name: true,
          age: true
        }
      });
      
      if (!foal) {
        return res.status(404).json(ApiResponse.notFound('Foal not found'));
      }
      
      // Verify it's actually a foal
      if (foal.age > 1) {
        return res.status(400).json(ApiResponse.badRequest('Horse is not a foal (age > 1 year)'));
      }
      
      // Mock enrichment activities by day
      const enrichmentActivities = {
        0: [
          { name: 'Feeding Assistance', description: 'Help with feeding routine', bond: +5, stress: -2 },
          { name: 'Gentle Touch', description: 'Gentle physical contact', bond: +3, stress: -1 },
          { name: 'Voice Introduction', description: 'Vocal interaction and commands', bond: +2, stress: -1 }
        ],
        1: [
          { name: 'Leading Practice', description: 'Basic leading exercises', bond: +4, stress: +1 },
          { name: 'Halter Introduction', description: 'Introduction to halter', bond: +3, stress: +2 },
          { name: 'Basic Commands', description: 'Simple voice commands', bond: +2, stress: +1 }
        ],
        2: [
          { name: 'Grooming Introduction', description: 'Basic grooming activities', bond: +4, stress: -1 },
          { name: 'Hoof Handling', description: 'Hoof care and handling', bond: +2, stress: +3 },
          { name: 'Medical Check', description: 'Health examination', bond: +1, stress: +4 }
        ],
        3: [
          { name: 'Trailer Exposure', description: 'Introduction to trailer', bond: +3, stress: +5 },
          { name: 'Obstacle Introduction', description: 'Simple obstacle course', bond: +4, stress: +3 },
          { name: 'Social Interaction', description: 'Interaction with other horses', bond: +5, stress: -2 }
        ]
      };
      
      // Determine current development day (mock)
      const developmentDay = Math.floor(Math.random() * 4);
      const availableActivities = enrichmentActivities[developmentDay] || [];
      
      return res.status(200).json(ApiResponse.success(
        'Available activities retrieved successfully',
        {
          foalId: foalId,
          foalName: foal.name,
          developmentDay: developmentDay,
          activities: availableActivities
        }
      ));
      
    } catch (error) {
      logger.error('[foalRoutes] Error getting foal activities:', error);
      return res.status(500).json(ApiResponse.serverError('Failed to retrieve foal activities'));
    }
  }
);

/**
 * POST /api/foals/:foalId/enrichment
 * Complete an enrichment activity for a foal
 */
router.post('/:foalId/enrichment',
  // Authentication required
  authenticateToken,
  
  // Validation middleware
  param('foalId')
    .isInt({ min: 1 })
    .withMessage('Foal ID must be a positive integer'),
  
  body('activity')
    .notEmpty()
    .isString()
    .withMessage('Activity is required and must be a string'),
  
  // Security middleware
  requireOwnership('horse'),
  preventDuplication('foal_enrichment'),
  auditLog('foal_enrichment', 'medium'),
  
  async (req, res) => {
    try {
      // Check validation results
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json(ApiResponse.badRequest('Validation failed', {
          errors: errors.array()
        }));
      }

      const foalId = parseInt(req.params.foalId);
      const { activity } = req.body;
      
      logger.info(`[foalRoutes] User ${req.user.id} completing enrichment activity '${activity}' for foal ${foalId}`);
      
      // Get foal information
      const foal = await prisma.horse.findUnique({
        where: { id: foalId },
        select: {
          id: true,
          name: true,
          age: true,
          bond_score: true,
          stress_level: true,
          playerId: true,
          ownerId: true
        }
      });
      
      if (!foal) {
        return res.status(404).json(ApiResponse.notFound('Foal not found'));
      }
      
      // Verify it's actually a foal (age <= 1)
      if (foal.age > 1) {
        return res.status(400).json(ApiResponse.badRequest('Horse is not a foal (age > 1 year)'));
      }
      
      // Mock enrichment activities by day
      const enrichmentActivities = {
        0: ['Feeding Assistance', 'Gentle Touch', 'Voice Introduction'],
        1: ['Leading Practice', 'Halter Introduction', 'Basic Commands'],
        2: ['Grooming Introduction', 'Hoof Handling', 'Medical Check'],
        3: ['Trailer Exposure', 'Obstacle Introduction', 'Social Interaction'],
        4: ['Advanced Leading', 'Tack Introduction', 'Ground Work'],
        5: ['Riding Preparation', 'Saddle Introduction', 'Advanced Commands'],
        6: ['Final Assessment', 'Graduation Ceremony', 'Adult Transition']
      };
      
      // Determine current development day (mock - replace with actual logic)
      const developmentDay = Math.floor(Math.random() * 7);
      
      // Check if activity is appropriate for current day
      const dayActivities = enrichmentActivities[developmentDay] || [];
      const activityNormalized = activity.toLowerCase().replace(/[_\s]/g, '');
      const isValidActivity = dayActivities.some(dayActivity => 
        dayActivity.toLowerCase().replace(/[_\s]/g, '') === activityNormalized
      );
      
      if (!isValidActivity) {
        return res.status(400).json(ApiResponse.badRequest(
          `Activity '${activity}' is not appropriate for day ${developmentDay}. Available activities: ${dayActivities.join(', ')}`
        ));
      }
      
      // Calculate bond and stress changes based on activity
      const activityEffects = {
        'feeding assistance': { bond: +5, stress: -2 },
        'gentle touch': { bond: +3, stress: -1 },
        'voice introduction': { bond: +2, stress: -1 },
        'leading practice': { bond: +4, stress: +1 },
        'halter introduction': { bond: +3, stress: +2 },
        'basic commands': { bond: +2, stress: +1 },
        'grooming introduction': { bond: +4, stress: -1 },
        'hoof handling': { bond: +2, stress: +3 },
        'medical check': { bond: +1, stress: +4 },
        'trailer exposure': { bond: +3, stress: +5 },
        'obstacle introduction': { bond: +4, stress: +3 },
        'social interaction': { bond: +5, stress: -2 }
      };
      
      const effects = activityEffects[activityNormalized] || { bond: +2, stress: +1 };
      
      // Calculate new bond and stress levels (clamped to 0-100)
      const currentBond = foal.bond_score || 50;
      const currentStress = foal.stress_level || 50;
      const newBond = Math.max(0, Math.min(100, currentBond + effects.bond));
      const newStress = Math.max(0, Math.min(100, currentStress + effects.stress));
      
      // Update foal in database
      const updatedFoal = await prisma.horse.update({
        where: { id: foalId },
        data: {
          bond_score: newBond,
          stress_level: newStress
        }
      });
      
      // Create training history record
      await prisma.foalTrainingHistory.create({
        data: {
          horse_id: foalId,
          activity_type: activity,
          development_day: developmentDay,
          bond_change: effects.bond,
          stress_change: effects.stress,
          completed_at: new Date()
        }
      }).catch(error => {
        // Log error but don't fail the request if history table doesn't exist
        logger.warn(`[foalRoutes] Could not create training history: ${error.message}`);
      });
      
      const result = {
        success: true,
        foalId: foalId,
        foalName: foal.name,
        activity: {
          name: activity,
          developmentDay: developmentDay,
          effects: effects
        },
        updated_levels: {
          bond_score: newBond,
          stress_level: newStress
        },
        changes: {
          bond_change: effects.bond,
          stress_change: effects.stress
        }
      };
      
      return res.status(200).json(ApiResponse.success(
        `${foal.name} completed ${activity} successfully!`,
        result
      ));
      
    } catch (error) {
      logger.error('[foalRoutes] Error completing enrichment activity:', error);
      return res.status(500).json(ApiResponse.serverError('Failed to complete enrichment activity'));
    }
  }
);

export default router; 