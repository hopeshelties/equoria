import { jest } from '@jest/globals';

// Mock the modules BEFORE importing the module under test
jest.unstable_mockModule('../db/index.js', () => ({
  default: {
    horse: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    foalTrainingHistory: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
  }
}));

jest.unstable_mockModule('../utils/logger.js', () => ({
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }
}));

// Now import the module under test and the mocks
const { revealTraits, batchRevealTraits, getDiscoveryProgress, DISCOVERY_CONDITIONS } = await import('../utils/traitDiscovery.js');
const mockPrisma = (await import('../db/index.js')).default;
const mockLogger = (await import('../utils/logger.js')).default;

describe('traitDiscovery', () => {
  beforeEach(() => {
    // Clear all mock implementations and calls before each test
    jest.clearAllMocks();
  });

  describe('DISCOVERY_CONDITIONS', () => {
    it('should have all required discovery conditions', () => {
      expect(DISCOVERY_CONDITIONS).toHaveProperty('high_bonding');
      expect(DISCOVERY_CONDITIONS).toHaveProperty('low_stress');
      expect(DISCOVERY_CONDITIONS).toHaveProperty('social_activities');
      expect(DISCOVERY_CONDITIONS).toHaveProperty('physical_activities');
      expect(DISCOVERY_CONDITIONS).toHaveProperty('mental_activities');
      expect(DISCOVERY_CONDITIONS).toHaveProperty('perfect_care');
      expect(DISCOVERY_CONDITIONS).toHaveProperty('development_complete');
    });

    it('should have proper structure for each condition', () => {
      Object.values(DISCOVERY_CONDITIONS).forEach(condition => {
        expect(condition).toHaveProperty('name');
        expect(condition).toHaveProperty('description');
        expect(condition).toHaveProperty('condition');
        expect(condition).toHaveProperty('revealableTraits');
        expect(typeof condition.condition).toBe('function');
        expect(Array.isArray(condition.revealableTraits)).toBe(true);
      });
    });
  });

  describe('revealTraits', () => {
    const mockFoal = {
      id: 1,
      name: 'Test Foal',
      age: 0,
      bond_score: 85,
      stress_level: 15,
      epigenetic_modifiers: {
        positive: ['calm'],
        negative: [],
        hidden: ['intelligent', 'athletic', 'legendary_bloodline']
      },
      foalDevelopment: {
        currentDay: 3
      },
      breed: { name: 'Arabian' }
    };

    const mockActivities = [
      { activity: 'gentle_handling' },
      { activity: 'human_interaction' },
      { activity: 'social_play' },
      { activity: 'exercise' }
    ];

    it('should reveal traits when conditions are met', async () => {
      mockPrisma.horse.findUnique.mockResolvedValue(mockFoal);
      mockPrisma.foalTrainingHistory.findMany.mockResolvedValue(mockActivities);
      mockPrisma.horse.update.mockResolvedValue({ ...mockFoal });
      mockPrisma.foalTrainingHistory.create.mockResolvedValue({});

      const result = await revealTraits(1);

      expect(result).toHaveProperty('foalId', 1);
      expect(result).toHaveProperty('foalName', 'Test Foal');
      expect(result).toHaveProperty('conditionsMet');
      expect(result).toHaveProperty('traitsRevealed');
      expect(result.conditionsMet.length).toBeGreaterThan(0);
      expect(result.traitsRevealed.length).toBeGreaterThan(0);
    });

    it('should handle foal with no hidden traits', async () => {
      const foalWithNoHidden = {
        ...mockFoal,
        epigenetic_modifiers: {
          positive: ['calm', 'intelligent'],
          negative: [],
          hidden: []
        }
      };

      mockPrisma.horse.findUnique.mockResolvedValue(foalWithNoHidden);
      mockPrisma.foalTrainingHistory.findMany.mockResolvedValue(mockActivities);

      const result = await revealTraits(1);

      expect(result.traitsRevealed).toHaveLength(0);
      expect(result.totalHiddenAfter).toBe(0);
    });

    it('should throw error for invalid foal ID', async () => {
      await expect(revealTraits(null)).rejects.toThrow('Invalid foal ID provided');
      await expect(revealTraits(-1)).rejects.toThrow('Invalid foal ID provided');
      await expect(revealTraits('invalid')).rejects.toThrow('Invalid foal ID provided');
    });

    it('should throw error for non-existent foal', async () => {
      mockPrisma.horse.findUnique.mockResolvedValue(null);

      await expect(revealTraits(999)).rejects.toThrow('Foal with ID 999 not found');
    });

    it('should throw error for non-foal horse', async () => {
      const adultHorse = { ...mockFoal, age: 5 };
      mockPrisma.horse.findUnique.mockResolvedValue(adultHorse);

      await expect(revealTraits(1)).rejects.toThrow('Horse 1 is not a foal (age: 5)');
    });

    it('should handle database errors gracefully', async () => {
      mockPrisma.horse.findUnique.mockRejectedValue(new Error('Database connection failed'));

      await expect(revealTraits(1)).rejects.toThrow('Database connection failed');
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should update database when traits are revealed', async () => {
      mockPrisma.horse.findUnique.mockResolvedValue(mockFoal);
      mockPrisma.foalTrainingHistory.findMany.mockResolvedValue(mockActivities);
      mockPrisma.horse.update.mockResolvedValue({ ...mockFoal });
      mockPrisma.foalTrainingHistory.create.mockResolvedValue({});

      await revealTraits(1);

      expect(mockPrisma.horse.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          epigenetic_modifiers: expect.any(Object)
        }
      });
    });

    it('should not update database when no traits are revealed', async () => {
      const foalWithLowStats = {
        ...mockFoal,
        bond_score: 20,
        stress_level: 80,
        epigenetic_modifiers: {
          positive: [],
          negative: [],
          hidden: ['intelligent']
        }
      };

      mockPrisma.horse.findUnique.mockResolvedValue(foalWithLowStats);
      mockPrisma.foalTrainingHistory.findMany.mockResolvedValue([]);

      await revealTraits(1);

      expect(mockPrisma.horse.update).not.toHaveBeenCalled();
    });
  });

  describe('batchRevealTraits', () => {
    it('should process multiple foals successfully', async () => {
      const mockFoal1 = {
        id: 1,
        name: 'Foal 1',
        age: 0,
        bond_score: 85,
        stress_level: 15,
        epigenetic_modifiers: { positive: [], negative: [], hidden: ['intelligent'] },
        foalDevelopment: { currentDay: 3 },
        breed: { name: 'Arabian' }
      };

      const mockFoal2 = {
        id: 2,
        name: 'Foal 2',
        age: 0,
        bond_score: 90,
        stress_level: 10,
        epigenetic_modifiers: { positive: [], negative: [], hidden: ['athletic'] },
        foalDevelopment: { currentDay: 4 },
        breed: { name: 'Thoroughbred' }
      };

      mockPrisma.horse.findUnique
        .mockResolvedValueOnce(mockFoal1)
        .mockResolvedValueOnce(mockFoal2);
      mockPrisma.foalTrainingHistory.findMany.mockResolvedValue([]);
      mockPrisma.horse.update.mockResolvedValue({});
      mockPrisma.foalTrainingHistory.create.mockResolvedValue({});

      const results = await batchRevealTraits([1, 2]);

      expect(results).toHaveLength(2);
      expect(results[0]).toHaveProperty('foalId', 1);
      expect(results[1]).toHaveProperty('foalId', 2);
    });

    it('should handle individual foal failures gracefully', async () => {
      mockPrisma.horse.findUnique
        .mockResolvedValueOnce({ id: 1, name: 'Foal 1', age: 0 })
        .mockRejectedValueOnce(new Error('Database error'));

      const results = await batchRevealTraits([1, 2]);

      expect(results).toHaveLength(2);
      expect(results[0]).not.toHaveProperty('error');
      expect(results[1]).toHaveProperty('error');
      expect(results[1]).toHaveProperty('success', false);
    });
  });

  describe('getDiscoveryProgress', () => {
    const mockFoal = {
      id: 1,
      name: 'Test Foal',
      age: 0,
      bond_score: 60,
      stress_level: 40,
      epigenetic_modifiers: {
        positive: [],
        negative: [],
        hidden: ['intelligent', 'athletic']
      },
      foalDevelopment: {
        currentDay: 2
      }
    };

    it('should return progress information for a foal', async () => {
      mockPrisma.horse.findUnique.mockResolvedValue(mockFoal);
      mockPrisma.foalTrainingHistory.findMany.mockResolvedValue([
        { activityType: 'gentle_handling' },
        { activityType: 'exercise' }
      ]);

      const progress = await getDiscoveryProgress(1);

      expect(progress).toHaveProperty('foalId', 1);
      expect(progress).toHaveProperty('foalName', 'Test Foal');
      expect(progress).toHaveProperty('currentStats');
      expect(progress).toHaveProperty('conditions');
      expect(progress).toHaveProperty('hiddenTraitsCount', 2);

      expect(progress.currentStats).toEqual({
        bondScore: 60,
        stressLevel: 40,
        developmentDay: 2
      });
    });

    it('should calculate progress percentages correctly', async () => {
      mockPrisma.horse.findUnique.mockResolvedValue(mockFoal);
      mockPrisma.foalTrainingHistory.findMany.mockResolvedValue([]);

      const progress = await getDiscoveryProgress(1);

      // High bonding condition: 60/80 = 75%
      expect(progress.conditions.high_bonding.progress).toBe(75);
      
      // Development complete: 2/6 = 33%
      expect(progress.conditions.development_complete.progress).toBe(33);
    });

    it('should throw error for non-existent foal', async () => {
      mockPrisma.horse.findUnique.mockResolvedValue(null);

      await expect(getDiscoveryProgress(999)).rejects.toThrow('Foal with ID 999 not found');
    });
  });

  describe('condition evaluation', () => {
    it('should correctly evaluate high bonding condition', () => {
      const condition = DISCOVERY_CONDITIONS.high_bonding;
      
      expect(condition.condition({ bond_score: 85 }, [])).toBe(true);
      expect(condition.condition({ bond_score: 79 }, [])).toBe(false);
      expect(condition.condition({ bond_score: 80 }, [])).toBe(true);
    });

    it('should correctly evaluate low stress condition', () => {
      const condition = DISCOVERY_CONDITIONS.low_stress;
      
      expect(condition.condition({ stress_level: 15 }, [])).toBe(true);
      expect(condition.condition({ stress_level: 21 }, [])).toBe(false);
      expect(condition.condition({ stress_level: 20 }, [])).toBe(true);
    });

    it('should correctly evaluate activity-based conditions', () => {
      const socialCondition = DISCOVERY_CONDITIONS.social_activities;
      const physicalCondition = DISCOVERY_CONDITIONS.physical_activities;
      const mentalCondition = DISCOVERY_CONDITIONS.mental_activities;

      const socialActivities = [
        { activityType: 'gentle_handling' },
        { activityType: 'human_interaction' },
        { activityType: 'social_play' }
      ];

      const physicalActivities = [
        { activityType: 'exercise' },
        { activityType: 'obstacle_course' },
        { activityType: 'free_play' }
      ];

      const mentalActivities = [
        { activityType: 'puzzle_feeding' },
        { activityType: 'sensory_exposure' },
        { activityType: 'learning_games' }
      ];

      expect(socialCondition.condition({}, socialActivities)).toBe(true);
      expect(socialCondition.condition({}, socialActivities.slice(0, 2))).toBe(false);

      expect(physicalCondition.condition({}, physicalActivities)).toBe(true);
      expect(physicalCondition.condition({}, physicalActivities.slice(0, 2))).toBe(false);

      expect(mentalCondition.condition({}, mentalActivities)).toBe(true);
      expect(mentalCondition.condition({}, mentalActivities.slice(0, 2))).toBe(false);
    });

    it('should correctly evaluate perfect care condition', () => {
      const condition = DISCOVERY_CONDITIONS.perfect_care;
      
      expect(condition.condition({ bond_score: 90, stress_level: 15 }, [])).toBe(true);
      expect(condition.condition({ bond_score: 89, stress_level: 15 }, [])).toBe(false);
      expect(condition.condition({ bond_score: 90, stress_level: 16 }, [])).toBe(false);
    });

    it('should correctly evaluate development complete condition', () => {
      const condition = DISCOVERY_CONDITIONS.development_complete;
      
      expect(condition.condition({}, [], { currentDay: 6 })).toBe(true);
      expect(condition.condition({}, [], { currentDay: 7 })).toBe(true);
      expect(condition.condition({}, [], { currentDay: 5 })).toBe(false);
      expect(condition.condition({}, [], null)).toBe(false);
      expect(condition.condition({}, [], undefined)).toBe(false);
    });
  });

  describe('trait revelation logic', () => {
    it('should reveal all hidden traits for development_complete condition', async () => {
      const foalWithManyHidden = {
        id: 1,
        name: 'Test Foal',
        age: 0,
        bond_score: 50,
        stress_level: 50,
        epigenetic_modifiers: {
          positive: [],
          negative: [],
          hidden: ['intelligent', 'athletic', 'calm', 'bold']
        },
        foalDevelopment: {
          currentDay: 6 // Triggers development_complete
        },
        breed: { name: 'Arabian' }
      };

      mockPrisma.horse.findUnique.mockResolvedValue(foalWithManyHidden);
      mockPrisma.foalTrainingHistory.findMany.mockResolvedValue([]);
      mockPrisma.horse.update.mockResolvedValue({ ...foalWithManyHidden });
      mockPrisma.foalTrainingHistory.create.mockResolvedValue({});

      const result = await revealTraits(1);

      expect(result.traitsRevealed.length).toBe(4); // All hidden traits revealed
      expect(result.totalHiddenAfter).toBe(0);
    });

    it('should only reveal traits that are currently hidden', async () => {
      const foalWithSomeRevealed = {
        id: 1,
        name: 'Test Foal',
        age: 0,
        bond_score: 85,
        stress_level: 15,
        epigenetic_modifiers: {
          positive: ['calm'], // Already revealed
          negative: [],
          hidden: ['intelligent', 'athletic'] // Only these can be revealed
        },
        foalDevelopment: {
          currentDay: 3
        },
        breed: { name: 'Arabian' }
      };

      mockPrisma.horse.findUnique.mockResolvedValue(foalWithSomeRevealed);
      mockPrisma.foalTrainingHistory.findMany.mockResolvedValue([]);
      mockPrisma.horse.update.mockResolvedValue({ ...foalWithSomeRevealed });
      mockPrisma.foalTrainingHistory.create.mockResolvedValue({});

      const result = await revealTraits(1);

      // Should only reveal traits that were hidden and match the condition
      const revealedTraitKeys = result.traitsRevealed.map(t => t.traitKey);
      expect(revealedTraitKeys).not.toContain('calm'); // Already revealed
      expect(revealedTraitKeys.every(key => ['intelligent', 'athletic'].includes(key))).toBe(true);
    });
  });
}); 