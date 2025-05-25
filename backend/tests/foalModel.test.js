import { jest } from '@jest/globals';

// Mock the database
const mockPrisma = {
  horse: {
    findUnique: jest.fn(),
  },
  foalDevelopment: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  foalActivity: {
    findMany: jest.fn(),
    create: jest.fn(),
  },
};

// Mock the logger
const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
};

// Mock modules
jest.unstable_mockModule('../db/index.js', () => ({
  default: mockPrisma
}));

jest.unstable_mockModule('../utils/logger.js', () => ({
  default: mockLogger
}));

// Import after mocking
const { getFoalDevelopment, completeActivity, advanceDay } = await import('../models/foalModel.js');

describe('foalModel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getFoalDevelopment', () => {
    it('should return foal development data for valid foal', async () => {
      const mockHorse = {
        id: 1,
        name: 'Test Foal',
        age: 0,
        breed: { name: 'Thoroughbred' },
        owner: { name: 'Test Owner' },
        stable: { name: 'Test Stable' }
      };

      const mockDevelopment = {
        currentDay: 2,
        bondingLevel: 60,
        stressLevel: 15,
        completedActivities: { '0': ['gentle_touch'], '1': ['feeding_assistance'] }
      };

      const mockActivities = [
        {
          id: 1,
          day: 1,
          activityType: 'feeding_assistance',
          outcome: 'success',
          bondingChange: 5,
          stressChange: -1,
          description: 'Feeding went well',
          createdAt: new Date()
        }
      ];

      mockPrisma.horse.findUnique.mockResolvedValue(mockHorse);
      mockPrisma.foalDevelopment.findUnique.mockResolvedValue(mockDevelopment);
      mockPrisma.foalActivity.findMany.mockResolvedValue(mockActivities);

      const result = await getFoalDevelopment(1);

      expect(result).toHaveProperty('foal');
      expect(result).toHaveProperty('development');
      expect(result).toHaveProperty('activityHistory');
      expect(result).toHaveProperty('availableActivities');
      expect(result.foal.name).toBe('Test Foal');
      expect(result.development.currentDay).toBe(2);
      expect(result.development.bondingLevel).toBe(60);
    });

    it('should throw error for horse that is not a foal', async () => {
      const mockHorse = {
        id: 1,
        name: 'Adult Horse',
        age: 5,
        breed: { name: 'Thoroughbred' }
      };

      mockPrisma.horse.findUnique.mockResolvedValue(mockHorse);

      await expect(getFoalDevelopment(1)).rejects.toThrow('Horse is not a foal');
    });

    it('should throw error for non-existent horse', async () => {
      mockPrisma.horse.findUnique.mockResolvedValue(null);

      await expect(getFoalDevelopment(999)).rejects.toThrow('Foal not found');
    });

    it('should throw error for invalid foal ID', async () => {
      await expect(getFoalDevelopment('invalid')).rejects.toThrow('Foal ID must be a positive integer');
      await expect(getFoalDevelopment(-1)).rejects.toThrow('Foal ID must be a positive integer');
      await expect(getFoalDevelopment(0)).rejects.toThrow('Foal ID must be a positive integer');
    });

    it('should create default development record for new foal', async () => {
      const mockHorse = {
        id: 1,
        name: 'New Foal',
        age: 0,
        breed: { name: 'Thoroughbred' },
        owner: { name: 'Test Owner' }
      };

      const mockNewDevelopment = {
        currentDay: 0,
        bondingLevel: 50,
        stressLevel: 20,
        completedActivities: {}
      };

      mockPrisma.horse.findUnique.mockResolvedValue(mockHorse);
      mockPrisma.foalDevelopment.findUnique.mockResolvedValue(null);
      mockPrisma.foalDevelopment.create.mockResolvedValue(mockNewDevelopment);
      mockPrisma.foalActivity.findMany.mockResolvedValue([]);

      const result = await getFoalDevelopment(1);

      expect(mockPrisma.foalDevelopment.create).toHaveBeenCalledWith({
        data: {
          foalId: 1,
          currentDay: 0,
          bondingLevel: 50,
          stressLevel: 20,
          completedActivities: {},
          activityLog: []
        }
      });
      expect(result.development.currentDay).toBe(0);
    });
  });

  describe('completeActivity', () => {
    it('should complete an available activity successfully', async () => {
      const mockDevelopment = {
        currentDay: 0,
        bondingLevel: 50,
        stressLevel: 20,
        completedActivities: {}
      };

      mockPrisma.foalDevelopment.findUnique.mockResolvedValue(mockDevelopment);
      mockPrisma.foalDevelopment.update.mockResolvedValue({});
      mockPrisma.foalActivity.create.mockResolvedValue({ id: 1 });

      // Mock the return call to getFoalDevelopment
      const mockHorse = {
        id: 1,
        name: 'Test Foal',
        age: 0,
        breed: { name: 'Thoroughbred' },
        owner: { name: 'Test Owner' }
      };
      mockPrisma.horse.findUnique.mockResolvedValue(mockHorse);
      mockPrisma.foalActivity.findMany.mockResolvedValue([]);

      const result = await completeActivity(1, 'gentle_touch');

      expect(mockPrisma.foalDevelopment.update).toHaveBeenCalled();
      expect(mockPrisma.foalActivity.create).toHaveBeenCalled();
      expect(result).toHaveProperty('foal');
      expect(result).toHaveProperty('development');
    });

    it('should throw error for invalid foal ID', async () => {
      await expect(completeActivity('invalid', 'gentle_touch')).rejects.toThrow('Foal ID must be a positive integer');
    });

    it('should throw error for missing activity type', async () => {
      await expect(completeActivity(1, '')).rejects.toThrow('Activity type is required');
    });

    it('should throw error for unavailable activity', async () => {
      const mockDevelopment = {
        currentDay: 0,
        bondingLevel: 50,
        stressLevel: 20,
        completedActivities: { '0': ['gentle_touch'] } // Activity already completed
      };

      mockPrisma.foalDevelopment.findUnique.mockResolvedValue(mockDevelopment);

      await expect(completeActivity(1, 'gentle_touch')).rejects.toThrow('Activity not available for current day or already completed');
    });
  });

  describe('advanceDay', () => {
    it('should advance foal to next day successfully', async () => {
      const mockDevelopment = {
        currentDay: 2,
        bondingLevel: 60,
        stressLevel: 15
      };

      mockPrisma.foalDevelopment.findUnique.mockResolvedValue(mockDevelopment);
      mockPrisma.foalDevelopment.update.mockResolvedValue({ ...mockDevelopment, currentDay: 3 });

      // Mock the return call to getFoalDevelopment
      const mockHorse = {
        id: 1,
        name: 'Test Foal',
        age: 0,
        breed: { name: 'Thoroughbred' },
        owner: { name: 'Test Owner' }
      };
      mockPrisma.horse.findUnique.mockResolvedValue(mockHorse);
      mockPrisma.foalActivity.findMany.mockResolvedValue([]);

      const result = await advanceDay(1);

      expect(mockPrisma.foalDevelopment.update).toHaveBeenCalledWith({
        where: { foalId: 1 },
        data: { currentDay: 3 }
      });
      expect(result).toHaveProperty('foal');
      expect(result).toHaveProperty('development');
    });

    it('should throw error for foal that has completed development', async () => {
      const mockDevelopment = {
        currentDay: 6,
        bondingLevel: 80,
        stressLevel: 10
      };

      mockPrisma.foalDevelopment.findUnique.mockResolvedValue(mockDevelopment);

      await expect(advanceDay(1)).rejects.toThrow('Foal has already completed development period');
    });

    it('should throw error for invalid foal ID', async () => {
      await expect(advanceDay('invalid')).rejects.toThrow('Foal ID must be a positive integer');
    });
  });
}); 