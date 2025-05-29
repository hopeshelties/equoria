
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Mock the dependencies
const mockGetResultsByHorse = jest.fn();
const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn()
};

// Mock the modules
jest.unstable_mockModule(join(__dirname, '../models/resultModel.js'), () => ({
  getResultsByHorse: mockGetResultsByHorse
}));

jest.unstable_mockModule(join(__dirname, '../utils/logger.js'), () => ({
  default: mockLogger
}));

// Import the function to test after mocking
const { getHorseHistory } = await import(join(__dirname, '../controllers/horseController.js'));

describe('Horse History Controller', () => {
  let req, res;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup request and response objects
    req = {
      params: { id: '1' }
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
  });

  describe('getHorseHistory', () => {
    it('should return horse competition history successfully', async () => {
      const mockResults = [
        {
          id: 1,
          showName: 'Autumn Challenge - Barrel Racing',
          discipline: 'Barrel Racing',
          placement: '1st',
          score: 162.4,
          prizeWon: 1000,
          statGains: '{"stat":"stamina","gain":1}',
          runDate: new Date('2025-06-01'),
          createdAt: new Date('2025-06-01T10:00:00Z')
        },
        {
          id: 2,
          showName: 'Harvest Gala - Dressage',
          discipline: 'Dressage',
          placement: null,
          score: 143.7,
          prizeWon: 0,
          statGains: null,
          runDate: new Date('2025-05-25'),
          createdAt: new Date('2025-05-25T14:30:00Z')
        }
      ];

      mockGetResultsByHorse.mockResolvedValue(mockResults);

      await getHorseHistory(req, res);

      expect(mockGetResultsByHorse).toHaveBeenCalledWith(1);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Found 2 competition results for horse 1',
        data: [
          {
            id: 1,
            showName: 'Autumn Challenge - Barrel Racing',
            discipline: 'Barrel Racing',
            placement: '1st',
            score: 162.4,
            prize: 1000,
            statGain: { stat: 'stamina', gain: 1 },
            runDate: new Date('2025-06-01'),
            createdAt: new Date('2025-06-01T10:00:00Z')
          },
          {
            id: 2,
            showName: 'Harvest Gala - Dressage',
            discipline: 'Dressage',
            placement: null,
            score: 143.7,
            prize: 0,
            statGain: null,
            runDate: new Date('2025-05-25'),
            createdAt: new Date('2025-05-25T14:30:00Z')
          }
        ]
      });
      expect(mockLogger.info).toHaveBeenCalledWith('[horseController.getHorseHistory] Retrieved 2 competition results for horse 1');
    });

    it('should return empty array when horse has no competition history', async () => {
      mockGetResultsByHorse.mockResolvedValue([]);

      await getHorseHistory(req, res);

      expect(mockGetResultsByHorse).toHaveBeenCalledWith(1);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Found 0 competition results for horse 1',
        data: []
      });
    });

    it('should handle invalid horse ID (non-numeric)', async () => {
      req.params.id = 'invalid';

      await getHorseHistory(req, res);

      expect(mockGetResultsByHorse).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid horse ID. Must be a positive integer.',
        data: null
      });
    });

    it('should handle invalid horse ID (negative number)', async () => {
      req.params.id = '-1';

      await getHorseHistory(req, res);

      expect(mockGetResultsByHorse).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid horse ID. Must be a positive integer.',
        data: null
      });
    });

    it('should handle invalid horse ID (zero)', async () => {
      req.params.id = '0';

      await getHorseHistory(req, res);

      expect(mockGetResultsByHorse).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid horse ID. Must be a positive integer.',
        data: null
      });
    });

    it('should handle database errors gracefully', async () => {
      const dbError = new Error('Database connection failed');
      mockGetResultsByHorse.mockRejectedValue(dbError);

      await getHorseHistory(req, res);

      expect(mockGetResultsByHorse).toHaveBeenCalledWith(1);
      expect(mockLogger.error).toHaveBeenCalledWith('[horseController.getHorseHistory] Error retrieving horse history: %o', dbError);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Internal server error while retrieving horse history',
        data: null
      });
    });

    it('should properly parse stat gains JSON', async () => {
      const mockResults = [
        {
          id: 1,
          showName: 'Spring Classic',
          discipline: 'Racing',
          placement: '1st',
          score: 180.5,
          prizeWon: 500,
          statGains: '{"stat":"speed","gain":1}',
          runDate: new Date('2025-05-15'),
          createdAt: new Date('2025-05-15T12:00:00Z')
        }
      ];

      mockGetResultsByHorse.mockResolvedValue(mockResults);

      await getHorseHistory(req, res);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Found 1 competition results for horse 1',
        data: [
          {
            id: 1,
            showName: 'Spring Classic',
            discipline: 'Racing',
            placement: '1st',
            score: 180.5,
            prize: 500,
            statGain: { stat: 'speed', gain: 1 },
            runDate: new Date('2025-05-15'),
            createdAt: new Date('2025-05-15T12:00:00Z')
          }
        ]
      });
    });

    it('should handle malformed stat gains JSON gracefully', async () => {
      const mockResults = [
        {
          id: 1,
          showName: 'Spring Classic',
          discipline: 'Racing',
          placement: '1st',
          score: 180.5,
          prizeWon: 500,
          statGains: 'invalid json',
          runDate: new Date('2025-05-15'),
          createdAt: new Date('2025-05-15T12:00:00Z')
        }
      ];

      mockGetResultsByHorse.mockResolvedValue(mockResults);

      // This should not throw but should handle the error gracefully
      await getHorseHistory(req, res);

      expect(mockLogger.error).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Internal server error while retrieving horse history',
        data: null
      });
    });

    it('should handle large horse ID numbers', async () => {
      req.params.id = '999999';
      mockGetResultsByHorse.mockResolvedValue([]);

      await getHorseHistory(req, res);

      expect(mockGetResultsByHorse).toHaveBeenCalledWith(999999);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Found 0 competition results for horse 999999',
        data: []
      });
    });

    it('should maintain order from database query (newest first)', async () => {
      const mockResults = [
        {
          id: 3,
          showName: 'Latest Show',
          discipline: 'Jumping',
          placement: '2nd',
          score: 155.0,
          prizeWon: 300,
          statGains: null,
          runDate: new Date('2025-06-10'),
          createdAt: new Date('2025-06-10T16:00:00Z')
        },
        {
          id: 1,
          showName: 'Older Show',
          discipline: 'Dressage',
          placement: '1st',
          score: 170.0,
          prizeWon: 500,
          statGains: '{"stat":"agility","gain":1}',
          runDate: new Date('2025-05-20'),
          createdAt: new Date('2025-05-20T10:00:00Z')
        }
      ];

      mockGetResultsByHorse.mockResolvedValue(mockResults);

      await getHorseHistory(req, res);

      const responseData = res.json.mock.calls[0][0].data;
      expect(responseData).toHaveLength(2);
      expect(responseData[0].showName).toBe('Latest Show');
      expect(responseData[1].showName).toBe('Older Show');
    });
  });
});