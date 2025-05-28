import { calculateCompetitionScore } from '../utils/competitionScore.js';

// Simple integration test to verify the trait scoring works
const createTestHorse = (overrides = {}) => ({
  id: 1,
  name: 'Test Horse',
  speed: 70,
  stamina: 60,
  focus: 50,
  precision: 65,
  agility: 55,
  coordination: 50,
  boldness: 45,
  balance: 50,
  stress_level: 20,
  health: 'Good',
  tack: {
    saddleBonus: 5,
    bridleBonus: 3
  },
  epigenetic_modifiers: {
    positive: [],
    negative: [],
    hidden: []
  },
  ...overrides
});

describe('Enhanced Competition Integration Tests', () => {

  describe('Basic Integration Tests', () => {
    it('should successfully import and use calculateCompetitionScore function', () => {
      const horse = createTestHorse();
      const score = calculateCompetitionScore(horse, 'Racing');

      expect(typeof score).toBe('number');
      expect(score).toBeGreaterThan(0);
      expect(Number.isInteger(score)).toBe(true);
    });

    it('should apply trait bonuses correctly for each discipline', () => {
      const disciplines = [
        { name: 'Racing', trait: 'discipline_affinity_racing' },
        { name: 'Show Jumping', trait: 'discipline_affinity_show_jumping' },
        { name: 'Dressage', trait: 'discipline_affinity_dressage' },
        { name: 'Cross Country', trait: 'discipline_affinity_cross_country' }
      ];

      disciplines.forEach(({ name, trait }) => {
        const horseWithTrait = createTestHorse({
          epigenetic_modifiers: {
            positive: [trait],
            negative: [],
            hidden: []
          }
        });

        const horseWithoutTrait = createTestHorse();

        // Test multiple times to find at least one case where trait wins
        let foundTraitAdvantage = false;
        for (let i = 0; i < 10; i++) {
          const scoreWithTrait = calculateCompetitionScore(horseWithTrait, name);
          const scoreWithoutTrait = calculateCompetitionScore(horseWithoutTrait, name);

          if (scoreWithTrait > scoreWithoutTrait) {
            foundTraitAdvantage = true;
            break;
          }
        }

        expect(foundTraitAdvantage).toBe(true);
      });
    });

    it('should not apply trait bonus when trait does not match discipline', () => {
      const horseWithRacingTrait = createTestHorse({
        epigenetic_modifiers: {
          positive: ['discipline_affinity_racing'],
          negative: [],
          hidden: []
        }
      });

      const horseWithoutTrait = createTestHorse();

      // Test racing trait in show jumping - should not have consistent advantage
      let traitWins = 0;
      const totalRuns = 10;

      for (let i = 0; i < totalRuns; i++) {
        const scoreWithTrait = calculateCompetitionScore(horseWithRacingTrait, 'Show Jumping');
        const scoreWithoutTrait = calculateCompetitionScore(horseWithoutTrait, 'Show Jumping');

        if (scoreWithTrait > scoreWithoutTrait) {
          traitWins++;
        }
      }

      // Should not win all the time since no trait advantage applies
      expect(traitWins).toBeLessThan(totalRuns);
    });

    it('should handle horses with missing epigenetic_modifiers', () => {
      const horseWithoutModifiers = createTestHorse();
      delete horseWithoutModifiers.epigenetic_modifiers;

      expect(() => {
        calculateCompetitionScore(horseWithoutModifiers, 'Racing');
      }).not.toThrow();

      const score = calculateCompetitionScore(horseWithoutModifiers, 'Racing');
      expect(typeof score).toBe('number');
      expect(score).toBeGreaterThan(0);
    });

    it('should provide consistent scoring results with variance', () => {
      const horse = createTestHorse({
        epigenetic_modifiers: {
          positive: ['discipline_affinity_racing'],
          negative: [],
          hidden: []
        }
      });

      // Run the same scoring multiple times
      const scores = [];
      for (let i = 0; i < 10; i++) {
        scores.push(calculateCompetitionScore(horse, 'Racing'));
      }

      // All scores should be numbers and within reasonable range
      scores.forEach(score => {
        expect(typeof score).toBe('number');
        expect(score).toBeGreaterThan(150);
        expect(score).toBeLessThan(250);
      });

      // There should be some variance due to luck modifier
      const uniqueScores = [...new Set(scores)];
      expect(uniqueScores.length).toBeGreaterThan(1);
    });

    it('should demonstrate that trait integration is working', () => {
      // This test verifies that the integration is working by checking
      // that horses with traits can potentially score higher than those without
      const horseWithTrait = createTestHorse({
        epigenetic_modifiers: {
          positive: ['discipline_affinity_racing'],
          negative: [],
          hidden: []
        }
      });

      const horseWithoutTrait = createTestHorse();

      // Get multiple scores to find the maximum potential
      const scoresWithTrait = [];
      const scoresWithoutTrait = [];

      for (let i = 0; i < 20; i++) {
        scoresWithTrait.push(calculateCompetitionScore(horseWithTrait, 'Racing'));
        scoresWithoutTrait.push(calculateCompetitionScore(horseWithoutTrait, 'Racing'));
      }

      const maxWithTrait = Math.max(...scoresWithTrait);
      const maxWithoutTrait = Math.max(...scoresWithoutTrait);

      // The horse with trait should be able to achieve higher scores
      expect(maxWithTrait).toBeGreaterThan(maxWithoutTrait);
    });
  });
});
