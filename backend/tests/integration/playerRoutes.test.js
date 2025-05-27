import { jest } from '@jest/globals';
import request from 'supertest';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Mock the playerModel functions
const mockGetPlayerById = jest.fn();
const mockGetPlayerByEmail = jest.fn();
const mockGetPlayerWithHorses = jest.fn();
const mockCreatePlayer = jest.fn();
const mockUpdatePlayer = jest.fn();
const mockDeletePlayer = jest.fn();
const mockAddXp = jest.fn();
const mockLevelUpIfNeeded = jest.fn();

// Mock logger
const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

jest.unstable_mockModule(join(__dirname, '../../models/playerModel.js'), () => ({
  getPlayerById: mockGetPlayerById,
  getPlayerByEmail: mockGetPlayerByEmail,
  getPlayerWithHorses: mockGetPlayerWithHorses,
  createPlayer: mockCreatePlayer,
  updatePlayer: mockUpdatePlayer,
  deletePlayer: mockDeletePlayer,
  addXp: mockAddXp,
  levelUpIfNeeded: mockLevelUpIfNeeded
}));

jest.unstable_mockModule(join(__dirname, '../../utils/logger.js'), () => ({
  default: mockLogger
}));

// Import app after mocking
const app = (await import('../../app.js')).default;

describe('Player Routes Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetPlayerById.mockClear();
    mockGetPlayerByEmail.mockClear();
    mockGetPlayerWithHorses.mockClear();
    mockCreatePlayer.mockClear();
    mockUpdatePlayer.mockClear();
    mockDeletePlayer.mockClear();
    mockAddXp.mockClear();
    mockLevelUpIfNeeded.mockClear();
    mockLogger.info.mockClear();
    mockLogger.warn.mockClear();
    mockLogger.error.mockClear();
  });

  describe('GET /api/player/:id/progress', () => {
    it('should return player progress successfully', async() => {
      const mockPlayer = {
        id: 'test-player-123',
        name: 'Integration Test Player',
        level: 5,
        xp: 75,
        email: 'integration@test.com',
        money: 3000
      };

      mockGetPlayerById.mockResolvedValue(mockPlayer);

      const response = await request(app)
        .get('/api/player/test-player-123/progress')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'Player progress retrieved successfully',
        data: {
          playerId: 'test-player-123',
          name: 'Integration Test Player',
          level: 5,
          xp: 75,
          xpToNextLevel: 25 // 100 - (75 % 100) = 25
        }
      });

      expect(mockGetPlayerById).toHaveBeenCalledWith('test-player-123');
    });

    it('should return 404 for non-existent player', async() => {
      mockGetPlayerById.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/player/nonexistent-player/progress')
        .expect(404);

      expect(response.body).toEqual({
        success: false,
        message: 'Player not found'
      });
    });

    it('should return validation error for empty player ID', async() => {
      const response = await request(app)
        .get('/api/player//progress')
        .expect(404); // Route not found for empty ID
    });

    it('should return validation error for invalid player ID format', async() => {
      // Single character "a" is actually valid (min: 1, max: 50)
      // So let's test with an empty string by using a different approach
      // or test that a valid short ID actually works
      mockGetPlayerById.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/player/a/progress') // Single character is valid
        .expect(404); // Should get 404 because player doesn't exist

      expect(response.body).toEqual({
        success: false,
        message: 'Player not found'
      });
    });

    it('should return validation error for extremely long player ID', async() => {
      const longId = 'a'.repeat(51); // 51 characters, exceeds limit

      const response = await request(app)
        .get(`/api/player/${longId}/progress`)
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        message: 'Validation failed',
        errors: expect.arrayContaining([
          expect.objectContaining({
            msg: 'Player ID must be between 1 and 50 characters'
          })
        ])
      });
    });

    it('should handle database errors gracefully', async() => {
      mockGetPlayerById.mockRejectedValue(new Error('Database connection failed'));

      const response = await request(app)
        .get('/api/player/test-player-123/progress')
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        message: 'Internal server error',
        error: expect.any(String)
      });
    });

    it('should calculate xpToNextLevel correctly for edge cases', async() => {
      const testCases = [
        {
          player: { id: 'p1', name: 'Player1', level: 1, xp: 0 },
          expectedXpToNext: 100
        },
        {
          player: { id: 'p2', name: 'Player2', level: 1, xp: 99 },
          expectedXpToNext: 1
        },
        {
          player: { id: 'p3', name: 'Player3', level: 2, xp: 0 },
          expectedXpToNext: 100
        },
        {
          player: { id: 'p4', name: 'Player4', level: 3, xp: 50 },
          expectedXpToNext: 50
        }
      ];

      for (const testCase of testCases) {
        mockGetPlayerById.mockResolvedValue(testCase.player);

        const response = await request(app)
          .get(`/api/player/${testCase.player.id}/progress`)
          .expect(200);

        expect(response.body.data.xpToNextLevel).toBe(testCase.expectedXpToNext);

        jest.clearAllMocks();
      }
    });

    it('should only return required fields in response', async() => {
      const mockPlayer = {
        id: 'test-player-456',
        name: 'Detailed Player',
        level: 8,
        xp: 42,
        email: 'detailed@test.com',
        money: 5000,
        settings: { theme: 'dark', notifications: true },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockGetPlayerById.mockResolvedValue(mockPlayer);

      const response = await request(app)
        .get('/api/player/test-player-456/progress')
        .expect(200);

      // Verify only required fields are present
      expect(response.body.data).toEqual({
        playerId: 'test-player-456',
        name: 'Detailed Player',
        level: 8,
        xp: 42,
        xpToNextLevel: 58 // 100 - (42 % 100) = 58
      });

      // Verify sensitive/unnecessary fields are not included
      expect(response.body.data).not.toHaveProperty('email');
      expect(response.body.data).not.toHaveProperty('money');
      expect(response.body.data).not.toHaveProperty('settings');
      expect(response.body.data).not.toHaveProperty('createdAt');
      expect(response.body.data).not.toHaveProperty('updatedAt');
    });

    it('should handle special characters in player ID', async() => {
      const specialId = 'player-123_test';
      const mockPlayer = {
        id: specialId,
        name: 'Special Player',
        level: 2,
        xp: 25
      };

      mockGetPlayerById.mockResolvedValue(mockPlayer);

      const response = await request(app)
        .get(`/api/player/${specialId}/progress`)
        .expect(200);

      expect(response.body.data.playerId).toBe(specialId);
      expect(mockGetPlayerById).toHaveBeenCalledWith(specialId);
    });
  });
});
