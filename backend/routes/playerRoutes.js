/**
 * Player Routes
 * API endpoints for player-related operations
 */

import express from 'express';
import { param, validationResult } from 'express-validator';
import { getPlayerProgress, getDashboardData } from '../controllers/playerController.js';
import logger from '../utils/logger.js';

const router = express.Router();

/**
 * Validation middleware for player ID parameter
 */
const validatePlayerId = [
  param('id')
    .isLength({ min: 1, max: 50 })
    .withMessage('Player ID must be between 1 and 50 characters')
    .notEmpty()
    .withMessage('Player ID is required'),

  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn(`[playerRoutes] Validation errors: ${JSON.stringify(errors.array())}`);
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
 * @swagger
 * /api/player/{id}/progress:
 *   get:
 *     summary: Get player progress information
 *     tags: [Player]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Player ID
 *     responses:
 *       200:
 *         description: Player progress retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Player progress retrieved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     playerId:
 *                       type: string
 *                       example: "123e4567-e89b-12d3-a456-426614174000"
 *                     name:
 *                       type: string
 *                       example: "Alex"
 *                     level:
 *                       type: integer
 *                       example: 4
 *                     xp:
 *                       type: integer
 *                       example: 230
 *                     xpToNextLevel:
 *                       type: integer
 *                       example: 70
 *       400:
 *         description: Validation error
 *       404:
 *         description: Player not found
 *       500:
 *         description: Internal server error
 */
router.get('/:id/progress', validatePlayerId, getPlayerProgress);

/**
 * @swagger
 * /api/player/dashboard/{playerId}:
 *   get:
 *     summary: Get player dashboard data
 *     tags: [Player]
 *     parameters:
 *       - in: path
 *         name: playerId
 *         required: true
 *         schema:
 *           type: string
 *         description: Player ID
 *     responses:
 *       200:
 *         description: Dashboard data retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Dashboard data retrieved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     player:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           example: "123e4567-e89b-12d3-a456-426614174000"
 *                         name:
 *                           type: string
 *                           example: "Alex"
 *                         level:
 *                           type: integer
 *                           example: 4
 *                         xp:
 *                           type: integer
 *                           example: 230
 *                         money:
 *                           type: integer
 *                           example: 4250
 *                     horses:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: integer
 *                           example: 12
 *                         trainable:
 *                           type: integer
 *                           example: 4
 *                     shows:
 *                       type: object
 *                       properties:
 *                         upcomingEntries:
 *                           type: integer
 *                           example: 3
 *                         nextShowRuns:
 *                           type: array
 *                           items:
 *                             type: string
 *                             format: date-time
 *                           example: ["2025-06-05T10:00:00.000Z", "2025-06-06T14:30:00.000Z"]
 *                     recent:
 *                       type: object
 *                       properties:
 *                         lastTrained:
 *                           type: string
 *                           format: date-time
 *                           example: "2025-06-03T17:00:00.000Z"
 *                         lastShowPlaced:
 *                           type: object
 *                           properties:
 *                             horseName:
 *                               type: string
 *                               example: "Nova"
 *                             placement:
 *                               type: string
 *                               example: "2nd"
 *                             show:
 *                               type: string
 *                               example: "Spring Gala - Dressage"
 *       400:
 *         description: Validation error
 *       404:
 *         description: Player not found
 *       500:
 *         description: Internal server error
 */
router.get('/dashboard/:playerId', [
  param('playerId')
    .isLength({ min: 1, max: 50 })
    .withMessage('Player ID must be between 1 and 50 characters')
    .notEmpty()
    .withMessage('Player ID is required'),

  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn(`[playerRoutes] Dashboard validation errors: ${JSON.stringify(errors.array())}`);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }
    next();
  }
], getDashboardData);

export default router;
