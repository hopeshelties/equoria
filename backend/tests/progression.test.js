import { jest, describe, beforeEach, afterEach, expect, it } from '@jest/globals';
/**
 * User Progression Tests
 * Tests XP gains, level-ups, rollover, and progress reporting
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const testUserId = 'test-user-uuid-123'; // Valid test ID
const mockNonExistentUserId = 'test-non-existent-user-uuid';

// Mock Prisma
const mockPrisma = {
  user: { // Changed from player to user
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
// Changed userModel.js to userModel.js and function names
const { addXpToUser, getUserProgress } = await import(join(__dirname, '../models/userModel.js'));
// Changed getPlayerXpEvents to getUserXpEvents
const { logXpEvent, getUserXpEvents } = await import(join(__dirname, '../models/xpLogModel.js'));

describe('User Progression System', () => { // Changed from Player to User
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('XP Earning and Level Progression', () => {
    test('should gain 20 XP correctly', async() => {
      mockPrisma.user.findUnique.mockResolvedValue({ // Changed from player to user
        id: testUserId,
        username: 'TestUser', // Changed from name to username
        level: 1,
        xp: 0
        // Removed userId field
      });

      mockPrisma.user.update.mockResolvedValue({ // Changed from player to user
        id: testUserId,
        username: 'TestUser', // Changed from name to username
        level: 1,
        xp: 20
        // Removed userId field
      });

      const result = await addXpToUser(testUserId, 20); // Changed from addXp and mockPlayerId

      expect(result.success).toBe(true);
      expect(result.newXp).toBe(20);
      expect(result.newLevel).toBe(1);
      expect(result.leveledUp).toBe(false);
      expect(mockPrisma.user.update).toHaveBeenCalledWith({ // Changed from player to user
        where: { id: testUserId }, // Changed from mockPlayerId
        data: { xp: 20 }
      });
    });

    test('should level up when reaching 100 XP', async() => {
      mockPrisma.user.findUnique.mockResolvedValue({ // Changed from player to user
        id: testUserId,
        username: 'TestUser', // Changed from name to username
        level: 1,
        xp: 20
        // Removed userId field
      });

      mockPrisma.user.update.mockResolvedValue({ // Changed from player to user
        id: testUserId,
        username: 'TestUser', // Changed from name to username
        level: 2,
        xp: 0
        // Removed userId field
      });

      const result = await addXpToUser(testUserId, 80); // Changed from addXp and mockPlayerId

      expect(result.success).toBe(true);
      expect(result.newXp).toBe(0);
      expect(result.newLevel).toBe(2);
      expect(result.leveledUp).toBe(true);
      expect(mockPrisma.user.update).toHaveBeenCalledWith({ // Changed from player to user
        where: { id: testUserId }, // Changed from mockPlayerId
        data: { xp: 0, level: 2 }
      });
    });

    test('should handle XP rollover correctly', async() => {
      mockPrisma.user.findUnique.mockResolvedValue({ // Changed from player to user
        id: testUserId,
        username: 'TestUser', // Changed from name to username
        level: 1,
        xp: 90
        // Removed userId field
      });

      mockPrisma.user.update.mockResolvedValue({ // Changed from player to user
        id: testUserId,
        username: 'TestUser', // Changed from name to username
        level: 2,
        xp: 15
        // Removed userId field
      });

      const result = await addXpToUser(testUserId, 25); // Changed from addXp and mockPlayerId

      expect(result.success).toBe(true);
      expect(result.newXp).toBe(15);
      expect(result.newLevel).toBe(2);
      expect(result.leveledUp).toBe(true);
      expect(mockPrisma.user.update).toHaveBeenCalledWith({ // Changed from player to user
        where: { id: testUserId }, // Changed from mockPlayerId
        data: { xp: 15, level: 2 }
      });
    });

    test('should handle multiple level ups', async() => {
      mockPrisma.user.findUnique.mockResolvedValue({ // Changed from player to user
        id: testUserId,
        username: 'TestUser', // Changed from name to username
        level: 1,
        xp: 50
        // Removed userId field
      });

      mockPrisma.user.update.mockResolvedValue({ // Changed from player to user
        id: testUserId,
        username: 'TestUser', // Changed from name to username
        level: 3,
        xp: 0
        // Removed userId field
      });

      const result = await addXpToUser(testUserId, 150); // Changed from addXp and mockPlayerId

      expect(result.success).toBe(true);
      expect(result.newXp).toBe(0);
      expect(result.newLevel).toBe(3);
      expect(result.leveledUp).toBe(true);
      expect(mockPrisma.user.update).toHaveBeenCalledWith({ // Changed from player to user
        where: { id: testUserId }, // Changed from mockPlayerId
        data: { xp: 0, level: 3 }
      });
    });
  });

  describe('XP Event Logging', () => {
    test('should log training XP event correctly', async() => {
      const mockXpEvent = {
        id: 1,
        userId: testUserId, // Changed from playerId
        amount: 5,
        reason: 'Trained horse Thunder in Dressage',
        timestamp: new Date()
      };

      mockPrisma.xpEvent.create.mockResolvedValue(mockXpEvent);

      const result = await logXpEvent({
        userId: testUserId, // Changed from playerId
        amount: 5,
        reason: 'Trained horse Thunder in Dressage'
      });

      expect(result.id).toBe(1);
      expect(result.amount).toBe(5);
      expect(result.reason).toBe('Trained horse Thunder in Dressage');
      expect(mockPrisma.xpEvent.create).toHaveBeenCalledWith({
        data: {
          userId: testUserId, // Changed from playerId
          amount: 5,
          reason: 'Trained horse Thunder in Dressage'
        }
      });
    });

    test('should log show placement XP event correctly', async() => {
      const mockXpEvent = {
        id: 2,
        userId: testUserId, // Changed from playerId
        amount: 20,
        reason: 'Horse Lightning placed 1st in Racing competition',
        timestamp: new Date()
      };

      mockPrisma.xpEvent.create.mockResolvedValue(mockXpEvent);

      const result = await logXpEvent({
        userId: testUserId, // Changed from playerId
        amount: 20,
        reason: 'Horse Lightning placed 1st in Racing competition'
      });

      expect(result.id).toBe(2);
      expect(result.amount).toBe(20);
      expect(result.reason).toBe('Horse Lightning placed 1st in Racing competition');
      expect(mockPrisma.xpEvent.create).toHaveBeenCalledWith({
        data: {
          userId: testUserId, // Changed from playerId
          amount: 20,
          reason: 'Horse Lightning placed 1st in Racing competition'
        }
      });
    });

    test('should retrieve user XP events', async() => { // Changed from player to user
      const mockEvents = [
        {
          id: 1,
          userId: testUserId, // Changed from playerId
          amount: 5,
          reason: 'Trained horse Thunder in Dressage',
          timestamp: new Date('2024-001-01')
        },
        {
          id: 2,
          userId: testUserId, // Changed from playerId
          amount: 20,
          reason: 'Horse Lightning placed 1st in Racing competition',
          timestamp: new Date('2024-01-02')
        }
      ];

      mockPrisma.xpEvent.findMany.mockResolvedValue(mockEvents);

      const result = await getUserXpEvents(testUserId); // Changed from getPlayerXpEvents and mockPlayerId

      expect(result).toHaveLength(2);
      expect(result[0].amount).toBe(5);
      expect(result[1].amount).toBe(20);
      expect(mockPrisma.xpEvent.findMany).toHaveBeenCalledWith({
        where: { userId: testUserId }, // Changed from playerId
        orderBy: { timestamp: 'desc' },
        take: 50,
        skip: 0
      });
    });
  });

  describe('User Progress Reporting', () => { // Changed from Player to User
    test('should return correct progress for level 1 user', async() => { // Changed from player to user
      mockPrisma.user.findUnique.mockResolvedValue({ // Changed from player to user
        id: testUserId,
        username: 'TestUser', // Changed from name to username
        level: 1,
        xp: 45
        // Removed userId field
      });

      const result = await getUserProgress(testUserId); // Changed from getPlayerProgress and mockPlayerId

      expect(result.success).toBe(true);
      expect(result.progress.level).toBe(1);
      expect(result.progress.xp).toBe(45);
      expect(result.progress.xpToNextLevel).toBe(55);
      expect(result.progress.xpForCurrentLevel).toBe(100);
    });

    test('should return correct progress for level 2 user', async() => { // Changed from player to user
      mockPrisma.user.findUnique.mockResolvedValue({ // Changed from player to user
        id: testUserId,
        username: 'TestUser', // Changed from name to username
        level: 2,
        xp: 30
        // Removed userId field
      });

      const result = await getUserProgress(testUserId); // Changed from getPlayerProgress and mockPlayerId

      expect(result.success).toBe(true);
      expect(result.progress.level).toBe(2);
      expect(result.progress.xp).toBe(30);
      expect(result.progress.xpToNextLevel).toBe(70);
      expect(result.progress.xpForCurrentLevel).toBe(100);
    });

    test('should return correct progress for user at level boundary', async() => { // Changed from player to user
      mockPrisma.user.findUnique.mockResolvedValue({ // Changed from player to user
        id: testUserId,
        username: 'TestUser', // Changed from name to username
        level: 1,
        xp: 0
        // Removed userId field
      });

      const result = await getUserProgress(testUserId); // Changed from getPlayerProgress and mockPlayerId

      expect(result.success).toBe(true);
      expect(result.progress.level).toBe(1);
      expect(result.progress.xp).toBe(0);
      expect(result.progress.xpToNextLevel).toBe(100);
      expect(result.progress.xpForCurrentLevel).toBe(100);
    });

    test('should handle non-existent user in getUserProgress', async() => { // Changed from player to user
      mockPrisma.user.findUnique.mockResolvedValue(null); // Changed from player to user

      const result = await getUserProgress(mockNonExistentUserId); // Changed from getPlayerProgress

      expect(result.success).toBe(false);
      expect(result.error).toBe('User not found'); // Changed from 'Player not found'
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle negative XP amounts in addXpToUser', async() => { // Changed from addXp
      const result = await addXpToUser(testUserId, -10); // Changed from addXp and mockPlayerId
      expect(result.success).toBe(false);
      expect(result.error).toContain('XP amount must be positive');
    });

    test('should handle zero XP amounts in addXpToUser', async() => { // Changed from addXp
      const result = await addXpToUser(testUserId, 0); // Changed from addXp and mockPlayerId
      expect(result.success).toBe(false);
      expect(result.error).toContain('XP amount must be positive');
    });

    test('should handle database errors gracefully in addXpToUser', async() => { // Changed from addXp
      mockPrisma.user.findUnique.mockRejectedValue(new Error('Database connection failed')); // Changed from player to user
      const result = await addXpToUser(testUserId, 20); // Changed from addXp and mockPlayerId
      expect(result.success).toBe(false);
      expect(result.error).toContain('Database connection failed');
    });

    test('should handle database errors gracefully in getUserProgress', async() => { // Changed from getPlayerProgress
      mockPrisma.user.findUnique.mockRejectedValue(new Error('Database connection failed')); // Changed from player to user
      const result = await getUserProgress(testUserId); // Changed from getPlayerProgress and mockPlayerId
      expect(result.success).toBe(false);
      expect(result.error).toContain('Database connection failed');
    });

    test('should handle invalid (empty string) user ID in addXpToUser', async() => { // Changed from player to user
      const result = await addXpToUser('', 20); // Changed from addXp
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid user ID format'); // Changed from 'Invalid player ID format'
    });

    test('should handle invalid (empty string) user ID in getUserProgress', async() => { // Changed from player to user
      const result = await getUserProgress(''); // Changed from getPlayerProgress
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid user ID format'); // Changed from 'Invalid player ID format'
    });

    test('should handle null user ID in addXpToUser', async() => { // Changed from player to user
      const result = await addXpToUser(null, 20); // Changed from addXp
      expect(result.success).toBe(false);
      expect(result.error).toContain('User ID is required'); // Changed from 'Player ID is required'
    });

    test('should handle null user ID in getUserProgress', async() => { // Changed from player to user
      const result = await getUserProgress(null); // Changed from getPlayerProgress
      expect(result.success).toBe(false);
      expect(result.error).toContain('User ID is required'); // Changed from 'Player ID is required'
    });

    test('should handle XP logging errors gracefully', async() => {
      mockPrisma.xpEvent.create.mockRejectedValue(new Error('XP logging failed'));
      await expect(logXpEvent({
        userId: testUserId, // Changed from playerId
        amount: 5,
        reason: 'Training'
      })).rejects.toThrow('XP logging failed');
    });
  });

  describe('Integration Scenarios', () => {
    test('should handle complete training workflow with XP', async() => {
      mockPrisma.user.findUnique.mockResolvedValue({ // Changed from player to user
        id: testUserId,
        username: 'TestUser', // Changed from name to username
        level: 1,
        xp: 95
        // Removed userId field
      });
      mockPrisma.user.update.mockResolvedValue({ // Changed from player to user
        id: testUserId,
        username: 'TestUser', // Changed from name to username
        level: 2,
        xp: 0
        // Removed userId field
      });
      mockPrisma.xpEvent.create.mockResolvedValue({
        id: 1,
        userId: testUserId, // Changed from playerId
        amount: 5,
        reason: 'Trained horse Thunder in Dressage',
        timestamp: new Date()
      });

      const xpResult = await addXpToUser(testUserId, 5); // Changed from addXp and mockPlayerId
      expect(xpResult.success).toBe(true);
      expect(xpResult.leveledUp).toBe(true);
      expect(xpResult.newLevel).toBe(2);
      expect(xpResult.newXp).toBe(0);

      const logResult = await logXpEvent({
        userId: testUserId, // Changed from playerId
        amount: 5,
        reason: 'Trained horse Thunder in Dressage'
      });
      expect(logResult.id).toBe(1);
    });

    test('should handle complete competition workflow with XP', async() => {
      mockPrisma.user.findUnique.mockResolvedValue({ // Changed from player to user
        id: testUserId,
        username: 'TestUser', // Changed from name to username
        level: 1,
        xp: 85
        // Removed userId field
      });
      mockPrisma.user.update.mockResolvedValue({ // Changed from player to user
        id: testUserId,
        username: 'TestUser', // Changed from name to username
        level: 2,
        xp: 5
        // Removed userId field
      });
      mockPrisma.xpEvent.create.mockResolvedValue({
        id: 2,
        userId: testUserId, // Changed from playerId
        amount: 20,
        reason: 'Horse Lightning placed 1st in Racing competition',
        timestamp: new Date()
      });

      const xpResult = await addXpToUser(testUserId, 20); // Changed from addXp and mockPlayerId
      expect(xpResult.success).toBe(true);
      expect(xpResult.leveledUp).toBe(true);
      expect(xpResult.newLevel).toBe(2);
      expect(xpResult.newXp).toBe(5);

      const logResult = await logXpEvent({
        userId: testUserId, // Changed from playerId
        amount: 20,
        reason: 'Horse Lightning placed 1st in Racing competition'
      });
      expect(logResult.id).toBe(2);
    });

    test('should handle multiple XP sources in sequence', async() => {
      mockPrisma.user.findUnique.mockResolvedValueOnce({ // Changed from player to user
        id: testUserId,
        username: 'TestUser', // Changed from name to username
        level: 1,
        xp: 0
        // Removed userId field
      });
      mockPrisma.user.update.mockResolvedValueOnce({ // Changed from player to user
        id: testUserId,
        username: 'TestUser', // Changed from name to username
        level: 1,
        xp: 5
        // Removed userId field
      });

      const trainingResult = await addXpToUser(testUserId, 5); // Changed from addXp and mockPlayerId
      expect(trainingResult.success).toBe(true);
      expect(trainingResult.newXp).toBe(5);
      expect(trainingResult.leveledUp).toBe(false);

      // Mock for the second call to addXpToUser
      mockPrisma.user.findUnique.mockResolvedValueOnce({ // Changed from player to user
        id: testUserId,
        username: 'TestUser', // Changed from name to username
        level: 1,
        xp: 5 // Current XP after training
        // Removed userId field
      });
      mockPrisma.user.update.mockResolvedValueOnce({ // Changed from player to user
        id: testUserId,
        username: 'TestUser', // Changed from name to username
        level: 1,
        xp: 25 // XP after competition (5 + 20)
        // Removed userId field
      });

      const competitionResult = await addXpToUser(testUserId, 20); // Changed from addXp and mockPlayerId
      expect(competitionResult.success).toBe(true);
      expect(competitionResult.newXp).toBe(25);
      expect(competitionResult.leveledUp).toBe(false);
    });
  });
});
