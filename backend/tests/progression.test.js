/**
 * Player Progression Tests
 * Tests XP gains, level-ups, rollover, and progress reporting
 */

import { jest } from '@jest/globals';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Mock Prisma
const mockPrisma = {
  player: {
    findUnique: jest.fn(),
    update: jest.fn()
  },
  xpEvent: {
    create: jest.fn(),
    findMany: jest.fn()
  }
};

// Mock modules before importing
jest.unstable_mockModule(join(__dirname, '../db/index.js'), () => ({
  default: mockPrisma
}));

jest.unstable_mockModule(join(__dirname, '../utils/logger.js'), () => ({
  default: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }
}));

// Import modules after mocking
const { addXp, getPlayerProgress } = await import(join(__dirname, '../models/playerModel.js'));
const { logXpEvent, getPlayerXpEvents } = await import(join(__dirname, '../models/xpLogModel.js'));

describe('Player Progression System', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('XP Earning and Level Progression', () => {
    test('should gain 20 XP correctly', async() => {
      // Mock player with 0 XP at level 1
      mockPrisma.player.findUnique.mockResolvedValue({
        id: 'test-player',
        username: 'TestPlayer',
        level: 1,
        xp: 0
      });

      mockPrisma.player.update.mockResolvedValue({
        id: 'test-player',
        username: 'TestPlayer',
        level: 1,
        xp: 20
      });

      const result = await addXp('test-player', 20);

      expect(result.success).toBe(true);
      expect(result.newXp).toBe(20);
      expect(result.newLevel).toBe(1);
      expect(result.leveledUp).toBe(false);
      expect(mockPrisma.player.update).toHaveBeenCalledWith({
        where: { id: 'test-player' },
        data: { xp: 20 }
      });
    });

    test('should level up when reaching 100 XP', async() => {
      // Mock player with 20 XP, gaining 80 more (total 100)
      mockPrisma.player.findUnique.mockResolvedValue({
        id: 'test-player',
        username: 'TestPlayer',
        level: 1,
        xp: 20
      });

      mockPrisma.player.update.mockResolvedValue({
        id: 'test-player',
        username: 'TestPlayer',
        level: 2,
        xp: 0
      });

      const result = await addXp('test-player', 80);

      expect(result.success).toBe(true);
      expect(result.newXp).toBe(0);
      expect(result.newLevel).toBe(2);
      expect(result.leveledUp).toBe(true);
      expect(mockPrisma.player.update).toHaveBeenCalledWith({
        where: { id: 'test-player' },
        data: { xp: 0, level: 2 }
      });
    });

    test('should handle XP rollover correctly', async() => {
      // Mock player with 90 XP, gaining 25 more (total 115 → level 2, 15 XP)
      mockPrisma.player.findUnique.mockResolvedValue({
        id: 'test-player',
        username: 'TestPlayer',
        level: 1,
        xp: 90
      });

      mockPrisma.player.update.mockResolvedValue({
        id: 'test-player',
        username: 'TestPlayer',
        level: 2,
        xp: 15
      });

      const result = await addXp('test-player', 25);

      expect(result.success).toBe(true);
      expect(result.newXp).toBe(15);
      expect(result.newLevel).toBe(2);
      expect(result.leveledUp).toBe(true);
      expect(mockPrisma.player.update).toHaveBeenCalledWith({
        where: { id: 'test-player' },
        data: { xp: 15, level: 2 }
      });
    });

    test('should handle multiple level ups', async() => {
      // Mock player with 50 XP, gaining 150 more (total 200 → level 3, 0 XP)
      mockPrisma.player.findUnique.mockResolvedValue({
        id: 'test-player',
        username: 'TestPlayer',
        level: 1,
        xp: 50
      });

      mockPrisma.player.update.mockResolvedValue({
        id: 'test-player',
        username: 'TestPlayer',
        level: 3,
        xp: 0
      });

      const result = await addXp('test-player', 150);

      expect(result.success).toBe(true);
      expect(result.newXp).toBe(0);
      expect(result.newLevel).toBe(3);
      expect(result.leveledUp).toBe(true);
      expect(mockPrisma.player.update).toHaveBeenCalledWith({
        where: { id: 'test-player' },
        data: { xp: 0, level: 3 }
      });
    });
  });

  describe('XP Event Logging', () => {
    test('should log training XP event correctly', async() => {
      const mockXpEvent = {
        id: 1,
        playerId: 'test-player',
        amount: 5,
        reason: 'Trained horse Thunder in Dressage',
        timestamp: new Date()
      };

      mockPrisma.xpEvent.create.mockResolvedValue(mockXpEvent);

      const result = await logXpEvent({
        playerId: 'test-player',
        amount: 5,
        reason: 'Trained horse Thunder in Dressage'
      });

      expect(result.id).toBe(1);
      expect(result.amount).toBe(5);
      expect(result.reason).toBe('Trained horse Thunder in Dressage');
      expect(mockPrisma.xpEvent.create).toHaveBeenCalledWith({
        data: {
          playerId: 'test-player',
          amount: 5,
          reason: 'Trained horse Thunder in Dressage'
        }
      });
    });

    test('should log show placement XP event correctly', async() => {
      const mockXpEvent = {
        id: 2,
        playerId: 'test-player',
        amount: 20,
        reason: 'Horse Lightning placed 1st in Racing competition',
        timestamp: new Date()
      };

      mockPrisma.xpEvent.create.mockResolvedValue(mockXpEvent);

      const result = await logXpEvent({
        playerId: 'test-player',
        amount: 20,
        reason: 'Horse Lightning placed 1st in Racing competition'
      });

      expect(result.id).toBe(2);
      expect(result.amount).toBe(20);
      expect(result.reason).toBe('Horse Lightning placed 1st in Racing competition');
      expect(mockPrisma.xpEvent.create).toHaveBeenCalledWith({
        data: {
          playerId: 'test-player',
          amount: 20,
          reason: 'Horse Lightning placed 1st in Racing competition'
        }
      });
    });

    test('should retrieve player XP events', async() => {
      const mockEvents = [
        {
          id: 1,
          playerId: 'test-player',
          amount: 5,
          reason: 'Trained horse Thunder in Dressage',
          timestamp: new Date('2024-01-01')
        },
        {
          id: 2,
          playerId: 'test-player',
          amount: 20,
          reason: 'Horse Lightning placed 1st in Racing competition',
          timestamp: new Date('2024-01-02')
        }
      ];

      mockPrisma.xpEvent.findMany.mockResolvedValue(mockEvents);

      const result = await getPlayerXpEvents('test-player');

      expect(result).toHaveLength(2);
      expect(result[0].amount).toBe(5);
      expect(result[1].amount).toBe(20);
      expect(mockPrisma.xpEvent.findMany).toHaveBeenCalledWith({
        where: { playerId: 'test-player' },
        orderBy: { timestamp: 'desc' },
        take: 50,
        skip: 0
      });
    });
  });

  describe('Player Progress Reporting', () => {
    test('should return correct progress for level 1 player', async() => {
      mockPrisma.player.findUnique.mockResolvedValue({
        id: 'test-player',
        username: 'TestPlayer',
        level: 1,
        xp: 45
      });

      const result = await getPlayerProgress('test-player');

      expect(result.success).toBe(true);
      expect(result.progress.level).toBe(1);
      expect(result.progress.xp).toBe(45);
      expect(result.progress.xpToNextLevel).toBe(55); // 100 - 45
      expect(result.progress.xpForCurrentLevel).toBe(100);
    });

    test('should return correct progress for level 2 player', async() => {
      mockPrisma.player.findUnique.mockResolvedValue({
        id: 'test-player',
        username: 'TestPlayer',
        level: 2,
        xp: 30
      });

      const result = await getPlayerProgress('test-player');

      expect(result.success).toBe(true);
      expect(result.progress.level).toBe(2);
      expect(result.progress.xp).toBe(30);
      expect(result.progress.xpToNextLevel).toBe(70); // 100 - 30
      expect(result.progress.xpForCurrentLevel).toBe(100);
    });

    test('should return correct progress for player at level boundary', async() => {
      mockPrisma.player.findUnique.mockResolvedValue({
        id: 'test-player',
        username: 'TestPlayer',
        level: 1,
        xp: 0
      });

      const result = await getPlayerProgress('test-player');

      expect(result.success).toBe(true);
      expect(result.progress.level).toBe(1);
      expect(result.progress.xp).toBe(0);
      expect(result.progress.xpToNextLevel).toBe(100);
      expect(result.progress.xpForCurrentLevel).toBe(100);
    });

    test('should handle non-existent player', async() => {
      mockPrisma.player.findUnique.mockResolvedValue(null);

      const result = await getPlayerProgress('non-existent');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Player not found');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle negative XP amounts', async() => {
      mockPrisma.player.findUnique.mockResolvedValue({
        id: 'test-player',
        username: 'TestPlayer',
        level: 1,
        xp: 50
      });

      const result = await addXp('test-player', -10);

      expect(result.success).toBe(false);
      expect(result.error).toContain('XP amount must be positive');
    });

    test('should handle zero XP amounts', async() => {
      mockPrisma.player.findUnique.mockResolvedValue({
        id: 'test-player',
        username: 'TestPlayer',
        level: 1,
        xp: 50
      });

      const result = await addXp('test-player', 0);

      expect(result.success).toBe(false);
      expect(result.error).toContain('XP amount must be positive');
    });

    test('should handle database errors gracefully', async() => {
      mockPrisma.player.findUnique.mockRejectedValue(new Error('Database connection failed'));

      const result = await addXp('test-player', 20);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Database connection failed');
    });

    test('should handle invalid player ID', async() => {
      const result = await addXp('', 20);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Player ID is required');
    });

    test('should handle XP logging errors gracefully', async() => {
      mockPrisma.xpEvent.create.mockRejectedValue(new Error('XP logging failed'));

      await expect(logXpEvent({
        playerId: 'test-player',
        amount: 5,
        reason: 'Training'
      })).rejects.toThrow('XP logging failed');
    });
  });

  describe('Integration Scenarios', () => {
    test('should handle complete training workflow with XP', async() => {
      // Mock successful training XP award
      mockPrisma.player.findUnique.mockResolvedValue({
        id: 'test-player',
        username: 'TestPlayer',
        level: 1,
        xp: 95
      });

      mockPrisma.player.update.mockResolvedValue({
        id: 'test-player',
        username: 'TestPlayer',
        level: 2,
        xp: 0
      });

      mockPrisma.xpEvent.create.mockResolvedValue({
        id: 1,
        playerId: 'test-player',
        amount: 5,
        reason: 'Trained horse Thunder in Dressage',
        timestamp: new Date()
      });

      // Award training XP
      const xpResult = await addXp('test-player', 5);
      expect(xpResult.success).toBe(true);
      expect(xpResult.leveledUp).toBe(true);
      expect(xpResult.newLevel).toBe(2);
      expect(xpResult.newXp).toBe(0);

      // Log the XP event
      const logResult = await logXpEvent({
        playerId: 'test-player',
        amount: 5,
        reason: 'Trained horse Thunder in Dressage'
      });
      expect(logResult.id).toBe(1);
    });

    test('should handle complete competition workflow with XP', async() => {
      // Mock successful competition XP award
      mockPrisma.player.findUnique.mockResolvedValue({
        id: 'test-player',
        username: 'TestPlayer',
        level: 1,
        xp: 85
      });

      mockPrisma.player.update.mockResolvedValue({
        id: 'test-player',
        username: 'TestPlayer',
        level: 2,
        xp: 5
      });

      mockPrisma.xpEvent.create.mockResolvedValue({
        id: 2,
        playerId: 'test-player',
        amount: 20,
        reason: 'Horse Lightning placed 1st in Racing competition',
        timestamp: new Date()
      });

      // Award competition XP (1st place = 20 XP)
      const xpResult = await addXp('test-player', 20);
      expect(xpResult.success).toBe(true);
      expect(xpResult.leveledUp).toBe(true);
      expect(xpResult.newLevel).toBe(2);
      expect(xpResult.newXp).toBe(5);

      // Log the XP event
      const logResult = await logXpEvent({
        playerId: 'test-player',
        amount: 20,
        reason: 'Horse Lightning placed 1st in Racing competition'
      });
      expect(logResult.id).toBe(2);
    });

    test('should handle multiple XP sources in sequence', async() => {
      // Training XP first
      mockPrisma.player.findUnique.mockResolvedValueOnce({
        id: 'test-player',
        username: 'TestPlayer',
        level: 1,
        xp: 0
      });

      mockPrisma.player.update.mockResolvedValueOnce({
        id: 'test-player',
        username: 'TestPlayer',
        level: 1,
        xp: 5
      });

      const trainingResult = await addXp('test-player', 5);
      expect(trainingResult.success).toBe(true);
      expect(trainingResult.newXp).toBe(5);
      expect(trainingResult.leveledUp).toBe(false);

      // Competition XP second
      mockPrisma.player.findUnique.mockResolvedValueOnce({
        id: 'test-player',
        username: 'TestPlayer',
        level: 1,
        xp: 5
      });

      mockPrisma.player.update.mockResolvedValueOnce({
        id: 'test-player',
        username: 'TestPlayer',
        level: 1,
        xp: 25
      });

      const competitionResult = await addXp('test-player', 20);
      expect(competitionResult.success).toBe(true);
      expect(competitionResult.newXp).toBe(25);
      expect(competitionResult.leveledUp).toBe(false);
    });
  });
});
