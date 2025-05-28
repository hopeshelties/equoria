import { calculateEpigeneticTraits } from '../utils/epigeneticTraits.js';

describe('Trait Calculation System', () => {
  describe('Edge Cases', () => {
    it('should handle extreme bonding values', () => {
      // Test with maximum bonding
      const maxBondResult = calculateEpigeneticTraits({
        damTraits: ['resilient'],
        sireTraits: ['bold'],
        damBondScore: 100,
        damStressLevel: 50,
        seed: 12345
      });

      // Test with minimum bonding
      const minBondResult = calculateEpigeneticTraits({
        damTraits: ['resilient'],
        sireTraits: ['bold'],
        damBondScore: 0,
        damStressLevel: 50,
        seed: 12345
      });

      // Maximum bonding should generally produce more positive traits
      expect(maxBondResult.positive.length).toBeGreaterThanOrEqual(minBondResult.positive.length);
    });

    it('should handle extreme stress values', () => {
      // Test with maximum stress
      const maxStressResult = calculateEpigeneticTraits({
        damTraits: ['resilient'],
        sireTraits: ['bold'],
        damBondScore: 50,
        damStressLevel: 100,
        seed: 12345
      });

      // Test with minimum stress
      const minStressResult = calculateEpigeneticTraits({
        damTraits: ['resilient'],
        sireTraits: ['bold'],
        damBondScore: 50,
        damStressLevel: 0,
        seed: 12345
      });

      // Minimum stress should generally produce more positive traits
      expect(minStressResult.positive.length).toBeGreaterThanOrEqual(maxStressResult.positive.length);
    });

    it('should handle empty trait arrays', () => {
      const result = calculateEpigeneticTraits({
        damTraits: [],
        sireTraits: [],
        damBondScore: 50,
        damStressLevel: 50,
        seed: 12345
      });

      // Should still produce some traits based on environmental factors
      expect(result).toHaveProperty('positive');
      expect(result).toHaveProperty('negative');
      expect(result).toHaveProperty('hidden');
    });
  });

  describe('Trait Combinations', () => {
    it('should handle complementary positive traits', () => {
      const result = calculateEpigeneticTraits({
        damTraits: ['intelligent', 'trainability_boost'],
        sireTraits: ['athletic', 'resilient'],
        damBondScore: 85,
        damStressLevel: 15,
        seed: 12345
      });

      // Should have a good chance of inheriting complementary traits
      const allTraits = [...result.positive, ...result.hidden];
      const hasIntelligenceRelatedTrait = allTraits.some(trait =>
        ['intelligent', 'trainability_boost'].includes(trait));

      expect(hasIntelligenceRelatedTrait).toBe(true);
    });

    it('should handle opposing traits appropriately', () => {
      const result = calculateEpigeneticTraits({
        damTraits: ['calm'],
        sireTraits: ['nervous'],
        damBondScore: 50,
        damStressLevel: 50,
        seed: 12345
      });

      const allTraits = [...result.positive, ...result.negative, ...result.hidden];

      // Should not have both opposing traits
      const hasCalm = allTraits.includes('calm');
      const hasNervous = allTraits.includes('nervous');

      expect(hasCalm && hasNervous).toBe(false);
    });
  });

  describe('Environmental Influence', () => {
    it('should produce more positive traits in ideal conditions', () => {
      const idealResult = calculateEpigeneticTraits({
        damTraits: ['resilient', 'intelligent'],
        sireTraits: ['bold', 'athletic'],
        damBondScore: 95,
        damStressLevel: 5,
        seed: 12345
      });

      const poorResult = calculateEpigeneticTraits({
        damTraits: ['resilient', 'intelligent'],
        sireTraits: ['bold', 'athletic'],
        damBondScore: 15,
        damStressLevel: 85,
        seed: 12345
      });

      // Ideal conditions should produce more positive traits
      expect(idealResult.positive.length).toBeGreaterThanOrEqual(poorResult.positive.length);

      // Poor conditions should produce more negative traits
      expect(poorResult.negative.length).toBeGreaterThanOrEqual(idealResult.negative.length);
    });

    it('should test trait inheritance probability', () => {
      // Run multiple tests with same parameters to check probability distribution
      const results = [];
      const params = {
        damTraits: ['resilient'],
        sireTraits: ['bold'],
        damBondScore: 75,
        damStressLevel: 25
      };

      for (let i = 0; i < 50; i++) {
        results.push(calculateEpigeneticTraits({ ...params, seed: i }));
      }

      // Count trait occurrences
      const resilientCount = results.filter(r =>
        r.positive.includes('resilient') || r.hidden.includes('resilient')).length;
      const boldCount = results.filter(r =>
        r.positive.includes('bold') || r.hidden.includes('bold')).length;

      // Should have reasonable inheritance rates (at least 20%)
      expect(resilientCount).toBeGreaterThan(10);
      expect(boldCount).toBeGreaterThan(10);
    });
  });

  describe('Rare Trait Generation', () => {
    it('should occasionally produce rare traits', () => {
      // Run multiple tests to increase chance of generating rare traits
      const results = [];
      const params = {
        damTraits: ['resilient', 'intelligent'],
        sireTraits: ['bold', 'athletic'],
        damBondScore: 95, // High bond score to increase positive trait chances
        damStressLevel: 5 // Low stress to increase positive trait chances
      };

      // Run 100 tests with different seeds to increase chance of rare traits
      for (let i = 0; i < 100; i++) {
        results.push(calculateEpigeneticTraits({ ...params, seed: i }));
      }

      // Collect all traits from all results
      const allTraits = results.flatMap(result => [
        ...result.positive,
        ...result.negative,
        ...result.hidden
      ]);

      // Check if we have at least one trait that's not in the input traits
      const uniqueTraits = new Set(allTraits);
      const inputTraits = new Set([...params.damTraits, ...params.sireTraits]);

      // Find traits that weren't in the input
      const newTraits = [...uniqueTraits].filter(trait => !inputTraits.has(trait));

      // We should have generated at least one new trait across all tests
      expect(newTraits.length).toBeGreaterThan(0);
    });
  });

  describe('Input Validation', () => {
    it('should handle missing parameters gracefully', () => {
      // Missing damBondScore
      expect(() => {
        calculateEpigeneticTraits({
          damTraits: ['resilient'],
          sireTraits: ['bold'],
          damStressLevel: 50,
          seed: 12345
        });
      }).toThrow('Missing required breeding parameters');

      // Missing damStressLevel
      expect(() => {
        calculateEpigeneticTraits({
          damTraits: ['resilient'],
          sireTraits: ['bold'],
          damBondScore: 50,
          seed: 12345
        });
      }).toThrow('Missing required breeding parameters');
    });

    it('should handle invalid parameter types', () => {
      // Non-numeric bonding score
      expect(() => {
        calculateEpigeneticTraits({
          damTraits: ['resilient'],
          sireTraits: ['bold'],
          damBondScore: 'high',
          damStressLevel: 50,
          seed: 12345
        });
      }).toThrow('Bond scores and stress levels must be numbers');

      // Non-numeric stress level
      expect(() => {
        calculateEpigeneticTraits({
          damTraits: ['resilient'],
          sireTraits: ['bold'],
          damBondScore: 50,
          damStressLevel: 'low',
          seed: 12345
        });
      }).toThrow('Bond scores and stress levels must be numbers');
    });
  });

  describe('Deterministic Behavior', () => {
    it('should produce consistent results with the same seed', () => {
      const params = {
        damTraits: ['resilient'],
        sireTraits: ['bold'],
        damBondScore: 50,
        damStressLevel: 50,
        seed: 54321
      };

      const result1 = calculateEpigeneticTraits(params);
      const result2 = calculateEpigeneticTraits(params);

      // Results should be identical with the same seed
      expect(result1.positive).toEqual(result2.positive);
      expect(result1.negative).toEqual(result2.negative);
      expect(result1.hidden).toEqual(result2.hidden);
    });

    it('should produce different results with different seeds', () => {
      const baseParams = {
        damTraits: ['resilient', 'bold', 'intelligent'],
        sireTraits: ['athletic', 'calm', 'nervous'],
        damBondScore: 75,
        damStressLevel: 25
      };

      // Test multiple seed combinations to ensure we get different results
      let foundDifference = false;
      const seeds = [12345, 54321, 98765, 11111, 99999];

      for (let i = 0; i < seeds.length - 1; i++) {
        const result1 = calculateEpigeneticTraits({ ...baseParams, seed: seeds[i] });
        const result2 = calculateEpigeneticTraits({ ...baseParams, seed: seeds[i + 1] });

        const areAllEqual =
          JSON.stringify(result1.positive) === JSON.stringify(result2.positive) &&
          JSON.stringify(result1.negative) === JSON.stringify(result2.negative) &&
          JSON.stringify(result1.hidden) === JSON.stringify(result2.hidden);

        if (!areAllEqual) {
          foundDifference = true;
          break;
        }
      }

      expect(foundDifference).toBe(true);
    });
  });
});



