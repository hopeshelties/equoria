/**
 * 🧪 UNIT TEST: User Controller - Progress & Dashboard APIs
 *
 * This test validates the user controller's API endpoints for progress tracking
 * and dashboard data aggregation, focusing on response formatting and error handling.
 *
 * 📋 BUSINESS RULES TESTED:
 * - User progress calculation: XP to next level = 100 - (totalXP % 100)
 * - Current level XP display: totalXP % 100 (progress within current level)
 * - Level calculation: Math.floor(totalXP / 100) + 1
 * - Dashboard data aggregation from multiple sources (horses, shows, activity)
 * - Proper error handling with appropriate HTTP status codes
 * - Data privacy: sensitive fields (email, money) excluded from progress responses
 * - Production vs development error message handling
 *
 * 🎯 FUNCTIONALITY TESTED:
 * 1. getUserProgress() - User progress API with XP calculations
 * 2. getDashboardData() - Comprehensive dashboard data aggregation
 * 3. Error handling for missing users and database failures
 * 4. Response formatting and data transformation
 * 5. Edge cases: various XP values, missing optional data
 *
 * 🔄 BALANCED MOCKING APPROACH:
 * ✅ REAL: Controller logic, XP calculations, response formatting, error handling
 * ✅ REAL: HTTP request/response handling, status codes, data transformation
 * 🔧 MOCK: Database operations (Prisma calls) - external dependency
 * 🔧 MOCK: Training controller calls - external dependency
 * 🔧 MOCK: Logger calls - external dependency
 *
 * 💡 TEST STRATEGY: Unit testing with mocked dependencies to focus on controller
 *    logic and API response formatting while ensuring predictable test outcomes
 */

import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Mock trainingController functions
const mockGetTrainableHorses = jest.fn();

// Mock prisma
const mockPrisma = {
  user: {
    // Changed from player to user
    findUnique: jest.fn(), // For getUserProgress (formerly getPlayerProgress)
    // Add other user model operations if needed by getDashboardData
  },
  horse: {
    count: jest.fn(),
  },
  show: {
    findMany: jest.fn(),
  },
  competitionResult: {
    count: jest.fn(),
    findFirst: jest.fn(),
  },
  trainingLog: {
    findFirst: jest.fn(),
  },
};

// Mock logger
const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Remove mock for userModel.js as it's no longer directly used by userController
// jest.unstable_mockModule(join(__dirname, '../models/userModel.js'), () => ({
//   getPlayerById: mockGetPlayerById // This was mockGetPlayerById
// }));

jest.unstable_mockModule(join(__dirname, '../controllers/trainingController.js'), () => ({
  getTrainableHorses: mockGetTrainableHorses,
}));

jest.unstable_mockModule(join(__dirname, '../db/index.js'), () => ({
  default: mockPrisma,
}));

jest.unstable_mockModule(join(__dirname, '../utils/logger.js'), () => ({
  default: mockLogger,
}));

// Import the module after mocking - change controller name
const { getUserProgress, getDashboardData } = await import(
  join(__dirname, '../controllers/userController.js')
); // Changed from playerController.js

describe('👤 UNIT: User Controller - Progress & Dashboard APIs', () => {
  let mockNext;

  beforeEach(() => {
    jest.clearAllMocks();
    mockNext = jest.fn();
    // mockGetPlayerById.mockClear(); // Removed
    mockPrisma.user.findUnique.mockClear(); // Added for user
    mockGetTrainableHorses.mockClear();
    mockPrisma.horse.count.mockClear();
    mockPrisma.show.findMany.mockClear();
    mockPrisma.competitionResult.count.mockClear();
    mockPrisma.competitionResult.findFirst.mockClear();
    mockPrisma.trainingLog.findFirst.mockClear();
    mockLogger.info.mockClear();
    mockLogger.warn.mockClear();
    mockLogger.error.mockClear();
  });

  describe('getUserProgress', () => {
    // Changed from getPlayerProgress
    it('should return user progress successfully', async () => {
      const mockUser = {
        // Changed from mockPlayer
        id: 123, // Changed to number
        name: 'Alex',
        level: 4,
        xp: 30, // This is total XP. Controller calculates current level XP.
        email: 'alex@example.com',
        money: 1500,
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser); // Changed from mockGetPlayerById

      const req = {
        params: { userId: '123' }, // Changed from id to userId, kept as string for req.params
      };
      const res = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis(),
      };

      await getUserProgress(req, res, mockNext);

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({ where: { id: 123 } }); // Changed, and ensure ID is number
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'User progress retrieved successfully', // Changed message
        data: {
          userId: 123, // Changed from playerId
          name: 'Alex',
          level: 4,
          xp: 30, // Controller calculates current level XP as user.xp % 100, so this should be 30
          xpToNextLevel: 70, // 100 - (30 % 100) = 70
        },
      });
      expect(mockLogger.info).toHaveBeenCalledWith(
        '[userController.getUserProgress] Getting progress for user 123',
      ); // Changed log message
    });

    it('should calculate xpToNextLevel correctly for different XP values', async () => {
      const testCases = [
        { xp: 0, currentLevelXp: 0, expectedXpToNext: 100 },
        { xp: 50, currentLevelXp: 50, expectedXpToNext: 50 },
        { xp: 99, currentLevelXp: 99, expectedXpToNext: 1 },
        { xp: 100, currentLevelXp: 0, expectedXpToNext: 100 },
        { xp: 150, currentLevelXp: 50, expectedXpToNext: 50 },
        { xp: 230, currentLevelXp: 30, expectedXpToNext: 70 },
      ];

      for (const testCase of testCases) {
        const mockUserForDb = {
          // Changed from mockPlayer
          id: 123, // Changed to number
          name: 'Test User', // Changed
          // Level calculation in controller: Math.floor(user.xp / 100) + 1
          // XP for current level in controller: user.xp % 100
          level: Math.floor(testCase.xp / 100) + 1, // Level based on total XP
          xp: testCase.xp, // Store total XP in the mock DB object
          email: 'test@example.com',
        };

        mockPrisma.user.findUnique.mockResolvedValue(mockUserForDb); // Changed from mockGetPlayerById

        const req = { params: { userId: '123' } }; // Changed from id to userId
        const res = { json: jest.fn(), status: jest.fn().mockReturnThis() };

        await getUserProgress(req, res, mockNext);

        expect(res.json).toHaveBeenCalledWith({
          success: true,
          message: 'User progress retrieved successfully', // Changed message
          data: expect.objectContaining({
            xp: testCase.currentLevelXp, // Assert current level XP
            xpToNextLevel: testCase.expectedXpToNext,
          }),
        });

        jest.clearAllMocks(); // Clear mocks for the next iteration
        mockNext.mockClear(); // Clear mockNext for the next iteration
      }
    });

    it('should return 404 when user is not found', async () => {
      // Changed
      mockPrisma.user.findUnique.mockResolvedValue(null); // Changed from mockGetPlayerById

      const req = {
        params: { userId: '999' }, // Changed from id to userId
      };
      const res = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis(),
      };

      await getUserProgress(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'User not found', // Changed message
      });
      expect(mockLogger.warn).toHaveBeenCalledWith(
        '[userController.getUserProgress] User 999 not found',
      ); // Changed log
    });

    it('should handle database errors gracefully', async () => {
      mockPrisma.user.findUnique.mockRejectedValue(new Error('Database connection failed')); // Changed

      const req = {
        params: { userId: '123' }, // Changed
      };
      const res = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis(),
      };
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      await getUserProgress(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Internal server error',
        error: 'Database connection failed',
      });
      expect(mockLogger.error).toHaveBeenCalledWith(
        '[userController.getUserProgress] Error getting user progress: Database connection failed',
      ); // Changed

      process.env.NODE_ENV = originalEnv;
    });

    it('should not expose error details in production', async () => {
      mockPrisma.user.findUnique.mockRejectedValue(new Error('Database connection failed')); // Changed

      const req = {
        params: { userId: '123' }, // Changed
      };
      const res = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis(),
      };
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      await getUserProgress(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Internal server error',
        error: 'Something went wrong',
      });

      process.env.NODE_ENV = originalEnv;
    });

    it('should include all required fields in response', async () => {
      const mockUser = {
        // Changed
        id: 456, // Changed
        name: 'Sarah',
        level: 7,
        xp: 85, // Total XP
        email: 'sarah@example.com',
        money: 2500,
        settings: { theme: 'dark' },
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser); // Changed

      const req = {
        params: { userId: '456' }, // Changed
      };
      const res = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis(),
      };

      await getUserProgress(req, res, mockNext);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'User progress retrieved successfully', // Changed
        data: {
          userId: 456, // Changed
          name: 'Sarah',
          level: 7,
          xp: 85, // Controller calculates current level XP as user.xp % 100
          xpToNextLevel: 15, // 100 - (85 % 100) = 15
        },
      });

      const responseData = res.json.mock.calls[0][0].data;
      expect(responseData).not.toHaveProperty('email');
      expect(responseData).not.toHaveProperty('money');
      expect(responseData).not.toHaveProperty('settings');
    });
  });

  describe('getDashboardData', () => {
    it('should return dashboard data successfully', async () => {
      const mockUser = {
        // Changed
        id: 123, // Changed
        name: 'Alex',
        level: 4, // Calculated by controller based on total XP
        xp: 230, // Total XP
        money: 4250,
      };

      const mockTrainableHorses = [
        { horseId: 1, name: 'Thunder', age: 5 },
        { horseId: 2, name: 'Lightning', age: 4 },
      ];

      const mockUpcomingShows = [
        { id: 1, runDate: new Date('2025-06-05T10:00:00.000Z') },
        { id: 2, runDate: new Date('2025-06-06T14:30:00.000Z') },
      ];

      const mockRecentTraining = {
        trainedAt: new Date('2025-06-03T17:00:00.000Z'),
      };

      const mockRecentPlacement = {
        horse: { name: 'Nova' },
        placement: '2nd',
        showName: 'Spring Gala - Dressage',
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser); // Changed
      mockPrisma.horse.count.mockResolvedValue(12);
      mockGetTrainableHorses.mockResolvedValue(mockTrainableHorses); // This is called with userId (number)
      mockPrisma.show.findMany.mockResolvedValue(mockUpcomingShows);
      mockPrisma.competitionResult.count.mockResolvedValue(3); // For upcomingEntries
      mockPrisma.trainingLog.findFirst.mockResolvedValue(mockRecentTraining);
      mockPrisma.competitionResult.findFirst.mockResolvedValue(mockRecentPlacement); // For lastShowPlaced

      const req = {
        params: { userId: '123' }, // Changed from playerId
      };
      const res = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis(),
      };

      await getDashboardData(req, res, mockNext);

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({ where: { id: 123 } }); // Changed
      expect(mockPrisma.horse.count).toHaveBeenCalledWith({
        where: { userId: 123 }, // Changed from playerId, ensure it's number
      });
      expect(mockGetTrainableHorses).toHaveBeenCalledWith(123); // Changed, ensure it's number

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Dashboard data retrieved successfully',
        data: {
          user: {
            // Changed from player
            id: 123, // Changed
            name: 'Alex',
            level: 3, // Math.floor(230 / 100) + 1 = 2 + 1 = 3
            xp: 30, // 230 % 100 = 30
            money: 4250,
          },
          horses: {
            total: 12,
            trainable: 2, // Length of mockTrainableHorses
          },
          shows: {
            upcomingEntries: 3, // From competitionResult.count
            nextShowRuns: [
              // From show.findMany
              new Date('2025-06-05T10:00:00.000Z'),
              new Date('2025-06-06T14:30:00.000Z'),
            ],
          },
          activity: {
            // Changed from recent to activity
            lastTrained: new Date('2025-06-03T17:00:00.000Z'), // From trainingLog.findFirst
            lastShowPlaced: {
              // From competitionResult.findFirst
              horseName: 'Nova',
              placement: '2nd',
              show: 'Spring Gala - Dressage',
            },
          },
        },
      });
      expect(mockLogger.info).toHaveBeenCalledWith(
        '[userController.getDashboardData] Dashboard data for user 123',
      ); // Changed
    });

    it('should return 404 when user is not found', async () => {
      // Changed
      mockPrisma.user.findUnique.mockResolvedValue(null); // Changed

      const req = {
        params: { userId: '999' }, // Changed
      };
      const res = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis(),
      };

      await getDashboardData(req, res, mockNext);

      // The controller calls next(new AppError(...))
      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
      const errorPassedToNext = mockNext.mock.calls[0][0];
      expect(errorPassedToNext.statusCode).toBe(404);
      expect(errorPassedToNext.message).toBe('User not found'); // Changed
      expect(mockLogger.warn).toHaveBeenCalledWith(
        '[userController.getDashboardData] User not found for ID: 999',
      ); // Changed
    });

    it('should handle errors when fetching trainable horses', async () => {
      const mockUser = { id: 123, name: 'Alex', xp: 100, money: 100 }; // Added xp, money
      mockPrisma.user.findUnique.mockResolvedValue(mockUser); // Changed
      mockGetTrainableHorses.mockRejectedValue(new Error('Trainable horses error'));

      const req = { params: { userId: '123' } }; // Changed, and ensure it's params.userId
      const res = { json: jest.fn(), status: jest.fn().mockReturnThis() };

      await getDashboardData(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
      expect(mockNext.mock.calls[0][0].message).toBe('Trainable horses error');
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining(
          '[userController.getDashboardData] Error fetching dashboard data for user 123: Trainable horses error',
        ),
      );
    });

    it('should handle errors when fetching horse count', async () => {
      const mockUser = { id: 123, name: 'Alex', xp: 100, money: 100 };
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockGetTrainableHorses.mockResolvedValue([]);
      mockPrisma.horse.count.mockRejectedValue(new Error('Horse count error'));

      const req = { params: { userId: '123' } };
      const res = { json: jest.fn(), status: jest.fn().mockReturnThis() };

      await getDashboardData(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
      expect(mockNext.mock.calls[0][0].message).toBe('Horse count error');
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Error fetching dashboard data for user 123: Horse count error'),
      );
    });

    it('should handle errors when fetching upcoming shows', async () => {
      const mockUser = { id: 123, name: 'Alex', xp: 100, money: 100 };
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockGetTrainableHorses.mockResolvedValue([]);
      mockPrisma.horse.count.mockResolvedValue(0);
      mockPrisma.show.findMany.mockRejectedValue(new Error('Show fetch error'));

      const req = { params: { userId: '123' } };
      const res = { json: jest.fn(), status: jest.fn().mockReturnThis() };

      await getDashboardData(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
      expect(mockNext.mock.calls[0][0].message).toBe('Show fetch error');
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Error fetching dashboard data for user 123: Show fetch error'),
      );
    });

    it('should handle errors when fetching competition results count', async () => {
      const mockUser = { id: 123, name: 'Alex', xp: 100, money: 100 };
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockGetTrainableHorses.mockResolvedValue([]);
      mockPrisma.horse.count.mockResolvedValue(0);
      mockPrisma.show.findMany.mockResolvedValue([]);
      mockPrisma.competitionResult.count.mockRejectedValue(new Error('Comp count error'));

      const req = { params: { userId: '123' } };
      const res = { json: jest.fn(), status: jest.fn().mockReturnThis() };

      await getDashboardData(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
      expect(mockNext.mock.calls[0][0].message).toBe('Comp count error');
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Error fetching dashboard data for user 123: Comp count error'),
      );
    });

    it('should handle errors when fetching last competition result', async () => {
      const mockUser = { id: 123, name: 'Alex', xp: 100, money: 100 };
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockGetTrainableHorses.mockResolvedValue([]);
      mockPrisma.horse.count.mockResolvedValue(0);
      mockPrisma.show.findMany.mockResolvedValue([]);
      mockPrisma.competitionResult.count.mockResolvedValue(1);
      mockPrisma.competitionResult.findFirst.mockRejectedValue(new Error('Last comp error'));

      const req = { params: { userId: '123' } };
      const res = { json: jest.fn(), status: jest.fn().mockReturnThis() };

      await getDashboardData(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
      expect(mockNext.mock.calls[0][0].message).toBe('Last comp error');
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Error fetching dashboard data for user 123: Last comp error'),
      );
    });

    it('should handle errors when fetching last training log', async () => {
      const mockUser = { id: 123, name: 'Alex', xp: 100, money: 100 };
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockGetTrainableHorses.mockResolvedValue([]);
      mockPrisma.horse.count.mockResolvedValue(0);
      mockPrisma.show.findMany.mockResolvedValue([]);
      mockPrisma.competitionResult.count.mockResolvedValue(0);
      mockPrisma.competitionResult.findFirst.mockResolvedValue(null);
      mockPrisma.trainingLog.findFirst.mockRejectedValue(new Error('Last training error'));

      const req = { params: { userId: '123' } };
      const res = { json: jest.fn(), status: jest.fn().mockReturnThis() };

      await getDashboardData(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
      expect(mockNext.mock.calls[0][0].message).toBe('Last training error');
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Error fetching dashboard data for user 123: Last training error'),
      );
    });

    it('should gracefully handle missing optional data (last competition, last training)', async () => {
      const mockUser = { id: 123, name: 'Alex', money: 1000, xp: 50, level: 1 }; // level should be 1 for xp 50
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockGetTrainableHorses.mockResolvedValue([]);
      mockPrisma.horse.count.mockResolvedValue(0);
      mockPrisma.show.findMany.mockResolvedValue([]);
      mockPrisma.competitionResult.count.mockResolvedValue(0);
      mockPrisma.competitionResult.findFirst.mockResolvedValue(null);
      mockPrisma.trainingLog.findFirst.mockResolvedValue(null);

      const req = { params: { userId: '123' } };
      const res = { json: jest.fn(), status: jest.fn().mockReturnThis() };

      await getDashboardData(req, res, mockNext);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            activity: {
              // Changed from recent to activity
              lastTrained: null,
              lastShowPlaced: null,
            },
          }),
        }),
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        '[userController.getDashboardData] Dashboard data for user 123',
      );
    });
  });
});
