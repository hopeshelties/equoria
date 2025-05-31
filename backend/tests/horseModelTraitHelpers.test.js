import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Mocks
const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
};

jest.unstable_mockModule(join(__dirname, '../utils/logger.js'), () => ({
  default: mockLogger,
}));

const { _addTraitSafely, _removeTraitSafely, _getAllTraits } = await import(
  join(__dirname, '../utils/horseModelTraitHelpers.js')
);

describe('horseModelTraitHelpers utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('trait addition', () => {
    it('should add a trait to the correct category if not present', () => {
      const traits = {
        positive: ['agile'],
        negative: [],
        hidden: [],
      };

      const traitToAdd = 'strong';
      const category = 'positive';

      const result = _addTraitSafely(traits, traitToAdd, category);

      expect(result.positive).toContain('strong');
      expect(result.positive).toContain('agile');
      expect(result.negative).toEqual([]);
    });

    it('should not add a duplicate trait', () => {
      const traits = {
        positive: ['agile'],
        negative: [],
        hidden: [],
      };

      const traitToAdd = 'agile';
      const category = 'positive';

      const result = _addTraitSafely(traits, traitToAdd, category);

      expect(result.positive.filter(t => t === 'agile').length).toBe(1);
    });
  });

  describe('trait removal', () => {
    it('should remove a trait from the correct category', () => {
      const traits = {
        positive: ['agile', 'strong'],
        negative: [],
        hidden: [],
      };

      const traitToRemove = 'strong';
      const category = 'positive';

      const result = _removeTraitSafely(traits, traitToRemove, category);

      expect(result.positive).not.toContain('strong');
      expect(result.positive).toContain('agile');
    });

    it('should handle removal of a non-existent trait gracefully', () => {
      const traits = {
        positive: ['agile'],
        negative: [],
        hidden: [],
      };

      const traitToRemove = 'strong';
      const category = 'positive';

      const result = _removeTraitSafely(traits, traitToRemove, category);

      expect(result.positive).toEqual(['agile']);
    });
  });

  describe('getAllTraits utility', () => {
    it('should return a flattened array of all traits', () => {
      const traits = {
        positive: ['agile'],
        negative: ['timid'],
        hidden: ['secretive'],
      };

      const result = _getAllTraits(traits);

      expect(result).toEqual(expect.arrayContaining(['agile', 'timid', 'secretive']));
    });

    it('should handle empty trait categories', () => {
      const traits = {
        positive: [],
        negative: [],
        hidden: [],
      };

      const result = _getAllTraits(traits);

      expect(result).toEqual([]);
    });
  });
});
