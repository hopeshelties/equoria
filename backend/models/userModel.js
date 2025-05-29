import prisma from '../db/index.js';
import logger from '../utils/logger.js';
import { DatabaseError } from '../errors/index.js';

/**
 * Validates a user ID.
 * @param {string|number} id - The user ID to validate.
 * @returns {number} - The validated numeric user ID.
 * @throws {Error} - If the ID is invalid.
 */
function validateUserId(id) {
  const numericId = parseInt(id, 10);
  if (isNaN(numericId) || numericId <= 0 || numericId > Number.MAX_SAFE_INTEGER) {
    throw new Error('Invalid user ID format. ID must be a positive integer.');
  }
  return numericId;
}

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
    // Additional validation for money, level, xp can be added here if needed beyond schema defaults
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
        // Ensure Prisma schema defaults are applied if not provided in userData
        // money, level, xp, settings, role have defaults in schema
      }
    });
    logger.info(`[userModel.createUser] Successfully created user: ${newUser.username} (ID: ${newUser.id})`);
    return newUser;
  } catch (error) {
    if (error.code === 'P2002') { // Prisma unique constraint violation
      const target = error.meta && Array.isArray(error.meta.target) ? error.meta.target.join(', ') : 'field';
      logger.error(`[userModel.createUser] Unique constraint violation for ${target}.`);
      throw new Error(`User with this ${target} already exists.`);
    }
    if (error.message.includes('required') || error.message.includes('must be')) {
      throw error; // Re-throw specific validation errors
    }
    logger.error('[userModel.createUser] Database error: %o', error);
    throw new DatabaseError(`Database error in createUser: ${error.message}`);
  }
}

/**
 * Retrieves a user with their horses
 * @param {number|string} id - User ID
 * @returns {Object|null} - User object with horses if found, null otherwise
 * @throws {Error} - Validation or database errors
 */
export async function getUserWithHorses(id) {
  try {
    const numericId = validateUserId(id);

    const user = await prisma.user.findUnique({
      where: { id: numericId },
      include: {
        // Removed player: { include: { horses: ... } } as horses are now directly on User
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
      logger.info(`[userModel.getUserWithHorses] Successfully found user with horses: ${user.name || user.username} (ID: ${numericId}, Horses: ${horseCount})`);
    }

    return user;
  } catch (error) {
    if (error.message.startsWith('Invalid user ID format')) {
      throw error;
    }
    logger.error('[userModel.getUserWithHorses] Database error: %o', error);
    throw new DatabaseError(`Database error in getUserWithHorses: ${error.message}`);
  }
}

/**
 * Retrieves a user by ID
 * @param {number|string} id - User ID
 * @returns {Object|null} - User object if found, null otherwise
 * @throws {Error} - Validation or database errors
 */
export async function getUserById(id) {
  try {
    const numericId = validateUserId(id);

    const user = await prisma.user.findUnique({
      where: { id: numericId }
    });

    if (user) {
      logger.info(`[userModel.getUserById] Successfully found user: ${user.name || user.username} (ID: ${numericId})`);
    }

    return user;
  } catch (error) {
    if (error.message.startsWith('Invalid user ID format')) {
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
    if (!email || typeof email !== 'string') { // Basic email validation
      throw new Error('Invalid email format: email must be a non-empty string.');
    }
    // Prisma will also validate email format if the field type is String and has @db.VarChar or similar with constraints

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
 * @param {number|string} userId - The ID of the user to update.
 * @param {Object} updateData - An object containing the fields to update.
 * @returns {Object} - The updated user object.
 * @throws {Error} - If validation fails or user not found or db error.
 */
export async function updateUser(userId, updateData) {
  try {
    const numericId = validateUserId(userId);

    if (!updateData || Object.keys(updateData).length === 0) {
      throw new Error('No update data provided.');
    }

    // Prevent updating protected fields like id, createdAt, etc.
    delete updateData.id;
    delete updateData.createdAt; // updatedAt is handled by Prisma

    const updatedUser = await prisma.user.update({
      where: { id: numericId },
      data: updateData
    });
    logger.info(`[userModel.updateUser] Successfully updated user: ${updatedUser.username} (ID: ${numericId})`);
    return updatedUser;
  } catch (error) {
    if (error.code === 'P2025') { // Prisma "Record to update not found"
      logger.error(`[userModel.updateUser] User not found for update: ID ${userId}`);
      throw new Error('User not found for update.');
    }
    if (error.message.startsWith('Invalid user ID format') || error.message.startsWith('No update data')) {
      throw error;
    }
    logger.error('[userModel.updateUser] Database error: %o', error);
    throw new DatabaseError(`Database error in updateUser: ${error.message}`);
  }
}

/**
 * Deletes a user by ID.
 * @param {number|string} userId - The ID of the user to delete.
 * @returns {Object} - The deleted user object.
 * @throws {Error} - If validation fails, user not found, or db error.
 */
export async function deleteUser(userId) {
  try {
    const numericId = validateUserId(userId);

    const deletedUser = await prisma.user.delete({
      where: { id: numericId }
    });
    logger.info(`[userModel.deleteUser] Successfully deleted user: ${deletedUser.username} (ID: ${numericId})`);
    return deletedUser;
  } catch (error) {
    if (error.code === 'P2025') { // Prisma "Record to delete not found"
      logger.error(`[userModel.deleteUser] User not found for deletion: ID ${userId}`);
      throw new Error('User not found for deletion.');
    }
    if (error.message.startsWith('Invalid user ID format')) {
      throw error;
    }
    logger.error('[userModel.deleteUser] Database error: %o', error);
    throw new DatabaseError(`Database error in deleteUser: ${error.message}`);
  }
}

/**
 * Adds XP to a user and handles automatic leveling.
 * @param {number|string} userId - User ID.
 * @param {number} amount - Amount of XP to add.
 * @returns {Object} - Updated user object with level up info.
 * @throws {Error} - Validation or database errors.
 */
export async function addUserXp(userId, amount) {
  try {
    const numericId = validateUserId(userId);
    if (typeof amount !== 'number' || amount <= 0) {
      throw new Error('XP amount must be a positive number.');
    }

    logger.info(`[userModel.addUserXp] Adding ${amount} XP to user ${numericId}`);
    const currentUser = await prisma.user.findUnique({ where: { id: numericId } });

    if (!currentUser) {
      throw new Error('User not found to add XP.');
    }

    let newXp = currentUser.xp + amount;
    let newLevel = currentUser.level;
    let leveledUp = false;
    let levelsGained = 0;
    const xpPerLevel = 100; // Define XP needed per level

    while (newXp >= xpPerLevel) {
      newXp -= xpPerLevel;
      newLevel++;
      levelsGained++;
      leveledUp = true;
    }

    const updateData = { xp: newXp };
    if (leveledUp) {
      updateData.level = newLevel;
    }

    const updatedUser = await prisma.user.update({
      where: { id: numericId },
      data: updateData
    });

    if (leveledUp) {
      logger.info(`[userModel.addUserXp] User ${numericId} leveled up! New level: ${newLevel} (gained ${levelsGained} levels)`);
    } else {
      logger.info(`[userModel.addUserXp] Added ${amount} XP to user ${numericId}. Total XP: ${newXp}`);
    }

    return {
      ...updatedUser,
      leveledUp,
      levelsGained,
      xpGained: amount
    };
  } catch (error) {
    if (error.message.startsWith('Invalid') || error.message.startsWith('User not found') || error.message.startsWith('XP amount')) {
      throw error;
    }
    logger.error('[userModel.addUserXp] Database error: %o', error);
    throw new DatabaseError(`Database error in addUserXp: ${error.message}`);
  }
}

/**
 * Checks if a user should level up based on current XP and handles the level up process.
 * This might be redundant if addUserXp is always used for XP changes.
 * @param {number|string} userId - User ID.
 * @returns {Object} - User data with level up info.
 * @throws {Error} - Validation or database errors.
 */
export async function checkAndLevelUpUser(userId) {
  try {
    const numericId = validateUserId(userId);

    logger.info(`[userModel.checkAndLevelUpUser] Checking level up for user ${numericId}`);
    const currentUser = await prisma.user.findUnique({ where: { id: numericId } });

    if (!currentUser) {
      throw new Error('User not found for level up check.');
    }

    let currentXp = currentUser.xp; // Use a mutable variable for XP calculation
    let newLevel = currentUser.level;
    let leveledUp = false;
    let levelsGained = 0;
    const xpPerLevel = 100;

    while (currentXp >= xpPerLevel) {
      currentXp -= xpPerLevel;
      newLevel++;
      levelsGained++;
      leveledUp = true;
    }

    if (leveledUp) {
      const updatedUser = await prisma.user.update({
        where: { id: numericId },
        data: { level: newLevel, xp: currentXp } // Update with the new XP after deductions
      });
      logger.info(`[userModel.checkAndLevelUpUser] User ${numericId} leveled up to level ${newLevel}!`);
      return {
        ...updatedUser,
        leveledUp: true,
        levelsGained,
        message: `Congratulations! You've reached Level ${newLevel}!`
      };
    }

    // If no level up, return current user state
    return {
      ...currentUser,
      leveledUp: false,
      levelsGained: 0,
      message: null
    };
  } catch (error) {
    if (error.message.startsWith('Invalid') || error.message.startsWith('User not found')) {
      throw error;
    }
    logger.error('[userModel.checkAndLevelUpUser] Database error: %o', error);
    throw new DatabaseError(`Database error in checkAndLevelUpUser: ${error.message}`);
  }
}

/**
 * Gets user progress information (level, XP, XP to next level).
 * @param {number|string} userId - User ID.
 * @returns {Object} - Progress information object.
 * @throws {Error} - Validation or database errors.
 */
export async function getUserProgress(userId) {
  try {
    const numericId = validateUserId(userId);

    logger.info(`[userModel.getUserProgress] Getting progress for user ${numericId}`);
    const user = await prisma.user.findUnique({ where: { id: numericId } });

    if (!user) {
      throw new Error('User not found for progress check.');
    }

    const xpPerLevel = 100;
    // XP is assumed to be < xpPerLevel due to leveling logic in addUserXp/checkAndLevelUpUser
    const xpToNextLevel = xpPerLevel - user.xp;

    const progressData = {
      userId: user.id,
      username: user.username,
      name: user.name, // Merged from Player
      level: user.level,
      xp: user.xp,
      xpToNextLevel,
      xpForCurrentLevel: xpPerLevel // Total XP for the current level band
    };

    logger.info(`[userModel.getUserProgress] Successfully retrieved progress for user ${user.name || user.username} (Level ${user.level}, XP: ${user.xp})`);
    return progressData;
  } catch (error) {
    if (error.message.startsWith('Invalid') || error.message.startsWith('User not found')) {
      throw error;
    }
    logger.error('[userModel.getUserProgress] Database error: %o', error);
    throw new DatabaseError(`Database error in getUserProgress: ${error.message}`);
  }
}

/**
 * Retrieves statistics for a user.
 * Note: The original player relation is removed, horses are directly on user.
 * @param {number|string} userId - User ID
 * @returns {Object|null} - User statistics object if found, null otherwise
 * @throws {Error} - Validation or database errors
 */
export async function getUserStats(userId) {
  try {
    const numericId = validateUserId(userId);
    const user = await prisma.user.findUnique({
      where: { id: numericId },
      include: {
        horses: true // Horses are now directly related to User
      }
    });

    if (!user) {
      logger.warn(`[userModel.getUserStats] User not found with ID: ${numericId}`);
      return null; // Or throw new NotFoundError('User not found');
    }

    const horseCount = user.horses ? user.horses.length : 0;
    const averageHorseAge =
      horseCount > 0
        ? user.horses.reduce((sum, horse) => sum + horse.age, 0) / horseCount
        : 0;

    const stats = {
      id: user.id,
      username: user.username,
      email: user.email, // Be cautious about exposing email in stats unless intended
      role: user.role,
      createdAt: user.createdAt,
      name: user.name, // Merged from Player
      money: user.money,
      level: user.level,
      xp: user.xp,
      horseCount,
      averageHorseAge: parseFloat(averageHorseAge.toFixed(2)) // Format to 2 decimal places
      // Add any other relevant stats from the merged User model
    };
    logger.info(`[userModel.getUserStats] Successfully fetched stats for user ${numericId}`);
    return stats;
  } catch (error) {
    if (error.message.startsWith('Invalid user ID format')) {
      throw error;
    }
    logger.error(`[userModel.getUserStats] Error fetching user stats for user ${userId}: %o`, error);
    throw new DatabaseError(`Could not fetch user stats: ${error.message}`);
  }
}

export default {
  createUser,
  getUserWithHorses,
  getUserById,
  getUserByEmail,
  updateUser,
  deleteUser,
  addUserXp,
  checkAndLevelUpUser,
  getUserProgress,
  getUserStats
};
