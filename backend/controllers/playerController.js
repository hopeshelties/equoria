/**
 * Player Controller
 * Handles player-related API endpoints including progress tracking
 */

import { getPlayerById } from '../models/playerModel.js';
import logger from '../utils/logger.js';

/**
 * Get player progress information
 * Returns current level, XP, and XP needed to reach next level
 * 
 * @route GET /player/:id/progress
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getPlayerProgress = async (req, res) => {
  try {
    const { id } = req.params;

    logger.info(`[playerController.getPlayerProgress] Getting progress for player ${id}`);

    // Fetch player data using getPlayerById from playerModel
    const player = await getPlayerById(id);

    if (!player) {
      logger.warn(`[playerController.getPlayerProgress] Player ${id} not found`);
      return res.status(404).json({
        success: false,
        message: 'Player not found'
      });
    }

    // Calculate XP needed to reach next level
    // Formula: xpToNextLevel = 100 - (player.xp % 100)
    const xpToNextLevel = 100 - (player.xp % 100);

    // Prepare response data
    const progressData = {
      playerId: player.id,
      name: player.name,
      level: player.level,
      xp: player.xp,
      xpToNextLevel
    };

    logger.info(`[playerController.getPlayerProgress] Successfully retrieved progress for player ${player.name} (Level ${player.level}, XP: ${player.xp}/${player.xp + xpToNextLevel})`);

    res.json({
      success: true,
      message: 'Player progress retrieved successfully',
      data: progressData
    });

  } catch (error) {
    logger.error(`[playerController.getPlayerProgress] Error getting player progress: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
  }
};
