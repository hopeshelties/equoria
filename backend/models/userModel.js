import prisma from '../db/index.js';
import logger from '../utils/logger.js';
import { DatabaseError } from '../errors/index.js';

/**
 * Retrieves a user with their horses
 * @param {number} id - User ID (integer)
 * @returns {Object|null} - User object with horses if found, null otherwise
 * @throws {Error} - Validation or database errors
 */
export async function getUserWithHorses(id) {
  try {
    // Validate ID format
    const numericId = parseInt(id, 10);
    if (isNaN(numericId) || numericId <= 0) {
      throw new Error('Invalid user ID format');
    }

    const user = await prisma.user.findUnique({
      where: { id: numericId },
      include: {
        player: {
          include: {
            horses: {
              include: {
                breed: true,
                stable: true
              }
            }
          }
        }
      }
    });

    if (user) {
      const horseCount = user.player && user.player.horses ? user.player.horses.length : 0;
      logger.info(`[userModel.getUserWithHorses] Successfully found user with horses: ${user.name} (ID: ${id}, Horses: ${horseCount})`);
    }

    return user;

  } catch (error) {
    if (error.message.startsWith('Invalid')) {
      // Re-throw validation errors as-is
      throw error;
    }

    // Log and re-throw database errors
    logger.error('[userModel.getUserWithHorses] Database error: %o', error);
    throw new Error(`Database error in getUserWithHorses: ${error.message}`);
  }
}

/**
 * Retrieves a user by ID
 * @param {number} id - User ID (integer)
 * @returns {Object|null} - User object if found, null otherwise
 * @throws {Error} - Validation or database errors
 */
export async function getUserById(id) {
  try {
    // Validate ID format
    const numericId = parseInt(id, 10);
    if (isNaN(numericId) || numericId <= 0) {
      throw new Error('Invalid user ID format');
    }

    const user = await prisma.user.findUnique({
      where: { id: numericId }
    });

    if (user) {
      logger.info(`[userModel.getUserById] Successfully found user: ${user.name} (ID: ${id})`);
    }

    return user;

  } catch (error) {
    if (error.message.startsWith('Invalid')) {
      // Re-throw validation errors as-is
      throw error;
    }

    // Log and re-throw database errors
    logger.error('[userModel.getUserById] Database error: %o', error);
    throw new Error(`Database error in getUserById: ${error.message}`);
  }
}

/**
 * Retrieves a user by email
 * @param {string} email - User email
 * @returns {Object|null} - User object if found, null otherwise
 * @throws {Error} - Validation or database errors
 */
export async function getUserByEmail(email) {
  try {
    // Validate email format
    if (!email || typeof email !== 'string') {
      throw new Error('Invalid email format');
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (user) {
      logger.info(`[userModel.getUserByEmail] Successfully found user: ${user.name} (Email: ${email})`);
    }

    return user;

  } catch (error) {
    if (error.message.startsWith('Invalid')) {
      // Re-throw validation errors as-is
      throw error;
    }

    // Log and re-throw database errors
    logger.error('[userModel.getUserByEmail] Database error: %o', error);
    throw new Error(`Database error in getUserByEmail: ${error.message}`);
  }
}

/**
 * Retrieves statistics for a user
 * @param {number} userId - User ID (integer)
 * @returns {Object|null} - User statistics object if found, null otherwise
 * @throws {Error} - Validation or database errors
 */
const getUserStats = async(userId) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        player: {
          include: {
            horses: true
          }
        }
      }
    });

    if (!user) {
      return null;
    }

    // Calculate stats based on the user and their player's horses
    const horseCount = user.player && user.player.horses ? user.player.horses.length : 0;
    const averageHorseAge = horseCount > 0
      ? user.player.horses.reduce((sum, horse) => sum + horse.age, 0) / horseCount
      : 0;

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
      horseCount,
      averageHorseAge
      // Add any other relevant stats
    };
  } catch (error) {
    logger.error(`Error fetching user stats for user ${userId}: ${error.message}`);
    throw new DatabaseError(`Could not fetch user stats: ${error.message}`);
  }
};

export default {
  getUserWithHorses,
  getUserById,
  getUserByEmail,
  getUserStats
  // ... any other functions you might have
};
