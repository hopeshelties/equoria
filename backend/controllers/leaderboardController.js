/**
 * Leaderboard Controller
 * Provides ranked lists of top-performing horses and users based on various metrics
 */

import prisma from '../db/index.js';
import logger from '../utils/logger.js';

// Helper function (inlined or imported from a shared utility if it exists elsewhere)
const calculateXpToNextLevel = (currentLevelXp) => { // currentLevelXp is user.xp
  const xpPerLevel = 100;
  return xpPerLevel - currentLevelXp;
};

const calculateTotalXpForLevel = (level) => { // This calculates the XP needed to REACH this level
  const xpPerLevel = 100;
  return (level - 1) * xpPerLevel;
};

/**
 * Get top users by level and XP
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getTopUsersByLevel = async(req, res) => {
  const { limit = 10, offset = 0 } = req.query;
  const numericLimit = parseInt(limit, 10);
  const numericOffset = parseInt(offset, 10);

  try {
    const users = await prisma.user.findMany({ // Correct: prisma.user
      take: numericLimit,
      skip: numericOffset,
      orderBy: [
        { level: 'desc' },
        { xp: 'desc' }
      ],
      select: {
        id: true,
        name: true,
        level: true,
        xp: true,
        money: true
      }
    });

    const totalUsers = await prisma.user.count(); // Correct: prisma.user

    const rankedUsers = users.map((user, index) => { // Correct: user
      const rank = numericOffset + index + 1;
      const xpToNext = calculateXpToNextLevel(user.xp); // Correct: pass user.xp
      const totalXp = calculateTotalXpForLevel(user.level) + user.xp; // Correct: pass user.level
      return {
        rank,
        userId: user.id, // Correct: userId
        name: user.name,
        level: user.level,
        xp: user.xp,
        xpToNext,
        money: user.money,
        totalXp
      };
    });

    res.json({
      success: true,
      message: 'Top users by level retrieved successfully',
      data: {
        users: rankedUsers, // Changed from players
        pagination: {
          limit: numericLimit,
          offset: numericOffset,
          total: totalUsers,
          hasMore: (numericOffset + numericLimit) < totalUsers
        }
      }
    });
  } catch (error) {
    logger.error(`[leaderboardController.getTopUsersByLevel] Error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve user level leaderboard', // Consistent with test
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

/**
 * Get top users by total XP earned
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getTopUsersByXP = async(req, res) => { // Should be getTopUsersByXP
  const { period = 'all', limit = 10, offset = 0 } = req.query;
  const numericLimit = parseInt(limit, 10);
  const numericOffset = parseInt(offset, 10);

  try {
    let whereClause = {};

    if (period !== 'all') {
      const now = new Date();
      switch (period) {
      case 'week':
        whereClause = { timestamp: { gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) } };
        break;
      case 'month':
        whereClause = { timestamp: { gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) } };
        break;
      case 'year':
        whereClause = { timestamp: { gte: new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000) } };
        break;
      }
    }

    const xpData = await prisma.xpEvent.groupBy({
      by: ['userId'], // Correct: userId
      _sum: { amount: true },
      where: whereClause,
      orderBy: {
        _sum: { amount: 'desc' }
      },
      take: numericLimit,
      skip: numericOffset
      // include was removed as it's not compatible with groupBy. User data fetched separately.
    });

    const totalRecords = await prisma.xpEvent.groupBy({
      by: ['userId'], // Correct: userId
      where: whereClause
    });

    // Fetch user names separately as include doesn't work with groupBy
    const userIds = xpData.map(item => item.userId);
    const users = await prisma.user.findMany({
      where: {
        id: { in: userIds }
      },
      select: {
        id: true,
        name: true
      }
    });
    const userMap = users.reduce((acc, user) => {
      acc[user.id] = user.name;
      return acc;
    }, {});

    const rankedUsers = xpData.map((item, index) => ({
      rank: numericOffset + index + 1,
      userId: item.userId, // Correct: userId
      name: userMap[item.userId] || 'Unknown User', // Use mapped user name
      totalXp: item._sum.amount
    }));

    res.json({
      success: true,
      message: `Top users by XP (${period}) retrieved successfully`,
      data: {
        users: rankedUsers, // Changed from players
        pagination: {
          limit: numericLimit,
          offset: numericOffset,
          total: totalRecords.length,
          hasMore: (numericOffset + numericLimit) < totalRecords.length
        }
      }
    });
  } catch (error) {
    logger.error(`[leaderboardController.getTopUsersByXP] Error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve user XP leaderboard',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

/**
 * Get top horses by total earnings
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getTopHorsesByEarnings = async(req, res) => {
  const { limit = 10, offset = 0, breed } = req.query;
  const numericLimit = parseInt(limit, 10);
  const numericOffset = parseInt(offset, 10);

  try {
    const whereClause = {};
    if (breed) {
      whereClause.breed = { name: breed }; // Use the breed query parameter
    }

    const horses = await prisma.horse.findMany({
      where: whereClause, // Apply the whereClause
      take: numericLimit,
      skip: numericOffset,
      orderBy: {
        total_earnings: 'desc'
      },
      select: {
        id: true,
        name: true,
        total_earnings: true,
        userId: true, // Correct: userId
        user: { // Correct: user
          select: { name: true }
        },
        breed: {
          select: { name: true }
        }
      }
    });

    const totalHorses = await prisma.horse.count({
      where: { // Consider applying the breed filter here too for accurate total
        ...whereClause,
        total_earnings: {
          gt: 0 // Only horses with earnings
        }
      }
    });

    const rankings = horses.map((horse, index) => ({
      rank: numericOffset + index + 1,
      horseId: horse.id,
      name: horse.name,
      earnings: horse.total_earnings,
      breed: horse.breed?.name || 'Unknown',
      owner: {
        id: horse.userId,
        name: horse.user?.name || 'Unknown Owner'
      }
    }));

    res.json({
      success: true,
      message: 'Top horses by earnings retrieved successfully',
      data: {
        rankings,
        pagination: {
          limit: numericLimit,
          offset: numericOffset,
          total: totalHorses,
          hasMore: (numericOffset + numericLimit) < totalHorses
        }
      }
    });

  } catch (error) {
    logger.error(`[leaderboardController.getTopHorsesByEarnings] Error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve horse earnings leaderboard',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

/**
 * Get top horses by competition performance (wins, placements)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getTopHorsesByPerformance = async(req, res) => {
  const { type = 'wins', limit = 10, offset = 0, discipline } = req.query;
  const numericLimit = parseInt(limit, 10);
  const numericOffset = parseInt(offset, 10);

  try {
    let orderDirection; // Not strictly needed for count-based ordering with Prisma
    const queryWhereClause = {};

    if (discipline) {
      queryWhereClause.discipline = discipline;
    }

    switch (type) {
    case 'wins':
      queryWhereClause.placement = 1;
      // orderDirection for Prisma's _count is implicitly 'desc' for highest count
      break;
    case 'placements':
      queryWhereClause.placement = { lte: 3 };
      // orderDirection for Prisma's _count is implicitly 'desc'
      break;
    case 'averageScore':
      orderDirection = 'desc'; // For _avg.score
      break;
    default:
      return res.status(400).json({ success: false, message: 'Invalid metric type. Must be wins, placements, or averageScore' });
    }

    const performanceData = await prisma.competitionResult.groupBy({
      by: ['horseId'],
      _count: { id: true }, // Counts competition results for the horse
      _avg: { score: type === 'averageScore' ? true : undefined },
      where: queryWhereClause,
      orderBy: type === 'averageScore' ? { _avg: { score: orderDirection } } : { _count: { id: 'desc' } },
      take: numericLimit,
      skip: numericOffset
    });

    // Count total records matching the criteria for pagination
    const totalGroupedRecords = await prisma.competitionResult.groupBy({
      by: ['horseId'],
      where: queryWhereClause
    });
    const totalRecords = totalGroupedRecords.length;

    const rankings = await Promise.all(performanceData.map(async(entry, index) => {
      const horse = await prisma.horse.findUnique({
        where: { id: entry.horseId },
        select: { name: true, breed: { select: { name: true } }, user: { select: { name: true } }, total_earnings: true, userId: true }
      });

      const ranking = {
        rank: numericOffset + index + 1,
        horseId: entry.horseId,
        name: horse?.name || 'Unknown Horse',
        breed: horse?.breed?.name || 'Unknown',
        earnings: horse?.total_earnings || 0,
        owner: {
          id: horse?.userId,
          name: horse?.user?.name || 'Unknown Owner'
        },
        metric: type,
        value: 0
      };

      switch (type) {
      case 'wins':
      case 'placements':
        ranking.value = entry._count.id;
        if (type === 'wins') {
          ranking.wins = entry._count.id;
        }
        if (type === 'placements') {
          ranking.placements = entry._count.id;
        }
        break;
      case 'averageScore':
        ranking.averageScore = entry._avg.score ? Math.round(entry._avg.score * 10) / 10 : 0;
        ranking.value = ranking.averageScore;
        break;
      }
      return ranking;
    }));

    res.json({
      success: true,
      message: `Top horses by ${type} retrieved successfully`,
      data: {
        rankings,
        metric: type,
        pagination: {
          limit: numericLimit,
          offset: numericOffset,
          total: totalRecords,
          hasMore: (numericOffset + numericLimit) < totalRecords
        }
      }
    });

  } catch (error) {
    logger.error(`[leaderboardController.getTopHorsesByPerformance] Error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve horse performance leaderboard',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

/**
 * Get top users by horse earnings (sum of all owned horses' earnings)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getTopUsersByHorseEarnings = async(req, res) => { // Should be getTopUsersByHorseEarnings
  const { limit = 10, offset = 0 } = req.query;
  const numericLimit = parseInt(limit, 10);
  const numericOffset = parseInt(offset, 10);

  try {
    const userEarnings = await prisma.horse.groupBy({
      by: ['userId'], // Correct: userId
      _sum: { total_earnings: true },
      _count: { id: true }, // Count of horses
      where: {
        total_earnings: { gt: 0 }
      },
      orderBy: {
        _sum: { total_earnings: 'desc' }
      },
      take: numericLimit,
      skip: numericOffset
      // include was removed as it's not compatible with groupBy. User data fetched separately.
    });

    // Fetch user data separately
    const userIds = userEarnings.map(item => item.userId);
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true }
    });
    const userMap = users.reduce((acc, user) => {
      acc[user.id] = user.name;
      return acc;
    }, {});

    const totalRecords = await prisma.horse.groupBy({
      by: ['userId'], // Correct: userId
      where: {
        total_earnings: { gt: 0 }
      }
    });

    const rankedUsers = userEarnings.map((item, index) => ({
      rank: numericOffset + index + 1,
      userId: item.userId, // Correct: userId
      name: userMap[item.userId] || 'Unknown User', // Changed from item.user.name
      totalHorseEarnings: item._sum.total_earnings,
      horseCount: item._count.id
    }));

    res.json({
      success: true,
      message: 'Top users by combined horse earnings retrieved successfully',
      data: {
        users: rankedUsers, // Changed from players
        pagination: {
          limit: numericLimit,
          offset: numericOffset,
          total: totalRecords.length,
          hasMore: (numericOffset + numericLimit) < totalRecords.length
        }
      }
    });
  } catch (error) {
    logger.error(`[leaderboardController.getTopUsersByHorseEarnings] Error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve user horse earnings leaderboard',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

/**
 * Get recent competition winners across all disciplines
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getRecentWinners = async(req, res) => {
  const { limit = 10, offset = 0, discipline = 'all' } = req.query;
  const numericLimit = parseInt(limit, 10);
  const numericOffset = parseInt(offset, 10);

  try {
    const whereClause = {
      placement: 1
    };

    if (discipline !== 'all') {
      whereClause.discipline = discipline;
    }

    // Count total records for pagination
    const totalWinners = await prisma.competitionEntry.count({
      where: whereClause
    });

    const recentWinners = await prisma.competitionEntry.findMany({
      where: whereClause,
      select: {
        id: true,
        horse: {
          select: {
            name: true,
            user: { // Correct: user
              select: { name: true }
            }
          }
        },
        showName: true,
        runDate: true,
        discipline: true,
        prizeWon: true
      },
      orderBy: {
        runDate: 'desc'
      },
      take: numericLimit,
      skip: numericOffset
    });

    const formattedWinners = recentWinners.map(entry => {
      const { horse } = entry;
      return {
        id: entry.id,
        horseName: horse?.name || 'Unknown Horse',
        ownerName: horse?.user?.name || 'Unknown Owner', // Changed from horse?.user?.name
        showName: entry.showName,
        discipline: entry.discipline,
        date: entry.runDate,
        prize: entry.prizeWon || 0
      };
    });

    res.json({
      success: true,
      message: 'Recent competition winners retrieved successfully',
      data: {
        winners: formattedWinners,
        discipline: discipline === 'all' ? 'All Disciplines' : discipline,
        pagination: { // Added pagination
          limit: numericLimit,
          offset: numericOffset,
          total: totalWinners,
          hasMore: (numericOffset + numericLimit) < totalWinners
        }
      }
    });

  } catch (error) {
    logger.error(`[leaderboardController.getRecentWinners] Error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve recent winners',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

/**
 * Get overall leaderboard statistics
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getLeaderboardStats = async(req, res) => {
  try {
    const userCount = await prisma.user.count(); // Correct: prisma.user
    const horseCount = await prisma.horse.count();
    const showCount = await prisma.competitionEntry.count();
    const totalEarnings = await prisma.horse.aggregate({
      _sum: { total_earnings: true }
    });
    const totalXpSum = await prisma.xpEvent.aggregate({
      _sum: { amount: true }
    });
    const totalXp = totalXpSum._sum.amount || 0;

    // Calculate average user level
    const usersForLevelAvg = await prisma.user.findMany({ // Correct: prisma.user
      select: { level: true }
    });
    const averageUserLevel = usersForLevelAvg.length > 0
      ? parseFloat((usersForLevelAvg.reduce((acc, u) => acc + u.level, 0) / usersForLevelAvg.length).toFixed(2))
      : 0;

    res.json({
      success: true,
      message: 'Leaderboard statistics retrieved successfully',
      data: {
        userCount, // Was playerCount
        horseCount,
        showCount,
        totalEarnings,
        totalXp,
        averageUserLevel // Was avgLevel
      }
    });
  } catch (error) {
    logger.error(`[leaderboardController.getLeaderboardStats] Error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve leaderboard statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Add alias for backward compatibility
export const getTopPlayersByHorseEarnings = getTopUsersByHorseEarnings;

// Default export with all controller functions
export default {
  getTopUsersByLevel,
  getTopUsersByXP,
  getTopHorsesByEarnings,
  getTopHorsesByPerformance,
  getTopUsersByHorseEarnings,
  getTopPlayersByHorseEarnings, // Add alias to default export
  getRecentWinners,
  getLeaderboardStats
};
