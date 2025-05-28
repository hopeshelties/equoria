import { jest } from '@jest/globals';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Mock modules
jest.unstable_mockModule(join(__dirname, '../db/index.js'), () => ({
  default: {
    player: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn()
    }
  }
}));

jest.unstable_mockModule(join(__dirname, '../utils/logger.js'), () => ({
  default: {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn()
  }
}));

// Import modules after mocking
const { createPlayer, getPlayerById, getPlayerByEmail, getPlayerWithHorses, updatePlayer, deletePlayer, addXp, levelUpIfNeeded } = await import(join(__dirname, './playerModel.js'));
const mockPrisma = (await import(join(__dirname, '../db/index.js'))).default;
const mockLogger = (await import(join(__dirname, '../utils/logger.js'))).default;

describe('playerModel', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    mockPrisma.player.create.mockClear();
    mockPrisma.player.findUnique.mockClear();
    mockPrisma.player.findMany.mockClear();
    mockPrisma.player.update.mockClear();
    mockPrisma.player.delete.mockClear();
    mockLogger.error.mockClear();
    mockLogger.info.mockClear();
    mockLogger.warn.mockClear();
  });

  describe('createPlayer', () => {
    it('should create a player with all required fields and return it', async() => {
      const playerData = {
        name: 'Test Player',
        email: 'test@example.com',
        money: 1000,
        level: 1,
        xp: 0,
        settings: { theme: 'light', notifications: true }
      };

      const expectedPlayer = {
        id: 'test-id-create-success',
        name: 'Test Player',
        email: 'test@example.com',
        money: 1000,
        level: 1,
        xp: 0,
        settings: { theme: 'light', notifications: true }
      };

      mockPrisma.player.create.mockResolvedValue(expectedPlayer);

      const result = await createPlayer(playerData);

      expect(mockPrisma.player.create).toHaveBeenCalledTimes(1);
      expect(mockPrisma.player.create).toHaveBeenCalledWith({
        data: playerData
      });
      expect(result).toEqual(expectedPlayer);
      expect(mockLogger.info).toHaveBeenCalledWith('[playerModel.createPlayer] Successfully created player: Test Player (ID: test-id-create-success)');
    });

    it('should throw an error if name is missing', async() => {
      const playerData = {
        email: 'test@example.com',
        money: 1000,
        level: 1,
        xp: 0,
        settings: {}
      };

      await expect(createPlayer(playerData)).rejects.toThrow('Player name is required');
      expect(mockPrisma.player.create).not.toHaveBeenCalled();
    });

    it('should throw an error if email is missing', async() => {
      const playerData = {
        name: 'Test Player',
        money: 1000,
        level: 1,
        xp: 0,
        settings: {}
      };

      await expect(createPlayer(playerData)).rejects.toThrow('Player email is required');
      expect(mockPrisma.player.create).not.toHaveBeenCalled();
    });

    it('should throw an error if email format is invalid', async() => {
      const playerData = {
        name: 'Test Player',
        email: 'invalid-email',
        money: 1000,
        level: 1,
        xp: 0,
        settings: {}
      };

      await expect(createPlayer(playerData)).rejects.toThrow('Invalid email format');
      expect(mockPrisma.player.create).not.toHaveBeenCalled();
    });

    it('should throw an error if money is not provided', async() => {
      const playerData = {
        name: 'Test Player',
        email: 'test@example.com',
        level: 1,
        xp: 0,
        settings: {}
      };

      await expect(createPlayer(playerData)).rejects.toThrow('Player money is required');
      expect(mockPrisma.player.create).not.toHaveBeenCalled();
    });

    it('should throw an error if level is not provided', async() => {
      const playerData = {
        name: 'Test Player',
        email: 'test@example.com',
        money: 1000,
        xp: 0,
        settings: {}
      };

      await expect(createPlayer(playerData)).rejects.toThrow('Player level is required');
      expect(mockPrisma.player.create).not.toHaveBeenCalled();
    });

    it('should throw an error if xp is not provided', async() => {
      const playerData = {
        name: 'Test Player',
        email: 'test@example.com',
        money: 1000,
        level: 1,
        settings: {}
      };

      await expect(createPlayer(playerData)).rejects.toThrow('Player xp is required');
      expect(mockPrisma.player.create).not.toHaveBeenCalled();
    });

    it('should throw an error if settings is not provided', async() => {
      const playerData = {
        name: 'Test Player',
        email: 'test@example.com',
        money: 1000,
        level: 1,
        xp: 0
      };

      await expect(createPlayer(playerData)).rejects.toThrow('Player settings is required');
      expect(mockPrisma.player.create).not.toHaveBeenCalled();
    });

    it('should throw an error if money is negative', async() => {
      const playerData = {
        name: 'Test Player',
        email: 'test@example.com',
        money: -100,
        level: 1,
        xp: 0,
        settings: {}
      };

      await expect(createPlayer(playerData)).rejects.toThrow('Player money must be non-negative');
      expect(mockPrisma.player.create).not.toHaveBeenCalled();
    });

    it('should throw an error if level is less than 1', async() => {
      const playerData = {
        name: 'Test Player',
        email: 'test@example.com',
        money: 1000,
        level: 0,
        xp: 0,
        settings: {}
      };

      await expect(createPlayer(playerData)).rejects.toThrow('Player level must be at least 1');
      expect(mockPrisma.player.create).not.toHaveBeenCalled();
    });

    it('should throw an error if xp is negative', async() => {
      const playerData = {
        name: 'Test Player',
        email: 'test@example.com',
        money: 1000,
        level: 1,
        xp: -50,
        settings: {}
      };

      await expect(createPlayer(playerData)).rejects.toThrow('Player xp must be non-negative');
      expect(mockPrisma.player.create).not.toHaveBeenCalled();
    });

    it('should throw an error if Prisma client fails to create', async() => {
      const playerData = {
        name: 'Error Player',
        email: 'error@example.com',
        money: 1000,
        level: 1,
        xp: 0,
        settings: {}
      };

      const dbError = new Error('DB create error');
      mockPrisma.player.create.mockRejectedValue(dbError);

      await expect(createPlayer(playerData)).rejects.toThrow('Database error in createPlayer: DB create error');
      expect(mockLogger.error).toHaveBeenCalledTimes(1);
      expect(mockLogger.error).toHaveBeenCalledWith('[playerModel.createPlayer] Database error: %o', dbError);
    });
  });

  describe('getPlayerById', () => {
    it('should return a player if found by ID', async() => {
      const playerId = 'test-getid-found';
      const expectedPlayer = {
        id: playerId,
        name: 'Found Player',
        email: 'found@example.com',
        money: 1500,
        level: 5,
        xp: 1200,
        settings: { theme: 'dark' }
      };

      mockPrisma.player.findUnique.mockResolvedValue(expectedPlayer);

      const result = await getPlayerById(playerId);

      expect(mockPrisma.player.findUnique).toHaveBeenCalledTimes(1);
      expect(mockPrisma.player.findUnique).toHaveBeenCalledWith({
        where: { id: playerId }
      });
      expect(result).toEqual(expectedPlayer);
      expect(mockLogger.info).toHaveBeenCalledWith(`[playerModel.getPlayerById] Successfully found player: Found Player (ID: ${playerId})`);
    });

    it('should return null if player is not found by ID', async() => {
      const playerId = 'test-getid-notfound';
      mockPrisma.player.findUnique.mockResolvedValue(null);

      const result = await getPlayerById(playerId);

      expect(mockPrisma.player.findUnique).toHaveBeenCalledTimes(1);
      expect(mockPrisma.player.findUnique).toHaveBeenCalledWith({
        where: { id: playerId }
      });
      expect(result).toBeNull();
      expect(mockLogger.info).not.toHaveBeenCalled();
    });

    it('should throw an error for invalid ID format', async() => {
      const invalidId = 'plain-invalid-id';
      await expect(getPlayerById(invalidId)).rejects.toThrow('Invalid player ID format');
      expect(mockPrisma.player.findUnique).not.toHaveBeenCalled();
    });

    it('should throw an error if Prisma client fails to find by ID', async() => {
      const playerId = 'test-getid-dbfail';
      const dbError = new Error('DB findUnique error');
      mockPrisma.player.findUnique.mockRejectedValue(dbError);

      await expect(getPlayerById(playerId)).rejects.toThrow('Database error in getPlayerById: DB findUnique error');
      expect(mockLogger.error).toHaveBeenCalledTimes(1);
      expect(mockLogger.error).toHaveBeenCalledWith('[playerModel.getPlayerById] Database error: %o', dbError);
    });
  });

  describe('getPlayerByEmail', () => {
    it('should return a player if found by email', async() => {
      const email = 'test@example.com';
      const expectedPlayer = {
        id: 'test-getemail-found',
        name: 'Test Player',
        email,
        money: 1500,
        level: 3,
        xp: 750,
        settings: { notifications: true }
      };

      mockPrisma.player.findUnique.mockResolvedValue(expectedPlayer);

      const result = await getPlayerByEmail(email);

      expect(mockPrisma.player.findUnique).toHaveBeenCalledTimes(1);
      expect(mockPrisma.player.findUnique).toHaveBeenCalledWith({
        where: { email }
      });
      expect(result).toEqual(expectedPlayer);
      expect(mockLogger.info).toHaveBeenCalledWith(`[playerModel.getPlayerByEmail] Successfully found player: Test Player (Email: ${email})`);
    });

    it('should return null if player is not found by email', async() => {
      const email = 'nonexistent@example.com';
      mockPrisma.player.findUnique.mockResolvedValue(null);

      const result = await getPlayerByEmail(email);

      expect(result).toBeNull();
      expect(mockLogger.info).not.toHaveBeenCalled();
    });

    it('should throw an error for invalid email format', async() => {
      const invalidEmail = 'invalid-email';
      await expect(getPlayerByEmail(invalidEmail)).rejects.toThrow('Invalid email format');
      expect(mockPrisma.player.findUnique).not.toHaveBeenCalled();
    });
  });

  describe('getPlayerWithHorses', () => {
    it('should return a player with their horses', async() => {
      const playerId = 'test-gethorses-found';
      const expectedPlayer = {
        id: playerId,
        name: 'Player with Horses',
        email: 'horses@example.com',
        money: 2500,
        level: 8,
        xp: 2000,
        settings: { showStats: true },
        horses: [
          { id: 1, name: 'Thunder', breed: { name: 'Thoroughbred' } },
          { id: 2, name: 'Lightning', breed: { name: 'Arabian' } }
        ]
      };

      mockPrisma.player.findUnique.mockResolvedValue(expectedPlayer);

      const result = await getPlayerWithHorses(playerId);

      expect(mockPrisma.player.findUnique).toHaveBeenCalledTimes(1);
      expect(mockPrisma.player.findUnique).toHaveBeenCalledWith({
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
      expect(result).toEqual(expectedPlayer);
      expect(mockLogger.info).toHaveBeenCalledWith(`[playerModel.getPlayerWithHorses] Successfully found player with horses: Player with Horses (ID: ${playerId}, Horses: 2)`);
    });

    it('should return null if player is not found', async() => {
      const playerId = 'test-gethorses-notfound';
      mockPrisma.player.findUnique.mockResolvedValue(null);

      const result = await getPlayerWithHorses(playerId);

      expect(result).toBeNull();
      expect(mockLogger.info).not.toHaveBeenCalled();
    });

    it('should throw an error for invalid UUID format', async() => {
      const invalidId = 'plain-invalid-id-horses';
      await expect(getPlayerWithHorses(invalidId)).rejects.toThrow('Invalid player ID format');
      expect(mockPrisma.player.findUnique).not.toHaveBeenCalled();
    });
  });

  describe('updatePlayer', () => {
    it('should update player fields and return updated player', async() => {
      const playerId = 'test-update-success';
      const updateData = {
        money: 15000,
        level: 10,
        xp: 5000,
        settings: { theme: 'dark', notifications: true }
      };

      const expectedPlayer = {
        id: playerId,
        name: 'Updated Player',
        email: 'updated@example.com',
        ...updateData
      };

      mockPrisma.player.update.mockResolvedValue(expectedPlayer);

      const result = await updatePlayer(playerId, updateData);

      expect(mockPrisma.player.update).toHaveBeenCalledTimes(1);
      expect(mockPrisma.player.update).toHaveBeenCalledWith({
        where: { id: playerId },
        data: updateData
      });
      expect(result).toEqual(expectedPlayer);
      expect(mockLogger.info).toHaveBeenCalledWith(`[playerModel.updatePlayer] Successfully updated player: Updated Player (ID: ${playerId})`);
    });

    it('should throw an error for invalid UUID format', async() => {
      const invalidId = 'plain-invalid-id-update';
      const updateData = { money: 5000 };

      await expect(updatePlayer(invalidId, updateData)).rejects.toThrow('Invalid player ID format');
      expect(mockPrisma.player.update).not.toHaveBeenCalled();
    });

    it('should throw an error if no update data provided', async() => {
      const playerId = 'test-update-nodata';

      await expect(updatePlayer(playerId, {})).rejects.toThrow('No update data provided');
      expect(mockPrisma.player.update).not.toHaveBeenCalled();
    });

    it('should throw an error if Prisma client fails to update', async() => {
      const playerId = 'test-update-dbfail';
      const updateData = { money: 5000 };
      const dbError = new Error('DB update error');
      mockPrisma.player.update.mockRejectedValue(dbError);

      await expect(updatePlayer(playerId, updateData)).rejects.toThrow('Database error in updatePlayer: DB update error');
      expect(mockLogger.error).toHaveBeenCalledTimes(1);
      expect(mockLogger.error).toHaveBeenCalledWith('[playerModel.updatePlayer] Database error: %o', dbError);
    });
  });

  describe('deletePlayer', () => {
    it('should delete a player and return the deleted player', async() => {
      const playerId = 'test-delete-success';
      const deletedPlayer = {
        id: playerId,
        name: 'Deleted Player',
        email: 'deleted@example.com',
        money: 1000,
        level: 1,
        xp: 0,
        settings: {}
      };

      mockPrisma.player.delete.mockResolvedValue(deletedPlayer);

      const result = await deletePlayer(playerId);

      expect(mockPrisma.player.delete).toHaveBeenCalledTimes(1);
      expect(mockPrisma.player.delete).toHaveBeenCalledWith({
        where: { id: playerId }
      });
      expect(result).toEqual(deletedPlayer);
      expect(mockLogger.info).toHaveBeenCalledWith(`[playerModel.deletePlayer] Successfully deleted player: Deleted Player (ID: ${playerId})`);
    });

    it('should throw an error for invalid UUID format', async() => {
      const invalidId = 'plain-invalid-id-delete';

      await expect(deletePlayer(invalidId)).rejects.toThrow('Invalid player ID format');
      expect(mockPrisma.player.delete).not.toHaveBeenCalled();
    });

    it('should throw an error if Prisma client fails to delete', async() => {
      const playerId = 'test-delete-dbfail';
      const dbError = new Error('DB delete error');

      mockPrisma.player.delete.mockRejectedValue(dbError);

      await expect(deletePlayer(playerId)).rejects.toThrow('Database error in deletePlayer: DB delete error');
      expect(mockLogger.error).toHaveBeenCalledTimes(1);
      expect(mockLogger.error).toHaveBeenCalledWith('[playerModel.deletePlayer] Database error: %o', dbError);
    });
  });

  describe('addXp', () => {
    it('should add XP to a player without leveling up', async() => {
      const playerId = 'test-addxp-nolevelup';
      const currentPlayer = {
        id: playerId,
        name: 'Test Player',
        email: 'test@example.com',
        money: 1000,
        level: 1,
        xp: 50,
        settings: {}
      };
      const updatedPlayer = { ...currentPlayer, xp: 70 };

      mockPrisma.player.findUnique.mockResolvedValue(currentPlayer);
      mockPrisma.player.update.mockResolvedValue(updatedPlayer);

      const result = await addXp(playerId, 20);

      expect(mockPrisma.player.findUnique).toHaveBeenCalledWith({ where: { id: playerId } });
      expect(mockPrisma.player.update).toHaveBeenCalledWith({
        where: { id: playerId },
        data: { xp: 70 }
      });
      expect(result.success).toBe(true);
      expect(result.newXp).toBe(70);
      expect(result.leveledUp).toBe(false);
    });

    it('should add XP and level up once when reaching 100 XP', async() => {
      const playerId = 'test-addxp-levelup1';
      const currentPlayer = {
        id: playerId,
        name: 'Test Player',
        level: 1,
        xp: 80,
        settings: {}
      };
      const updatedPlayer = { ...currentPlayer, level: 2, xp: 0 };


      mockPrisma.player.findUnique.mockResolvedValue(currentPlayer);
      mockPrisma.player.update.mockResolvedValue(updatedPlayer);

      const result = await addXp(playerId, 20);

      expect(mockPrisma.player.update).toHaveBeenCalledWith({
        where: { id: playerId },
        data: { xp: 0, level: 2 }
      });
      expect(result.success).toBe(true);
      expect(result.newLevel).toBe(2);
      expect(result.newXp).toBe(0);
      expect(result.leveledUp).toBe(true);
      expect(result.levelsGained).toBe(1);
    });

    it('should add XP and level up multiple times for large XP gains', async() => {
      const playerId = 'test-addxp-levelupmulti';
      const currentPlayer = {
        id: playerId,
        name: 'Test Player',
        level: 1,
        xp: 50,
        settings: {}
      };
      // XP: 50 + 220 = 270. Level 1 -> 2 (170xp), Level 2 -> 3 (70xp). New Level 3, New XP 70.
      const updatedPlayer = { ...currentPlayer, level: 3, xp: 70 };


      mockPrisma.player.findUnique.mockResolvedValue(currentPlayer);
      mockPrisma.player.update.mockResolvedValue(updatedPlayer);

      const result = await addXp(playerId, 220);

      expect(mockPrisma.player.update).toHaveBeenCalledWith({
        where: { id: playerId },
        data: { xp: 70, level: 3 }
      });
      expect(result.success).toBe(true);
      expect(result.newLevel).toBe(3);
      expect(result.newXp).toBe(70);
      expect(result.leveledUp).toBe(true);
      expect(result.levelsGained).toBe(2);
    });

    it('should return error for invalid player ID format', async() => {
      const invalidId = 'plain-invalid-id-addxp';
      const result = await addXp(invalidId, 20);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid player ID format');
      expect(mockPrisma.player.findUnique).not.toHaveBeenCalled();
    });

    it('should return error for negative XP amount', async() => {
      const playerId = 'test-addxp-negxp';
      const result = await addXp(playerId, -10);
      expect(result.success).toBe(false);
      expect(result.error).toBe('XP amount must be positive');
      expect(mockPrisma.player.findUnique).not.toHaveBeenCalled(); // findUnique is not called if XP is invalid before that
    });

    it('should return error for non-numeric XP amount', async() => {
      const playerId = 'test-addxp-nonnumericxp';
      const result = await addXp(playerId, 'invalid-xp');
      expect(result.success).toBe(false);
      expect(result.error).toBe('XP amount must be positive');
      expect(mockPrisma.player.findUnique).not.toHaveBeenCalled();
    });

    it('should return error if player not found', async() => {
      const playerId = 'test-addxp-playernotfound';
      mockPrisma.player.findUnique.mockResolvedValue(null);
      const result = await addXp(playerId, 20);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Player not found');
      expect(mockPrisma.player.update).not.toHaveBeenCalled();
    });

    it('should return error if database update fails', async() => {
      const playerId = 'test-addxp-dbupdatefail';
      const currentPlayer = { id: playerId, name: 'Test Player', level: 1, xp: 50, settings: {} };
      const dbError = new Error('DB update error');

      mockPrisma.player.findUnique.mockResolvedValue(currentPlayer);
      mockPrisma.player.update.mockRejectedValue(dbError);

      const result = await addXp(playerId, 20);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Database error in addXp: DB update error');
    });
  });

  describe('levelUpIfNeeded', () => {
    it('should not level up if player has less than 100 XP', async() => {
      const playerId = 'test-levelup-nolevel';
      const currentPlayer = {
        id: playerId, name: 'Test Player', level: 1, xp: 50, settings: {}
      };
      mockPrisma.player.findUnique.mockResolvedValue(currentPlayer);
      const result = await levelUpIfNeeded(playerId);

      expect(mockPrisma.player.findUnique).toHaveBeenCalledWith({ where: { id: playerId } });
      expect(mockPrisma.player.update).not.toHaveBeenCalled();
      expect(result.leveledUp).toBe(false);
      expect(result.levelsGained).toBe(0);
      expect(result.xp).toBe(50); // Ensure current XP is returned
    });

    it('should level up once when player has exactly 100 XP', async() => {
      const playerId = 'test-levelup-100xp';
      const currentPlayer = {
        id: playerId, name: 'Test Player', level: 1, xp: 100, settings: {}
      };
      const updatedPlayer = { ...currentPlayer, level: 2, xp: 0 };

      mockPrisma.player.findUnique.mockResolvedValue(currentPlayer);
      mockPrisma.player.update.mockResolvedValue(updatedPlayer);

      const result = await levelUpIfNeeded(playerId);

      expect(mockPrisma.player.update).toHaveBeenCalledWith({
        where: { id: playerId },
        data: { level: 2, xp: 0 }
      });
      expect(result.leveledUp).toBe(true);
      expect(result.levelsGained).toBe(1);
      expect(result.level).toBe(2);
      expect(result.xp).toBe(0);
    });

    it('should level up multiple times when player has more than 200 XP', async() => {
      const playerId = 'test-levelup-multixp';
      const currentPlayer = {
        id: playerId, name: 'Test Player', level: 1, xp: 250, settings: {}
      };
      // 250xp -> level 2 (150xp), level 3 (50xp). Result: level 3, 50xp
      const updatedPlayer = { ...currentPlayer, level: 3, xp: 50 };

      mockPrisma.player.findUnique.mockResolvedValue(currentPlayer);
      mockPrisma.player.update.mockResolvedValue(updatedPlayer);

      const result = await levelUpIfNeeded(playerId);

      expect(mockPrisma.player.update).toHaveBeenCalledWith({
        where: { id: playerId },
        data: { level: 3, xp: 50 }
      });
      expect(result.leveledUp).toBe(true);
      expect(result.levelsGained).toBe(2);
      expect(result.level).toBe(3);
      expect(result.xp).toBe(50);
    });

    it('should throw an error for invalid player ID format', async() => {
      const invalidId = 'plain-invalid-id-levelup';
      await expect(levelUpIfNeeded(invalidId)).rejects.toThrow('Invalid player ID format');
      expect(mockPrisma.player.findUnique).not.toHaveBeenCalled();
    });

    it('should throw an error if player not found', async() => {
      const playerId = 'test-levelup-playernotfound';
      mockPrisma.player.findUnique.mockResolvedValue(null);
      await expect(levelUpIfNeeded(playerId)).rejects.toThrow('Player not found');
      expect(mockPrisma.player.update).not.toHaveBeenCalled();
    });

    it('should throw an error if database update fails', async() => {
      const playerId = 'test-levelup-dbupdatefail';
      const currentPlayer = { id: playerId, name: 'Test Player', level: 1, xp: 150, settings: {} };
      const dbError = new Error('DB update error');

      mockPrisma.player.findUnique.mockResolvedValue(currentPlayer);
      mockPrisma.player.update.mockRejectedValue(dbError);

      await expect(levelUpIfNeeded(playerId)).rejects.toThrow('Database error in levelUpIfNeeded: DB update error');
    });
  });
});
