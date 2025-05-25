import prisma from '../db/index.js';
import logger from './logger.js';

/**
 * Update player money from entry fees
 * @param {string} playerId - Player ID (UUID)
 * @param {number} amount - Amount to add to player's money
 * @returns {Object} - Updated player object
 */
async function updatePlayerMoney(playerId, amount) {
  try {
    if (!playerId || typeof playerId !== 'string') {
      throw new Error('Valid player ID is required');
    }

    if (!amount || typeof amount !== 'number' || amount < 0) {
      throw new Error('Valid amount is required');
    }

    const updatedPlayer = await prisma.player.update({
      where: { id: playerId },
      data: {
        money: {
          increment: amount
        }
      }
    });

    logger.info(`[playerUpdates.updatePlayerMoney] Updated player ${playerId} money by $${amount} (total: $${updatedPlayer.money})`);
    return updatedPlayer;

  } catch (error) {
    if (error.code === 'P2025') {
      logger.error(`[playerUpdates.updatePlayerMoney] Player not found: ${playerId}`);
      throw new Error(`Player not found: ${playerId}`);
    }
    
    logger.error(`[playerUpdates.updatePlayerMoney] Error updating player money: ${error.message}`);
    throw error;
  }
}

/**
 * Transfer entry fees to host player
 * @param {string} hostPlayerId - Host player ID (UUID)
 * @param {number} entryFee - Entry fee per horse
 * @param {number} numEntries - Number of horses entered
 * @returns {Object} - Updated player object
 */
async function transferEntryFees(hostPlayerId, entryFee, numEntries) {
  try {
    if (!hostPlayerId) {
      logger.info(`[playerUpdates.transferEntryFees] No host player specified, entry fees not transferred`);
      return null;
    }

    const totalFees = entryFee * numEntries;
    const updatedPlayer = await updatePlayerMoney(hostPlayerId, totalFees);

    logger.info(`[playerUpdates.transferEntryFees] Transferred $${totalFees} in entry fees to host player ${hostPlayerId}`);
    return updatedPlayer;

  } catch (error) {
    logger.error(`[playerUpdates.transferEntryFees] Error transferring entry fees: ${error.message}`);
    throw error;
  }
}

export {
  updatePlayerMoney,
  transferEntryFees
}; 