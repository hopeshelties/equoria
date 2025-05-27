import prisma from '../db/index.js';
import logger from '../utils/logger.js';

/**
 * Validates if an ID is a valid user ID format (integer or string representation)
 * @param {string|number} id - The ID to validate
 * @returns {boolean} - Whether the ID is a valid user ID format
 */
function isValidUserId(id) {
  // Allow numbers
  if (typeof id === 'number' && id > 0 && Number.isInteger(id)) {
    return true;
  }
  
  // Allow string representations of positive integers
  if (typeof id === 'string') {
    const numId = parseInt(id, 10);
    if (!isNaN(numId) && numId > 0 && numId.toString() === id) {
      return true;
    }
  }
  
  return false;
}

/**
 * Validates email format
 * @param {string} email - The email to validate
 * @returns {boolean} - Whether the email is valid
 */
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Creates a new player in the database
 * @param {Object} playerData - Player data object
 * @param {string} playerData.name - Player name (required)
 * @param {string} playerData.email - Player email (required, unique)
 * @param {number} playerData.money - Player money (required, non-negative)
 * @param {number} playerData.level - Player level (required, min 1)
 * @param {number} playerData.xp - Player experience points (required, non-negative)
 * @param {Object} playerData.settings - Player settings JSON (required)
 * @returns {Object} - Created player object
 * @throws {Error} - Validation or database errors
 */
export async function createPlayer(playerData) {
  try {
    // Validate required fields
    if (!playerData.name) {
      throw new Error('Player name is required');
    }
    
    if (!playerData.email) {
      throw new Error('Player email is required');
    }
    
    if (!isValidEmail(playerData.email)) {
      throw new Error('Invalid email format');
    }
    
    if (playerData.money === undefined || playerData.money === null) {
      throw new Error('Player money is required');
    }
    
    if (playerData.level === undefined || playerData.level === null) {
      throw new Error('Player level is required');
    }
    
    if (playerData.xp === undefined || playerData.xp === null) {
      throw new Error('Player xp is required');
    }
    
    if (!playerData.settings) {
      throw new Error('Player settings is required');
    }
    
    // Validate field constraints
    if (playerData.money < 0) {
      throw new Error('Player money must be non-negative');
    }
    
    if (playerData.level < 1) {
      throw new Error('Player level must be at least 1');
    }
    
    if (playerData.xp < 0) {
      throw new Error('Player xp must be non-negative');
    }

    // Create player in database
    const createdPlayer = await prisma.user.create({
      data: playerData
    });

    logger.info(`[playerModel.createPlayer] Successfully created player: ${createdPlayer.name} (ID: ${createdPlayer.id})`);
    return createdPlayer;

  } catch (error) {
    if (error.message.startsWith('Player') || error.message.startsWith('Invalid')) {
      // Re-throw validation errors as-is
      throw error;
    }
    
    // Log and re-throw database errors
    logger.error('[playerModel.createPlayer] Database error: %o', error);
    throw new Error(`Database error in createPlayer: ${error.message}`);
  }
}

/**
 * Retrieves a player by ID
 * @param {string|number} id - Player ID
 * @returns {Object|null} - Player object if found, null otherwise
 * @throws {Error} - Validation or database errors
 */
export async function getPlayerById(id) {
  try {
    // Validate ID format
    if (!isValidUserId(id)) {
      throw new Error('Invalid player ID format');
    }

    // Convert to integer for database query
    const playerId = parseInt(id, 10);

    const player = await prisma.user.findUnique({
      where: { id: playerId }
    });

    if (player) {
      logger.info(`[playerModel.getPlayerById] Successfully found player: ${player.name} (ID: ${id})`);
    }

    return player;

  } catch (error) {
    if (error.message.startsWith('Invalid')) {
      // Re-throw validation errors as-is
      throw error;
    }
    
    // Log and re-throw database errors
    logger.error('[playerModel.getPlayerById] Database error: %o', error);
    throw new Error(`Database error in getPlayerById: ${error.message}`);
  }
}

/**
 * Retrieves a player by email
 * @param {string} email - Player email
 * @returns {Object|null} - Player object if found, null otherwise
 * @throws {Error} - Validation or database errors
 */
export async function getPlayerByEmail(email) {
  try {
    // Validate email format
    if (!isValidEmail(email)) {
      throw new Error('Invalid email format');
    }

    const player = await prisma.user.findUnique({
      where: { email }
    });

    if (player) {
      logger.info(`[playerModel.getPlayerByEmail] Successfully found player: ${player.name} (Email: ${email})`);
    }

    return player;

  } catch (error) {
    if (error.message.startsWith('Invalid')) {
      // Re-throw validation errors as-is
      throw error;
    }
    
    // Log and re-throw database errors
    logger.error('[playerModel.getPlayerByEmail] Database error: %o', error);
    throw new Error(`Database error in getPlayerByEmail: ${error.message}`);
  }
}

/**
 * Retrieves a player with their horses
 * @param {string|number} id - Player ID
 * @returns {Object|null} - Player object with horses if found, null otherwise
 * @throws {Error} - Validation or database errors
 */
export async function getPlayerWithHorses(id) {
  try {
    // Validate ID format
    if (!isValidUserId(id)) {
      throw new Error('Invalid player ID format');
    }

    // Convert to integer for database query
    const playerId = parseInt(id, 10);

    const player = await prisma.user.findUnique({
      where: { id: playerId },
      include: {
        horses: {
          include: {
            breed: true,
            stable: true
          }
        }
      }
    });

    if (player) {
      const horseCount = player.horses ? player.horses.length : 0;
      logger.info(`[playerModel.getPlayerWithHorses] Successfully found player with horses: ${player.name} (ID: ${id}, Horses: ${horseCount})`);
    }

    return player;

  } catch (error) {
    if (error.message.startsWith('Invalid')) {
      // Re-throw validation errors as-is
      throw error;
    }
    
    // Log and re-throw database errors
    logger.error('[playerModel.getPlayerWithHorses] Database error: %o', error);
    throw new Error(`Database error in getPlayerWithHorses: ${error.message}`);
  }
}

/**
 * Updates a player's information
 * @param {string|number} id - Player ID
 * @param {Object} updateData - Data to update
 * @returns {Object} - Updated player object
 * @throws {Error} - Validation or database errors
 */
export async function updatePlayer(id, updateData) {
  try {
    // Validate ID format
    if (!isValidUserId(id)) {
      throw new Error('Invalid player ID format');
    }

    // Validate that update data is provided
    if (!updateData || Object.keys(updateData).length === 0) {
      throw new Error('No update data provided');
    }

    // Convert to integer for database query
    const playerId = parseInt(id, 10);

    const updatedPlayer = await prisma.user.update({
      where: { id: playerId },
      data: updateData
    });

    logger.info(`[playerModel.updatePlayer] Successfully updated player: ${updatedPlayer.name} (ID: ${id})`);
    return updatedPlayer;

  } catch (error) {
    if (error.message.startsWith('Invalid') || error.message.startsWith('No update')) {
      // Re-throw validation errors as-is
      throw error;
    }
    
    // Log and re-throw database errors
    logger.error('[playerModel.updatePlayer] Database error: %o', error);
    throw new Error(`Database error in updatePlayer: ${error.message}`);
  }
}

/**
 * Deletes a player from the database
 * @param {string|number} id - Player ID
 * @returns {Object} - Deleted player object
 * @throws {Error} - Validation or database errors
 */
export async function deletePlayer(id) {
  try {
    // Validate ID format
    if (!isValidUserId(id)) {
      throw new Error('Invalid player ID format');
    }

    // Convert to integer for database query
    const playerId = parseInt(id, 10);

    const deletedPlayer = await prisma.user.delete({
      where: { id: playerId }
    });

    logger.info(`[playerModel.deletePlayer] Successfully deleted player: ${deletedPlayer.name} (ID: ${id})`);
    return deletedPlayer;

  } catch (error) {
    if (error.message.startsWith('Invalid')) {
      // Re-throw validation errors as-is
      throw error;
    }
    
    // Log and re-throw database errors
    logger.error('[playerModel.deletePlayer] Database error: %o', error);
    throw new Error(`Database error in deletePlayer: ${error.message}`);
  }
}

/**
 * Adds XP to a player's experience points
 * @param {string|number} playerId - Player ID
 * @param {number} amount - Amount of XP to add (must be positive)
 * @returns {Object} - Updated player object
 * @throws {Error} - Validation or database errors
 */
export async function addXp(playerId, amount) {
  try {
    // Validate ID format
    if (!isValidUserId(playerId)) {
      throw new Error('Invalid player ID format');
    }

    // Validate amount
    if (typeof amount !== 'number' || amount <= 0) {
      throw new Error('XP amount must be a positive number');
    }

    // Convert to integer for database query
    const playerIdInt = parseInt(playerId, 10);

    // Get current player data
    const currentPlayer = await prisma.user.findUnique({
      where: { id: playerIdInt }
    });

    if (!currentPlayer) {
      throw new Error('Player not found');
    }

    // Calculate new XP
    const newXp = currentPlayer.xp + amount;

    // Update player with new XP
    const updatedPlayer = await prisma.user.update({
      where: { id: playerIdInt },
      data: { xp: newXp }
    });

    logger.info(`[playerModel.addXp] Added ${amount} XP to player ${updatedPlayer.name} (ID: ${playerId}). New XP: ${newXp}`);
    return updatedPlayer;

  } catch (error) {
    if (error.message.startsWith('Invalid') || error.message.startsWith('XP amount') || error.message.startsWith('Player not found')) {
      // Re-throw validation errors as-is
      throw error;
    }
    
    // Log and re-throw database errors
    logger.error('[playerModel.addXp] Database error: %o', error);
    throw new Error(`Database error in addXp: ${error.message}`);
  }
}

/**
 * Checks if a player should level up based on their XP and levels them up if needed
 * @param {string|number} playerId - Player ID
 * @returns {Object} - Object with leveledUp boolean and updated player data
 * @throws {Error} - Validation or database errors
 */
export async function levelUpIfNeeded(playerId) {
  try {
    // Validate ID format
    if (!isValidUserId(playerId)) {
      throw new Error('Invalid player ID format');
    }

    // Convert to integer for database query
    const playerIdInt = parseInt(playerId, 10);

    // Get current player data
    const currentPlayer = await prisma.user.findUnique({
      where: { id: playerIdInt }
    });

    if (!currentPlayer) {
      throw new Error('Player not found');
    }

    // Calculate XP needed for next level (simple formula: level * 1000)
    const xpForNextLevel = currentPlayer.level * 1000;
    
    if (currentPlayer.xp >= xpForNextLevel) {
      // Player should level up
      const newLevel = currentPlayer.level + 1;
      
      const updatedPlayer = await prisma.user.update({
        where: { id: playerIdInt },
        data: { level: newLevel }
      });

      logger.info(`[playerModel.levelUpIfNeeded] Player ${updatedPlayer.name} (ID: ${playerId}) leveled up to level ${newLevel}!`);
      
      return {
        leveledUp: true,
        player: updatedPlayer,
        previousLevel: currentPlayer.level,
        newLevel: newLevel
      };
    } else {
      // No level up needed
      logger.info(`[playerModel.levelUpIfNeeded] Player ${currentPlayer.name} (ID: ${playerId}) does not need to level up. XP: ${currentPlayer.xp}/${xpForNextLevel}`);
      
      return {
        leveledUp: false,
        player: currentPlayer,
        xpNeeded: xpForNextLevel - currentPlayer.xp
      };
    }

  } catch (error) {
    if (error.message.startsWith('Invalid') || error.message.startsWith('Player not found')) {
      // Re-throw validation errors as-is
      throw error;
    }
    
    // Log and re-throw database errors
    logger.error('[playerModel.levelUpIfNeeded] Database error: %o', error);
    throw new Error(`Database error in levelUpIfNeeded: ${error.message}`);
  }
} 