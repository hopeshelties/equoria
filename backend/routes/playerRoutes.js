/**
 * Player Routes
 * API endpoints for player-related operations
 */

import express from 'express';
import { param, validationResult } from 'express-validator';
import { getPlayerProgress } from '../controllers/playerController.js';
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

export default router;
