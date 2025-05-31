/**
 * 🧪 UNIT TEST: Leaderboard Controller - Ranking & Statistics APIs
 *
 * This test validates the leaderboard controller's API endpoints for various
 * ranking systems and statistical data aggregation across the game.
 *
 * 📋 BUSINESS RULES TESTED:
 * - User level rankings with XP tiebreakers and pagination
 * - XP leaderboards with time period filtering (all-time, week, month)
 * - Horse earnings rankings with breed filtering capabilities
 * - Horse performance rankings by wins with discipline filtering
 * - Combined user earnings from all owned horses
 * - Recent winners tracking with discipline-specific filtering
 * - Comprehensive leaderboard statistics aggregation
 * - Error handling for database failures and invalid parameters
 * - Proper response formatting with success/error states
 *
 * 🎯 FUNCTIONALITY TESTED:
 * 1. getTopPlayersByLevel() - User level rankings with pagination
 * 2. getTopPlayersByXP() - XP rankings with time period filters
 * 3. getTopHorsesByEarnings() - Horse earnings with breed filters
 * 4. getTopHorsesByPerformance() - Horse wins with discipline filters
 * 5. getTopPlayersByHorseEarnings() - Combined user horse earnings
 * 6. getRecentWinners() - Recent competition winners with filters
 * 7. getLeaderboardStats() - Comprehensive statistics aggregation
 *
 * 🔄 BALANCED MOCKING APPROACH:
 * ✅ REAL: Controller logic, response formatting, error handling, parameter processing
 * ✅ REAL: HTTP request/response handling, status codes, data transformation
 * 🔧 MOCK: Leaderboard service calls - external dependency for data aggregation
 *
 * 💡 TEST STRATEGY: Unit testing with mocked service layer to focus on controller
 *    logic and API response formatting while ensuring predictable test outcomes
 */

import { jest, describe, it, expect, afterEach } from '@jest/globals';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Mock Prisma since the controller uses it directly
const mockPrisma = {
  user: {
    findMany: jest.fn(),
    count: jest.fn(),
    aggregate: jest.fn()
  },
  horse: {
    findMany: jest.fn(),
    count: jest.fn(),
    groupBy: jest.fn(),
    aggregate: jest.fn()
  },
  competitionEntry: {
    findMany: jest.fn(),
    count: jest.fn()
  },
  xpEvent: {
    groupBy: jest.fn(),
    aggregate: jest.fn()
  }
};

// Mock logger
const mockLogger = {
  error: jest.fn(),
  info: jest.fn()
};

// Mock the imports
jest.unstable_mockModule(join(__dirname, '../db/index.js'), () => ({
  default: mockPrisma
}));

jest.unstable_mockModule(join(__dirname, '../utils/logger.js'), () => ({
  default: mockLogger
}));

// Import the module under test after mocking
const { getTopPlayersByLevel, getTopPlayersByXP, getTopHorsesByEarnings, getTopHorsesByPerformance, getTopPlayersByHorseEarnings, getRecentWinners, getLeaderboardStats } = await import(join(__dirname, '../controllers/leaderboardController.js'));

describe('🏆 UNIT: Leaderboard Controller - Ranking & Statistics APIs', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getTopPlayersByLevel', () => {
    it('should return top players ranked by level and XP', async() => {
      const req = { query: { limit: '10', offset: '0' } };
      const res = {
        json: jest.fn()
      };

      const mockUsers = [
        { id: 'user1', name: 'Alice', level: 10, xp: 50, money: 5000 },
        { id: 'user2', name: 'Bob', level: 8, xp: 75, money: 3000 },
        { id: 'user3', name: 'Charlie', level: 7, xp: 25, money: 2500 }
      ];

      mockPrisma.user.findMany.mockResolvedValue(mockUsers);
      mockPrisma.user.count.mockResolvedValue(3);

      await getTopPlayersByLevel(req, res);

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith({
        take: 10,
        skip: 0,
        orderBy: [{ level: 'desc' }, { xp: 'desc' }],
        select: {
          id: true,
          name: true,
          level: true,
          xp: true,
          money: true
        }
      });

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Top users by level retrieved successfully',
        data: {
          users: [
            {
              rank: 1,
              userId: 'user1',
              name: 'Alice',
              level: 10,
              xp: 50,
              xpToNext: 50,
              money: 5000,
              totalXp: 950
            },
            {
              rank: 2,
              userId: 'user2',
              name: 'Bob',
              level: 8,
              xp: 75,
              xpToNext: 25,
              money: 3000,
              totalXp: 775
            },
            {
              rank: 3,
              userId: 'user3',
              name: 'Charlie',
              level: 7,
              xp: 25,
              xpToNext: 75,
              money: 2500,
              totalXp: 625
            }
          ],
          pagination: {
            limit: 10,
            offset: 0,
            total: 3,
            hasMore: false
          }
        }
      });
    });

    it('should handle default pagination parameters', async() => {
      const req = { query: {} }; // No limit/offset specified
      const res = { json: jest.fn() };

      const mockUsers = [{ id: 'user1', name: 'Alice', level: 5, xp: 50, money: 1000 }];

      mockPrisma.user.findMany.mockResolvedValue(mockUsers);
      mockPrisma.user.count.mockResolvedValue(1);

      await getTopPlayersByLevel(req, res);

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith({
        take: 10, // Default limit
        skip: 0,  // Default offset
        orderBy: [{ level: 'desc' }, { xp: 'desc' }],
        select: {
          id: true,
          name: true,
          level: true,
          xp: true,
          money: true
        }
      });

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Top users by level retrieved successfully',
        data: {
          users: [
            {
              rank: 1,
              userId: 'user1',
              name: 'Alice',
              level: 5,
              xp: 50,
              xpToNext: 50,
              money: 1000,
              totalXp: 450
            }
          ],
          pagination: {
            limit: 10,
            offset: 0,
            total: 1,
            hasMore: false
          }
        }
      });
    });

    it('should validate and sanitize pagination parameters', async() => {
      const req = { query: { limit: 'invalid', offset: -5 } };
      const res = { json: jest.fn() };
      const data = {
        users: [],
        pagination: { limit: 50, offset: 0, total: 0, hasMore: false }
      };
      leaderboardService.getTopPlayersByLevel.mockResolvedValue(data);

      await getTopPlayersByLevel(req, res);

      // Should use defaults for invalid parameters
      expect(leaderboardService.getTopPlayersByLevel).toHaveBeenCalledWith({ limit: 50, offset: 0 });
    });

    it('should handle database errors', async() => {
      const req = {};
      const res = { json: jest.fn() };
      leaderboardService.getTopPlayersByLevel.mockRejectedValue(new Error('DB error'));
      await getTopPlayersByLevel(req, res);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to retrieve user level leaderboard',
        error: 'Internal server error'
      });
    });
  });

  describe('getTopPlayersByXP', () => {
    it('should return top players by XP for all time', async() => {
      const req = { query: { limit: 10, offset: 0 } };
      const res = { json: jest.fn() };
      leaderboardService.getTopPlayersByXP.mockResolvedValue([
        { userId: 1, xp: 2000, user: { name: 'Alice' } }
      ]);
      await getTopPlayersByXP(req, res);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Top players by XP retrieved successfully',
        data: [
          { userId: 1, xp: 2000, user: { name: 'Alice' } }
        ]
      });
    });

    it('should filter by time period', async() => {
      const req = { query: { timePeriod: 'week' } };
      const res = { json: jest.fn() };
      leaderboardService.getTopPlayersByXP.mockResolvedValue([
        { userId: 2, xp: 500, user: { name: 'Bob' } }
      ]);
      await getTopPlayersByXP(req, res);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Top players by XP retrieved successfully',
        data: [
          { userId: 2, xp: 500, user: { name: 'Bob' } }
        ]
      });
    });

    it('should handle invalid time periods gracefully', async() => {
      const req = { query: { timePeriod: 'invalid_period' } };
      const res = { json: jest.fn() };
      leaderboardService.getTopPlayersByXP.mockResolvedValue([]);

      await getTopPlayersByXP(req, res);

      expect(leaderboardService.getTopPlayersByXP).toHaveBeenCalledWith({
        timePeriod: 'invalid_period',
        limit: 50,
        offset: 0
      });
    });

    it('should handle empty results', async() => {
      const req = { query: { timePeriod: 'month' } };
      const res = { json: jest.fn() };
      leaderboardService.getTopPlayersByXP.mockResolvedValue([]);

      await getTopPlayersByXP(req, res);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Top players by XP retrieved successfully',
        data: []
      });
    });

    it('should handle database errors for XP leaderboard', async() => {
      const req = { query: {} };
      const res = { json: jest.fn() };
      leaderboardService.getTopPlayersByXP.mockRejectedValue(new Error('Database error'));

      await getTopPlayersByXP(req, res);

      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to retrieve XP leaderboard',
        error: 'Internal server error'
      });
    });
  });

  describe('getTopHorsesByEarnings', () => {
    it('should return top horses by earnings', async() => {
      const req = { query: {} };
      const res = { json: jest.fn() };
      leaderboardService.getTopHorsesByEarnings.mockResolvedValue([
        { id: 1, name: 'Star', total_earnings: 10000, breed: { name: 'Arabian' }, user: { name: 'Alice' } }
      ]);
      await getTopHorsesByEarnings(req, res);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Top horses by earnings retrieved successfully',
        data: [
          { id: 1, name: 'Star', total_earnings: 10000, breed: { name: 'Arabian' }, user: { name: 'Alice' } }
        ]
      });
    });

    it('should filter by breed', async() => {
      const req = { query: { breed: 'Thoroughbred' } };
      const res = { json: jest.fn() };
      leaderboardService.getTopHorsesByEarnings.mockResolvedValue([
        { id: 2, name: 'Bolt', total_earnings: 8000, breed: { name: 'Thoroughbred' }, user: { name: 'Bob' } }
      ]);
      await getTopHorsesByEarnings(req, res);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Top horses by earnings retrieved successfully',
        data: [
          { id: 2, name: 'Bolt', total_earnings: 8000, breed: { name: 'Thoroughbred' }, user: { name: 'Bob' } }
        ]
      });
    });

    it('should handle database errors for horse earnings', async() => {
      const req = { query: {} };
      const res = { json: jest.fn() };
      leaderboardService.getTopHorsesByEarnings.mockRejectedValue(new Error('Database error'));

      await getTopHorsesByEarnings(req, res);

      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to retrieve horse earnings leaderboard',
        error: 'Internal server error'
      });
    });
  });

  describe('getTopHorsesByPerformance', () => {
    it('should return top horses by wins', async() => {
      const req = { query: {} };
      const res = { json: jest.fn() };
      leaderboardService.getTopHorsesByPerformance.mockResolvedValue([
        { horseId: 1, _count: { id: 5 }, horse: { name: 'Star', breed: { name: 'Arabian' }, user: { name: 'Alice' } } }
      ]);
      await getTopHorsesByPerformance(req, res);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Top horses by performance retrieved successfully',
        data: [
          { horseId: 1, _count: { id: 5 }, horse: { name: 'Star', breed: { name: 'Arabian' }, user: { name: 'Alice' } } }
        ]
      });
    });

    it('should filter by discipline', async() => {
      const req = { query: { discipline: 'Jumping' } };
      const res = { json: jest.fn() };
      leaderboardService.getTopHorsesByPerformance.mockResolvedValue([
        { horseId: 2, _count: { id: 3 }, horse: { name: 'Dash', breed: { name: 'Quarter Horse' }, user: { name: 'Bob' } } }
      ]);
      await getTopHorsesByPerformance(req, res);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Top horses by performance retrieved successfully',
        data: [
          { horseId: 2, _count: { id: 3 }, horse: { name: 'Dash', breed: { name: 'Quarter Horse' }, user: { name: 'Bob' } } }
        ]
      });
    });

    it('should handle database errors for horse performance', async() => {
      const req = { query: {} };
      const res = { json: jest.fn() };
      leaderboardService.getTopHorsesByPerformance.mockRejectedValue(new Error('Database error'));

      await getTopHorsesByPerformance(req, res);

      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to retrieve horse performance leaderboard',
        error: 'Internal server error'
      });
    });
  });

  describe('getTopPlayersByHorseEarnings', () => {
    it('should return top players by combined horse earnings', async() => {
      const req = {};
      const res = { json: jest.fn() };
      leaderboardService.getTopPlayersByHorseEarnings.mockResolvedValue([
        { userId: 1, _sum: { total_earnings: 20000 }, user: { name: 'Alice' } }
      ]);
      await getTopPlayersByHorseEarnings(req, res);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Top players by horse earnings retrieved successfully',
        data: [
          { userId: 1, _sum: { total_earnings: 20000 }, user: { name: 'Alice' } }
        ]
      });
    });

    it('should handle database errors for player horse earnings', async() => {
      const req = {};
      const res = { json: jest.fn() };
      leaderboardService.getTopPlayersByHorseEarnings.mockRejectedValue(new Error('Database error'));

      await getTopPlayersByHorseEarnings(req, res);

      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to retrieve player horse earnings leaderboard',
        error: 'Internal server error'
      });
    });
  });

  describe('getRecentWinners', () => {
    it('should return recent winners', async() => {
      const req = {};
      const res = { json: jest.fn() };
      leaderboardService.getRecentWinners.mockResolvedValue([
        {
          id: 1,
          placement: '1st',
          horse: { name: 'Flash', user: { name: 'Alice' } },
          competedAt: '2025-05-28',
          discipline: 'Dressage',
          showName: 'Spring Classic',
          prizeWon: 1000
        }
      ]);
      await getRecentWinners(req, res);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Recent winners retrieved successfully',
        data: [
          {
            id: 1,
            placement: '1st',
            horse: { name: 'Flash', user: { name: 'Alice' } },
            competedAt: '2025-05-28',
            discipline: 'Dressage',
            showName: 'Spring Classic',
            prizeWon: 1000
          }
        ]
      });
    });

    it('should filter by discipline', async() => {
      const req = { query: { discipline: 'Jumping' } };
      const res = { json: jest.fn() };
      leaderboardService.getRecentWinners.mockResolvedValue([]);
      await getRecentWinners(req, res);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Recent winners retrieved successfully',
        data: []
      });
    });

    it('should handle database errors for recent winners', async() => {
      const req = {};
      const res = { json: jest.fn() };
      leaderboardService.getRecentWinners.mockRejectedValue(new Error('Database error'));

      await getRecentWinners(req, res);

      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to retrieve recent winners',
        error: 'Internal server error'
      });
    });
  });

  describe('getLeaderboardStats', () => {
    it('should return comprehensive leaderboard statistics', async() => {
      const req = {};
      const res = { json: jest.fn() };
      const stats = {
        userCount: 100,
        horseCount: 250,
        showCount: 50,
        totalEarnings: 500000,
        totalXp: 1000000,
        averageUserLevel: 5.5
      };
      leaderboardService.getLeaderboardStats.mockResolvedValue(stats);
      await getLeaderboardStats(req, res);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Leaderboard statistics retrieved successfully',
        data: stats
      });
    });

    it('should handle database errors for stats', async() => {
      const req = {};
      const res = { json: jest.fn() };
      leaderboardService.getLeaderboardStats.mockRejectedValue(new Error('DB Error'));
      await getLeaderboardStats(req, res);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to retrieve leaderboard statistics',
        error: 'Internal server error'
      });
    });
  });
});
