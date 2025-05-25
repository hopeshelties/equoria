import { generateMockShows, generateSingleMockShow } from '../utils/generateMockShows.js';
import { getAllDisciplines } from '../utils/statMap.js';

describe('generateMockShows', () => {
  const validDisciplines = getAllDisciplines();

  describe('generateMockShows', () => {
    it('should generate the correct number of shows', () => {
      const shows = generateMockShows(5);
      expect(shows).toHaveLength(5);
    });

    it('should generate default 10 shows when no count provided', () => {
      const shows = generateMockShows();
      expect(shows).toHaveLength(10);
    });

    it('should generate 0 shows when count is 0', () => {
      const shows = generateMockShows(0);
      expect(shows).toHaveLength(0);
    });

    it('should throw error for negative count', () => {
      expect(() => generateMockShows(-1)).toThrow('Count must be a non-negative number');
    });

    it('should throw error for non-number count', () => {
      expect(() => generateMockShows('invalid')).toThrow('Count must be a non-negative number');
    });

    it('should generate shows with all required properties', () => {
      const shows = generateMockShows(3);
      
      shows.forEach(show => {
        expect(show).toHaveProperty('id');
        expect(show).toHaveProperty('name');
        expect(show).toHaveProperty('discipline');
        expect(show).toHaveProperty('levelMin');
        expect(show).toHaveProperty('levelMax');
        expect(show).toHaveProperty('entryFee');
        expect(show).toHaveProperty('prize');
        expect(show).toHaveProperty('runDate');
      });
    });

    it('should generate unique sequential IDs', () => {
      const shows = generateMockShows(5);
      const ids = shows.map(show => show.id);
      
      expect(ids).toEqual([1, 2, 3, 4, 5]);
    });

    it('should use only valid disciplines', () => {
      const shows = generateMockShows(20); // Generate more to test variety
      
      shows.forEach(show => {
        expect(validDisciplines).toContain(show.discipline);
      });
    });

    it('should generate realistic show names', () => {
      const shows = generateMockShows(10);
      
      shows.forEach(show => {
        expect(typeof show.name).toBe('string');
        expect(show.name.length).toBeGreaterThan(0);
        expect(show.name).toContain(' - ');
        expect(show.name).toContain(show.discipline);
      });
    });

    it('should respect level constraints', () => {
      const shows = generateMockShows(20);
      
      shows.forEach(show => {
        // levelMin should be between 1 and 7
        expect(show.levelMin).toBeGreaterThanOrEqual(1);
        expect(show.levelMin).toBeLessThanOrEqual(7);
        
        // levelMax should be greater than levelMin
        expect(show.levelMax).toBeGreaterThan(show.levelMin);
        
        // levelMax should not exceed 10
        expect(show.levelMax).toBeLessThanOrEqual(10);
        
        // levelMax should be at most levelMin + 3
        expect(show.levelMax).toBeLessThanOrEqual(show.levelMin + 3);
      });
    });

    it('should respect entry fee range (100-500)', () => {
      const shows = generateMockShows(20);
      
      shows.forEach(show => {
        expect(show.entryFee).toBeGreaterThanOrEqual(100);
        expect(show.entryFee).toBeLessThanOrEqual(500);
        expect(Number.isInteger(show.entryFee)).toBe(true);
      });
    });

    it('should respect prize range (500-2000)', () => {
      const shows = generateMockShows(20);
      
      shows.forEach(show => {
        expect(show.prize).toBeGreaterThanOrEqual(500);
        expect(show.prize).toBeLessThanOrEqual(2000);
        expect(Number.isInteger(show.prize)).toBe(true);
      });
    });

    it('should generate run dates within ±30 days of today', () => {
      const today = new Date();
      const thirtyDaysAgo = new Date(today);
      thirtyDaysAgo.setDate(today.getDate() - 30);
      const thirtyDaysFromNow = new Date(today);
      thirtyDaysFromNow.setDate(today.getDate() + 30);
      
      // Generate shows after setting up date boundaries
      const shows = generateMockShows(20);
      
      shows.forEach(show => {
        expect(show.runDate).toBeInstanceOf(Date);
        // Add a small buffer (1 second) to account for timing precision
        expect(show.runDate.getTime()).toBeGreaterThanOrEqual(thirtyDaysAgo.getTime() - 1000);
        expect(show.runDate.getTime()).toBeLessThanOrEqual(thirtyDaysFromNow.getTime() + 1000);
      });
    });

    it('should generate variety in disciplines across multiple shows', () => {
      const shows = generateMockShows(50); // Generate many to test variety
      const usedDisciplines = new Set(shows.map(show => show.discipline));
      
      // Should use multiple different disciplines (not all the same)
      expect(usedDisciplines.size).toBeGreaterThan(1);
    });

    it('should generate variety in show names', () => {
      const shows = generateMockShows(20);
      const names = shows.map(show => show.name);
      const uniqueNames = new Set(names);
      
      // Should generate some variety in names (though duplicates are possible)
      expect(uniqueNames.size).toBeGreaterThan(1);
    });
  });

  describe('generateSingleMockShow', () => {
    it('should generate a single show with default properties', () => {
      const show = generateSingleMockShow();
      
      expect(show).toHaveProperty('id');
      expect(show).toHaveProperty('name');
      expect(show).toHaveProperty('discipline');
      expect(show).toHaveProperty('levelMin');
      expect(show).toHaveProperty('levelMax');
      expect(show).toHaveProperty('entryFee');
      expect(show).toHaveProperty('prize');
      expect(show).toHaveProperty('runDate');
    });

    it('should allow overriding specific properties', () => {
      const overrides = {
        name: 'Custom Test Show',
        discipline: 'Dressage',
        levelMin: 3,
        levelMax: 6,
        entryFee: 200,
        prize: 1000
      };
      
      const show = generateSingleMockShow(overrides);
      
      expect(show.name).toBe('Custom Test Show');
      expect(show.discipline).toBe('Dressage');
      expect(show.levelMin).toBe(3);
      expect(show.levelMax).toBe(6);
      expect(show.entryFee).toBe(200);
      expect(show.prize).toBe(1000);
      
      // Should still have other properties
      expect(show).toHaveProperty('id');
      expect(show).toHaveProperty('runDate');
    });

    it('should maintain constraints for non-overridden properties', () => {
      const show = generateSingleMockShow({ name: 'Custom Show' });
      
      // Non-overridden properties should still follow constraints
      expect(validDisciplines).toContain(show.discipline);
      expect(show.levelMax).toBeGreaterThan(show.levelMin);
      expect(show.entryFee).toBeGreaterThanOrEqual(100);
      expect(show.entryFee).toBeLessThanOrEqual(500);
      expect(show.prize).toBeGreaterThanOrEqual(500);
      expect(show.prize).toBeLessThanOrEqual(2000);
    });
  });

  describe('Integration with statMap', () => {
    it('should only use disciplines that exist in statMap', () => {
      const shows = generateMockShows(30);
      const usedDisciplines = shows.map(show => show.discipline);
      
      usedDisciplines.forEach(discipline => {
        expect(validDisciplines).toContain(discipline);
      });
    });

    it('should eventually use most available disciplines with enough shows', () => {
      const shows = generateMockShows(100); // Generate many shows
      const usedDisciplines = new Set(shows.map(show => show.discipline));
      
      // Should use a good variety of the available disciplines
      expect(usedDisciplines.size).toBeGreaterThan(validDisciplines.length * 0.5);
    });
  });
}); 