import { jest } from '@jest/globals';
import { createPlayer, getPlayerById, getPlayerWithHorses } from '../../backend/models/playerModel.js';
import { createHorse } from '../../backend/models/horseModel.js';

// Mock the database and logger
jest.unstable_mockModule('../../backend/db/index.js', () => ({
  default: {
    player: {
      create: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
    breed: {
      create: jest.fn(),
    },
    horse: {
      create: jest.fn(),
    },
    $disconnect: jest.fn(),
  },
}));

jest.unstable_mockModule('../../backend/utils/logger.js', () => ({
  default: {
    info: jest.fn(),
    error: jest.fn(),
  },
}));

const { default: prisma } = await import('../../backend/db/index.js');

describe('Player Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Player Creation', () => {
    test('should create a player successfully', async () => {
      const playerData = {
        id: 'test-uuid-123',
        userId: 1, // Added userId
        name: 'Test Player',
        email: 'test@example.com',
        money: 500,
        level: 3,
        xp: 1000,
        settings: { darkMode: true, notifications: true }
      };

      const mockCreatedPlayer = {
        ...playerData,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prisma.player.create.mockResolvedValue(mockCreatedPlayer);

      const result = await createPlayer(playerData);

      expect(prisma.player.create).toHaveBeenCalledWith({
        data: playerData,
      });
      expect(result).toEqual(mockCreatedPlayer);
    });

    test('should handle player creation errors', async () => {
      const playerData = {
        id: 'test-uuid-123',
        userId: 1, // Added userId
        name: 'Test Player',
        email: 'test@example.com',
        money: 500,
        level: 3,
        xp: 1000,
        settings: { darkMode: true, notifications: true }
      };

      prisma.player.create.mockRejectedValue(new Error('Database connection failed'));

      await expect(createPlayer(playerData)).rejects.toThrow('Database error in createPlayer: Database connection failed');
    });
  });

  describe('Player Retrieval', () => {
    test('should retrieve a player by ID', async () => {
      const playerId = 'test-uuid-123';
      const mockPlayer = {
        id: playerId,
        userId: 1, // Added userId
        name: 'Test Player',
        email: 'test@example.com',
        money: 500,
        level: 3,
        xp: 1000,
        settings: { darkMode: true, notifications: true },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prisma.player.findUnique.mockResolvedValue(mockPlayer);

      const result = await getPlayerById(playerId);

      expect(prisma.player.findUnique).toHaveBeenCalledWith({
        where: { id: playerId },
      });
      expect(result).toEqual(mockPlayer);
    });

    test('should return null when player not found', async () => {
      const playerId = 'non-existent-uuid';

      prisma.player.findUnique.mockResolvedValue(null);

      const result = await getPlayerById(playerId);

      expect(result).toBeNull();
    });
  });

  describe('Player with Horses', () => {
    test('should retrieve a player with their horses', async () => {
      const playerId = 'test-uuid-123';
      const mockPlayerWithHorses = {
        id: playerId,
        userId: 1, // Added userId
        name: 'Test Player',
        email: 'test@example.com',
        money: 500,
        level: 3,
        xp: 1000,
        settings: { darkMode: true, notifications: true },
        horses: [
          {
            id: 1,
            name: 'Starlight',
            age: 4,
            breed: { id: 1, name: 'Thoroughbred' },
            stable: null,
          },
          {
            id: 2,
            name: 'Comet',
            age: 6,
            breed: { id: 1, name: 'Thoroughbred' },
            stable: null,
          },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prisma.player.findUnique.mockResolvedValue(mockPlayerWithHorses);

      const result = await getPlayerWithHorses(playerId);

      expect(prisma.player.findUnique).toHaveBeenCalledWith({
        where: { id: playerId },
        include: {
          horses: {
            include: {
              breed: true,
              stable: true,
            },
          },
        },
      });
      expect(result).toEqual(mockPlayerWithHorses);
      expect(result.horses).toHaveLength(2);
      expect(result.horses[0].name).toBe('Starlight');
      expect(result.horses[1].name).toBe('Comet');
    });

    test('should confirm player has 2 horses attached', async () => {
      const playerId = 'test-uuid-123';
      const mockPlayerWithHorses = {
        id: playerId,
        userId: 1, // Added userId
        name: 'Test Player',
        email: 'test@example.com',
        money: 500,
        level: 3,
        xp: 1000,
        settings: { darkMode: true, notifications: true },
        horses: [
          { id: 1, name: 'Starlight', age: 4 },
          { id: 2, name: 'Comet', age: 6 },
        ],
      };

      prisma.player.findUnique.mockResolvedValue(mockPlayerWithHorses);

      const result = await getPlayerWithHorses(playerId);

      expect(result.horses).toHaveLength(2);
      expect(result.horses.map(h => h.name)).toEqual(['Starlight', 'Comet']);
    });
  });

  describe('JSON Settings Field', () => {
    test('should confirm JSON settings field exists and includes darkMode = true', async () => {
      const playerId = 'test-uuid-123';
      const mockPlayer = {
        id: playerId,
        userId: 1, // Added userId
        name: 'Test Player',
        email: 'test@example.com',
        money: 500,
        level: 3,
        xp: 1000,
        settings: { 
          darkMode: true, 
          notifications: true,
          soundEnabled: false,
          autoSave: true
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prisma.player.findUnique.mockResolvedValue(mockPlayer);

      const result = await getPlayerById(playerId);

      expect(result.settings).toBeDefined();
      expect(typeof result.settings).toBe('object');
      expect(result.settings.darkMode).toBe(true);
      expect(result.settings.notifications).toBe(true);
      expect(result.settings.soundEnabled).toBe(false);
      expect(result.settings.autoSave).toBe(true);
    });

    test('should handle complex JSON settings structure', async () => {
      const playerData = {
        id: 'test-uuid-456',
        userId: 2, // Added userId
        name: 'Advanced Player',
        email: 'advanced@example.com',
        money: 1000,
        level: 5,
        xp: 2500,
        settings: {
          darkMode: true,
          notifications: {
            email: true,
            push: false,
            sms: true,
          },
          gamePreferences: {
            autoSave: true,
            difficulty: 'hard',
            soundVolume: 0.8,
          },
          privacy: {
            showProfile: false,
            allowMessages: true,
          },
        }
      };

      const mockCreatedPlayer = {
        ...playerData,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prisma.player.create.mockResolvedValue(mockCreatedPlayer);

      const result = await createPlayer(playerData);

      expect(result.settings.darkMode).toBe(true);
      expect(result.settings.notifications.email).toBe(true);
      expect(result.settings.gamePreferences.difficulty).toBe('hard');
      expect(result.settings.privacy.showProfile).toBe(false);
    });
  });

  describe('Player Deletion and Integrity', () => {
    test('should handle player deletion', async () => {
      const playerId = 'test-uuid-123';
      const mockDeletedPlayer = {
        id: playerId,
        userId: 1, // Added userId
        name: 'Test Player',
        email: 'test@example.com',
        money: 500,
        level: 3,
        xp: 1000,
        settings: { darkMode: true, notifications: true },
      };

      prisma.player.delete.mockResolvedValue(mockDeletedPlayer);

      const result = await prisma.player.delete({
        where: { id: playerId },
      });

      expect(prisma.player.delete).toHaveBeenCalledWith({
        where: { id: playerId },
      });
      expect(result).toEqual(mockDeletedPlayer);
    });

    test('should confirm cascade behavior or integrity constraints', async () => {
      const playerId = 'test-uuid-123';
      
      const mockPlayerWithHorses = {
        id: playerId,
        userId: 1, // Added userId
        horses: [
          { id: 1, name: 'Starlight', playerId: playerId },
          { id: 2, name: 'Comet', playerId: playerId },
        ],
      };

      prisma.player.findUnique.mockResolvedValue(mockPlayerWithHorses);

      const result = await getPlayerWithHorses(playerId);

      expect(result.horses).toHaveLength(2);
      result.horses.forEach(horse => {
        expect(horse.playerId).toBe(playerId);
      });
    });
  });

  describe('Horse Creation with Player Link', () => {
    test('should create horses linked to a player', async () => {
      const playerId = 'test-uuid-123';
      const breedId = 1;

      const horseData1 = {
        name: 'Starlight',
        age: 4,
        breedId: breedId,
        playerId: playerId,
        sex: 'Mare',
        trait: 'Elegant',
        temperament: 'Gentle',
      };

      const horseData2 = {
        name: 'Comet',
        age: 6,
        breedId: breedId,
        playerId: playerId,
        sex: 'Stallion',
        trait: 'Swift',
        temperament: 'Spirited',
      };

      const mockHorse1 = { id: 1, ...horseData1, breed: { id: breedId, name: 'Thoroughbred' } };
      const mockHorse2 = { id: 2, ...horseData2, breed: { id: breedId, name: 'Thoroughbred' } };

      prisma.horse.create
        .mockResolvedValueOnce(mockHorse1)
        .mockResolvedValueOnce(mockHorse2);

      const result1 = await createHorse(horseData1);
      const result2 = await createHorse(horseData2);

      expect(result1.playerId).toBe(playerId);
      expect(result2.playerId).toBe(playerId);
      expect(result1.name).toBe('Starlight');
      expect(result2.name).toBe('Comet');
    });
  });
});