import { jest } from '@jest/globals';
import { getTopPlayersByLevel, getTopPlayersByXP, getTopHorsesByEarnings, getTopHorsesByPerformance, getTopPlayersByHorseEarnings, getRecentWinners, getLeaderboardStats } from '../controllers/leaderboardController.js';
import leaderboardService from '../services/leaderboardService.js';

jest.mock('../services/leaderboardService.js');

describe('Leaderboard Controller', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getTopPlayersByLevel', () => {
    it('should return top players ranked by level and XP', async() => {
      const req = { query: { limit: 10, offset: 0 } };
      const res = {
        json: jest.fn()
      };
      const data = {
        users: [
          { level: 10, xp: 1000, money: 5000 },
          { level: 8, xp: 900, money: 3000 },
          { level: 7, xp: 850, money: 2500 }
        ],
        pagination: {
          limit: 10,
          offset: 0,
          total: 3,
          hasMore: false
        }
      };
      leaderboardService.getTopPlayersByLevel.mockResolvedValue(data);
      await getTopPlayersByLevel(req, res);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Top players retrieved successfully',
        data
      });
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
