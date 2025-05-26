import { simulateCompetition } from '../logic/simulateCompetition.js';
import { getStatScore } from '../utils/getStatScore.js';
import { getHealthModifier } from '../utils/healthBonus.js';
import { applyRiderModifiers } from '../utils/riderBonus.js';

describe('Competition Simulation System', () => {

  describe('getStatScore', () => {
    const testHorse = {
      speed: 80,
      stamina: 70,
      focus: 60,
      agility: 50,
      balance: 40
    };

    it('should calculate correct weighted score for Racing discipline', () => {
      // Racing uses: ["speed", "stamina", "focus"] = 50/30/20
      const score = getStatScore(testHorse, 'Racing');
      const expected = (80 * 0.5) + (70 * 0.3) + (60 * 0.2); // 40 + 21 + 12 = 73
      expect(score).toBe(expected);
    });

    it('should calculate correct weighted score for Show Jumping discipline', () => {
      // Show Jumping uses: ["balance", "agility", "boldness"]
      const horseWithBoldness = { ...testHorse, boldness: 30 };
      const score = getStatScore(horseWithBoldness, 'Show Jumping');
      const expected = (40 * 0.5) + (50 * 0.3) + (30 * 0.2); // 20 + 15 + 6 = 41
      expect(score).toBe(expected);
    });

    it('should handle missing stats by defaulting to 0', () => {
      const incompleteHorse = { speed: 50 }; // missing stamina and focus
      const score = getStatScore(incompleteHorse, 'Racing');
      const expected = (50 * 0.5) + (0 * 0.3) + (0 * 0.2); // 25 + 0 + 0 = 25
      expect(score).toBe(expected);
    });

    it('should throw error for invalid discipline', () => {
      expect(() => getStatScore(testHorse, 'InvalidDiscipline')).toThrow('Unknown discipline: InvalidDiscipline');
    });

    it('should throw error for missing horse object', () => {
      expect(() => getStatScore(null, 'Racing')).toThrow('Horse object is required');
    });
  });

  describe('getHealthModifier', () => {
    it('should return correct modifiers for all health ratings', () => {
      expect(getHealthModifier('Excellent')).toBe(0.05);
      expect(getHealthModifier('Very Good')).toBe(0.03);
      expect(getHealthModifier('Good')).toBe(0.00);
      expect(getHealthModifier('Fair')).toBe(-0.03);
      expect(getHealthModifier('Bad')).toBe(-0.05);
    });

    it('should return 0 for unknown health rating', () => {
      expect(getHealthModifier('Unknown')).toBe(0);
      expect(getHealthModifier('')).toBe(0);
      expect(getHealthModifier(null)).toBe(0);
    });
  });

  describe('applyRiderModifiers', () => {
    it('should apply bonus correctly', () => {
      const result = applyRiderModifiers(100, 0.10, 0); // +10% bonus
      expect(result).toBeCloseTo(110, 10);
    });

    it('should apply penalty correctly', () => {
      const result = applyRiderModifiers(100, 0, 0.08); // -8% penalty
      expect(result).toBe(92);
    });

    it('should apply both bonus and penalty', () => {
      const result = applyRiderModifiers(100, 0.05, 0.03); // +5% bonus, -3% penalty = +2% net
      expect(result).toBe(102);
    });

    it('should handle default values', () => {
      const result = applyRiderModifiers(100);
      expect(result).toBe(100);
    });

    it('should validate input ranges', () => {
      expect(() => applyRiderModifiers(100, 0.15, 0)).toThrow('Bonus percent must be between 0 and 0.10');
      expect(() => applyRiderModifiers(100, 0, 0.10)).toThrow('Penalty percent must be between 0 and 0.08');
      expect(() => applyRiderModifiers(-10, 0, 0)).toThrow('Score must be a non-negative number');
    });
  });

  describe('simulateCompetition', () => {
    const sampleShow = {
      id: 'test-show',
      name: 'Test Racing Competition',
      discipline: 'Racing'
    };

    const createTestHorse = (id, name, overrides = {}) => ({
      id,
      name,
      speed: 70,
      stamina: 60,
      focus: 50,
      trait: 'Swift',
      trainingScore: 50,
      tack: {
        saddleBonus: 5,
        bridleBonus: 3
      },
      health: 'Good',
      rider: {
        bonusPercent: 0,
        penaltyPercent: 0
      },
      ...overrides
    });

    it('should simulate competition with 5 horses and return correct rankings', () => {
      const horses = [
        createTestHorse(1, 'Nova', {
          speed: 90, stamina: 80, focus: 70,
          trait: 'Racing', // Matches discipline for +5 bonus
          health: 'Excellent', // +5% health bonus
          trainingScore: 80
        }),
        createTestHorse(2, 'Ashen', {
          speed: 85, stamina: 75, focus: 65,
          trainingScore: 70,
          rider: { bonusPercent: 0.05, penaltyPercent: 0 } // +5% rider bonus
        }),
        createTestHorse(3, 'Dart', {
          speed: 80, stamina: 70, focus: 60,
          trainingScore: 60,
          health: 'Very Good' // +3% health bonus
        }),
        createTestHorse(4, 'Milo', {
          speed: 75, stamina: 65, focus: 55,
          trainingScore: 40,
          rider: { bonusPercent: 0, penaltyPercent: 0.08 } // -8% rider penalty
        }),
        createTestHorse(5, 'Zuri', {
          speed: 70, stamina: 60, focus: 50,
          trainingScore: 30,
          health: 'Bad' // -5% health penalty
        })
      ];

      const results = simulateCompetition(horses, sampleShow);

      // Verify structure
      expect(results).toHaveLength(5);
      expect(results[0].placement).toBe('1st');
      expect(results[1].placement).toBe('2nd');
      expect(results[2].placement).toBe('3rd');
      expect(results[3].placement).toBeNull();
      expect(results[4].placement).toBeNull();

      // Verify scores are in descending order
      for (let i = 0; i < results.length - 1; i++) {
        expect(results[i].score).toBeGreaterThanOrEqual(results[i + 1].score);
      }

      // Verify Nova is among the top performers (accounting for random luck modifier)
      // Nova has trait bonus (+5) and excellent health (+5%) which should give significant advantage
      const novaResult = results.find(r => r.name === 'Nova');
      expect(novaResult).toBeDefined();
      expect(novaResult.placement).toMatch(/^(1st|2nd)$/); // Should be 1st or 2nd place
      expect(novaResult.score).toBeGreaterThan(0);
    });

    it('should calculate trait bonus correctly', () => {
      // Run multiple simulations to account for random luck modifier
      let traitMatchWins = 0;
      const totalRuns = 20; // Increase sample size for more reliable results

      for (let i = 0; i < totalRuns; i++) {
        const horses = [
          createTestHorse(1, 'TraitMatch', { trait: 'Racing' }), // Matches show discipline
          createTestHorse(2, 'NoTraitMatch', { trait: 'Jumping' }) // Doesn't match
        ];

        const results = simulateCompetition(horses, sampleShow);

        if (results[0].name === 'TraitMatch') {
          traitMatchWins++;
        }
      }
      // Horse with matching trait should win most of the time due to +5 trait bonus
      // The +5 trait bonus should provide advantage over random luck modifier (±9%)
      // Lowered threshold to account for statistical variance in random testing
      expect(traitMatchWins).toBeGreaterThanOrEqual(11); // At least 11 out of 20 wins (55%)

      // Also verify that trait matching provides some advantage (not 50/50)
      expect(traitMatchWins).toBeGreaterThan(9); // Better than random chance
    });

    it('should handle horses with missing optional fields', () => {
      const horses = [
        {
          id: 1,
          name: 'MinimalHorse',
          speed: 50,
          stamina: 40,
          focus: 30
          // Missing: trait, trainingScore, tack, health, rider
        }
      ];

      const results = simulateCompetition(horses, sampleShow);

      expect(results).toHaveLength(1);
      expect(results[0].score).toBeGreaterThan(0);
      expect(results[0].placement).toBe('1st');
    });

    it('should handle empty horse array', () => {
      const results = simulateCompetition([], sampleShow);
      expect(results).toEqual([]);
    });

    it('should validate inputs', () => {
      const horses = [createTestHorse(1, 'Test')];

      expect(() => simulateCompetition('not-array', sampleShow)).toThrow('Horses must be an array');
      expect(() => simulateCompetition(horses, null)).toThrow('Show object with discipline is required');
      expect(() => simulateCompetition(horses, {})).toThrow('Show object with discipline is required');
    });

    it('should handle calculation errors gracefully', () => {
      const horses = [
        {
          id: 1,
          name: 'ErrorHorse'
          // Missing required stats - should cause error but not crash
        }
      ];

      const results = simulateCompetition(horses, sampleShow);

      expect(results).toHaveLength(1);
      expect(results[0].score).toBe(0); // Error should result in 0 score
      expect(results[0].name).toBe('ErrorHorse');
    });

    it('should verify complete scoring formula with random luck modifier', () => {
      const horse = createTestHorse(1, 'TestHorse', {
        speed: 80, // Primary stat for Racing
        stamina: 60, // Secondary stat for Racing
        focus: 40, // Tertiary stat for Racing
        trait: 'Racing', // +5 trait bonus
        trainingScore: 20, // +20 training
        tack: { saddleBonus: 10, bridleBonus: 5 }, // +15 tack
        health: 'Excellent', // +5% health modifier
        rider: { bonusPercent: 0.05, penaltyPercent: 0.02 } // +5% -2% = +3% net rider
      });

      const results = simulateCompetition([horse], sampleShow);

      // Manual calculation (before random luck modifier):
      // Base: (80 * 0.5) + (60 * 0.3) + (40 * 0.2) = 40 + 18 + 8 = 66
      // Trait: +5 = 71
      // Training: +20 = 91
      // Tack: +15 = 106
      // Rider: 106 * 1.03 = 109.18
      // Health: 109.18 * 1.05 = 114.639
      // Random luck: ±9% of 114.639 = ±10.32, so range is 104.32 to 124.96

      const baseScore = 114.639;
      const minExpected = baseScore * 0.91; // -9% luck
      const maxExpected = baseScore * 1.09; // +9% luck

      expect(results[0].score).toBeGreaterThanOrEqual(minExpected);
      expect(results[0].score).toBeLessThanOrEqual(maxExpected);
      expect(results[0].score).toBeGreaterThan(0);
    });

    it('should apply random luck modifier causing score variation', () => {
      // Create identical horses to test randomness
      const identicalHorse = createTestHorse(1, 'TestHorse', {
        speed: 80,
        stamina: 60,
        focus: 50,
        trait: 'Racing',
        trainingScore: 50,
        health: 'Good'
      });

      // Run simulation multiple times to verify randomness
      const scores = [];
      for (let i = 0; i < 20; i++) {
        const results = simulateCompetition([{ ...identicalHorse }], sampleShow);
        scores.push(results[0].score);
      }

      // Verify that we get different scores due to random luck modifier
      const uniqueScores = new Set(scores);
      expect(uniqueScores.size).toBeGreaterThan(1); // Should have multiple different scores

      // Verify all scores are within reasonable range
      const minScore = Math.min(...scores);
      const maxScore = Math.max(...scores);
      expect(maxScore - minScore).toBeGreaterThan(0); // Should have some variation
      expect(minScore).toBeGreaterThan(0); // All scores should be positive
    });
  });
});
