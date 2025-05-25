import { jest } from '@jest/globals';

// Mock Prisma client
const mockPrisma = {
  competitionResult: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn()
  }
};

// Mock the database import
jest.unstable_mockModule('../db/index.js', () => ({
  default: mockPrisma
}));

// Import the module under test after mocking
const { saveResult, getResultsByHorse, getResultsByShow, getResultById } = await import('../models/resultModel.js');

describe('resultModel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('saveResult', () => {
    it('should save a competition result with all required fields', async () => {
      const resultData = {
        horseId: 1,
        showId: 2,
        score: 85.5,
        placement: '1st',
        discipline: 'Racing',
        runDate: new Date('2024-05-25')
      };

      const expectedResult = {
        id: 1,
        ...resultData,
        createdAt: new Date()
      };

      mockPrisma.competitionResult.create.mockResolvedValue(expectedResult);

      const result = await saveResult(resultData);

      expect(mockPrisma.competitionResult.create).toHaveBeenCalledTimes(1);
      expect(mockPrisma.competitionResult.create).toHaveBeenCalledWith({
        data: {
          horseId: 1,
          showId: 2,
          score: 85.5,
          placement: '1st',
          discipline: 'Racing',
          runDate: new Date('2024-05-25')
        },
        include: {
          horse: {
            include: {
              breed: true
            }
          },
          show: true
        }
      });
      expect(result).toEqual(expectedResult);
    });

    it('should save a result without placement (null for non-top-3)', async () => {
      const resultData = {
        horseId: 3,
        showId: 2,
        score: 65.2,
        placement: null,
        discipline: 'Racing',
        runDate: new Date('2024-05-25')
      };

      const expectedResult = { id: 2, ...resultData, createdAt: new Date() };
      mockPrisma.competitionResult.create.mockResolvedValue(expectedResult);

      const result = await saveResult(resultData);

      expect(mockPrisma.competitionResult.create).toHaveBeenCalledWith({
        data: resultData,
        include: {
          horse: {
            include: {
              breed: true
            }
          },
          show: true
        }
      });
      expect(result).toEqual(expectedResult);
    });

    it('should throw error if horseId is missing', async () => {
      const resultData = {
        showId: 2,
        score: 85.5,
        placement: '1st',
        discipline: 'Racing',
        runDate: new Date('2024-05-25')
      };

      await expect(saveResult(resultData)).rejects.toThrow('Horse ID is required');
      expect(mockPrisma.competitionResult.create).not.toHaveBeenCalled();
    });

    it('should throw error if showId is missing', async () => {
      const resultData = {
        horseId: 1,
        score: 85.5,
        placement: '1st',
        discipline: 'Racing',
        runDate: new Date('2024-05-25')
      };

      await expect(saveResult(resultData)).rejects.toThrow('Show ID is required');
      expect(mockPrisma.competitionResult.create).not.toHaveBeenCalled();
    });

    it('should throw error if score is missing', async () => {
      const resultData = {
        horseId: 1,
        showId: 2,
        placement: '1st',
        discipline: 'Racing',
        runDate: new Date('2024-05-25')
      };

      await expect(saveResult(resultData)).rejects.toThrow('Score is required');
      expect(mockPrisma.competitionResult.create).not.toHaveBeenCalled();
    });

    it('should throw error if discipline is missing', async () => {
      const resultData = {
        horseId: 1,
        showId: 2,
        score: 85.5,
        placement: '1st',
        runDate: new Date('2024-05-25')
      };

      await expect(saveResult(resultData)).rejects.toThrow('Discipline is required');
      expect(mockPrisma.competitionResult.create).not.toHaveBeenCalled();
    });

    it('should throw error if runDate is missing', async () => {
      const resultData = {
        horseId: 1,
        showId: 2,
        score: 85.5,
        placement: '1st',
        discipline: 'Racing'
      };

      await expect(saveResult(resultData)).rejects.toThrow('Run date is required');
      expect(mockPrisma.competitionResult.create).not.toHaveBeenCalled();
    });

    it('should validate score is a number', async () => {
      const resultData = {
        horseId: 1,
        showId: 2,
        score: 'invalid',
        placement: '1st',
        discipline: 'Racing',
        runDate: new Date('2024-05-25')
      };

      await expect(saveResult(resultData)).rejects.toThrow('Score must be a number');
      expect(mockPrisma.competitionResult.create).not.toHaveBeenCalled();
    });

    it('should validate horseId is a positive integer', async () => {
      const resultData = {
        horseId: -1,
        showId: 2,
        score: 85.5,
        placement: '1st',
        discipline: 'Racing',
        runDate: new Date('2024-05-25')
      };

      await expect(saveResult(resultData)).rejects.toThrow('Horse ID must be a positive integer');
      expect(mockPrisma.competitionResult.create).not.toHaveBeenCalled();
    });

    it('should validate showId is a positive integer', async () => {
      const resultData = {
        horseId: 1,
        showId: 0,
        score: 85.5,
        placement: '1st',
        discipline: 'Racing',
        runDate: new Date('2024-05-25')
      };

      await expect(saveResult(resultData)).rejects.toThrow('Show ID must be a positive integer');
      expect(mockPrisma.competitionResult.create).not.toHaveBeenCalled();
    });

    it('should handle database errors gracefully', async () => {
      const resultData = {
        horseId: 1,
        showId: 2,
        score: 85.5,
        placement: '1st',
        discipline: 'Racing',
        runDate: new Date('2024-05-25')
      };

      mockPrisma.competitionResult.create.mockRejectedValue(new Error('Database connection failed'));

      await expect(saveResult(resultData)).rejects.toThrow('Database error in saveResult: Database connection failed');
    });
  });

  describe('getResultsByHorse', () => {
    it('should retrieve all results for a specific horse', async () => {
      const horseId = 1;
      const expectedResults = [
        {
          id: 1,
          horseId: 1,
          showId: 2,
          score: 85.5,
          placement: '1st',
          discipline: 'Racing',
          runDate: new Date('2024-05-25'),
          horse: { id: 1, name: 'Thunder', breed: { name: 'Thoroughbred' } },
          show: { id: 2, name: 'Spring Classic', discipline: 'Racing' }
        },
        {
          id: 2,
          horseId: 1,
          showId: 3,
          score: 78.2,
          placement: '2nd',
          discipline: 'Show Jumping',
          runDate: new Date('2024-05-20'),
          horse: { id: 1, name: 'Thunder', breed: { name: 'Thoroughbred' } },
          show: { id: 3, name: 'Elite Jumping', discipline: 'Show Jumping' }
        }
      ];

      mockPrisma.competitionResult.findMany.mockResolvedValue(expectedResults);

      const results = await getResultsByHorse(horseId);

      expect(mockPrisma.competitionResult.findMany).toHaveBeenCalledTimes(1);
      expect(mockPrisma.competitionResult.findMany).toHaveBeenCalledWith({
        where: { horseId: 1 },
        include: {
          horse: {
            include: {
              breed: true
            }
          },
          show: true
        },
        orderBy: { runDate: 'desc' }
      });
      expect(results).toEqual(expectedResults);
    });

    it('should return empty array if no results found for horse', async () => {
      const horseId = 999;
      mockPrisma.competitionResult.findMany.mockResolvedValue([]);

      const results = await getResultsByHorse(horseId);

      expect(results).toEqual([]);
    });

    it('should validate horseId is a positive integer', async () => {
      await expect(getResultsByHorse(-1)).rejects.toThrow('Horse ID must be a positive integer');
      await expect(getResultsByHorse('invalid')).rejects.toThrow('Horse ID must be a positive integer');
      expect(mockPrisma.competitionResult.findMany).not.toHaveBeenCalled();
    });

    it('should handle database errors gracefully', async () => {
      mockPrisma.competitionResult.findMany.mockRejectedValue(new Error('Database connection failed'));

      await expect(getResultsByHorse(1)).rejects.toThrow('Database error in getResultsByHorse: Database connection failed');
    });
  });

  describe('getResultsByShow', () => {
    it('should retrieve all results for a specific show', async () => {
      const showId = 2;
      const expectedResults = [
        {
          id: 1,
          horseId: 1,
          showId: 2,
          score: 85.5,
          placement: '1st',
          discipline: 'Racing',
          runDate: new Date('2024-05-25'),
          horse: { id: 1, name: 'Thunder', breed: { name: 'Thoroughbred' } },
          show: { id: 2, name: 'Spring Classic', discipline: 'Racing' }
        },
        {
          id: 3,
          horseId: 4,
          showId: 2,
          score: 82.1,
          placement: '2nd',
          discipline: 'Racing',
          runDate: new Date('2024-05-25'),
          horse: { id: 4, name: 'Lightning', breed: { name: 'Arabian' } },
          show: { id: 2, name: 'Spring Classic', discipline: 'Racing' }
        }
      ];

      mockPrisma.competitionResult.findMany.mockResolvedValue(expectedResults);

      const results = await getResultsByShow(showId);

      expect(mockPrisma.competitionResult.findMany).toHaveBeenCalledTimes(1);
      expect(mockPrisma.competitionResult.findMany).toHaveBeenCalledWith({
        where: { showId: 2 },
        include: {
          horse: {
            include: {
              breed: true
            }
          },
          show: true
        },
        orderBy: { score: 'desc' }
      });
      expect(results).toEqual(expectedResults);
    });

    it('should return empty array if no results found for show', async () => {
      const showId = 999;
      mockPrisma.competitionResult.findMany.mockResolvedValue([]);

      const results = await getResultsByShow(showId);

      expect(results).toEqual([]);
    });

    it('should validate showId is a positive integer', async () => {
      await expect(getResultsByShow(-1)).rejects.toThrow('Show ID must be a positive integer');
      await expect(getResultsByShow('invalid')).rejects.toThrow('Show ID must be a positive integer');
      expect(mockPrisma.competitionResult.findMany).not.toHaveBeenCalled();
    });

    it('should handle database errors gracefully', async () => {
      mockPrisma.competitionResult.findMany.mockRejectedValue(new Error('Database connection failed'));

      await expect(getResultsByShow(1)).rejects.toThrow('Database error in getResultsByShow: Database connection failed');
    });
  });

  describe('getResultById', () => {
    it('should retrieve a specific result by ID', async () => {
      const resultId = 1;
      const expectedResult = {
        id: 1,
        horseId: 1,
        showId: 2,
        score: 85.5,
        placement: '1st',
        discipline: 'Racing',
        runDate: new Date('2024-05-25'),
        horse: { id: 1, name: 'Thunder', breed: { name: 'Thoroughbred' } },
        show: { id: 2, name: 'Spring Classic', discipline: 'Racing' }
      };

      mockPrisma.competitionResult.findUnique.mockResolvedValue(expectedResult);

      const result = await getResultById(resultId);

      expect(mockPrisma.competitionResult.findUnique).toHaveBeenCalledTimes(1);
      expect(mockPrisma.competitionResult.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
        include: {
          horse: {
            include: {
              breed: true
            }
          },
          show: true
        }
      });
      expect(result).toEqual(expectedResult);
    });

    it('should return null if result not found', async () => {
      const resultId = 999;
      mockPrisma.competitionResult.findUnique.mockResolvedValue(null);

      const result = await getResultById(resultId);

      expect(result).toBeNull();
    });

    it('should validate resultId is a positive integer', async () => {
      await expect(getResultById(-1)).rejects.toThrow('Result ID must be a positive integer');
      await expect(getResultById('invalid')).rejects.toThrow('Result ID must be a positive integer');
      expect(mockPrisma.competitionResult.findUnique).not.toHaveBeenCalled();
    });

    it('should handle database errors gracefully', async () => {
      mockPrisma.competitionResult.findUnique.mockRejectedValue(new Error('Database connection failed'));

      await expect(getResultById(1)).rejects.toThrow('Database error in getResultById: Database connection failed');
    });
  });
}); 