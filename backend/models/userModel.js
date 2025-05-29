import prisma from '../db/index.js';
import logger from '../utils/logger.js';
import { DatabaseError } from '../errors/index.js';

const DEFAULT_XP_PER_LEVEL = 100;

// XP logic helper
function xpThreshold(level) {
  return DEFAULT_XP_PER_LEVEL; // Can be expanded later
}

// Core: Create a new user
export async function createUser(userData) {
  try {
    const { username, email, password } = userData;
    if (!username || !email || !password) {
      throw new Error('Username, email, and password are required.');
    }

    const newUser = await prisma.user.create({ data: userData });
    logger.info(`[createUser] User created: ${newUser.username}`);
    return newUser;
  } catch (error) {
    if (error.code === 'P2002') {
      const field = error.meta?.target?.join(', ') || 'field';
      throw new Error(`Duplicate value for ${field}.`);
    }
    logger.error(`[createUser] Error: ${error.message}`);
    throw new DatabaseError(`Create user failed: ${error.message}`);
  }
}

// Core: Get user by ID (no relations)
export async function getUserById(id) {
  try {
    if (!id) {throw new Error('User ID is required.');}
    return await prisma.user.findUnique({ where: { id } });
  } catch (error) {
    logger.error(`[getUserById] Error: ${error.message}`);
    throw new DatabaseError(`Lookup failed: ${error.message}`);
  }
}

// Core: Get user with horses
export async function getUserWithHorses(id) {
  try {
    if (!id) {throw new Error('User ID is required.');}
    return await prisma.user.findUnique({
      where: { id },
      include: {
        horses: { include: { breed: true, stable: true } }
      }
    });
  } catch (error) {
    logger.error(`[getUserWithHorses] Error: ${error.message}`);
    throw new DatabaseError(`Lookup failed: ${error.message}`);
  }
}

// Core: Get user by email
export async function getUserByEmail(email) {
  try {
    if (!email) {throw new Error('Email required.');}
    return await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });
  } catch (error) {
    logger.error(`[getUserByEmail] Error: ${error.message}`);
    throw new DatabaseError(`Lookup failed: ${error.message}`);
  }
}

// Core: Update user
export async function updateUser(id, updateData) {
  try {
    if (!id) {throw new Error('User ID is required.');}
    delete updateData.id;
    delete updateData.createdAt;

    return await prisma.user.update({
      where: { id },
      data: updateData
    });
  } catch (error) {
    logger.error(`[updateUser] Error: ${error.message}`);
    throw new DatabaseError(`Update failed: ${error.message}`);
  }
}

// Core: Delete user
export async function deleteUser(id) {
  try {
    if (!id) {throw new Error('User ID is required.');}
    return await prisma.user.delete({ where: { id } });
  } catch (error) {
    logger.error(`[deleteUser] Error: ${error.message}`);
    throw new DatabaseError(`Delete failed: ${error.message}`);
  }
}

// XP/Level: Add XP and level up if needed
export async function addXpToUser(userId, amount) {
  try {
    if (!userId) {throw new Error('User ID is required.');}
    if (typeof amount !== 'number' || amount <= 0) {
      throw new Error('XP amount must be a positive number.');
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {throw new Error('User not found.');}

    let { xp, level } = user;
    let levelsGained = 0;
    let leveledUp = false;

    xp += amount;

    while (xp >= xpThreshold(level)) {
      xp -= xpThreshold(level);
      level++;
      levelsGained++;
      leveledUp = true;
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { xp, level }
    });

    return {
      success: true,
      currentXP: updated.xp,
      currentLevel: updated.level,
      leveledUp,
      levelsGained,
      xpGained: amount
    };
  } catch (error) {
    logger.error(`[addXpToUser] Error: ${error.message}`);
    return {
      success: false,
      error: error.message,
      currentXP: null,
      currentLevel: null,
      leveledUp: false,
      levelsGained: 0
    };
  }
}

// Get XP progress
export async function getUserProgress(userId) {
  try {
    const user = await getUserById(userId);
    if (!user) {throw new Error('User not found.');}

    const threshold = xpThreshold(user.level);
    return {
      userId: user.id,
      level: user.level,
      xp: user.xp,
      xpToNextLevel: threshold - user.xp,
      xpForCurrentLevel: threshold
    };
  } catch (error) {
    throw new DatabaseError(`Progress fetch failed: ${error.message}`);
  }
}

// Get full stats
export async function getUserStats(userId) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { horses: true }
    });
    if (!user) {return null;}

    const horseCount = user.horses.length;
    const averageHorseAge = horseCount
      ? parseFloat((user.horses.reduce((acc, h) => acc + h.age, 0) / horseCount).toFixed(2))
      : 0;

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      name: user.name,
      createdAt: user.createdAt,
      money: user.money,
      level: user.level,
      xp: user.xp,
      horseCount,
      averageHorseAge
    };
  } catch (error) {
    throw new DatabaseError(`Stats fetch failed: ${error.message}`);
  }
}

// Deprecated — use addXpToUser
export async function addUserXp(userId, amount) {
  logger.warn('[addUserXp] DEPRECATED: Use addXpToUser instead.');
  return addXpToUser(userId, amount);
}

export async function checkAndLevelUpUser(userId) {
  logger.warn('[checkAndLevelUpUser] DEPRECATED: XP is auto-managed now.');
  const user = await getUserById(userId);
  return {
    ...user,
    leveledUp: false,
    levelsGained: 0,
    message: 'Deprecated: use addXpToUser.'
  };
}

export default {
  createUser,
  getUserById,
  getUserWithHorses,
  getUserByEmail,
  updateUser,
  deleteUser,
  addXpToUser,
  getUserProgress,
  getUserStats,
  addUserXp,
  checkAndLevelUpUser
};
