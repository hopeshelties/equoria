/**
 * Leaderboard Controller
 * Provides ranked lists of top-performing horses and players based on various metrics
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
 * Get top players by level and XP
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getTopPlayersByLevel = async(req, res) => {
  const { limit = 10, offset = 0 } = req.query;
  const numericLimit = parseInt(limit, 10);
  const numericOffset = parseInt(offset, 10);

  try {
    const users = await prisma.user.findMany({ // Changed from prisma.player
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

    const totalUsers = await prisma.user.count(); // Changed from prisma.player

    const rankedUsers = users.map((user, index) => { // Changed from player
      const rank = numericOffset + index + 1;
      // const xpToNext = calculateXpToNextLevel(user.level) - user.xp; // Original logic was incorrect
      const xpToNext = calculateXpToNextLevel(user.xp); // Corrected: pass user.xp
      const totalXp = calculateTotalXpForLevel(user.level) + user.xp; // Corrected: pass user.level
      return {
        rank,
        userId: user.id, // Changed from playerId
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
      message: 'Top players by level retrieved successfully',
      data: {
        players: rankedUsers, // Consider changing "players" to "users" for consistency, though this is a breaking API change
        pagination: {
          limit: numericLimit,
          offset: numericOffset,
          total: totalUsers,
          hasMore: (numericOffset + numericLimit) < totalUsers
        }
      }
    });
  } catch (error) {
    logger.error(`[leaderboardController.getTopPlayersByLevel] Error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve player level leaderboard',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

/**
 * Get top players by total XP earned
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getTopPlayersByXP = async(req, res) => {
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
      by: ['userId'], // Changed from playerId
      _sum: { amount: true },
      where: whereClause,
      orderBy: {
        _sum: { amount: 'desc' }
      },
      take: numericLimit,
      skip: numericOffset,
      include: {
        user: { // Changed from player
          select: { name: true }
        }
      }
    });

    const totalRecords = await prisma.xpEvent.groupBy({
      by: ['userId'], // Changed from playerId
      where: whereClause
    });

    const rankedPlayers = xpData.map((item, index) => ({
      rank: numericOffset + index + 1,
      userId: item.userId, // Changed from playerId
      name: item.user.name, // Changed from item.player.name
      totalXp: item._sum.amount
    }));

    res.json({
      success: true,
      message: `Top players by XP (${period}) retrieved successfully`,
      data: {
        players: rankedPlayers, // Consider changing "players" to "users"
        pagination: {
          limit: numericLimit,
          offset: numericOffset,
          total: totalRecords.length,
          hasMore: (numericOffset + numericLimit) < totalRecords.length
        }
      }
    });
  } catch (error) {
    logger.error(`[leaderboardController.getTopPlayersByXP] Error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve player XP leaderboard',
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
  const { limit = 10, offset = 0 } = req.query;
  const numericLimit = parseInt(limit, 10);
  const numericOffset = parseInt(offset, 10);

  try {
    const horses = await prisma.horse.findMany({
      select: {
        id: true,
        name: true,
        total_earnings: true,
        userId: true, // Changed from playerId
        user: { // Changed from player
          select: { name: true }
        },
        breed: {
          select: { name: true }
        }
      }
    });

    const totalHorses = await prisma.horse.count({
      where: {
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
  const { type = 'wins', limit = 10, offset = 0 } = req.query;
  const numericLimit = parseInt(limit, 10);
  const numericOffset = parseInt(offset, 10);

  try {
    let performanceField;
    let orderDirection = 'desc';

    switch (type) {
    case 'wins':
      performanceField = 'placement';
      orderDirection = 'asc'; // Wins should be ranked 1st, 2nd, 3rd, etc.
      break;
    case 'placements':
      performanceField = 'placement';
      orderDirection = 'asc'; // Placements should be ranked 1st, 2nd, 3rd, etc.
      break;
    case 'averageScore':
      performanceField = 'score';
      orderDirection = 'desc'; // Higher scores are better
      break;
    default:
      throw new Error('Invalid metric type. Must be wins, placements, or averageScore');
    }

    const performanceData = await prisma.competitionResult.groupBy({
      by: ['horseId'],
      where: {
        [performanceField]: {
          not: null
        }
      },
      _count: performanceField === 'placement' ? true : undefined,
      _avg: performanceField === 'score' ? { score: true } : undefined,
      orderBy: {
        [performanceField]: orderDirection
      },
      take: numericLimit,
      skip: numericOffset,
      include: {
        horse: {
          select: {
            name: true,
            user: { select: { name: true } }, // Changed from player
            breed: { select: { name: true } }
          }
        }
      }
    });

    const totalRecords = await prisma.competitionResult.count({
      where: {
        [performanceField]: {
          not: null
        }
      }
    });

    const rankings = performanceData.map((entry, index) => {
      const horse = entry.horse;
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
        metric: type
      };

      // Add metric-specific data
      switch (type) {
      case 'wins':
        ranking.wins = entry._count;
        ranking.value = entry._count;
        break;
      case 'placements':
        ranking.placements = entry._count;
        ranking.value = entry._count;
        break;
      case 'averageScore':
        ranking.averageScore = Math.round((entry._avg.score || 0) * 10) / 10;
        ranking.value = ranking.averageScore;
        break;
      }

      return ranking;
    });

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
 * Get top players by horse earnings (sum of all owned horses' earnings)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getTopPlayersByHorseEarnings = async(req, res) => {
  const { limit = 10, offset = 0 } = req.query;
  const numericLimit = parseInt(limit, 10);
  const numericOffset = parseInt(offset, 10);

  try {
    const playerEarnings = await prisma.horse.groupBy({
      by: ['userId'], // Changed from playerId
      _sum: { total_earnings: true },
      _count: { id: true }, // Count of horses
      where: {
        total_earnings: { gt: 0 }
      },
      orderBy: {
        _sum: { total_earnings: 'desc' }
      },
      take: numericLimit,
      skip: numericOffset,
      include: {
        user: { // Changed from player
          select: { name: true }
        }
      }
    });

    const totalRecords = await prisma.horse.groupBy({
      by: ['userId'], // Changed from playerId
      where: {
        total_earnings: { gt: 0 }
      }
    });

    const rankedPlayers = playerEarnings.map((item, index) => ({
      rank: numericOffset + index + 1,
      userId: item.userId, // Changed from playerId
      name: item.user.name, // Changed from item.player.name
      totalHorseEarnings: item._sum.total_earnings,
      horseCount: item._count.id
    }));

    res.json({
      success: true,
      message: 'Top players by combined horse earnings retrieved successfully',
      data: {
        players: rankedPlayers, // Consider changing "players" to "users"
        pagination: {
          limit: numericLimit,
          offset: numericOffset,
          total: totalRecords.length,
          hasMore: (numericOffset + numericLimit) < totalRecords.length
        }
      }
    });
  } catch (error) {
    logger.error(`[leaderboardController.getTopPlayersByHorseEarnings] Error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve player horse earnings leaderboard',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

/**
 * Get recent competition winners across all disciplines
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getRecentWinners = async (req, res) => {
  const { limit = 10, offset = 0, discipline = 'all' } = req.query; // Added discipline default
  const numericLimit = parseInt(limit, 10);
  const numericOffset = parseInt(offset, 10);

  try {
    let whereClause = {
      placement: 1
    };

    if (discipline !== 'all') {
      whereClause.discipline = discipline;
    }

    const recentWinners = await prisma.competitionEntry.findMany({
      where: whereClause,
      select: {
        id: true,
        horse: {
          select: {
            name: true,
            user: { // Changed from player
              select: { name: true }
            }
          }
        },
        showName: true,
        runDate: true,
        score: true,
        prizeWon: true
      },
      orderBy: {
        runDate: 'desc'
      },
      take: numericLimit,
      skip: numericOffset
    });

    const formattedWinners = recentWinners.map(entry => {
      const horse = entry.horse; // Simplified access
      return {
        id: entry.id,
        horseName: horse?.name || 'Unknown Horse',
        ownerName: horse?.user?.name || 'Unknown Owner', // Changed from player
        showName: entry.showName,
        discipline: entry.discipline, // Ensure this is part of the select if used
        date: entry.showDate, // Assuming showDate is the relevant date
        prize: entry.prizeMoney || 0
      };
    });

    res.json({
      success: true,
      message: 'Recent competition winners retrieved successfully',
      data: {
        winners: formattedWinners,
        discipline: discipline === 'all' ? 'All Disciplines' : discipline,
        count: formattedWinners.length
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
 * Get comprehensive leaderboard statistics and summary
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getLeaderboardStats = async (req, res) => {
  try {
    logger.info('[leaderboardController.getLeaderboardStats] Fetching leaderboard statistics');

    // Top player by level
    const topUserByLevel = await prisma.user.findFirst({ // Changed from player
      prisma.user.count(),

      // Total horses with earnings
      prisma.horse.count({ where: { total_earnings: { gt: 0 } } }),

      // Total competitions held
      prisma.competitionResult.count(),

      // Total prize money distributed
      prisma.competitionResult.aggregate({ _sum: { prizeWon: true } }),

      // Average player level
      prisma.user.aggregate({ _avg: { level: true } }),

      // Top player by level
      prisma.user.findFirst({
        select: { name: true, level: true, xp: true },
        orderBy: [{ level: 'desc' }, { xp: 'desc' }]
      }),

      // Top earning horse
      prisma.horse.findFirst({
        select: {
          name: true,
          total_earnings: true,
          user: { select: { name: true } }
        },
        where: { total_earnings: { gt: 0 } },
        orderBy: { total_earnings: 'desc' }
      }),

      // Recent activity (last 7 days)
      prisma.competitionResult.count({
        where: {
          runDate: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          }
        }
      })
    ]);

    // Get discipline breakdown
    const disciplineStats = await prisma.competitionResult.groupBy({
      by: ['discipline'],
      _count: { discipline: true },
      orderBy: { _count: { discipline: 'desc' } }
    });

    const stats = {
      overview: {
        totalPlayers,
        totalHorses,
        totalCompetitions,
        totalPrizeMoney: totalPrizeMoney._sum.prizeWon || 0,
        averagePlayerLevel: Math.round((averagePlayerLevel._avg.level || 1) * 10) / 10,
        recentActivity
      },
      topPerformers: {
        topPlayer: topPlayer ? {
          name: topPlayer.name,
          level: topPlayer.level,
          xp: topPlayer.xp,
          totalXp: (topPlayer.level - 1) * 100 + topPlayer.xp
        } : null,
        topHorse: topHorse ? {
          name: topHorse.name,
          earnings: topHorse.total_earnings,
          owner: topHorse.user?.name || 'Unknown'
        } : null
      },
      disciplines: disciplineStats.map(stat => ({
        discipline: stat.discipline,
        competitions: stat._count.discipline
      })),
      lastUpdated: new Date().toISOString()
    };

    res.json({
      success: true,
      message: 'Leaderboard statistics retrieved successfully',
      data: stats
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

// Default export with all controller functions
export default {
  getTopPlayersByLevel,
  getTopPlayersByXP,
  getTopHorsesByEarnings,
  getTopHorsesByPerformance,
  getTopPlayersByHorseEarnings,
  getRecentWinners,
  getLeaderboardStats
};
