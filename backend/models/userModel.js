import prisma from '../db/index.js';
import logger from '../utils/logger.js';
import { DatabaseError } from '../errors/index.js';

/**
 * Creates a new user.
 * @param {Object} userData - Data for the new user.
 * @returns {Object} - The created user object.
 * @throws {Error} - Validation or database errors.
 */
export async function createUser(userData) {
  try {
    if (!userData.username || !userData.email || !userData.password) {
      throw new Error('Username, email, and password are required for creating a user.');
    }
    if (userData.money !== undefined && (typeof userData.money !== 'number' || userData.money < 0)) {
      throw new Error('Initial money must be a non-negative number.');
    }
    if (userData.level !== undefined && (typeof userData.level !== 'number' || userData.level < 1)) {
      throw new Error('Initial level must be a positive integer, at least 1.');
    }
    if (userData.xp !== undefined && (typeof userData.xp !== 'number' || userData.xp < 0)) {
      throw new Error('Initial XP must be a non-negative number.');
    }

    const newUser = await prisma.user.create({
      data: {
        ...userData
      }
    });
    logger.info(`[userModel.createUser] Successfully created user: ${newUser.username} (ID: ${newUser.id})`);
    return newUser;
  } catch (error) {
    if (error.code === 'P2002') {
      const target = error.meta && Array.isArray(error.meta.target) ? error.meta.target.join(', ') : 'field';
      logger.error(`[userModel.createUser] Unique constraint violation for ${target}.`);
      throw new Error(`User with this ${target} already exists.`);
    }
    if (error.message.includes('required') || error.message.includes('must be')) {
      throw error;
    }
    logger.error('[userModel.createUser] Database error: %o', error);
    throw new DatabaseError(`Database error in createUser: ${error.message}`);
  }
}

/**
 * Retrieves a user with their horses
 * @param {string} id - User ID
 * @returns {Object|null} - User object with horses if found, null otherwise
 * @throws {Error} - Validation or database errors
 */
export async function getUserWithHorses(id) {
  try {
    if (!id || typeof id !== 'string') {
      throw new Error('User ID is required and must be a non-empty string.');
    }

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        horses: {
          include: {
            breed: true,
            stable: true
          }
        }
      }
    });

    if (user) {
      const horseCount = user.horses ? user.horses.length : 0;
      logger.info(`[userModel.getUserWithHorses] Successfully found user with horses: ${user.name || user.username} (ID: ${id}, Horses: ${horseCount})`);
    }
    return user;
  } catch (error) {
    if (error.message.startsWith('User ID is required')) {
      throw error;
    }
    logger.error('[userModel.getUserWithHorses] Database error: %o', error);
    throw new DatabaseError(`Database error in getUserWithHorses: ${error.message}`);
  }
}

/**
 * Retrieves a user by ID
 * @param {string} id - User ID
 * @returns {Object|null} - User object if found, null otherwise
 * @throws {Error} - Validation or database errors
 */
export async function getUserById(id) {
  try {
    if (!id || typeof id !== 'string') {
      throw new Error('User ID is required and must be a non-empty string.');
    }

    const user = await prisma.user.findUnique({
      where: { id }
    });

    if (user) {
      logger.info(`[userModel.getUserById] Successfully found user: ${user.name || user.username} (ID: ${id})`);
    }
    return user;
  } catch (error) {
    if (error.message.startsWith('User ID is required')) {
      throw error;
    }
    logger.error('[userModel.getUserById] Database error: %o', error);
    throw new DatabaseError(`Database error in getUserById: ${error.message}`);
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
    if (!email || typeof email !== 'string') {
      throw new Error('Invalid email format: email must be a non-empty string.');
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (user) {
      logger.info(`[userModel.getUserByEmail] Successfully found user: ${user.name || user.username} (Email: ${email})`);
    }
    return user;
  } catch (error) {
    if (error.message.startsWith('Invalid email format')) {
      throw error;
    }
    logger.error('[userModel.getUserByEmail] Database error: %o', error);
    throw new DatabaseError(`Database error in getUserByEmail: ${error.message}`);
  }
}

/**
 * Updates a user\'s information.
 * @param {string} userId - The ID of the user to update.
 * @param {Object} updateData - An object containing the fields to update.
 * @returns {Object} - The updated user object.
 * @throws {Error} - If validation fails or user not found or db error.
 */
export async function updateUser(userId, updateData) {
  try {
    if (!userId || typeof userId !== 'string') {
      throw new Error('User ID is required and must be a non-empty string.');
    }
    if (!updateData || Object.keys(updateData).length === 0) {
      throw new Error('No update data provided.');
    }
    delete updateData.id;
    delete updateData.createdAt;

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData
    });
    logger.info(`[userModel.updateUser] Successfully updated user: ${updatedUser.username} (ID: ${userId})`);
    return updatedUser;
  } catch (error) {
    if (error.code === 'P2025') {
      logger.error(`[userModel.updateUser] User not found for update: ID ${userId}`);
      throw new Error('User not found for update.');
    }
    if (error.message.startsWith('User ID is required') || error.message.startsWith('No update data')) {
      throw error;
    }
    logger.error('[userModel.updateUser] Database error: %o', error);
    throw new DatabaseError(`Database error in updateUser: ${error.message}`);
  }
}

/**
 * Deletes a user by ID.
 * @param {string} userId - The ID of the user to delete.
 * @returns {Object} - The deleted user object.
 * @throws {Error} - If validation fails, user not found, or db error.
 */
export async function deleteUser(userId) {
  try {
    if (!userId || typeof userId !== 'string') {
      throw new Error('User ID is required and must be a non-empty string.');
    }

    const deletedUser = await prisma.user.delete({
      where: { id: userId }
    });
    logger.info(`[userModel.deleteUser] Successfully deleted user: ${deletedUser.username} (ID: ${userId})`);
    return deletedUser;
  } catch (error) {
    if (error.code === 'P2025') {
      logger.error(`[userModel.deleteUser] User not found for deletion: ID ${userId}`);
      throw new Error('User not found for deletion.');
    }
    if (error.message.startsWith('User ID is required')) {
      throw error;
    }
    logger.error('[userModel.deleteUser] Database error: %o', error);
    throw new DatabaseError(`Database error in deleteUser: ${error.message}`);
  }
}

/**
 * Gets user progress information (level, XP, XP to next level).
 * @param {string} userId - User ID.
 * @returns {Object} - Progress information object.
 * @throws {Error} - Validation or database errors.
 */
export async function getUserProgress(userId) {
  try {
    if (!userId || typeof userId !== 'string') {
      throw new Error('User ID is required and must be a non-empty string.');
    }

    logger.info(`[userModel.getUserProgress] Getting progress for user ${userId}`);
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new Error('User not found for progress check.');
    }

    const xpPerLevel = xpThreshold(user.level); // Use xpThreshold for consistency
    const xpToNextLevel = xpPerLevel - user.xp;

    const progressData = {
      userId: user.id,
      username: user.username,
      name: user.name,
      level: user.level,
      xp: user.xp,
      xpToNextLevel,
      xpForCurrentLevel: xpPerLevel
    };

    logger.info(`[userModel.getUserProgress] Successfully retrieved progress for user ${user.name || user.username} (Level ${user.level}, XP: ${user.xp})`);
    return progressData;
  } catch (error) {
    if (error.message.startsWith('User ID is required') || error.message.startsWith('User not found')) {
      throw error;
    }
    logger.error('[userModel.getUserProgress] Database error: %o', error);
    throw new DatabaseError(`Database error in getUserProgress: ${error.message}`);
  }
}

/**
 * Retrieves statistics for a user.
 * @param {string} userId - User ID
 * @returns {Object|null} - User statistics object if found, null otherwise
 * @throws {Error} - Validation or database errors
 */
export async function getUserStats(userId) {
  try {
    if (!userId || typeof userId !== 'string') {
      throw new Error('User ID is required and must be a non-empty string.');
    }
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        horses: true
      }
    });

    if (!user) {
      logger.warn(`[userModel.getUserStats] User not found with ID: ${userId}`);
      return null;
    }

    const horseCount = user.horses ? user.horses.length : 0;
    const averageHorseAge =
      horseCount > 0
        ? user.horses.reduce((sum, horse) => sum + horse.age, 0) / horseCount
        : 0;

    const stats = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
      name: user.name,
      money: user.money,
      level: user.level,
      xp: user.xp,
      horseCount,
      averageHorseAge: parseFloat(averageHorseAge.toFixed(2))
    };
    logger.info(`[userModel.getUserStats] Successfully fetched stats for user ${userId}`);
    return stats;
  } catch (error) {
    if (error.message.startsWith('User ID is required')) {
      throw error;
    }
    logger.error(`[userModel.getUserStats] Error fetching user stats for user ${userId}: %o`, error);
    throw new DatabaseError(`Could not fetch user stats: ${error.message}`);
  }
}

// Placeholder for XP threshold logic
function xpThreshold(currentLevel) { // eslint-disable-line no-unused-vars
  return 100; // Example: 100 XP per level
}

/**
 * Adds XP to a user and handles automatic leveling.
 * This is the primary function for managing user XP and leveling.
 * @param {string} userId - The ID of the user.
 * @param {number} amount - The amount of XP to add.
 * @returns {Promise<Object>} - An object indicating success, new XP, current level, level-up status, and levels gained.
 */
export async function addXpToUser(userId, amount) {
  if (!userId || typeof userId !== 'string') {
    logger.error('[userModel.addXpToUser] User ID is required and must be a string.');
    throw new Error('User ID is required and must be a string');
  }
  if (typeof amount !== 'number' || amount <= 0) {
    logger.warn(`[userModel.addXpToUser] XP amount must be a positive number. Received: ${amount} for user ${userId}`);
    return { success: false, error: 'XP amount must be a positive number', currentXP: null, currentLevel: null, leveledUp: false, levelsGained: 0 };
  }

  try {
    logger.info(`[userModel.addXpToUser] Attempting to add ${amount} XP to user ${userId}`);
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      logger.error(`[userModel.addXpToUser] User not found: ${userId}`);
      return { success: false, error: 'User not found', currentXP: null, currentLevel: null, leveledUp: false, levelsGained: 0 };
    }

    let currentXP = user.xp + amount;
    let currentLevel = user.level;
    let leveledUp = false;
    let levelsGained = 0;
    let requiredXP = xpThreshold(currentLevel);

    logger.debug(`[userModel.addXpToUser] User ${userId} (Level ${currentLevel}) current XP: ${user.xp}, XP to add: ${amount}. XP threshold for L${currentLevel + 1}: ${requiredXP}`);

    while (currentXP >= requiredXP) {
      currentXP -= requiredXP;
      currentLevel++;
      levelsGained++;
      leveledUp = true;
      logger.info(`[userModel.addXpToUser] User ${userId} leveled up to Level ${currentLevel}. Remaining XP: ${currentXP}`);
      requiredXP = xpThreshold(currentLevel); // Get XP threshold for the new level
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        xp: currentXP,
        level: currentLevel
      }
    });

    logger.info(`[userModel.addXpToUser] User ${userId} XP updated. New XP: ${updatedUser.xp}, New Level: ${updatedUser.level}. Leveled up: ${leveledUp}, Levels gained: ${levelsGained}`);

    return {
      success: true,
      currentXP: updatedUser.xp,
      currentLevel: updatedUser.level,
      leveledUp,
      levelsGained,
      xpGained: amount
    };
  } catch (error) {
    logger.error(`[userModel.addXpToUser] Error adding XP to user ${userId}: %o`, error);
    return { success: false, error: error.message, currentXP: null, currentLevel: null, leveledUp: false, levelsGained: 0 };
  }
}

/**
 * DEPRECATED: Adds XP to a user. Logic is now in addXpToUser.
 * @deprecated Use addXpToUser instead.
 * @param {string} userId - User ID.
 * @param {number} amount - Amount of XP to add.
 * @returns {Promise<Object>} - Result from addXpToUser.
 */
export async function addUserXp(userId, amount) {
  logger.warn('[userModel.addUserXp] DEPRECATED: This function is deprecated. Use addXpToUser instead.');
  return addXpToUser(userId, amount); // Delegate to the new consolidated function
}

/**
 * DEPRECATED: Checks if a user should level up. Logic is now in addXpToUser.
 * @deprecated Leveling is handled by addXpToUser.
 * @param {string} userId - User ID.
 * @returns {Promise<Object>} - User data with level up info (leveledUp will be false).
 */
export async function checkAndLevelUpUser(userId) {
  logger.warn('[userModel.checkAndLevelUpUser] DEPRECATED: This function is deprecated. Leveling is handled by addXpToUser.');
  try {
    if (!userId || typeof userId !== 'string') {
      throw new Error('User ID is required and must be a non-empty string.');
    }
    const currentUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!currentUser) {
      logger.error(`[userModel.checkAndLevelUpUser] User not found in deprecated function: ${userId}`);
      throw new Error('User not found.');
    }
    // This function no longer performs leveling. Return current state.
    return {
      ...currentUser,
      leveledUp: false,
      levelsGained: 0,
      message: 'This function is deprecated. Leveling is handled by addXpToUser.'
    };
  } catch (error) {
    logger.error(`[userModel.checkAndLevelUpUser] Error in deprecated function for user ${userId}: ${error.message}`);
    // Return a structure consistent with addXpToUser's error response
    return { success: false, error: error.message, currentXP: null, currentLevel: null, leveledUp: false, levelsGained: 0 };
  }
}

export default {
  createUser,
  getUserWithHorses,
  getUserById,