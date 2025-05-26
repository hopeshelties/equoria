import { calculateCompetitionScore, getDisciplineStatWeights, validateHorseForCompetition } from '../utils/competitionScore.js';

describe('Competition Score Calculation', () => {

  const createTestHorse = (stats = {}, traits = []) => ({
    id: 1,
    name: 'Test Horse',
    speed: 70,
    stamina: 60,
    focus: 50,
    agility: 60,
    precision: 55,
    balance: 55,
    coordination: 50,
    boldness: 50,
    epigenetic_modifiers: {
      positive: traits,
      negative: [],
      hidden: []
    },
    ...stats
  });

  describe('calculateCompetitionScore', () => {

    it('should calculate correct base score for Racing discipline', () => {
      const horse = createTestHorse({ speed: 80, stamina: 70, focus: 60 });
      const score = calculateCompetitionScore(horse, 'Racing');

      // Base score should be 80 + 70 + 60 = 210, plus/minus luck and trait bonus
      expect(score).toBeGreaterThan(180); // Allow for luck variance
      expect(score).toBeLessThan(240);
    });

    it('should calculate correct base score for Show Jumping discipline', () => {
      const horse = createTestHorse({ precision: 80, focus: 70, stamina: 60 });
      const score = calculateCompetitionScore(horse, 'Show Jumping');

      // Base score should be 80 + 70 + 60 = 210, plus/minus luck and trait bonus
      expect(score).toBeGreaterThan(180);
      expect(score).toBeLessThan(240);
    });

    it('should calculate correct base score for Dressage discipline', () => {
      const horse = createTestHorse({ precision: 80, focus: 70, coordination: 60 });
      const score = calculateCompetitionScore(horse, 'Dressage');

      // Base score should be 80 + 70 + 60 = 210, plus/minus luck and trait bonus
      expect(score).toBeGreaterThan(180);
      expect(score).toBeLessThan(240);
    });

    it('should calculate correct base score for Cross Country discipline', () => {
      const horse = createTestHorse({ stamina: 80, agility: 70, boldness: 60 });
      const score = calculateCompetitionScore(horse, 'Cross Country');

      // Base score should be 80 + 70 + 60 = 210, plus/minus luck and trait bonus
      expect(score).toBeGreaterThan(180);
      expect(score).toBeLessThan(240);
    });

    it('should apply +5 trait bonus for matching discipline affinity', () => {
      const horseWithTrait = createTestHorse(
        { speed: 70, stamina: 60, focus: 50 },
        ['discipline_affinity_racing']
      );
      const horseWithoutTrait = createTestHorse({ speed: 70, stamina: 60, focus: 50 });

      // Mock Math.random to eliminate luck variance for this test
      const originalRandom = Math.random;
      Math.random = () => 0.5; // This gives 0% luck modifier

      const scoreWithTrait = calculateCompetitionScore(horseWithTrait, 'Racing');
      const scoreWithoutTrait = calculateCompetitionScore(horseWithoutTrait, 'Racing');

      // Restore Math.random
      Math.random = originalRandom;

      expect(scoreWithTrait).toBe(scoreWithoutTrait + 5);
    });

    it('should NOT apply trait bonus for non-matching discipline', () => {
      const horse = createTestHorse(
        { speed: 70, stamina: 60, focus: 50 },
        ['discipline_affinity_dressage'] // Wrong trait for Racing
      );

      // Mock Math.random to eliminate luck variance
      const originalRandom = Math.random;
      Math.random = () => 0.5;

      const score = calculateCompetitionScore(horse, 'Racing');

      // Restore Math.random
      Math.random = originalRandom;

      // Should be base score (180) with no trait bonus
      expect(score).toBe(180);
    });

    it('should apply ±9% random luck modifier', () => {
      const horse = createTestHorse({ speed: 100, stamina: 100, focus: 100 }); // Base score: 300
      const scores = [];

      // Generate multiple scores to test variance
      for (let i = 0; i < 50; i++) {
        scores.push(calculateCompetitionScore(horse, 'Racing'));
      }

      // Check that we have variance in scores
      const minScore = Math.min(...scores);
      const maxScore = Math.max(...scores);

      expect(maxScore).toBeGreaterThan(minScore); // Should have variance
      expect(minScore).toBeGreaterThan(270); // Should be above 300 * 0.91 = 273
      expect(maxScore).toBeLessThan(330); // Should be below 300 * 1.09 = 327
    });

    it('should handle missing stats by defaulting to 0', () => {
      const horse = createTestHorse({ speed: undefined, stamina: null, focus: 80 });
      const score = calculateCompetitionScore(horse, 'Racing');

      // Should use 0 + 0 + 80 = 80 as base score
      expect(score).toBeGreaterThan(70);
      expect(score).toBeLessThan(90);
    });

    it('should handle missing epigenetic_modifiers gracefully', () => {
      const horse = {
        id: 1,
        name: 'Test Horse',
        speed: 70,
        stamina: 60,
        focus: 50
        // No epigenetic_modifiers field
      };

      expect(() => calculateCompetitionScore(horse, 'Racing')).not.toThrow();
      const score = calculateCompetitionScore(horse, 'Racing');
      expect(typeof score).toBe('number');
    });

    it('should handle null epigenetic_modifiers.positive gracefully', () => {
      const horse = createTestHorse();
      horse.epigenetic_modifiers.positive = null;

      expect(() => calculateCompetitionScore(horse, 'Racing')).not.toThrow();
      const score = calculateCompetitionScore(horse, 'Racing');
      expect(typeof score).toBe('number');
    });

    it('should throw error for invalid horse input', () => {
      expect(() => calculateCompetitionScore(null, 'Racing')).toThrow('Horse object is required');
      expect(() => calculateCompetitionScore(undefined, 'Racing')).toThrow('Horse object is required');
      expect(() => calculateCompetitionScore('invalid', 'Racing')).toThrow('Horse object is required');
    });

    it('should throw error for invalid event type', () => {
      const horse = createTestHorse();
      expect(() => calculateCompetitionScore(horse, null)).toThrow('Event type is required and must be a string');
      expect(() => calculateCompetitionScore(horse, undefined)).toThrow('Event type is required and must be a string');
      expect(() => calculateCompetitionScore(horse, 123)).toThrow('Event type is required and must be a string');
    });

    it('should handle unknown event types with default calculation', () => {
      const horse = createTestHorse({ speed: 70, stamina: 60, focus: 50 });
      const score = calculateCompetitionScore(horse, 'Unknown Event');

      // Should use Racing calculation as default
      expect(typeof score).toBe('number');
      expect(score).toBeGreaterThan(160);
      expect(score).toBeLessThan(200);
    });

    it('should return rounded integer scores', () => {
      const horse = createTestHorse({ speed: 70, stamina: 60, focus: 50 });
      const score = calculateCompetitionScore(horse, 'Racing');

      expect(Number.isInteger(score)).toBe(true);
    });
  });

  describe('getDisciplineStatWeights', () => {

    it('should return correct weights for Racing', () => {
      const weights = getDisciplineStatWeights('Racing');
      expect(weights).toEqual({
        speed: 1.0,
        stamina: 1.0,
        focus: 1.0
      });
    });

    it('should return correct weights for Show Jumping', () => {
      const weights = getDisciplineStatWeights('Show Jumping');
      expect(weights).toEqual({
        precision: 1.0,
        focus: 1.0,
        stamina: 1.0
      });
    });

    it('should return default weights for unknown discipline', () => {
      const weights = getDisciplineStatWeights('Unknown');
      expect(weights).toEqual({
        speed: 1.0,
        stamina: 1.0,
        focus: 1.0
      });
    });
  });

  describe('validateHorseForCompetition', () => {

    it('should return true for valid horse with required stats', () => {
      const horse = createTestHorse({ speed: 70, stamina: 60, focus: 50 });
      expect(validateHorseForCompetition(horse, 'Racing')).toBe(true);
    });

    it('should return false for invalid horse input', () => {
      expect(validateHorseForCompetition(null, 'Racing')).toBe(false);
      expect(validateHorseForCompetition(undefined, 'Racing')).toBe(false);
      expect(validateHorseForCompetition('invalid', 'Racing')).toBe(false);
    });

    it('should return true if horse has at least one required stat', () => {
      const horse = { speed: 70 }; // Only has speed stat
      expect(validateHorseForCompetition(horse, 'Racing')).toBe(true);
    });

    it('should return false if horse has no valid stats', () => {
      const horse = { name: 'Test Horse' }; // No stat fields
      expect(validateHorseForCompetition(horse, 'Racing')).toBe(false);
    });
  });
});
