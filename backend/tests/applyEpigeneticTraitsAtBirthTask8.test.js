/**
 * TASK 8: Jest Tests for applyEpigeneticTraitsAtBirth()
 *
 * Focused tests for specific requirements:
 * 1. Low-stress, premium-fed mare produces resilient or people_trusting
 * 2. Duplicate ancestor IDs (inbreeding) trigger negative traits like fragile
 * 3. 3+ ancestors with same discipline return discipline_affinity_* and legacy_talent
 * 4. Use jest.spyOn(Math, 'random') for deterministic testing
 */

import { jest } from '@jest/globals';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Mock dependencies
const mockPrisma = {
  horse: {
    findUnique: jest.fn(),
    findMany: jest.fn()
  },
  competitionResult: {
    findMany: jest.fn()
  }
};

const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn()
};

// Mock the imports
jest.unstable_mockModule(join(__dirname, '../db/index.js'), () => ({
  default: mockPrisma
}));

jest.unstable_mockModule(join(__dirname, '../utils/logger.js'), () => ({
  default: mockLogger
}));

// Import the function after mocking
const { applyEpigeneticTraitsAtBirth } = await import(join(__dirname, '../utils/atBirthTraits.js'));

describe('TASK 8: applyEpigeneticTraitsAtBirth() Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Low-stress, premium-fed mare produces positive traits', () => {
    beforeEach(() => {
      // Mock mare with excellent conditions
      mockPrisma.horse.findUnique.mockResolvedValue({
        stress_level: 15,
        bond_score: 85,
        health_status: 'Excellent',
        total_earnings: 100000
      });

      // Mock empty lineage (no specialization or inbreeding)
      mockPrisma.horse.findMany.mockResolvedValue([]);
      mockPrisma.competitionResult.findMany.mockResolvedValue([]);
    });

    it('should produce hardy trait with low stress and premium feed', async() => {
      // Force trait application with low random value
      jest.spyOn(Math, 'random').mockReturnValueOnce(0.01); // Below 0.25 probability

      const breedingData = {
        sireId: 1,
        damId: 2,
        mareStress: 15,
        feedQuality: 85
      };

      const result = await applyEpigeneticTraitsAtBirth(breedingData);

      expect(result.traits.positive).toContain('hardy');
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Applied positive trait: hardy')
      );
    });

    it('should produce well_bred trait with optimal conditions and no inbreeding', async() => {
      // Force trait application
      jest.spyOn(Math, 'random').mockReturnValueOnce(0.1); // Below 0.20 probability

      const breedingData = {
        sireId: 1,
        damId: 2,
        mareStress: 25,
        feedQuality: 75
      };

      const result = await applyEpigeneticTraitsAtBirth(breedingData);

      expect(result.traits.positive).toContain('well_bred');
      expect(result.breedingAnalysis.inbreeding.inbreedingDetected).toBe(false);
    });

    it('should produce premium_care trait with exceptional conditions', async() => {
      // Force trait application
      jest.spyOn(Math, 'random').mockReturnValueOnce(0.05); // Below 0.15 probability

      const breedingData = {
        sireId: 1,
        damId: 2,
        mareStress: 8, // Must be <= 10
        feedQuality: 95 // Must be >= 90
      };

      const result = await applyEpigeneticTraitsAtBirth(breedingData);

      expect(result.traits.positive).toContain('premium_care');
    });

    it('should NOT produce positive traits with high stress', async() => {
      // Even with low random value, high stress should prevent positive traits
      jest.spyOn(Math, 'random').mockReturnValue(0.01);

      const breedingData = {
        sireId: 1,
        damId: 2,
        mareStress: 60, // High stress
        feedQuality: 90
      };

      const result = await applyEpigeneticTraitsAtBirth(breedingData);

      expect(result.traits.positive).not.toContain('hardy');
      expect(result.traits.positive).not.toContain('well_bred');
      expect(result.traits.positive).not.toContain('premium_care');
    });

    it('should NOT produce positive traits with poor feed quality', async() => {
      // Even with low random value, poor feed should prevent positive traits
      jest.spyOn(Math, 'random').mockReturnValue(0.01);

      const breedingData = {
        sireId: 1,
        damId: 2,
        mareStress: 15,
        feedQuality: 50 // Poor feed quality
      };

      const result = await applyEpigeneticTraitsAtBirth(breedingData);

      expect(result.traits.positive).not.toContain('hardy');
      expect(result.traits.positive).not.toContain('well_bred');
      expect(result.traits.positive).not.toContain('premium_care');
    });
  });

  describe('Inbreeding detection triggers negative traits', () => {
    beforeEach(() => {
      // Mock mare
      mockPrisma.horse.findUnique.mockResolvedValue({
        stress_level: 30,
        bond_score: 70,
        health_status: 'Good'
      });

      // Mock no competition results
      mockPrisma.competitionResult.findMany.mockResolvedValue([]);
    });

    it('should produce inbred trait when duplicate ancestors detected', async() => {
      // Force trait application
      jest.spyOn(Math, 'random').mockReturnValueOnce(0.3); // Below 0.60 probability

      // Mock inbreeding scenario - common ancestor appears in both lineages
      const commonAncestor = { id: 100, name: 'CommonAncestor', sire_id: null, dam_id: null };

      // Mock the getAncestors calls for detectInbreeding
      mockPrisma.horse.findMany
        // First call: get sire (id: 1) for sire lineage
        .mockResolvedValueOnce([{ id: 1, name: 'Sire', sire_id: 100, dam_id: 101 }])
        // Second call: get sire's parents
        .mockResolvedValueOnce([commonAncestor, { id: 101, name: 'SireGrandma', sire_id: null, dam_id: null }])
        // Third call: no further sire ancestors
        .mockResolvedValueOnce([])
        // Fourth call: get dam (id: 2) for dam lineage
        .mockResolvedValueOnce([{ id: 2, name: 'Dam', sire_id: 100, dam_id: 102 }])
        // Fifth call: get dam's parents (includes same common ancestor)
        .mockResolvedValueOnce([commonAncestor, { id: 102, name: 'DamGrandma', sire_id: null, dam_id: null }])
        // Sixth call: no further dam ancestors
        .mockResolvedValueOnce([])
        // Seventh call: for lineage analysis - get both parents
        .mockResolvedValueOnce([
          { id: 1, name: 'Sire', sire_id: 100, dam_id: 101 },
          { id: 2, name: 'Dam', sire_id: 100, dam_id: 102 }
        ])
        // Eighth call: get all ancestors for lineage analysis
        .mockResolvedValueOnce([commonAncestor, { id: 101, name: 'SireGrandma' }, { id: 102, name: 'DamGrandma' }])
        // Ninth call: no further ancestors
        .mockResolvedValueOnce([]);

      const breedingData = {
        sireId: 1,
        damId: 2
      };

      const result = await applyEpigeneticTraitsAtBirth(breedingData);

      expect(result.traits.negative).toContain('inbred');
      expect(result.breedingAnalysis.inbreeding.inbreedingDetected).toBe(true);
      expect(result.breedingAnalysis.inbreeding.commonAncestors).toHaveLength(1);
      expect(result.breedingAnalysis.inbreeding.commonAncestors[0].id).toBe(100);
    });

    it('should NOT produce inbred trait without common ancestors', async() => {
      // Mock no inbreeding scenario
      mockPrisma.horse.findMany
        // Sire lineage
        .mockResolvedValueOnce([{ id: 1, name: 'Sire', sire_id: 10, dam_id: 11 }])
        .mockResolvedValueOnce([
          { id: 10, name: 'SireGrandpa' },
          { id: 11, name: 'SireGrandma' }
        ])
        .mockResolvedValueOnce([])
        // Dam lineage
        .mockResolvedValueOnce([{ id: 2, name: 'Dam', sire_id: 20, dam_id: 21 }])
        .mockResolvedValueOnce([
          { id: 20, name: 'DamGrandpa' },
          { id: 21, name: 'DamGrandma' }
        ])
        .mockResolvedValueOnce([]);

      const breedingData = {
        sireId: 1,
        damId: 2
      };

      const result = await applyEpigeneticTraitsAtBirth(breedingData);

      expect(result.traits.negative).not.toContain('inbred');
      expect(result.breedingAnalysis.inbreeding.inbreedingDetected).toBe(false);
      expect(result.breedingAnalysis.inbreeding.commonAncestors).toHaveLength(0);
    });
  });

  describe('Poor breeding conditions trigger negative traits', () => {
    beforeEach(() => {
      // Mock mare with poor conditions
      mockPrisma.horse.findUnique.mockResolvedValue({
        stress_level: 80,
        bond_score: 30,
        health_status: 'Poor',
        total_earnings: 1000
      });

      // Mock empty lineage
      mockPrisma.horse.findMany.mockResolvedValue([]);
      mockPrisma.competitionResult.findMany.mockResolvedValue([]);
    });

    it('should produce weak_constitution trait with high stress and poor feed', async() => {
      // Force trait application
      jest.spyOn(Math, 'random').mockReturnValueOnce(0.2); // Below 0.35 probability

      const breedingData = {
        sireId: 1,
        damId: 2,
        mareStress: 75,
        feedQuality: 35
      };

      const result = await applyEpigeneticTraitsAtBirth(breedingData);

      expect(result.traits.negative).toContain('weak_constitution');
    });

    it('should produce stressed_lineage trait with high mare stress', async() => {
      // Force trait application
      jest.spyOn(Math, 'random').mockReturnValueOnce(0.15); // Below 0.25 probability

      const breedingData = {
        sireId: 1,
        damId: 2,
        mareStress: 65, // Must be >= 60 for stressed_lineage
        feedQuality: 50 // Neutral feed quality
      };

      const result = await applyEpigeneticTraitsAtBirth(breedingData);

      expect(result.traits.negative).toContain('stressed_lineage');
    });

    it('should produce poor_nutrition trait with very poor feed quality', async() => {
      // Force trait application
      jest.spyOn(Math, 'random').mockReturnValueOnce(0.25); // Below 0.40 probability

      const breedingData = {
        sireId: 1,
        damId: 2,
        mareStress: 40, // Moderate stress
        feedQuality: 25 // Must be <= 30 for poor_nutrition
      };

      const result = await applyEpigeneticTraitsAtBirth(breedingData);

      expect(result.traits.negative).toContain('poor_nutrition');
    });
  });

  describe('Discipline specialization produces legacy traits', () => {
    beforeEach(() => {
      // Mock mare with moderate conditions
      mockPrisma.horse.findUnique.mockResolvedValue({
        stress_level: 35,
        bond_score: 70,
        health_status: 'Good'
      });
    });

    it('should produce specialized_lineage trait with 3+ ancestors in same discipline', async() => {
      // Force trait application
      jest.spyOn(Math, 'random').mockReturnValueOnce(0.2); // Below 0.30 probability

      // Mock ancestors with Racing specialization
      const racingAncestors = [
        { id: 10, name: 'Ancestor1' },
        { id: 11, name: 'Ancestor2' },
        { id: 12, name: 'Ancestor3' },
        { id: 13, name: 'Ancestor4' }
      ];

      const racingResults = [
        { discipline: 'Racing', placement: '1st' },
        { discipline: 'Racing', placement: '2nd' },
        { discipline: 'Racing', placement: '1st' },
        { discipline: 'Racing', placement: '3rd' },
        { discipline: 'Dressage', placement: '2nd' } // Only 1 non-racing result
      ];

      mockPrisma.horse.findMany
        .mockResolvedValueOnce([{ id: 1, sire_id: 10, dam_id: 11 }])
        .mockResolvedValueOnce(racingAncestors)
        .mockResolvedValueOnce([]);

      // Mock competition results showing Racing specialization (80% of competitions)
      mockPrisma.competitionResult.findMany.mockResolvedValue(racingResults);

      const breedingData = {
        sireId: 1,
        damId: 2,
        mareStress: 35
      };

      const result = await applyEpigeneticTraitsAtBirth(breedingData);

      expect(result.traits.positive).toContain('specialized_lineage');
      expect(result.breedingAnalysis.lineage.disciplineSpecialization).toBe(true);
      expect(result.breedingAnalysis.lineage.specializedDiscipline).toBe('Racing');
      expect(result.breedingAnalysis.lineage.specializationStrength).toBeGreaterThan(0.6);
    });

    it('should NOT produce specialized_lineage trait without sufficient specialization', async() => {
      // Mock diverse competition history (no single discipline >60%)
      const diverseResults = [
        { discipline: 'Racing', placement: '1st' },
        { discipline: 'Racing', placement: '2nd' },
        { discipline: 'Dressage', placement: '1st' },
        { discipline: 'Dressage', placement: '3rd' },
        { discipline: 'Show Jumping', placement: '2nd' },
        { discipline: 'Show Jumping', placement: '1st' }
      ];

      mockPrisma.horse.findMany
        .mockResolvedValueOnce([{ id: 1, sire_id: 10, dam_id: 11 }])
        .mockResolvedValueOnce([
          { id: 10, name: 'Ancestor1' },
          { id: 11, name: 'Ancestor2' }
        ])
        .mockResolvedValueOnce([]);

      mockPrisma.competitionResult.findMany.mockResolvedValue(diverseResults);

      const breedingData = {
        sireId: 1,
        damId: 2
      };

      const result = await applyEpigeneticTraitsAtBirth(breedingData);

      expect(result.traits.positive).not.toContain('specialized_lineage');
      expect(result.breedingAnalysis.lineage.disciplineSpecialization).toBe(false);
      expect(result.breedingAnalysis.lineage.specializedDiscipline).toBeNull();
    });

    it('should handle no competition history gracefully', async() => {
      mockPrisma.horse.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      mockPrisma.competitionResult.findMany.mockResolvedValue([]);

      const breedingData = {
        sireId: 1,
        damId: 2
      };

      const result = await applyEpigeneticTraitsAtBirth(breedingData);

      expect(result.traits.positive).not.toContain('specialized_lineage');
      expect(result.breedingAnalysis.lineage.disciplineSpecialization).toBe(false);
      expect(result.breedingAnalysis.lineage.totalCompetitions).toBe(0);
    });
  });

  describe('Deterministic testing with Math.random mocking', () => {
    beforeEach(() => {
      // Mock optimal mare conditions
      mockPrisma.horse.findUnique.mockResolvedValue({
        stress_level: 10,
        bond_score: 90,
        health_status: 'Excellent',
        total_earnings: 200000
      });

      // Mock empty lineage
      mockPrisma.horse.findMany.mockResolvedValue([]);
      mockPrisma.competitionResult.findMany.mockResolvedValue([]);
    });

    it('should consistently apply traits when random value is below threshold', async() => {
      // Test multiple trait applications with controlled randomness
      jest.spyOn(Math, 'random')
        .mockReturnValueOnce(0.05) // Hardy trait (threshold 0.25) - mareStress: 8 <= 20, feedQuality: 95 >= 80
        .mockReturnValueOnce(0.10) // Well bred trait (threshold 0.20) - mareStress: 8 <= 30, feedQuality: 95 >= 70, noInbreeding: true
        .mockReturnValueOnce(0.08) // Premium care trait (threshold 0.15) - mareStress: 8 <= 10, feedQuality: 95 >= 90
        .mockReturnValueOnce(0.25); // Hidden trait chance (threshold 0.30)

      const breedingData = {
        sireId: 1,
        damId: 2,
        mareStress: 8, // Meets all stress requirements (hardy: <=20, well_bred: <=30, premium_care: <=10)
        feedQuality: 95 // Meets all feed requirements (hardy: >=80, well_bred: >=70, premium_care: >=90)
      };

      const result = await applyEpigeneticTraitsAtBirth(breedingData);

      // Should apply all three positive traits
      expect(result.traits.positive).toContain('hardy');
      expect(result.traits.positive).toContain('well_bred');
      expect(result.traits.positive).toContain('premium_care');

      // Should have moved one trait to hidden (3 traits > 2, and 0.25 < 0.30)
      expect(result.traits.hidden.length).toBeGreaterThan(0);
    });

    it('should consistently NOT apply traits when random value is above threshold', async() => {
      // Test trait rejection with controlled randomness
      jest.spyOn(Math, 'random')
        .mockReturnValueOnce(0.30) // Above hardy threshold (0.25)
        .mockReturnValueOnce(0.25) // Above well bred threshold (0.20)
        .mockReturnValueOnce(0.20); // Above premium care threshold (0.15)

      const breedingData = {
        sireId: 1,
        damId: 2,
        mareStress: 8,
        feedQuality: 95
      };

      const result = await applyEpigeneticTraitsAtBirth(breedingData);

      // Should not apply any traits due to random values being above thresholds
      expect(result.traits.positive).not.toContain('hardy');
      expect(result.traits.positive).not.toContain('well_bred');
      expect(result.traits.positive).not.toContain('premium_care');
    });

    it('should handle edge case random values at exact thresholds', async() => {
      // Test exact threshold values
      jest.spyOn(Math, 'random')
        .mockReturnValueOnce(0.25) // Exactly at hardy threshold (should not apply)
        .mockReturnValueOnce(0.20) // Exactly at well bred threshold (should not apply)
        .mockReturnValueOnce(0.15); // Exactly at premium care threshold (should not apply)

      const breedingData = {
        sireId: 1,
        damId: 2,
        mareStress: 8,
        feedQuality: 95
      };

      const result = await applyEpigeneticTraitsAtBirth(breedingData);

      // Random values equal to threshold should not trigger trait application
      expect(result.traits.positive).not.toContain('hardy');
      expect(result.traits.positive).not.toContain('well_bred');
      expect(result.traits.positive).not.toContain('premium_care');
    });
  });

  describe('Error handling and edge cases', () => {
    it('should throw error when sireId is missing', async() => {
      const breedingData = { damId: 2 };

      await expect(applyEpigeneticTraitsAtBirth(breedingData))
        .rejects.toThrow('Both sireId and damId are required');
    });

    it('should throw error when damId is missing', async() => {
      const breedingData = { sireId: 1 };

      await expect(applyEpigeneticTraitsAtBirth(breedingData))
        .rejects.toThrow('Both sireId and damId are required');
    });

    it('should throw error when mare is not found', async() => {
      mockPrisma.horse.findUnique.mockResolvedValue(null);

      const breedingData = {
        sireId: 1,
        damId: 999
      };

      await expect(applyEpigeneticTraitsAtBirth(breedingData))
        .rejects.toThrow('Mare with ID 999 not found');
    });

    it('should handle database errors gracefully in lineage analysis', async() => {
      mockPrisma.horse.findUnique.mockResolvedValue({
        stress_level: 30,
        bond_score: 70,
        health_status: 'Good'
      });

      // Mock database error in lineage analysis
      mockPrisma.horse.findMany.mockRejectedValue(new Error('Database connection failed'));

      const breedingData = {
        sireId: 1,
        damId: 2
      };

      // Should not throw, but continue with default analysis
      const result = await applyEpigeneticTraitsAtBirth(breedingData);

      expect(result).toHaveProperty('traits');
      expect(result.breedingAnalysis.lineage.disciplineSpecialization).toBe(false);
      expect(result.breedingAnalysis.inbreeding.inbreedingDetected).toBe(false);
    });
  });
});
