/**
 * Leaderboard Controller Tests
 * Comprehensive test suite for leaderboard functionality
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import request from 'supertest';
import app from '../app.js';
import prisma from '../db/index.js';

// Mock the auth middleware to always authenticate
jest.mock('../middleware/auth.js', () => {
  return jest.fn((req, res, next) => {
    req.user = { id: 1, username: 'testuser' };
    next();
  });
});

describe('Leaderboard Controller', () => {
  let testPlayers, testHorses, testResults;

  beforeEach(async() => {
    // Clean up database
    await prisma.competitionResult.deleteMany();
    await prisma.horse.deleteMany();
    await prisma.player.deleteMany();

    // Create test players
    testPlayers = await Promise.all([
      prisma.player.create({
        data: {
          username: 'player1',
          email: 'player1@test.com',
          passwordHash: 'hashedpassword',
          level: 10,
          xp: 1500,
          currency: 1000
        }
      }),
      prisma.player.create({
        data: {
          username: 'player2',
          email: 'player2@test.com',
          passwordHash: 'hashedpassword',
          level: 8,
          xp: 950,
          currency: 800
        }
      }),
      prisma.player.create({
        data: {
          username: 'player3',
          email: 'player3@test.com',
          passwordHash: 'hashedpassword',
          level: 12,
          xp: 2100,
          currency: 1200
        }
      })
    ]);

    // Create test horses
    testHorses = await Promise.all([
      prisma.horse.create({
        data: {
          name: 'Thunder',
          breed: 'Thoroughbred',
          ownerId: testPlayers[0].id,
          totalEarnings: 5000,
          color: 'Bay',
          gender: 'Stallion',
          birthDate: new Date('2020-01-01'),
          registrationNumber: 'TB001',
          generation: 1,
          sireId: null,
          damId: null,
          age: 5,
          energyLevel: 100,
          healthLevel: 100,
          moodLevel: 100,
          fitnessLevel: 100,
          coatCondition: 100,
          overallCondition: 100,
          disciplineScores: JSON.stringify({
            dressage: 85,
            jumping: 78,
            racing: 92
          })
        }
      }),
      prisma.horse.create({
        data: {
          name: 'Lightning',
          breed: 'Arabian',
          ownerId: testPlayers[1].id,
          totalEarnings: 3500,
          color: 'Chestnut',
          gender: 'Mare',
          birthDate: new Date('2019-05-15'),
          registrationNumber: 'AR001',
          generation: 1,
          sireId: null,
          damId: null,
          age: 6,
          energyLevel: 95,
          healthLevel: 98,
          moodLevel: 90,
          fitnessLevel: 88,
          coatCondition: 95,
          overallCondition: 93,
          disciplineScores: JSON.stringify({
            dressage: 90,
            jumping: 82,
            racing: 75
          })
        }
      }),
      prisma.horse.create({
        data: {
          name: 'Storm',
          breed: 'Thoroughbred',
          ownerId: testPlayers[2].id,
          totalEarnings: 7500,
          color: 'Black',
          gender: 'Stallion',
          birthDate: new Date('2018-03-10'),
          registrationNumber: 'TB002',
          generation: 1,
          sireId: null,
          damId: null,
          age: 7,
          energyLevel: 90,
          healthLevel: 95,
          moodLevel: 88,
          fitnessLevel: 95,
          coatCondition: 92,
          overallCondition: 94,
          disciplineScores: JSON.stringify({
            dressage: 88,
            jumping: 95,
            racing: 87
          })
        }
      })
    ]);

    // Create test competition results
    testResults = await Promise.all([
      // Thunder's results
      prisma.competitionResult.create({
        data: {
          horseId: testHorses[0].id,
          showId: 1,
          disciplineType: 'racing',
          score: 92.5,
          placement: 1,
          prizeWon: 2000,
          date: new Date('2024-01-15')
        }
      }),
      prisma.competitionResult.create({
        data: {
          horseId: testHorses[0].id,
          showId: 2,
          disciplineType: 'dressage',
          score: 85.0,
          placement: 2,
          prizeWon: 1000,
          date: new Date('2024-01-20')
        }
      }),
      // Lightning's results
      prisma.competitionResult.create({
        data: {
          horseId: testHorses[1].id,
          showId: 3,
          disciplineType: 'dressage',
          score: 90.0,
          placement: 1,
          prizeWon: 1500,
          date: new Date('2024-01-25')
        }
      }),
      // Storm's results
      prisma.competitionResult.create({
        data: {
          horseId: testHorses[2].id,
          showId: 4,
          disciplineType: 'jumping',
          score: 95.0,
          placement: 1,
          prizeWon: 3000,
          date: new Date('2024-01-30')
        }
      }),
      prisma.competitionResult.create({
        data: {
          horseId: testHorses[2].id,
          showId: 5,
          disciplineType: 'jumping',
          score: 94.5,
          placement: 1,
          prizeWon: 2500,
          date: new Date('2024-02-05')
        }
      })
    ]);
  });

  afterEach(async() => {
    await prisma.competitionResult.deleteMany();
    await prisma.horse.deleteMany();
    await prisma.player.deleteMany();
  });

  describe('GET /api/leaderboard/players/level', () => {
    it('should return top players ranked by level and XP', async() => {
      const response = await request(app)
        .get('/api/leaderboard/players/level')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.players).toHaveLength(3);

      // Should be ordered by level desc, then XP desc
      const { players } = response.body.data;
      expect(players[0].level).toBe(12); // player3
      expect(players[1].level).toBe(10); // player1
      expect(players[2].level).toBe(8);  // player2

      // Check progress calculation
      expect(players[0]).toHaveProperty('progressToNext');
      expect(players[0]).toHaveProperty('xpToNext');
      expect(players[0].rank).toBe(1);
    });

    it('should respect limit parameter', async() => {
      const response = await request(app)
        .get('/api/leaderboard/players/level?limit=2')
        .expect(200);

      expect(response.body.data.players).toHaveLength(2);
      expect(response.body.data.pagination.limit).toBe(2);
    });

    it('should respect offset parameter', async() => {
      const response = await request(app)
        .get('/api/leaderboard/players/level?offset=1&limit=1')
        .expect(200);

      expect(response.body.data.players).toHaveLength(1);
      expect(response.body.data.players[0].rank).toBe(2);
    });
  });

  describe('GET /api/leaderboard/players/xp', () => {
    it('should return top players ranked by XP', async() => {
      const response = await request(app)
        .get('/api/leaderboard/players/xp')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.players).toHaveLength(3);

      // Should be ordered by XP desc
      const { players } = response.body.data;
      expect(players[0].xp).toBe(2100); // player3
      expect(players[1].xp).toBe(1500); // player1
      expect(players[2].xp).toBe(950);  // player2
    });

    it('should filter by time period', async() => {
      const response = await request(app)
        .get('/api/leaderboard/players/xp?period=month')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.period).toBe('month');
    });
  });

  describe('GET /api/leaderboard/horses/earnings', () => {
    it('should return top horses ranked by earnings', async() => {
      const response = await request(app)
        .get('/api/leaderboard/horses/earnings')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.horses).toHaveLength(3);

      // Should be ordered by earnings desc
      const { horses } = response.body.data;
      expect(horses[0].totalEarnings).toBe(7500); // Storm
      expect(horses[1].totalEarnings).toBe(5000); // Thunder
      expect(horses[2].totalEarnings).toBe(3500); // Lightning

      expect(horses[0].rank).toBe(1);
      expect(horses[0]).toHaveProperty('ownerName');
    });

    it('should filter by breed', async() => {
      const response = await request(app)
        .get('/api/leaderboard/horses/earnings?breed=Arabian')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.horses).toHaveLength(1);
      expect(response.body.data.horses[0].breed).toBe('Arabian');
    });
  });

  describe('GET /api/leaderboard/horses/performance', () => {
    it('should return top horses ranked by wins', async() => {
      const response = await request(app)
        .get('/api/leaderboard/horses/performance?metric=wins')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.horses).toHaveLength(3);

      // Storm should have 2 wins, others have 1 each
      const { horses } = response.body.data;
      expect(horses[0].performanceMetric).toBe(2); // Storm
      expect(horses[0]).toHaveProperty('totalCompetitions');
      expect(horses[0]).toHaveProperty('winRate');
    });

    it('should filter by discipline', async() => {
      const response = await request(app)
        .get('/api/leaderboard/horses/performance?discipline=jumping')
        .expect(200);

      expect(response.body.success).toBe(true);
      // Only Storm has jumping results
      expect(response.body.data.horses).toHaveLength(1);
      expect(response.body.data.horses[0].name).toBe('Storm');
    });

    it('should rank by average score', async() => {
      const response = await request(app)
        .get('/api/leaderboard/horses/performance?metric=average_score')
        .expect(200);

      expect(response.body.success).toBe(true);
      const { horses } = response.body.data;
      // Should be ordered by average score desc
      expect(horses[0].performanceMetric).toBeGreaterThan(horses[1].performanceMetric);
    });
  });

  describe('GET /api/leaderboard/players/horse-earnings', () => {
    it('should return top players ranked by combined horse earnings', async() => {
      const response = await request(app)
        .get('/api/leaderboard/players/horse-earnings')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.players).toHaveLength(3);

      const { players } = response.body.data;
      expect(players[0].totalEarnings).toBe(7500); // player3 with Storm
      expect(players[1].totalEarnings).toBe(5000); // player1 with Thunder
      expect(players[2].totalEarnings).toBe(3500); // player2 with Lightning

      expect(players[0]).toHaveProperty('horseCount');
      expect(players[0]).toHaveProperty('avgEarningsPerHorse');
    });
  });

  describe('GET /api/leaderboard/recent-winners', () => {
    it('should return recent competition winners', async() => {
      const response = await request(app)
        .get('/api/leaderboard/recent-winners')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.winners.length).toBeGreaterThan(0);

      const { winners } = response.body.data;
      // Should be ordered by date desc (most recent first)
      expect(new Date(winners[0].date)).toBeInstanceOf(Date);
      expect(winners[0]).toHaveProperty('horseName');
      expect(winners[0]).toHaveProperty('ownerName');
      expect(winners[0]).toHaveProperty('disciplineType');
      expect(winners[0]).toHaveProperty('prizeWon');
    });

    it('should filter by discipline', async() => {
      const response = await request(app)
        .get('/api/leaderboard/recent-winners?discipline=jumping')
        .expect(200);

      expect(response.body.success).toBe(true);
      const { winners } = response.body.data;
      winners.forEach(winner => {
        expect(winner.disciplineType).toBe('jumping');
      });
    });
  });

  describe('GET /api/leaderboard/stats', () => {
    it('should return comprehensive leaderboard statistics', async() => {
      const response = await request(app)
        .get('/api/leaderboard/stats')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('playerStats');
      expect(response.body.data).toHaveProperty('horseStats');
      expect(response.body.data).toHaveProperty('competitionStats');
      expect(response.body.data).toHaveProperty('topPerformers');

      const { playerStats, horseStats, competitionStats } = response.body.data;

      expect(playerStats.totalPlayers).toBe(3);
      expect(playerStats.averageLevel).toBeGreaterThan(0);
      expect(horseStats.totalHorses).toBe(3);
      expect(competitionStats.totalCompetitions).toBe(5);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid limit parameter', async() => {
      const response = await request(app)
        .get('/api/leaderboard/players/level?limit=invalid')
        .expect(200);

      // Should default to 10
      expect(response.body.data.pagination.limit).toBe(10);
    });

    it('should cap limit at maximum value', async() => {
      const response = await request(app)
        .get('/api/leaderboard/players/level?limit=200')
        .expect(200);

      // Should cap at 100
      expect(response.body.data.pagination.limit).toBe(100);
    });

    it('should handle invalid metric parameter', async() => {
      const response = await request(app)
        .get('/api/leaderboard/horses/performance?metric=invalid')
        .expect(200);

      // Should default to wins
      expect(response.body.success).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    beforeEach(async() => {
      // Clean up and create minimal data
      await prisma.competitionResult.deleteMany();
      await prisma.horse.deleteMany();
      await prisma.player.deleteMany();
    });

    it('should handle empty database gracefully', async() => {
      const response = await request(app)
        .get('/api/leaderboard/players/level')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.players).toHaveLength(0);
      expect(response.body.data.pagination.total).toBe(0);
    });

    it('should handle horses with no competition results', async() => {
      const player = await prisma.player.create({
        data: {
          username: 'testplayer',
          email: 'test@test.com',
          passwordHash: 'hash',
          level: 1,
          xp: 0,
          currency: 100
        }
      });

      await prisma.horse.create({
        data: {
          name: 'TestHorse',
          breed: 'Thoroughbred',
          ownerId: player.id,
          totalEarnings: 0,
          color: 'Bay',
          gender: 'Stallion',
          birthDate: new Date('2020-01-01'),
          registrationNumber: 'TB999',
          generation: 1,
          sireId: null,
          damId: null,
          age: 5,
          energyLevel: 100,
          healthLevel: 100,
          moodLevel: 100,
          fitnessLevel: 100,
          coatCondition: 100,
          overallCondition: 100,
          disciplineScores: JSON.stringify({})
        }
      });

      const response = await request(app)
        .get('/api/leaderboard/horses/performance')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.horses).toHaveLength(1);
      expect(response.body.data.horses[0].performanceMetric).toBe(0);
    });
  });
});
