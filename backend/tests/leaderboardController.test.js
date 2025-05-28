/**
 * Leaderboard Controller Unit Tests
 * Tests all leaderboard functionality including rankings and statistics
 */

import { jest } from '@jest/globals';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Mock the database module BEFORE importing the controller
jest.unstable_mockModule(join(__dirname, '../db/index.js'), () => ({
  default: {
    user: {
      findMany: jest.fn(),
      count: jest.fn(),
      aggregate: jest.fn()
    },
    horse: {
      findMany: jest.fn(),
      count: jest.fn(),
      aggregate: jest.fn(),
      groupBy: jest.fn()
    },
    competitionResult: {
      findMany: jest.fn(),
      count: jest.fn(),
      aggregate: jest.fn(),
      groupBy: jest.fn()
    },
    xpEvent: {
      findMany: jest.fn(),
      aggregate: jest.fn(),
      groupBy: jest.fn()
    },
    breed: {
      findMany: jest.fn(),
      count: jest.fn()
    },
    show: {
      count: jest.fn()
    },
    $disconnect: jest.fn()
  }
}));

// Mock logger
jest.unstable_mockModule(join(__dirname, '../utils/logger.js'), () => ({
  default: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }
}));

// Now import the controller and mocked modules
const {
  getTopPlayersByLevel,
  getTopPlayersByXP,
  getTopHorsesByEarnings,
  getTopHorsesByPerformance,
  getTopPlayersByHorseEarnings,
  getRecentWinners,
  getLeaderboardStats
} = await import('../controllers/leaderboardController.js');

const mockPrisma = (await import(join(__dirname, '../db/index.js'))).default;

describe('Leaderboard Controller', () => {
  let mockReq;
  let mockRes;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Setup mock request and response objects
    mockReq = {
      query: {},
      user: { id: 'test-player-1' }
    };

    mockRes = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis()
    };
  });

  describe('getTopPlayersByLevel', () => {
    const mockPlayers = [
      {
        id: 'player-1',
        name: 'TopPlayer1',
        level: 10,
        xp: 50,
        money: 5000
      },
      {
        id: 'player-2',
        name: 'TopPlayer2',
        level: 9,
        xp: 80,
        money: 4500
      },
      {
        id: 'player-3',
        name: 'TopPlayer3',
        level: 9,
        xp: 60,
        money: 4000
      }
    ];

    it('should return top players ranked by level and XP', async() => {
      mockPrisma.user.findMany.mockResolvedValue(mockPlayers);

      await getTopPlayersByLevel(mockReq, mockRes);

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith({
        select: {
          id: true,
          name: true,
          level: true,
          xp: true,
          money: true
        },
        orderBy: [
          { level: 'desc' },
          { xp: 'desc' }
        ],
        take: 10,
        skip: 0
      });

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Top players by level retrieved successfully',
        data: {
          players: [
            {
              rank: 1,
              playerId: 'player-1',
              name: 'TopPlayer1',
              level: 10,
              xp: 50,
              xpToNext: 50,
              money: 5000,
              totalXp: 950
            },
            {
              rank: 2,
              playerId: 'player-2',
              name: 'TopPlayer2',
              level: 9,
              xp: 80,
              xpToNext: 20,
              money: 4500,
              totalXp: 880
            },
            {
              rank: 3,
              playerId: 'player-3',
              name: 'TopPlayer3',
              level: 9,
              xp: 60,
              xpToNext: 40,
              money: 4000,
              totalXp: 860
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

    it('should handle pagination parameters', async() => {
      mockReq.query = { limit: '5', offset: '10' };
      mockPrisma.user.findMany.mockResolvedValue([]);

      await getTopPlayersByLevel(mockReq, mockRes);

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 5,
          skip: 10
        })
      );
    });

    it('should handle database errors', async() => {
      mockPrisma.user.findMany.mockRejectedValue(new Error('Database error'));

      await getTopPlayersByLevel(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to retrieve top players by level'
      });
    });
  });

  describe('getTopPlayersByXP', () => {
    const mockXpData = [
      {
        playerId: 'player-1',
        player: { name: 'XPPlayer1' },
        _sum: { amount: 500 }
      },
      {
        playerId: 'player-2',
        player: { name: 'XPPlayer2' },
        _sum: { amount: 400 }
      }
    ];

    it('should return top players by XP for all time', async() => {
      mockReq.query = { period: 'all' };
      mockPrisma.xpEvent.groupBy.mockResolvedValue(mockXpData);

      await getTopPlayersByXP(mockReq, mockRes);

      expect(mockPrisma.xpEvent.groupBy).toHaveBeenCalledWith({
        by: ['playerId'],
        _sum: { amount: true },
        include: {
          player: {
            select: { name: true }
          }
        },
        orderBy: {
          _sum: { amount: 'desc' }
        },
        take: 10,
        skip: 0
      });
    });

    it('should filter by time period', async() => {
      mockReq.query = { period: 'week' };
      mockPrisma.xpEvent.groupBy.mockResolvedValue(mockXpData);

      await getTopPlayersByXP(mockReq, mockRes);

      expect(mockPrisma.xpEvent.groupBy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            createdAt: {
              gte: expect.any(Date)
            }
          }
        })
      );
    });
  });

  describe('getTopHorsesByEarnings', () => {
    const mockHorses = [
      {
        id: 1,
        name: 'EarningHorse1',
        total_earnings: 10000,
        playerId: 'player-1',
        player: { name: 'Owner1' },
        breed: { name: 'Thoroughbred' }
      },
      {
        id: 2,
        name: 'EarningHorse2',
        total_earnings: 8000,
        playerId: 'player-2',
        player: { name: 'Owner2' },
        breed: { name: 'Arabian' }
      }
    ];

    it('should return top horses by earnings', async() => {
      mockPrisma.horse.findMany.mockResolvedValue(mockHorses);

      await getTopHorsesByEarnings(mockReq, mockRes);

      expect(mockPrisma.horse.findMany).toHaveBeenCalledWith({
        select: {
          id: true,
          name: true,
          total_earnings: true,
          playerId: true,
          player: {
            select: { name: true }
          },
          breed: {
            select: { name: true }
          }
        },
        where: {
          total_earnings: { gt: 0 }
        },
        orderBy: { total_earnings: 'desc' },
        take: 10,
        skip: 0
      });
    });

    it('should filter by breed', async() => {
      mockReq.query = { breed: 'Thoroughbred' };
      mockPrisma.horse.findMany.mockResolvedValue(mockHorses);

      await getTopHorsesByEarnings(mockReq, mockRes);

      expect(mockPrisma.horse.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            total_earnings: { gt: 0 },
            breed: { name: 'Thoroughbred' }
          }
        })
      );
    });
  });

  describe('getTopHorsesByPerformance', () => {
    const mockPerformanceData = [
      {
        horseId: 1,
        horse: {
          name: 'PerformHorse1',
          player: { name: 'Owner1' },
          breed: { name: 'Thoroughbred' }
        },
        _count: { id: 5 }
      }
    ];

    it('should return top horses by wins', async() => {
      mockReq.query = { metric: 'wins' };
      mockPrisma.competitionResult.groupBy.mockResolvedValue(mockPerformanceData);

      await getTopHorsesByPerformance(mockReq, mockRes);

      expect(mockPrisma.competitionResult.groupBy).toHaveBeenCalledWith({
        by: ['horseId'],
        _count: { id: true },
        where: { placement: '1st' },
        include: {
          horse: {
            select: {
              name: true,
              player: { select: { name: true } },
              breed: { select: { name: true } }
            }
          }
        },
        orderBy: { _count: { id: 'desc' } },
        take: 10,
        skip: 0
      });
    });

    it('should filter by discipline', async() => {
      mockReq.query = { discipline: 'Dressage' };
      mockPrisma.competitionResult.groupBy.mockResolvedValue(mockPerformanceData);

      await getTopHorsesByPerformance(mockReq, mockRes);

      expect(mockPrisma.competitionResult.groupBy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            placement: '1st',
            discipline: 'Dressage'
          }
        })
      );
    });
  });

  describe('getTopPlayersByHorseEarnings', () => {
    const mockPlayerEarnings = [
      {
        playerId: 'player-1',
        player: { name: 'EarningPlayer1' },
        _sum: { total_earnings: 25000 },
        _count: { id: 3 }
      }
    ];

    it('should return top players by combined horse earnings', async() => {
      mockPrisma.horse.groupBy.mockResolvedValue(mockPlayerEarnings);

      await getTopPlayersByHorseEarnings(mockReq, mockRes);

      expect(mockPrisma.horse.groupBy).toHaveBeenCalledWith({
        by: ['playerId'],
        _sum: { total_earnings: true },
        _count: { id: true },
        include: {
          player: {
            select: { name: true }
          }
        },
        where: {
          total_earnings: { gt: 0 }
        },
        orderBy: {
          _sum: { total_earnings: 'desc' }
        },
        take: 10,
        skip: 0
      });
    });
  });

  describe('getRecentWinners', () => {
    const mockRecentWinners = [
      {
        id: 1,
        horse: {
          name: 'WinnerHorse1',
          player: { name: 'WinnerOwner1' }
        },
        showName: 'Test Show 1',
        discipline: 'Dressage',
        placement: '1st',
        prizeWon: 1000,
        competedAt: new Date()
      }
    ];

    it('should return recent winners', async() => {
      mockPrisma.competitionResult.findMany.mockResolvedValue(mockRecentWinners);

      await getRecentWinners(mockReq, mockRes);

      expect(mockPrisma.competitionResult.findMany).toHaveBeenCalledWith({
        select: {
          id: true,
          horse: {
            select: {
              name: true,
              player: {
                select: { name: true }
              }
            }
          },
          showName: true,
          discipline: true,
          placement: true,
          prizeWon: true,
          competedAt: true
        },
        where: {
          placement: { in: ['1st', '2nd', '3rd'] }
        },
        orderBy: { competedAt: 'desc' },
        take: 20
      });
    });

    it('should filter by discipline', async() => {
      mockReq.query = { discipline: 'Jumping' };
      mockPrisma.competitionResult.findMany.mockResolvedValue(mockRecentWinners);

      await getRecentWinners(mockReq, mockRes);

      expect(mockPrisma.competitionResult.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            placement: { in: ['1st', '2nd', '3rd'] },
            discipline: 'Jumping'
          }
        })
      );
    });
  });

  describe('getLeaderboardStats', () => {
    const mockStats = {
      playerCount: 100,
      horseCount: 250,
      showCount: 50,
      totalEarnings: 500000,
      totalXp: 1000000,
      avgLevel: 5.5
    };

    beforeEach(() => {
      mockPrisma.user.count.mockResolvedValue(mockStats.playerCount);
      mockPrisma.horse.count.mockResolvedValue(mockStats.horseCount);
      mockPrisma.show.count.mockResolvedValue(mockStats.showCount);
      mockPrisma.horse.aggregate.mockResolvedValue({
        _sum: { total_earnings: mockStats.totalEarnings }
      });
      mockPrisma.xpEvent.aggregate.mockResolvedValue({
        _sum: { amount: mockStats.totalXp }
      });
      mockPrisma.user.aggregate.mockResolvedValue({
        _avg: { level: mockStats.avgLevel }
      });
    });

    it('should return comprehensive leaderboard statistics', async() => {
      await getLeaderboardStats(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Leaderboard statistics retrieved successfully',
        data: {
          playerStats: {
            totalPlayers: mockStats.playerCount,
            averageLevel: mockStats.avgLevel,
            totalXpEarned: mockStats.totalXp
          },
          horseStats: {
            totalHorses: mockStats.horseCount,
            totalEarnings: mockStats.totalEarnings,
            averageEarningsPerHorse: mockStats.totalEarnings / mockStats.horseCount
          },
          competitionStats: {
            totalShows: mockStats.showCount
          },
          summary: {
            playersWithHorses: expect.any(Number),
            activeCompetitors: expect.any(Number),
            topPlayerLevel: expect.any(Number),
            highestEarningHorse: expect.any(Number)
          }
        }
      });
    });

    it('should handle database errors in stats retrieval', async() => {
      mockPrisma.user.count.mockRejectedValue(new Error('Stats error'));

      await getLeaderboardStats(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to retrieve leaderboard statistics'
      });
    });
  });
});
