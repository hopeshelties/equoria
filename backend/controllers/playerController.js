/**
 * Player Controller
 * Handles player-related API endpoints including progress tracking
 */

import { getPlayerById } from '../models/playerModel.js';
import { getTrainableHorses } from '../controllers/trainingController.js';
import prisma from '../db/index.js';
import logger from '../utils/logger.js';

/**
 * Get player progress information
 * Returns current level, XP, and XP needed to reach next level
 *
 * @route GET /player/:id/progress
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getPlayerProgress = async(req, res) => {
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

/**
 * Get dashboard data for a player
 * Returns player info, horse counts, upcoming shows, and recent activity
 *
 * @route GET /dashboard/:playerId
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getDashboardData = async(req, res) => {
  try {
    const { playerId } = req.params;

    logger.info(`[playerController.getDashboardData] Getting dashboard data for player ${playerId}`);

    // Validate player ID format (basic validation)
    if (!playerId || typeof playerId !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Valid player ID is required'
      });
    }

    // Get player basic info
    const player = await getPlayerById(playerId);
    if (!player) {
      logger.warn(`[playerController.getDashboardData] Player ${playerId} not found`);
      return res.status(404).json({
        success: false,
        message: 'Player not found'
      });
    }

    // Get horse counts
    const totalHorses = await prisma.horse.count({
      where: { playerId }
    });

    // Get trainable horses count
    let trainableHorsesCount = 0;
    try {
      const trainableHorses = await getTrainableHorses(playerId);
      trainableHorsesCount = trainableHorses.length;
    } catch (error) {
      logger.warn(`[playerController.getDashboardData] Error getting trainable horses: ${error.message}`);
      // Continue with 0 count if there's an error
    }

    // Get upcoming shows that player's horses could enter
    const upcomingShows = await prisma.show.findMany({
      where: {
        runDate: {
          gt: new Date() // Shows in the future
        }
      },
      orderBy: {
        runDate: 'asc'
      },
      take: 5 // Limit to next 5 shows
    });

    // Count upcoming entries (shows player's horses are entered in)
    const upcomingEntries = await prisma.competitionResult.count({
      where: {
        horse: {
          playerId
        },
        runDate: {
          gt: new Date()
        }
      }
    });

    // Get next show run dates
    const nextShowRuns = upcomingShows.slice(0, 2).map(show => show.runDate);

    // Get most recent training log for any of player's horses
    let lastTrained = null;
    try {
      const recentTraining = await prisma.trainingLog.findFirst({
        where: {
          horse: {
            playerId
          }
        },
        orderBy: {
          trainedAt: 'desc'
        }
      });
      lastTrained = recentTraining?.trainedAt || null;
    } catch (error) {
      logger.warn(`[playerController.getDashboardData] Error getting recent training: ${error.message}`);
    }

    // Get most recent show placement (1st-3rd) from competition results
    let lastShowPlaced = null;
    try {
      const recentPlacement = await prisma.competitionResult.findFirst({
        where: {
          horse: {
            playerId
          },
          placement: {
            in: ['1st', '2nd', '3rd']
          }
        },
        include: {
          horse: {
            select: {
              name: true
            }
          }
        },
        orderBy: {
          runDate: 'desc'
        }
      });

      if (recentPlacement) {
        lastShowPlaced = {
          horseName: recentPlacement.horse.name,
          placement: recentPlacement.placement,
          show: recentPlacement.showName
        };
      }
    } catch (error) {
      logger.warn(`[playerController.getDashboardData] Error getting recent placement: ${error.message}`);
    }

    // Prepare dashboard response
    const dashboardData = {
      player: {
        id: player.id,
        name: player.name,
        level: player.level,
        xp: player.xp,
        money: player.money
      },
      horses: {
        total: totalHorses,
        trainable: trainableHorsesCount
      },
      shows: {
        upcomingEntries,
        nextShowRuns
      },
      recent: {
        lastTrained,
        lastShowPlaced
      }
    };

    logger.info(`[playerController.getDashboardData] Successfully retrieved dashboard data for player ${player.name} (${totalHorses} horses, ${trainableHorsesCount} trainable)`);

    res.json({
      success: true,
      message: 'Dashboard data retrieved successfully',
      data: dashboardData
    });

  } catch (error) {
    logger.error(`[playerController.getDashboardData] Error getting dashboard data: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
  }
};
