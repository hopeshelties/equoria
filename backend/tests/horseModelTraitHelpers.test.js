import { jest, describe, beforeEach, afterEach, expect, it } from '@jest/globals';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Mock logger
const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
};

jest.unstable_mockModule(join(__dirname, '../utils/logger.js'), () => ({
  default: mockLogger
}));

// Mock Prisma
const mockPrisma = {
  horse: {
    findUnique: jest.fn(),
    update: jest.fn()
  }
};

jest.unstable_mockModule(join(__dirname, '../db/index.js'), () => ({
  default: mockPrisma
}));

// Import functions after mocking
const {
  getPositiveTraits,
  hasTraitPresent,
  addTraitSafely,
  removeTraitSafely,
  getAllTraits
} = await import(join(__dirname, '../models/horseModel.js'));

describe('Horse Model Trait Helper Functions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getPositiveTraits', () => {
    it('should return positive traits for a valid horse', async() => {
      const mockHorse = {
        id: 1,
        name: 'Test Horse',
        epigenetic_modifiers: {
          positive: ['resilient', 'people_trusting'],
          negative: ['nervous'],
          hidden: ['legacy_talent']
        }
      };

      mockPrisma.horse.findUnique.mockResolvedValue(mockHorse);

      const result = await getPositiveTraits(1);

      expect(result).toEqual(['resilient', 'people_trusting']);
      expect(mockPrisma.horse.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
        select: {
          id: true,
          name: true,
          epigenetic_modifiers: true
        }
      });
    });

    it('should return empty array when horse has no positive traits', async() => {
      const mockHorse = {
        id: 1,
        name: 'Test Horse',
        epigenetic_modifiers: {
          positive: [],
          negative: ['nervous'],
          hidden: []
        }
      };

      mockPrisma.horse.findUnique.mockResolvedValue(mockHorse);

      const result = await getPositiveTraits(1);

      expect(result).toEqual([]);
    });

    it('should handle horse with null epigenetic_modifiers', async() => {
      const mockHorse = {
        id: 1,
        name: 'Test Horse',
        epigenetic_modifiers: null
      };

      mockPrisma.horse.findUnique.mockResolvedValue(mockHorse);

      const result = await getPositiveTraits(1);

      expect(result).toEqual([]);
    });

    it('should throw error for invalid horse ID', async() => {
      await expect(getPositiveTraits('invalid')).rejects.toThrow('Invalid horse ID provided');
      await expect(getPositiveTraits(-1)).rejects.toThrow('Invalid horse ID provided');
      await expect(getPositiveTraits(0)).rejects.toThrow('Invalid horse ID provided');
    });

    it('should throw error when horse not found', async() => {
      mockPrisma.horse.findUnique.mockResolvedValue(null);

      await expect(getPositiveTraits(999)).rejects.toThrow('Horse with ID 999 not found');
    });
  });

  describe('hasTraitPresent', () => {
    it('should detect positive trait correctly', async() => {
      const mockHorse = {
        id: 1,
        name: 'Test Horse',
        epigenetic_modifiers: {
          positive: ['resilient', 'people_trusting'],
          negative: ['nervous'],
          hidden: ['legacy_talent']
        }
      };

      mockPrisma.horse.findUnique.mockResolvedValue(mockHorse);

      const result = await hasTraitPresent(1, 'resilient');

      expect(result).toEqual({
        present: true,
        category: 'positive',
        visible: true
      });
    });

    it('should detect negative trait correctly', async() => {
      const mockHorse = {
        id: 1,
        name: 'Test Horse',
        epigenetic_modifiers: {
          positive: ['resilient'],
          negative: ['nervous'],
          hidden: ['legacy_talent']
        }
      };

      mockPrisma.horse.findUnique.mockResolvedValue(mockHorse);

      const result = await hasTraitPresent(1, 'nervous');

      expect(result).toEqual({
        present: true,
        category: 'negative',
        visible: true
      });
    });

    it('should detect hidden trait correctly', async() => {
      const mockHorse = {
        id: 1,
        name: 'Test Horse',
        epigenetic_modifiers: {
          positive: ['resilient'],
          negative: ['nervous'],
          hidden: ['legacy_talent']
        }
      };

      mockPrisma.horse.findUnique.mockResolvedValue(mockHorse);

      const result = await hasTraitPresent(1, 'legacy_talent');

      expect(result).toEqual({
        present: true,
        category: 'hidden',
        visible: false
      });
    });

    it('should return false for non-existent trait', async() => {
      const mockHorse = {
        id: 1,
        name: 'Test Horse',
        epigenetic_modifiers: {
          positive: ['resilient'],
          negative: ['nervous'],
          hidden: ['legacy_talent']
        }
      };

      mockPrisma.horse.findUnique.mockResolvedValue(mockHorse);

      const result = await hasTraitPresent(1, 'non_existent');

      expect(result).toEqual({
        present: false,
        category: null,
        visible: false
      });
    });

    it('should throw error for invalid inputs', async() => {
      await expect(hasTraitPresent('invalid', 'trait')).rejects.toThrow('Invalid horse ID provided');
      await expect(hasTraitPresent(1, '')).rejects.toThrow('Trait name must be a non-empty string');
      await expect(hasTraitPresent(1, null)).rejects.toThrow('Trait name must be a non-empty string');
    });
  });

  describe('addTraitSafely', () => {
    it('should add new trait to positive category', async() => {
      const mockHorse = {
        id: 1,
        name: 'Test Horse',
        epigenetic_modifiers: {
          positive: ['resilient'],
          negative: [],
          hidden: []
        }
      };

      const updatedHorse = {
        ...mockHorse,
        epigenetic_modifiers: {
          positive: ['resilient', 'people_trusting'],
          negative: [],
          hidden: []
        },
        breed: { name: 'Arabian' },
        owner: null,
        stable: null,
        player: null
      };

      mockPrisma.horse.findUnique.mockResolvedValue(mockHorse);
      mockPrisma.horse.update.mockResolvedValue(updatedHorse);

      const result = await addTraitSafely(1, 'people_trusting', 'positive');

      expect(result).toEqual(updatedHorse);
      expect(mockPrisma.horse.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          epigenetic_modifiers: {
            positive: ['resilient', 'people_trusting'],
            negative: [],
            hidden: []
          }
        },
        include: {
          breed: true,
          owner: true,
          stable: true,
          player: true
        }
      });
    });

    it('should move trait from one category to another', async() => {
      const mockHorse = {
        id: 1,
        name: 'Test Horse',
        epigenetic_modifiers: {
          positive: [],
          negative: [],
          hidden: ['legacy_talent']
        }
      };

      const updatedHorse = {
        ...mockHorse,
        epigenetic_modifiers: {
          positive: ['legacy_talent'],
          negative: [],
          hidden: []
        }
      };

      mockPrisma.horse.findUnique.mockResolvedValue(mockHorse);
      mockPrisma.horse.update.mockResolvedValue(updatedHorse);

      await addTraitSafely(1, 'legacy_talent', 'positive');

      expect(mockPrisma.horse.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          epigenetic_modifiers: {
            positive: ['legacy_talent'],
            negative: [],
            hidden: []
          }
        },
        include: {
          breed: true,
          owner: true,
          stable: true,
          player: true
        }
      });
    });

    it('should not duplicate trait in same category', async() => {
      const mockHorse = {
        id: 1,
        name: 'Test Horse',
        epigenetic_modifiers: {
          positive: ['resilient'],
          negative: [],
          hidden: []
        }
      };

      mockPrisma.horse.findUnique.mockResolvedValue(mockHorse);

      const result = await addTraitSafely(1, 'resilient', 'positive');

      expect(result).toEqual(mockHorse);
      expect(mockPrisma.horse.update).not.toHaveBeenCalled();
    });

    it('should throw error for invalid category', async() => {
      await expect(addTraitSafely(1, 'trait', 'invalid')).rejects.toThrow('Invalid category \'invalid\'. Must be one of: positive, negative, hidden');
    });

    it('should throw error for invalid inputs', async() => {
      await expect(addTraitSafely('invalid', 'trait', 'positive')).rejects.toThrow('Invalid horse ID provided');
      await expect(addTraitSafely(1, '', 'positive')).rejects.toThrow('Trait name must be a non-empty string');
    });
  });

  describe('removeTraitSafely', () => {
    it('should remove trait from positive category', async() => {
      const mockHorse = {
        id: 1,
        name: 'Test Horse',
        epigenetic_modifiers: {
          positive: ['resilient', 'people_trusting'],
          negative: ['nervous'],
          hidden: []
        }
      };

      const updatedHorse = {
        ...mockHorse,
        epigenetic_modifiers: {
          positive: ['people_trusting'],
          negative: ['nervous'],
          hidden: []
        },
        breed: { name: 'Arabian' },
        owner: null,
        stable: null,
        player: null
      };

      mockPrisma.horse.findUnique.mockResolvedValue(mockHorse);
      mockPrisma.horse.update.mockResolvedValue(updatedHorse);

      const result = await removeTraitSafely(1, 'resilient');

      expect(result).toEqual(updatedHorse);
      expect(mockPrisma.horse.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          epigenetic_modifiers: {
            positive: ['people_trusting'],
            negative: ['nervous'],
            hidden: []
          }
        },
        include: {
          breed: true,
          owner: true,
          stable: true,
          player: true
        }
      });
    });

    it('should remove trait from negative category', async() => {
      const mockHorse = {
        id: 1,
        name: 'Test Horse',
        epigenetic_modifiers: {
          positive: ['resilient'],
          negative: ['nervous', 'reactive'],
          hidden: []
        }
      };

      const updatedHorse = {
        ...mockHorse,
        epigenetic_modifiers: {
          positive: ['resilient'],
          negative: ['reactive'],
          hidden: []
        }
      };

      mockPrisma.horse.findUnique.mockResolvedValue(mockHorse);
      mockPrisma.horse.update.mockResolvedValue(updatedHorse);

      await removeTraitSafely(1, 'nervous');

      expect(mockPrisma.horse.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          epigenetic_modifiers: {
            positive: ['resilient'],
            negative: ['reactive'],
            hidden: []
          }
        },
        include: {
          breed: true,
          owner: true,
          stable: true,
          player: true
        }
      });
    });

    it('should remove trait from hidden category', async() => {
      const mockHorse = {
        id: 1,
        name: 'Test Horse',
        epigenetic_modifiers: {
          positive: [],
          negative: [],
          hidden: ['legacy_talent', 'rare_trait']
        }
      };

      const updatedHorse = {
        ...mockHorse,
        epigenetic_modifiers: {
          positive: [],
          negative: [],
          hidden: ['rare_trait']
        }
      };

      mockPrisma.horse.findUnique.mockResolvedValue(mockHorse);
      mockPrisma.horse.update.mockResolvedValue(updatedHorse);

      await removeTraitSafely(1, 'legacy_talent');

      expect(mockPrisma.horse.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          epigenetic_modifiers: {
            positive: [],
            negative: [],
            hidden: ['rare_trait']
          }
        },
        include: {
          breed: true,
          owner: true,
          stable: true,
          player: true
        }
      });
    });

    it('should not update when trait does not exist', async() => {
      const mockHorse = {
        id: 1,
        name: 'Test Horse',
        epigenetic_modifiers: {
          positive: ['resilient'],
          negative: [],
          hidden: []
        }
      };

      mockPrisma.horse.findUnique.mockResolvedValue(mockHorse);

      const result = await removeTraitSafely(1, 'non_existent');

      expect(result).toEqual(mockHorse);
      expect(mockPrisma.horse.update).not.toHaveBeenCalled();
    });

    it('should throw error for invalid inputs', async() => {
      await expect(removeTraitSafely('invalid', 'trait')).rejects.toThrow('Invalid horse ID provided');
      await expect(removeTraitSafely(1, '')).rejects.toThrow('Trait name must be a non-empty string');
    });
  });

  describe('getAllTraits', () => {
    it('should return all traits with counts', async() => {
      const mockHorse = {
        id: 1,
        name: 'Test Horse',
        epigenetic_modifiers: {
          positive: ['resilient', 'people_trusting'],
          negative: ['nervous'],
          hidden: ['legacy_talent', 'rare_trait']
        }
      };

      mockPrisma.horse.findUnique.mockResolvedValue(mockHorse);

      const result = await getAllTraits(1);

      expect(result).toEqual({
        positive: ['resilient', 'people_trusting'],
        negative: ['nervous'],
        hidden: ['legacy_talent', 'rare_trait'],
        total: 5
      });
    });

    it('should handle horse with no traits', async() => {
      const mockHorse = {
        id: 1,
        name: 'Test Horse',
        epigenetic_modifiers: {
          positive: [],
          negative: [],
          hidden: []
        }
      };

      mockPrisma.horse.findUnique.mockResolvedValue(mockHorse);

      const result = await getAllTraits(1);

      expect(result).toEqual({
        positive: [],
        negative: [],
        hidden: [],
        total: 0
      });
    });

    it('should handle horse with null epigenetic_modifiers', async() => {
      const mockHorse = {
        id: 1,
        name: 'Test Horse',
        epigenetic_modifiers: null
      };

      mockPrisma.horse.findUnique.mockResolvedValue(mockHorse);

      const result = await getAllTraits(1);

      expect(result).toEqual({
        positive: [],
        negative: [],
        hidden: [],
        total: 0
      });
    });

    it('should handle partial trait structure', async() => {
      const mockHorse = {
        id: 1,
        name: 'Test Horse',
        epigenetic_modifiers: {
          positive: ['resilient']
          // missing negative and hidden arrays
        }
      };

      mockPrisma.horse.findUnique.mockResolvedValue(mockHorse);

      const result = await getAllTraits(1);

      expect(result).toEqual({
        positive: ['resilient'],
        negative: [],
        hidden: [],
        total: 1
      });
    });

    it('should throw error for invalid horse ID', async() => {
      await expect(getAllTraits('invalid')).rejects.toThrow('Invalid horse ID provided');
      await expect(getAllTraits(-1)).rejects.toThrow('Invalid horse ID provided');
      await expect(getAllTraits(0)).rejects.toThrow('Invalid horse ID provided');
    });

    it('should throw error when horse not found', async() => {
      mockPrisma.horse.findUnique.mockResolvedValue(null);

      await expect(getAllTraits(999)).rejects.toThrow('Horse with ID 999 not found');
    });
  });

  describe('Error handling', () => {
    it('should handle database errors gracefully', async() => {
      const dbError = new Error('Database connection failed');
      mockPrisma.horse.findUnique.mockRejectedValue(dbError);

      await expect(getPositiveTraits(1)).rejects.toThrow('Database connection failed');
      await expect(hasTraitPresent(1, 'trait')).rejects.toThrow('Database connection failed');
      await expect(getAllTraits(1)).rejects.toThrow('Database connection failed');
    });

    it('should handle update errors gracefully', async() => {
      const mockHorse = {
        id: 1,
        name: 'Test Horse',
        epigenetic_modifiers: { positive: [], negative: [], hidden: [] }
      };

      const updateError = new Error('Update failed');
      mockPrisma.horse.findUnique.mockResolvedValue(mockHorse);
      mockPrisma.horse.update.mockRejectedValue(updateError);

      await expect(addTraitSafely(1, 'trait', 'positive')).rejects.toThrow('Update failed');
      await expect(removeTraitSafely(1, 'trait')).rejects.toThrow('Update failed');
    });
  });
});
