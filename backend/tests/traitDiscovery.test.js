/**
 * Trait Discovery Tests
 * Tests for the trait discovery mechanism
 */

import { jest } from '@jest/globals';

// Mock dependencies
const mockPrisma = {
  horse: {
    findUnique: jest.fn(),
    update: jest.fn()
  },
  trainingLog: {
    count: jest.fn()
  }
};

const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
};

// Mock the imports
jest.unstable_mockModule('../db/index.js', () => ({
  default: mockPrisma
}));

jest.unstable_mockModule('../utils/logger.js', () => ({
  default: mockLogger
}));

jest.unstable_mockModule('../utils/epigeneticTraits.js', () => ({
  getTraitDefinition: jest.fn((trait) => {
    const definitions = {
      'resilient': { type: 'positive', rarity: 'common' },
      'bold': { type: 'positive', rarity: 'common' },
      'nervous': { type: 'negative', rarity: 'common' },
      'trainability_boost': { type: 'positive', rarity: 'rare' },
      'legendary_trait': { type: 'positive', rarity: 'legendary' }
    };
    return definitions[trait] || null;
  })
}));

// Import the module under test
const { revealTraits, checkDiscoveryConditions, checkEnrichmentDiscoveries } = await import('../utils/traitDiscovery.js');

describe('Trait Discovery System', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('revealTraits', () => {
    const mockHorse = {
      id: 1,
      name: 'Test Horse',
      bond_score: 85,
      stress_level: 15,
      age: 1,
      epigenetic_modifiers: {
        positive: ['resilient'],
        negative: [],
        hidden: ['bold', 'trainability_boost', 'legendary_trait']
      },
      breed: { name: 'Arabian' },
      foalActivities: []
    };

    it('should reveal traits when conditions are met', async() => {
      mockPrisma.horse.findUnique.mockResolvedValue(mockHorse);
      mockPrisma.horse.update.mockResolvedValue({
        ...mockHorse,
        epigenetic_modifiers: {
          positive: ['resilient', 'bold'],
          negative: [],
          hidden: ['trainability_boost', 'legendary_trait']
        }
      });

      const result = await revealTraits(1);

      expect(result.success).toBe(true);
      expect(result.revealed).toHaveLength(1);
      expect(result.revealed[0].trait).toBe('bold');
      expect(mockPrisma.horse.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          epigenetic_modifiers: expect.objectContaining({
            positive: expect.arrayContaining(['resilient', 'bold']),
            hidden: expect.not.arrayContaining(['bold'])
          })
        }
      });
    });

    it('should return no revelations when no conditions are met', async() => {
      const lowBondHorse = {
        ...mockHorse,
        bond_score: 30,
        stress_level: 80
      };

      mockPrisma.horse.findUnique.mockResolvedValue(lowBondHorse);

      const result = await revealTraits(1);

      expect(result.success).toBe(true);
      expect(result.revealed).toHaveLength(0);
      expect(result.message).toContain('No discovery conditions currently met');
    });

    it('should return message when no hidden traits exist', async() => {
      const noHiddenTraitsHorse = {
        ...mockHorse,
        epigenetic_modifiers: {
          positive: ['resilient', 'bold'],
          negative: [],
          hidden: []
        }
      };

      mockPrisma.horse.findUnique.mockResolvedValue(noHiddenTraitsHorse);

      const result = await revealTraits(1);

      expect(result.success).toBe(true);
      expect(result.revealed).toHaveLength(0);
      expect(result.message).toContain('No hidden traits available for discovery');
    });

    it('should handle horse not found', async() => {
      mockPrisma.horse.findUnique.mockResolvedValue(null);

      await expect(revealTraits(999)).rejects.toThrow('Horse with ID 999 not found');
    });

    it('should limit revelations per check', async() => {
      const manyHiddenTraitsHorse = {
        ...mockHorse,
        bond_score: 95, // Excellent bond
        stress_level: 5, // Minimal stress
        epigenetic_modifiers: {
          positive: [],
          negative: [],
          hidden: ['bold', 'resilient', 'trainability_boost', 'legendary_trait', 'calm']
        }
      };

      mockPrisma.horse.findUnique.mockResolvedValue(manyHiddenTraitsHorse);
      mockPrisma.horse.update.mockResolvedValue(manyHiddenTraitsHorse);

      const result = await revealTraits(1);

      expect(result.success).toBe(true);
      expect(result.revealed.length).toBeLessThanOrEqual(3); // Should limit to 3 per check
    });
  });

  describe('checkDiscoveryConditions', () => {
    it('should detect high bond condition', async() => {
      const horse = { bond_score: 85, stress_level: 30, age: 1 };

      const conditions = await checkDiscoveryConditions(horse);

      const highBondCondition = conditions.find(c => c.name === 'HIGH_BOND');
      expect(highBondCondition).toBeDefined();
      expect(highBondCondition.priority).toBe('high');
    });

    it('should detect low stress condition', async() => {
      const horse = { bond_score: 60, stress_level: 15, age: 1 };

      const conditions = await checkDiscoveryConditions(horse);

      const lowStressCondition = conditions.find(c => c.name === 'LOW_STRESS');
      expect(lowStressCondition).toBeDefined();
      expect(lowStressCondition.priority).toBe('medium');
    });

    it('should detect perfect care condition', async() => {
      const horse = { bond_score: 85, stress_level: 15, age: 1 };

      const conditions = await checkDiscoveryConditions(horse);

      const perfectCareCondition = conditions.find(c => c.name === 'PERFECT_CARE');
      expect(perfectCareCondition).toBeDefined();
      expect(perfectCareCondition.priority).toBe('legendary');
    });

    it('should detect consistent training condition', async() => {
      const horse = { id: 1, bond_score: 60, stress_level: 30, age: 1 };
      mockPrisma.trainingLog.count.mockResolvedValue(6); // 6 training sessions in last 7 days

      const conditions = await checkDiscoveryConditions(horse);

      const trainingCondition = conditions.find(c => c.name === 'CONSISTENT_TRAINING');
      expect(trainingCondition).toBeDefined();
      expect(trainingCondition.priority).toBe('medium');
    });

    it('should return empty array when no conditions are met', async() => {
      const horse = { bond_score: 30, stress_level: 80, age: 0 };
      mockPrisma.trainingLog.count.mockResolvedValue(0);

      const conditions = await checkDiscoveryConditions(horse);

      expect(conditions).toHaveLength(0);
    });
  });

  describe('checkEnrichmentDiscoveries', () => {
    it('should detect socialization completion', () => {
      const activities = [
        { activityType: 'social_interaction' },
        { activityType: 'social_interaction' },
        { activityType: 'group_play' },
        { activityType: 'group_play' }
      ];

      const conditions = checkEnrichmentDiscoveries(activities);

      const socializationCondition = conditions.find(c => c.name === 'SOCIALIZATION_COMPLETE');
      expect(socializationCondition).toBeDefined();
      expect(socializationCondition.completedCount).toBe(4);
      expect(socializationCondition.requiredCount).toBe(3);
    });

    it('should detect mental stimulation completion', () => {
      const activities = [
        { activityType: 'puzzle_feeding' },
        { activityType: 'obstacle_course' },
        { activityType: 'puzzle_feeding' }
      ];

      const conditions = checkEnrichmentDiscoveries(activities);

      const mentalCondition = conditions.find(c => c.name === 'MENTAL_STIMULATION_COMPLETE');
      expect(mentalCondition).toBeDefined();
      expect(mentalCondition.priority).toBe('high');
    });

    it('should detect all enrichment completion', () => {
      const activities = [
        { activityType: 'social_interaction' },
        { activityType: 'group_play' },
        { activityType: 'puzzle_feeding' },
        { activityType: 'obstacle_course' },
        { activityType: 'free_exercise' },
        { activityType: 'controlled_movement' },
        { activityType: 'social_interaction' } // Extra to meet count
      ];

      const conditions = checkEnrichmentDiscoveries(activities);

      const allEnrichmentCondition = conditions.find(c => c.name === 'ALL_ENRICHMENT_COMPLETE');
      expect(allEnrichmentCondition).toBeDefined();
      expect(allEnrichmentCondition.priority).toBe('legendary');
    });

    it('should return empty array when no enrichment conditions are met', () => {
      const activities = [
        { activityType: 'social_interaction' },
        { activityType: 'puzzle_feeding' }
      ];

      const conditions = checkEnrichmentDiscoveries(activities);

      expect(conditions).toHaveLength(0);
    });

    it('should handle empty activities array', () => {
      const conditions = checkEnrichmentDiscoveries([]);

      expect(conditions).toHaveLength(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async() => {
      mockPrisma.horse.findUnique.mockRejectedValue(new Error('Database connection failed'));

      await expect(revealTraits(1)).rejects.toThrow('Database connection failed');
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should handle invalid horse ID', async() => {
      await expect(revealTraits('invalid')).rejects.toThrow();
    });

    it('should handle missing epigenetic_modifiers field', async() => {
      const horseWithoutTraits = {
        id: 1,
        name: 'Test Horse',
        bond_score: 85,
        stress_level: 15,
        age: 1,
        epigenetic_modifiers: null,
        breed: { name: 'Arabian' },
        foalActivities: []
      };

      mockPrisma.horse.findUnique.mockResolvedValue(horseWithoutTraits);

      const result = await revealTraits(1);

      expect(result.success).toBe(true);
      expect(result.message).toContain('No hidden traits available for discovery');
    });
  });
});
