/**
 * Leaderboard Controller
 * Provides ranked lists of top-performing horses and players based on various metrics
 */

import prisma from '../db/index.js';
import logger from '../utils/logger.js';

/**
 * Get top players by level and XP
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getTopPlayersByLevel = async(req, res) => {
  try {
    const { limit = 10, offset = 0 } = req.query;
    const parsedLimit = Math.min(parseInt(limit, 10) || 10, 100); // Cap at 100
    const parsedOffset = parseInt(offset, 10) || 0;

    logger.info(`[leaderboardController.getTopPlayersByLevel] Getting top ${parsedLimit} players by level`);

    const players = await prisma.player.findMany({
      select: {
        id: true,
        name: true,
        level: true,
        xp: true,
        money: true
      },
      orderBy: [
        { level: 'desc' },
        { xp: 'desc' }
      ],
      take: parsedLimit,
      skip: parsedOffset
    });

    // Calculate ranking and XP progress
    const rankings = players.map((player, index) => ({
      rank: parsedOffset + index + 1,
      playerId: player.id,
      name: player.name,
      level: player.level,
      xp: player.xp,
      xpToNext: 100 - (player.xp % 100),
      money: player.money,
      totalXp: (player.level - 1) * 100 + player.xp
    }));

    res.json({
      success: true,
      message: 'Top players by level retrieved successfully',
      data: {
        rankings,
        pagination: {
          limit: parsedLimit,
          offset: parsedOffset,
          total: rankings.length
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
  try {
    const { limit = 10, offset = 0, period = 'all' } = req.query;
    const parsedLimit = Math.min(parseInt(limit, 10) || 10, 100);
    const parsedOffset = parseInt(offset, 10) || 0;

    logger.info(`[leaderboardController.getTopPlayersByXP] Getting top ${parsedLimit} players by XP (period: ${period})`);

    // Calculate date filter for period
    let dateFilter = {};
    if (period !== 'all') {
      const now = new Date();
      switch (period) {
      case 'week':
        dateFilter = { gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) };
        break;
      case 'month':
        dateFilter = { gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) };
        break;
      case 'year':
        dateFilter = { gte: new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000) };
        break;
      }
    }

    // Get XP data using aggregation
    const xpData = await prisma.xpEvent.groupBy({
      by: ['playerId'],
      where: period !== 'all' ? { timestamp: dateFilter } : {},
      _sum: {
        amount: true
      },
      orderBy: {
        _sum: {
          amount: 'desc'
        }
      },
      take: parsedLimit,
      skip: parsedOffset
    });

    // Get player details for the top XP earners
    const playerIds = xpData.map(entry => entry.playerId);
    const players = await prisma.player.findMany({
      where: { id: { in: playerIds } },
      select: {
        id: true,
        name: true,
        level: true,
        xp: true
      }
    });

    // Create player lookup map
    const playerMap = players.reduce((map, player) => {
      map[player.id] = player;
      return map;
    }, {});

    // Build rankings with XP data
    const rankings = xpData.map((entry, index) => {
      const player = playerMap[entry.playerId];
      return {
        rank: parsedOffset + index + 1,
        playerId: entry.playerId,
        name: player?.name || 'Unknown Player',
        level: player?.level || 1,
        currentXp: player?.xp || 0,
        xpEarned: Math.max(0, entry._sum.amount || 0), // Only positive XP
        totalXp: player ? (player.level - 1) * 100 + player.xp : 0,
        period
      };
    });

    res.json({
      success: true,
      message: `Top players by XP (${period}) retrieved successfully`,
      data: {
        rankings,
        period,
        pagination: {
          limit: parsedLimit,
          offset: parsedOffset,
          total: rankings.length
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
  try {
    const { limit = 10, offset = 0 } = req.query;
    const parsedLimit = Math.min(parseInt(limit, 10) || 10, 100);
    const parsedOffset = parseInt(offset, 10) || 0;

    logger.info(`[leaderboardController.getTopHorsesByEarnings] Getting top ${parsedLimit} horses by earnings`);

    const horses = await prisma.horse.findMany({
      select: {
        id: true,
        name: true,
        total_earnings: true,
        breed: {
          select: {
            name: true
          }
        },
        player: {
          select: {
            id: true,
            name: true
          }
        }
      },
      where: {
        total_earnings: {
          gt: 0 // Only horses with earnings
        }
      },
      orderBy: {
        total_earnings: 'desc'
      },
      take: parsedLimit,
      skip: parsedOffset
    });

    const rankings = horses.map((horse, index) => ({
      rank: parsedOffset + index + 1,
      horseId: horse.id,
      name: horse.name,
      earnings: horse.total_earnings,
      breed: horse.breed?.name || 'Unknown',
      owner: {
        id: horse.player?.id,
        name: horse.player?.name || 'Unknown Owner'
      }
    }));

    res.json({
      success: true,
      message: 'Top horses by earnings retrieved successfully',
      data: {
        rankings,
        pagination: {
          limit: parsedLimit,
          offset: parsedOffset,
          total: rankings.length
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
  try {
    const { limit = 10, offset = 0, metric = 'wins', discipline = 'all' } = req.query;
    const parsedLimit = Math.min(parseInt(limit, 10) || 10, 100);
    const parsedOffset = parseInt(offset, 10) || 0;

    logger.info(`[leaderboardController.getTopHorsesByPerformance] Getting top ${parsedLimit} horses by ${metric} (discipline: ${discipline})`);

    // Build where clause
    const whereClause = {};
    if (discipline !== 'all') {
      whereClause.discipline = discipline;
    }

    // Different aggregation based on metric
    let orderBy = {};
    let selectFields = {};

    switch (metric) {
    case 'wins':
      whereClause.placement = '1st';
      selectFields = { wins: { _count: true } };
      orderBy = { _count: 'desc' };
      break;
    case 'placements':
      whereClause.placement = { in: ['1st', '2nd', '3rd'] };
      selectFields = { placements: { _count: true } };
      orderBy = { _count: 'desc' };
      break;
    case 'averageScore':
      selectFields = { averageScore: { _avg: { score: true } } };
      orderBy = { _avg: { score: 'desc' } };
      break;
    default:
      throw new Error('Invalid metric. Must be wins, placements, or averageScore');
    }

    // Get performance data
    const performanceData = await prisma.competitionResult.groupBy({
      by: ['horseId'],
      where: whereClause,
      _count: metric === 'wins' || metric === 'placements' ? true : undefined,
      _avg: metric === 'averageScore' ? { score: true } : undefined,
      orderBy,
      take: parsedLimit,
      skip: parsedOffset
    });

    // Get horse details
    const horseIds = performanceData.map(entry => entry.horseId);
    const horses = await prisma.horse.findMany({
      where: { id: { in: horseIds } },
      select: {
        id: true,
        name: true,
        total_earnings: true,
        breed: {
          select: {
            name: true
          }
        },
        player: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    // Create horse lookup map
    const horseMap = horses.reduce((map, horse) => {
      map[horse.id] = horse;
      return map;
    }, {});

    // Build rankings
    const rankings = performanceData.map((entry, index) => {
      const horse = horseMap[entry.horseId];
      const ranking = {
        rank: parsedOffset + index + 1,
        horseId: entry.horseId,
        name: horse?.name || 'Unknown Horse',
        breed: horse?.breed?.name || 'Unknown',
        earnings: horse?.total_earnings || 0,
        owner: {
          id: horse?.player?.id,
          name: horse?.player?.name || 'Unknown Owner'
        },
        metric,
        discipline: discipline === 'all' ? 'All Disciplines' : discipline
      };

      // Add metric-specific data
      switch (metric) {
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
      message: `Top horses by ${metric} retrieved successfully`,
      data: {
        rankings,
        metric,
        discipline: discipline === 'all' ? 'All Disciplines' : discipline,
        pagination: {
          limit: parsedLimit,
          offset: parsedOffset,
          total: rankings.length
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
  try {
    const { limit = 10, offset = 0 } = req.query;
    const parsedLimit = Math.min(parseInt(limit, 10) || 10, 100);
    const parsedOffset = parseInt(offset, 10) || 0;

    logger.info(`[leaderboardController.getTopPlayersByHorseEarnings] Getting top ${parsedLimit} players by horse earnings`);

    // Get aggregated horse earnings by player
    const earningsData = await prisma.horse.groupBy({
      by: ['playerId'],
      where: {
        playerId: { not: null },
        total_earnings: { gt: 0 }
      },
      _sum: {
        total_earnings: true
      },
      _count: {
        id: true
      },
      orderBy: {
        _sum: {
          total_earnings: 'desc'
        }
      },
      take: parsedLimit,
      skip: parsedOffset
    });

    // Get player details
    const playerIds = earningsData.map(entry => entry.playerId).filter(Boolean);
    const players = await prisma.player.findMany({
      where: { id: { in: playerIds } },
      select: {
        id: true,
        name: true,
        level: true,
        money: true
      }
    });

    // Create player lookup map
    const playerMap = players.reduce((map, player) => {
      map[player.id] = player;
      return map;
    }, {});

    // Build rankings
    const rankings = earningsData.map((entry, index) => {
      const player = playerMap[entry.playerId];
      return {
        rank: parsedOffset + index + 1,
        playerId: entry.playerId,
        name: player?.name || 'Unknown Player',
        level: player?.level || 1,
        personalMoney: player?.money || 0,
        totalHorseEarnings: entry._sum.total_earnings || 0,
        horseCount: entry._count.id || 0,
        averageEarningsPerHorse: Math.round((entry._sum.total_earnings || 0) / (entry._count.id || 1))
      };
    });

    res.json({
      success: true,
      message: 'Top players by horse earnings retrieved successfully',
      data: {
        rankings,
        pagination: {
          limit: parsedLimit,
          offset: parsedOffset,
          total: rankings.length
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
export const getRecentWinners = async(req, res) => {
  try {
    const { limit = 20, discipline = 'all' } = req.query;
    const parsedLimit = Math.min(parseInt(limit, 10) || 20, 100);

    logger.info(`[leaderboardController.getRecentWinners] Getting ${parsedLimit} recent winners (discipline: ${discipline})`);

    // Build where clause
    const whereClause = { placement: '1st' };
    if (discipline !== 'all') {
      whereClause.discipline = discipline;
    }

    const recentWinners = await prisma.competitionResult.findMany({
      where: whereClause,
      select: {
        id: true,
        score: true,
        discipline: true,
        runDate: true,
        showName: true,
        prizeWon: true,
        horse: {
          select: {
            id: true,
            name: true,
            breed: {
              select: {
                name: true
              }
            },
            player: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      },
      orderBy: {
        runDate: 'desc'
      },
      take: parsedLimit
    });

    const winners = recentWinners.map((result, index) => ({
      rank: index + 1,
      resultId: result.id,
      horse: {
        id: result.horse.id,
        name: result.horse.name,
        breed: result.horse.breed?.name || 'Unknown'
      },
      owner: {
        id: result.horse.player?.id,
        name: result.horse.player?.name || 'Unknown Owner'
      },
      competition: {
        name: result.showName,
        discipline: result.discipline,
        date: result.runDate,
        score: result.score,
        prize: result.prizeWon
      }
    }));

    res.json({
      success: true,
      message: 'Recent competition winners retrieved successfully',
      data: {
        winners,
        discipline: discipline === 'all' ? 'All Disciplines' : discipline,
        count: winners.length
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
export const getLeaderboardStats = async(req, res) => {
  try {
    logger.info('[leaderboardController.getLeaderboardStats] Getting leaderboard statistics');

    // Get various statistics in parallel
    const [
      totalPlayers,
      totalHorses,
      totalCompetitions,
      totalPrizeMoney,
      averagePlayerLevel,
      topPlayer,
      topHorse,
      recentActivity
    ] = await Promise.all([
      // Total active players
      prisma.player.count(),

      // Total horses with earnings
      prisma.horse.count({ where: { total_earnings: { gt: 0 } } }),

      // Total competitions held
      prisma.competitionResult.count(),

      // Total prize money distributed
      prisma.competitionResult.aggregate({ _sum: { prizeWon: true } }),

      // Average player level
      prisma.player.aggregate({ _avg: { level: true } }),

      // Top player by level
      prisma.player.findFirst({
        select: { name: true, level: true, xp: true },
        orderBy: [{ level: 'desc' }, { xp: 'desc' }]
      }),

      // Top earning horse
      prisma.horse.findFirst({
        select: {
          name: true,
          total_earnings: true,
          player: { select: { name: true } }
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
          owner: topHorse.player?.name || 'Unknown'
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
