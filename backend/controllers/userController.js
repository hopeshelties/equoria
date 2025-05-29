/**
 * User Controller
 * Handles user-related API endpoints including progress tracking and dashboard
 */

import { getTrainableHorses } from '../controllers/trainingController.js';
import prisma from '../db/index.js';
import logger from '../utils/logger.js';
import AppError from '../errors/AppError.js';

/**
 * Get user progress information
 * Returns current level, XP, and XP needed to reach next level
 *
 * @route GET /user/:id/progress
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export const getUserProgress = async(req, res, next) => {
  try {
    const { id } = req.params;
    const userId = parseInt(id, 10);

    if (isNaN(userId)) {
      logger.warn(`[userController.getUserProgress] Invalid user ID format: ${id}`);
      return next(new AppError('Invalid user ID format', 400));
    }

    logger.info(`[userController.getUserProgress] Getting progress for user ${userId}`);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, level: true, xp: true }
    });

    if (!user) {
      logger.warn(`[userController.getUserProgress] User ${userId} not found`);
      return next(new AppError('User not found', 404));
    }

    // Calculate XP needed to reach next level
    // Formula: xpToNextLevel = 100 - (user.xp % 100)
    const xpToNextLevel = 100 - (user.xp % 100);

    // Prepare response data
    const progressData = {
      userId: user.id,
      name: user.name,
      level: user.level,
      xp: user.xp,
      xpToNextLevel
    };

    logger.info(`[userController.getUserProgress] Successfully retrieved progress for user ${user.name} (Level ${user.level}, XP: ${user.xp}/${user.xp + xpToNextLevel})`);

    res.json({
      success: true,
      message: 'User progress retrieved successfully',
      data: progressData
    });

  } catch (error) {
    logger.error(`[userController.getUserProgress] Error getting user progress: ${error.message}`);
    next(error); // Pass to global error handler
  }
};

/**
 * Get dashboard data for a user
 * Returns user info, horse counts, upcoming shows, and recent activity
 *
 * @route GET /dashboard/:userId
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export const getDashboardData = async(req, res, next) => {
  const { userId: userIdParam } = req.params;
  const userId = parseInt(userIdParam, 10);

  if (isNaN(userId)) {
    logger.warn(`[userController.getDashboardData] Invalid user ID format: ${userIdParam}`);
    return next(new AppError('Invalid user ID format', 400));
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, level: true, xp: true, money: true }
    });

    if (!user) {
      logger.warn(`[userController.getDashboardData] User ${userId} not found`);
      return next(new AppError('User not found', 404));
    }

    // Get horse counts
    const totalHorses = await prisma.horse.count({
      where: { userId }
    });

    // Get trainable horses count
    let trainableHorsesCount = 0;
    try {
      const trainableHorsesResult = await getTrainableHorses(userId);
      trainableHorsesCount = trainableHorsesResult.length;
    } catch (error) {
      logger.error(`[userController.getDashboardData] Error getting trainable horses for user ${userId}: ${error.message}`, { error });
      // Not critical, proceed with 0, but log error.
    }

    // Get upcoming shows that user's horses could enter
    const upcomingShows = await prisma.show.findMany({
      where: {
        runDate: {
          gt: new Date()
        }
      },
      orderBy: {
        runDate: 'asc'
      },
      take: 5
    });

    // Count upcoming entries (shows user's horses are entered in)
    const upcomingEntries = await prisma.competitionResult.count({
      where: {
        horse: {
          userId
        },
        runDate: {
          gt: new Date()
        }
      }
    });

    const nextShowRuns = upcomingShows.slice(0, 2).map(show => show.runDate);

    let lastTrained = null;
    try {
      const recentTraining = await prisma.trainingLog.findFirst({
        where: {
          horse: {
            userId
          }
        },
        orderBy: {
          trainedAt: 'desc'
        }
      });
      lastTrained = recentTraining?.trainedAt || null;
    } catch (error) {
      logger.warn(`[userController.getDashboardData] Error getting recent training for user ${userId}: ${error.message}`);
    }

    let lastShowPlaced = null;
    try {
      const recentPlacement = await prisma.competitionResult.findFirst({
        where: {
          horse: {
            userId
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
      logger.warn(`[userController.getDashboardData] Error getting recent placement for user ${userId}: ${error.message}`);
    }

    const dashboardData = {
      user: {
        id: user.id,
        name: user.name,
        level: user.level,
        xp: user.xp,
        money: user.money
      },
      horses: {
        total: totalHorses,
        trainable: trainableHorsesCount
      },
      shows: {
        upcomingEntries,
        nextShowRuns
      },
      activity: {
        lastTrained,
        lastShowPlaced
      }
    };

    logger.info(`[userController.getDashboardData] Successfully retrieved dashboard data for user ${user.name} (${totalHorses} horses, ${trainableHorsesCount} trainable)`);

    res.status(200).json({
      success: true,
      message: 'Dashboard data retrieved successfully',
      data: dashboardData
    });

  } catch (error) {
    logger.error(`[userController.getDashboardData] Error getting dashboard data for user ${userId}: ${error.message}`, { stack: error.stack });
    next(error);
  }
};
