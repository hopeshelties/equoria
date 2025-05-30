
import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Mock Prisma client
const mockPrisma = {
  horse: {
    findUnique: jest.fn(),
    update: jest.fn()
  },
  foalTrainingHistory: {
    create: jest.fn()
  }
};

// Mock logger
const mockLogger = {
  info: jest.fn(),
  error: jest.fn()
};

// Mock the imports before importing the module
jest.unstable_mockModule(join(__dirname, '../db/index.js'), () => ({
  default: mockPrisma
}));

jest.unstable_mockModule(join(__dirname, '../utils/logger.js'), () => ({
  default: mockLogger
}));

// Import the function after mocking
const { completeEnrichmentActivity } = await import(join(__dirname, '../models/foalModel.js'));

describe('Foal Enrichment API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('completeEnrichmentActivity', () => {
    const mockFoal = {
      id: 1,
      name: 'Test Foal',
      age: 0,
      bond_score: 50,
      stress_level: 20
    };

    const mockTrainingRecord = {
      id: 'test-uuid-123',
      horse_id: 1,
      day: 3,
      activity: 'Trailer Exposure',
      outcome: 'success',
      bond_change: 4,
      stress_change: 5
    };

    it('should complete enrichment activity successfully', async () => {
      mockPrisma.horse.findUnique.mockResolvedValue(mockFoal);
      mockPrisma.horse.update.mockResolvedValue({
        ...mockFoal,
        bond_score: 54,
        stress_level: 25
      });
      mockPrisma.foalTrainingHistory.create.mockResolvedValue(mockTrainingRecord);

      const result = await completeEnrichmentActivity(1, 3, 'Trailer Exposure');

      expect(result.success).toBe(true);
      expect(result.foal.id).toBe(1);
      expect(result.foal.name).toBe('Test Foal');
      expect(result.activity.name).toBe('Trailer Exposure');
      expect(result.activity.day).toBe(3);
      expect(result.levels.bond_score).toBeGreaterThanOrEqual(52);
      expect(result.levels.stress_level).toBeGreaterThanOrEqual(23);
      expect(result.training_record_id).toBe('test-uuid-123');

      expect(mockPrisma.horse.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
        select: {
          id: true,
          name: true,
          age: true,
          bond_score: true,
          stress_level: true
        }
      });

      expect(mockPrisma.horse.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          bond_score: expect.any(Number),
          stress_level: expect.any(Number)
        }
      });

      expect(mockPrisma.foalTrainingHistory.create).toHaveBeenCalledWith({
        data: {
          horse_id: 1,
          day: 3,
          activity: 'Trailer Exposure',
          outcome: expect.any(String),
          bond_change: expect.any(Number),
          stress_change: expect.any(Number)
        }
      });
    });

    it('should handle foal with null bond_score and stress_level', async () => {
      const foalWithNulls = {
        ...mockFoal,
        bond_score: null,
        stress_level: null
      };

      mockPrisma.horse.findUnique.mockResolvedValue(foalWithNulls);
      mockPrisma.horse.update.mockResolvedValue({
        ...foalWithNulls,
        bond_score: 54,
        stress_level: 5
      });
      mockPrisma.foalTrainingHistory.create.mockResolvedValue(mockTrainingRecord);

      const result = await completeEnrichmentActivity(1, 3, 'Trailer Exposure');

      expect(result.success).toBe(true);
      expect(result.levels.bond_score).toBeGreaterThanOrEqual(50); // Should use default 50
      expect(result.levels.stress_level).toBeGreaterThanOrEqual(0); // Should use default 0
    });

    it('should validate foal ID is a positive integer', async () => {
      await expect(completeEnrichmentActivity('invalid', 3, 'Trailer Exposure'))
        .rejects.toThrow('Foal ID must be a positive integer');

      await expect(completeEnrichmentActivity(-1, 3, 'Trailer Exposure'))
        .rejects.toThrow('Foal ID must be a positive integer');

      await expect(completeEnrichmentActivity(0, 3, 'Trailer Exposure'))
        .rejects.toThrow('Foal ID must be a positive integer');
    });

    it('should validate day is between 0 and 6', async () => {
      await expect(completeEnrichmentActivity(1, -1, 'Trailer Exposure'))
        .rejects.toThrow('Day must be between 0 and 6');

      await expect(completeEnrichmentActivity(1, 7, 'Trailer Exposure'))
        .rejects.toThrow('Day must be between 0 and 6');

      await expect(completeEnrichmentActivity(1, 'invalid', 'Trailer Exposure'))
        .rejects.toThrow('Day must be between 0 and 6');
    });

    it('should validate activity is required and is a string', async () => {
      await expect(completeEnrichmentActivity(1, 3, ''))
        .rejects.toThrow('Activity is required and must be a string');

      await expect(completeEnrichmentActivity(1, 3, null))
        .rejects.toThrow('Activity is required and must be a string');

      await expect(completeEnrichmentActivity(1, 3, 123))
        .rejects.toThrow('Activity is required and must be a string');
    });

    it('should throw error if foal not found', async () => {
      mockPrisma.horse.findUnique.mockResolvedValue(null);

      await expect(completeEnrichmentActivity(999, 3, 'Trailer Exposure'))
        .rejects.toThrow('Foal not found');
    });

    it('should throw error if horse is not a foal (age > 1)', async () => {
      const adultHorse = {
        ...mockFoal,
        age: 3
      };

      mockPrisma.horse.findUnique.mockResolvedValue(adultHorse);

      await expect(completeEnrichmentActivity(1, 3, 'Trailer Exposure'))
        .rejects.toThrow('Horse is not a foal (must be 1 year old or younger)');
    });

    it('should throw error if activity is not appropriate for the day', async () => {
      mockPrisma.horse.findUnique.mockResolvedValue(mockFoal);

      // Try to do a day 3 activity on day 0
      await expect(completeEnrichmentActivity(1, 0, 'Trailer Exposure'))
        .rejects.toThrow('Activity "Trailer Exposure" is not appropriate for day 0');

      // Try an invalid activity
      await expect(completeEnrichmentActivity(1, 3, 'Invalid Activity'))
        .rejects.toThrow('Activity "Invalid Activity" is not appropriate for day 3');
    });

    it('should accept activity by type or name', async () => {
      mockPrisma.horse.findUnique.mockResolvedValue(mockFoal);
      mockPrisma.horse.update.mockResolvedValue({
        ...mockFoal,
        bond_score: 54,
        stress_level: 25
      });
      mockPrisma.foalTrainingHistory.create.mockResolvedValue(mockTrainingRecord);

      // Test by exact type
      const result1 = await completeEnrichmentActivity(1, 3, 'trailer_exposure');
      expect(result1.success).toBe(true);

      // Test by exact name
      const result2 = await completeEnrichmentActivity(1, 3, 'Trailer Exposure');
      expect(result2.success).toBe(true);

      // Test case insensitive
      const result3 = await completeEnrichmentActivity(1, 3, 'TRAILER EXPOSURE');
      expect(result3.success).toBe(true);
    });

    it('should enforce bonding and stress level bounds (0-100)', async () => {
      // Test with extreme values
      const extremeFoal = {
        ...mockFoal,
        bond_score: 95,
        stress_level: 5
      };

      mockPrisma.horse.findUnique.mockResolvedValue(extremeFoal);
      mockPrisma.horse.update.mockResolvedValue({
        ...extremeFoal,
        bond_score: 100, // Should be capped at 100
        stress_level: 0   // Should be capped at 0
      });
      mockPrisma.foalTrainingHistory.create.mockResolvedValue(mockTrainingRecord);

      const result = await completeEnrichmentActivity(1, 3, 'Trailer Exposure');

      expect(result.levels.bond_score).toBeLessThanOrEqual(100);
      expect(result.levels.stress_level).toBeGreaterThanOrEqual(0);
    });

    it('should handle database errors gracefully', async () => {
      mockPrisma.horse.findUnique.mockRejectedValue(new Error('Database connection failed'));

      await expect(completeEnrichmentActivity(1, 3, 'Trailer Exposure'))
        .rejects.toThrow('Database connection failed');

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('[foalModel.completeEnrichmentActivity] Error: Database connection failed')
      );
    });

    it('should validate all day 3 activities are available', async () => {
      mockPrisma.horse.findUnique.mockResolvedValue(mockFoal);
      mockPrisma.horse.update.mockResolvedValue({
        ...mockFoal,
        bond_score: 54,
        stress_level: 25
      });
      mockPrisma.foalTrainingHistory.create.mockResolvedValue(mockTrainingRecord);

      const day3Activities = [
        'Halter Introduction',
        'Leading Practice',
        'Handling Exercises',
        'Trailer Exposure'
      ];

      for (const activity of day3Activities) {
        const result = await completeEnrichmentActivity(1, 3, activity);
        expect(result.success).toBe(true);
        expect(result.activity.name).toBe(activity);
      }
    });
  });
});