import { jest } from '@jest/globals';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Mock the playerModel functions
const mockGetPlayerById = jest.fn();

// Mock logger
const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

jest.unstable_mockModule(join(__dirname, '../models/playerModel.js'), () => ({
  getPlayerById: mockGetPlayerById
}));

jest.unstable_mockModule(join(__dirname, '../utils/logger.js'), () => ({
  default: mockLogger
}));

// Import the module after mocking
const { getPlayerProgress } = await import(join(__dirname, '../controllers/playerController.js'));

describe('playerController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetPlayerById.mockClear();
    mockLogger.info.mockClear();
    mockLogger.warn.mockClear();
    mockLogger.error.mockClear();
  });

  describe('getPlayerProgress', () => {
    it('should return player progress successfully', async () => {
      const mockPlayer = {
        id: 'player-123',
        name: 'Alex',
        level: 4,
        xp: 30,
        email: 'alex@example.com',
        money: 1500
      };

      mockGetPlayerById.mockResolvedValue(mockPlayer);

      const req = {
        params: { id: 'player-123' }
      };
      const res = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis()
      };

      await getPlayerProgress(req, res);

      expect(mockGetPlayerById).toHaveBeenCalledWith('player-123');
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Player progress retrieved successfully',
        data: {
          playerId: 'player-123',
          name: 'Alex',
          level: 4,
          xp: 30,
          xpToNextLevel: 70 // 100 - (30 % 100) = 70
        }
      });
      expect(mockLogger.info).toHaveBeenCalledWith('[playerController.getPlayerProgress] Getting progress for player player-123');
    });

    it('should calculate xpToNextLevel correctly for different XP values', async () => {
      const testCases = [
        { xp: 0, expectedXpToNext: 100 },   // 100 - (0 % 100) = 100
        { xp: 50, expectedXpToNext: 50 },   // 100 - (50 % 100) = 50
        { xp: 99, expectedXpToNext: 1 },    // 100 - (99 % 100) = 1
        { xp: 100, expectedXpToNext: 100 }, // 100 - (100 % 100) = 100 (level 2, 0 XP)
        { xp: 150, expectedXpToNext: 50 },  // 100 - (150 % 100) = 50 (level 2, 50 XP)
        { xp: 230, expectedXpToNext: 70 }   // 100 - (230 % 100) = 70 (level 3, 30 XP)
      ];

      for (const testCase of testCases) {
        const mockPlayer = {
          id: 'player-123',
          name: 'Test Player',
          level: Math.floor(testCase.xp / 100) + 1,
          xp: testCase.xp % 100,
          email: 'test@example.com'
        };

        mockGetPlayerById.mockResolvedValue(mockPlayer);

        const req = { params: { id: 'player-123' } };
        const res = { json: jest.fn(), status: jest.fn().mockReturnThis() };

        await getPlayerProgress(req, res);

        expect(res.json).toHaveBeenCalledWith({
          success: true,
          message: 'Player progress retrieved successfully',
          data: expect.objectContaining({
            xpToNextLevel: testCase.expectedXpToNext
          })
        });

        jest.clearAllMocks();
      }
    });

    it('should return 404 when player is not found', async () => {
      mockGetPlayerById.mockResolvedValue(null);

      const req = {
        params: { id: 'nonexistent-player' }
      };
      const res = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis()
      };

      await getPlayerProgress(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Player not found'
      });
      expect(mockLogger.warn).toHaveBeenCalledWith('[playerController.getPlayerProgress] Player nonexistent-player not found');
    });

    it('should handle database errors gracefully', async () => {
      mockGetPlayerById.mockRejectedValue(new Error('Database connection failed'));

      const req = {
        params: { id: 'player-123' }
      };
      const res = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis()
      };

      // Mock NODE_ENV for development error details
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      await getPlayerProgress(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Internal server error',
        error: 'Database connection failed'
      });
      expect(mockLogger.error).toHaveBeenCalledWith('[playerController.getPlayerProgress] Error getting player progress: Database connection failed');

      // Restore original NODE_ENV
      process.env.NODE_ENV = originalEnv;
    });

    it('should not expose error details in production', async () => {
      mockGetPlayerById.mockRejectedValue(new Error('Database connection failed'));

      const req = {
        params: { id: 'player-123' }
      };
      const res = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis()
      };

      // Mock NODE_ENV for production
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      await getPlayerProgress(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Internal server error',
        error: 'Something went wrong'
      });

      // Restore original NODE_ENV
      process.env.NODE_ENV = originalEnv;
    });

    it('should include all required fields in response', async () => {
      const mockPlayer = {
        id: 'player-456',
        name: 'Sarah',
        level: 7,
        xp: 85,
        email: 'sarah@example.com',
        money: 2500,
        settings: { theme: 'dark' }
      };

      mockGetPlayerById.mockResolvedValue(mockPlayer);

      const req = {
        params: { id: 'player-456' }
      };
      const res = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis()
      };

      await getPlayerProgress(req, res);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Player progress retrieved successfully',
        data: {
          playerId: 'player-456',
          name: 'Sarah',
          level: 7,
          xp: 85,
          xpToNextLevel: 15 // 100 - (85 % 100) = 15
        }
      });

      // Verify that only required fields are included (no email, money, settings)
      const responseData = res.json.mock.calls[0][0].data;
      expect(responseData).not.toHaveProperty('email');
      expect(responseData).not.toHaveProperty('money');
      expect(responseData).not.toHaveProperty('settings');
    });
  });
});
