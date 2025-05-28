/**
 * XP Log Model
 * Handles logging of all XP events for auditing and analytics
 */

import prisma from '../db/index.js';
import logger from '../utils/logger.js';

/**
 * Log an XP event to the database
 *
 * @param {Object} params - XP event parameters
 * @param {string} params.playerId - Player ID who received/lost XP
 * @param {number} params.amount - Amount of XP gained/lost (positive or negative)
 * @param {string} params.reason - Reason for XP change (e.g., "Trained horse in Dressage")
 * @returns {Promise<Object>} The created XP event record
 */
export const logXpEvent = async ({ playerId, amount, reason }) => {
  try {
    logger.info(`[xpLogModel.logXpEvent] Logging XP event: Player ${playerId}, Amount: ${amount}, Reason: ${reason}`);

    // Validate input parameters
    if (!playerId) {
      throw new Error('Player ID is required');
    }

    if (typeof amount !== 'number') {
      throw new Error('Amount must be a number');
    }

    if (!reason || typeof reason !== 'string') {
      throw new Error('Reason is required and must be a string');
    }

    // Insert XP event into database using Prisma
    const xpEvent = await prisma.xpEvent.create({
      data: {
        playerId,
        amount,
        reason
      }
    });

    logger.info(`[xpLogModel.logXpEvent] Successfully logged XP event: ID ${xpEvent.id}, Player ${xpEvent.playerId}, Amount: ${xpEvent.amount}`);

    return {
      id: xpEvent.id,
      playerId: xpEvent.playerId,
      amount: xpEvent.amount,
      reason: xpEvent.reason,
      timestamp: xpEvent.timestamp
    };

  } catch (error) {
    logger.error(`[xpLogModel.logXpEvent] Error logging XP event: ${error.message}`);
    throw error;
  }
};

/**
 * Get XP events for a specific player
 *
 * @param {string} playerId - Player ID to get XP events for
 * @param {Object} options - Query options
 * @param {number} options.limit - Maximum number of events to return (default: 50)
 * @param {number} options.offset - Number of events to skip (default: 0)
 * @param {Date} options.startDate - Start date filter (optional)
 * @param {Date} options.endDate - End date filter (optional)
 * @returns {Promise<Array>} Array of XP events
 */
export const getPlayerXpEvents = async (playerId, options = {}) => {
  try {
    const { limit = 50, offset = 0, startDate, endDate } = options;

    logger.info(`[xpLogModel.getPlayerXpEvents] Getting XP events for player ${playerId}, limit: ${limit}, offset: ${offset}`);

    // Build where clause for date filters
    const where = {
      playerId
    };

    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) {
        where.timestamp.gte = startDate;
      }
      if (endDate) {
        where.timestamp.lte = endDate;
      }
    }

    // Query XP events using Prisma
    const xpEvents = await prisma.xpEvent.findMany({
      where,
      orderBy: {
        timestamp: 'desc'
      },
      take: limit,
      skip: offset
    });

    logger.info(`[xpLogModel.getPlayerXpEvents] Retrieved ${xpEvents.length} XP events for player ${playerId}`);

    return xpEvents;

  } catch (error) {
    logger.error(`[xpLogModel.getPlayerXpEvents] Error getting XP events: ${error.message}`);
    throw error;
  }
};

/**
 * Get total XP gained by a player within a date range
 *
 * @param {string} playerId - Player ID
 * @param {Date} startDate - Start date (optional)
 * @param {Date} endDate - End date (optional)
 * @returns {Promise<Object>} Object with total XP gained and lost
 */
export const getPlayerXpSummary = async (playerId, startDate = null, endDate = null) => {
  try {
    logger.info(`[xpLogModel.getPlayerXpSummary] Getting XP summary for player ${playerId}`);

    // Build where clause for date filters
    const where = {
      playerId
    };

    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) {
        where.timestamp.gte = startDate;
      }
      if (endDate) {
        where.timestamp.lte = endDate;
      }
    }

    // Get all XP events for the player within the date range
    const xpEvents = await prisma.xpEvent.findMany({
      where,
      select: {
        amount: true
      }
    });

    // Calculate summary statistics
    let totalGained = 0;
    let totalLost = 0;
    let netTotal = 0;

    for (const event of xpEvents) {
      if (event.amount > 0) {
        totalGained += event.amount;
      } else {
        totalLost += Math.abs(event.amount);
      }
      netTotal += event.amount;
    }

    const xpSummary = {
      totalGained,
      totalLost,
      netTotal,
      totalEvents: xpEvents.length
    };

    logger.info(`[xpLogModel.getPlayerXpSummary] XP summary for player ${playerId}: Gained ${xpSummary.totalGained}, Lost ${xpSummary.totalLost}, Net ${xpSummary.netTotal}`);

    return xpSummary;

  } catch (error) {
    logger.error(`[xpLogModel.getPlayerXpSummary] Error getting XP summary: ${error.message}`);
    throw error;
  }
};

/**
 * Get recent XP events across all players (for admin/analytics)
 *
 * @param {Object} options - Query options
 * @param {number} options.limit - Maximum number of events to return (default: 100)
 * @param {number} options.offset - Number of events to skip (default: 0)
 * @returns {Promise<Array>} Array of recent XP events
 */
export const getRecentXpEvents = async (options = {}) => {
  try {
    const { limit = 100, offset = 0 } = options;

    logger.info(`[xpLogModel.getRecentXpEvents] Getting recent XP events, limit: ${limit}, offset: ${offset}`);

    // Query recent XP events using Prisma
    const xpEvents = await prisma.xpEvent.findMany({
      orderBy: {
        timestamp: 'desc'
      },
      take: limit,
      skip: offset
    });

    logger.info(`[xpLogModel.getRecentXpEvents] Retrieved ${xpEvents.length} recent XP events`);

    return xpEvents;

  } catch (error) {
    logger.error(`[xpLogModel.getRecentXpEvents] Error getting recent XP events: ${error.message}`);
    throw error;
  }
};
