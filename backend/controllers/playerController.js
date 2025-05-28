/**
 * Player Controller
 * Handles player-related API endpoints including progress tracking
 */

import { getPlayerById } from '../models/playerModel.js';
import { getTrainableHorses } from '../controllers/trainingController.js';
import prisma from '../db/index.js';
import logger from '../utils/logger.js';
import AppError from '../errors/AppError.js'; // Corrected path

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
export const getDashboardData = async(req, res, next) => { // Removed space
  const { playerId } = req.params;

  try {
    const player = await prisma.player.findUnique({ // Changed from prisma.user to prisma.player
      where: { id: playerId },
      select: { id: true, name: true, level: true, xp: true, money: true }
    });

    if (!player) {
      logger.warn(`[playerController.getDashboardData] Player ${playerId} not found`);
      // Use AppError for consistent error handling
      return next(new AppError('Player not found', 404));
    }

    // Get horse counts
    const totalHorses = await prisma.horse.count({
      where: { playerId }
    });

    // Get trainable horses count
    let trainableHorsesCount = 0;
    try {
      // Ensure playerId is passed correctly if getTrainableHorses expects it
      const trainableHorsesResult = await getTrainableHorses(playerId); // Assuming getTrainableHorses is robust
      trainableHorsesCount = trainableHorsesResult.length;
    } catch (error) {
      logger.error(`[playerController.getDashboardData] Error getting trainable horses for player ${playerId}: ${error.message}`, { error });
      // Decide if this is a critical failure or if dashboard can proceed with 0
      // For now, let's assume it's not critical and proceed with 0, but log it as an error.
      // If this error should halt the process, re-throw or call next(error)
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
        nextShowRuns // Ensure this is an array of dates or appropriate structure
      },
      activity: { // Changed 'recent' to 'activity' to match test expectations if any
        lastTrained,
        lastShowPlaced // Ensure this is an object or null as expected by tests
      }
    };

    logger.info(`[playerController.getDashboardData] Successfully retrieved dashboard data for player ${player.name} (${totalHorses} horses, ${trainableHorsesCount} trainable)`);

    res.status(200).json({ // Ensure status is 200 for success
      success: true,
      message: 'Dashboard data retrieved successfully',
      data: dashboardData
    });

  } catch (error) {
    logger.error(`[playerController.getDashboardData] Error getting dashboard data for player ${req.params.playerId}: ${error.message}`, { stack: error.stack });
    // Pass error to the global error handler
    next(error);
  }
};
