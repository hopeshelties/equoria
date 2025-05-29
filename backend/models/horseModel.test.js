import { jest, describe, beforeEach, afterEach, expect, it, beforeAll, afterAll } from '@jest/globals';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Mock the modules BEFORE importing the module under test
jest.unstable_mockModule(join(__dirname, '../db/index.js'), () => ({
  default: {
    horse: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn()
    }
  }
}));

jest.unstable_mockModule(join(__dirname, '../utils/logger.js'), () => ({
  default: {
    error: jest.fn(),
    info: jest.fn()
  }
}));

// Now import the module under test and the mocks
const { createHorse, getHorseById, updateDisciplineScore, getDisciplineScores, incrementDisciplineScore } = await import(join(__dirname, './horseModel.js'));
const mockPrisma = (await import(join(__dirname, '../db/index.js'))).default;
const mockLogger = (await import(join(__dirname, '../utils/logger.js'))).default;

describe('horseModel', () => {
  beforeEach(() => {
    // Clear all mock implementations and calls before each test
    mockPrisma.horse.create.mockClear();
    mockPrisma.horse.findUnique.mockClear();
    mockPrisma.horse.update.mockClear();
    mockLogger.error.mockClear();
    mockLogger.info.mockClear();
  });

  describe('createHorse', () => {
    it('should create a horse with breedId and return it', async() => {
      const horseData = {
        name: 'Test Horse',
        age: 5,
        breed: { connect: { id: 1 } }
      };
      const expectedHorse = {
        id: 1,
        name: 'Test Horse',
        age: 5,
        breedId: 1,
        createdAt: new Date(),
        breed: { id: 1, name: 'Arabian' }
      };

      mockPrisma.horse.create.mockResolvedValue(expectedHorse);

      const result = await createHorse(horseData);

      expect(mockPrisma.horse.create).toHaveBeenCalledTimes(1);
      expect(mockPrisma.horse.create).toHaveBeenCalledWith({
        data: {
          name: 'Test Horse',
          age: 5,
          breedId: 1,
          epigenetic_modifiers: {
            positive: [],
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
      expect(result).toEqual(expectedHorse);
      expect(mockLogger.info).toHaveBeenCalledWith('[horseModel.createHorse] Successfully created horse: Test Horse (ID: 1)');
    });

    it('should create a horse with breed connection and return it', async() => {
      const horseData = {
        name: 'Connected Horse',
        age: 3,
        breed: {
          connect: { id: 2 }
        }
      };
      const expectedHorse = {
        id: 2,
        name: 'Connected Horse',
        age: 3,
        breedId: 2,
        createdAt: new Date(),
        breed: { id: 2, name: 'Thoroughbred' }
      };

      mockPrisma.horse.create.mockResolvedValue(expectedHorse);

      const result = await createHorse(horseData);

      expect(mockPrisma.horse.create).toHaveBeenCalledTimes(1);
      expect(mockPrisma.horse.create).toHaveBeenCalledWith({
        data: {
          name: 'Connected Horse',
          age: 3,
          breed: {
            connect: { id: 2 }
          },
          epigenetic_modifiers: {
            positive: [],
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
      expect(result).toEqual(expectedHorse);
    });

    it('should create a horse with all optional fields', async() => {
      const horseData = {
        name: 'Full Horse',
        age: 7,
        breed: { connect: { id: 1 } },
        ownerId: 1,
        stableId: 1,
        sex: 'stallion',
        date_of_birth: '2017-01-01',
        genotype: { coat: 'chestnut' },
        temperament: 'calm',
        speed: 85,
        for_sale: true,
        sale_price: 50000
      };
      const expectedHorse = {
        id: 3,
        name: 'Full Horse',
        age: 7,
        breedId: 1,
        ownerId: 1,
        stableId: 1,
        sex: 'stallion',
        speed: 85,
        for_sale: true,
        sale_price: 50000,
        createdAt: new Date()
      };

      mockPrisma.horse.create.mockResolvedValue(expectedHorse);

      const result = await createHorse(horseData);

      expect(mockPrisma.horse.create).toHaveBeenCalledTimes(1);
      expect(mockPrisma.horse.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: 'Full Horse',
            age: 7,
            breed: { connect: { id: 1 } },
            ownerId: 1,
            stableId: 1,
            sex: 'stallion',
            date_of_birth: new Date('2017-01-01'),
            genotype: { coat: 'chestnut' },
            temperament: 'calm',
            speed: 85,
            for_sale: true,
            sale_price: 50000
          }),
          include: {
            breed: true,
            owner: true,
            stable: true,
            player: true
          }
        })
      );
      expect(result).toEqual(expectedHorse);
    });

    it('should throw an error if name is missing', async() => {
      const horseData = { age: 3, breed: { connect: { id: 1 } } };

      await expect(createHorse(horseData)).rejects.toThrow('Horse name is required');
      expect(mockPrisma.horse.create).not.toHaveBeenCalled();
    });

    it('should throw an error if age is missing', async() => {
      const horseData = { name: 'No Age Horse', breed: { connect: { id: 1 } } };

      await expect(createHorse(horseData)).rejects.toThrow('Horse age is required');
      expect(mockPrisma.horse.create).not.toHaveBeenCalled();
    });

    it('should throw an error if neither breedId nor breed is provided', async() => {
      const horseData = { name: 'No Breed Horse', age: 5 };

      await expect(createHorse(horseData)).rejects.toThrow('Either breedId or breed connection is required');
      expect(mockPrisma.horse.create).not.toHaveBeenCalled();
    });

    it('should throw an error if breed format is invalid', async() => {
      const horseData = { name: 'Invalid Breed Horse', age: 5, breed: 'invalid' };

      await expect(createHorse(horseData)).rejects.toThrow('Invalid breed format. Use breedId (number) or breed: { connect: { id: number } }');
      expect(mockPrisma.horse.create).not.toHaveBeenCalled();
    });

    it('should handle breed as a number (treat as breedId)', async() => {
      const horseData = {
        name: 'Number Breed Horse',
        age: 4,
        breed: 3 // Should be treated as breedId
      };
      const expectedHorse = {
        id: 4,
        name: 'Number Breed Horse',
        age: 4,
        breedId: 3,
        createdAt: new Date()
      };

      mockPrisma.horse.create.mockResolvedValue(expectedHorse);

      const result = await createHorse(horseData);

      expect(mockPrisma.horse.create).toHaveBeenCalledWith({
        data: {
          name: 'Number Breed Horse',
          age: 4,
          breedId: 3,
          epigenetic_modifiers: {
            positive: [],
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
      expect(result).toEqual(expectedHorse);
    });

    it('should throw an error if Prisma client fails to create', async() => {
      const horseData = { name: 'Error Horse', age: 3, breed: { connect: { id: 1 } } };
      const dbError = new Error('DB create error');
      mockPrisma.horse.create.mockRejectedValue(dbError);

      await expect(createHorse(horseData)).rejects.toThrow('Database error in createHorse: DB create error');
      expect(mockLogger.error).toHaveBeenCalledTimes(1);
      expect(mockLogger.error).toHaveBeenCalledWith('[horseModel.createHorse] Database error: %o', dbError);
    });
  });

  describe('getHorseById', () => {
    it('should return a horse with relations if found by ID', async() => {
      const horseId = 1;
      const expectedHorse = {
        id: horseId,
        name: 'Found Horse',
        age: 7,
        breedId: 1,
        createdAt: new Date(),
        breed: { id: 1, name: 'Arabian' },
        owner: { id: 1, name: 'John Doe' },
        stable: null
      };
      mockPrisma.horse.findUnique.mockResolvedValue(expectedHorse);

      const result = await getHorseById(horseId);

      expect(mockPrisma.horse.findUnique).toHaveBeenCalledTimes(1);
      expect(mockPrisma.horse.findUnique).toHaveBeenCalledWith({
        where: { id: horseId },
        include: {
          breed: true,
          owner: true,
          stable: true
        }
      });
      expect(result).toEqual(expectedHorse);
      expect(mockLogger.info).toHaveBeenCalledWith('[horseModel.getHorseById] Successfully found horse: Found Horse (ID: 1)');
    });

    it('should return null if horse is not found by ID', async() => {
      const horseId = 99;
      mockPrisma.horse.findUnique.mockResolvedValue(null);

      const result = await getHorseById(horseId);

      expect(mockPrisma.horse.findUnique).toHaveBeenCalledTimes(1);
      expect(mockPrisma.horse.findUnique).toHaveBeenCalledWith({
        where: { id: horseId },
        include: {
          breed: true,
          owner: true,
          stable: true
        }
      });
      expect(result).toBeNull();
      expect(mockLogger.info).not.toHaveBeenCalled();
    });

    it('should throw an error for invalid ID (NaN)', async() => {
      const invalidId = 'invalid';

      await expect(getHorseById(invalidId)).rejects.toThrow('Invalid horse ID provided');
      expect(mockPrisma.horse.findUnique).not.toHaveBeenCalled();
    });

    it('should throw an error for invalid ID (negative)', async() => {
      const invalidId = -1;

      await expect(getHorseById(invalidId)).rejects.toThrow('Invalid horse ID provided');
      expect(mockPrisma.horse.findUnique).not.toHaveBeenCalled();
    });

    it('should throw an error for invalid ID (zero)', async() => {
      const invalidId = 0;

      await expect(getHorseById(invalidId)).rejects.toThrow('Invalid horse ID provided');
      expect(mockPrisma.horse.findUnique).not.toHaveBeenCalled();
    });

    it('should throw an error if Prisma client fails to find by ID', async() => {
      const horseId = 1;
      const dbError = new Error('DB findUnique error');
      mockPrisma.horse.findUnique.mockRejectedValue(dbError);

      await expect(getHorseById(horseId)).rejects.toThrow('Database error in getHorseById: DB findUnique error');
      expect(mockLogger.error).toHaveBeenCalledTimes(1);
      expect(mockLogger.error).toHaveBeenCalledWith('[horseModel.getHorseById] Database error: %o', dbError);
    });
  });

  describe('updateDisciplineScore', () => {
    it('should update discipline score for existing horse', async() => {
      const horseId = 1;
      const discipline = 'Dressage';
      const pointsToAdd = 5;

      const currentHorse = { disciplineScores: null };
      const updatedHorse = {
        id: horseId,
        name: 'Test Horse',
        disciplineScores: { 'Dressage': 5 },
        breed: { id: 1, name: 'Arabian' },
        owner: null,
        stable: null,
        player: null
      };

      mockPrisma.horse.findUnique.mockResolvedValue(currentHorse);
      mockPrisma.horse.update.mockResolvedValue(updatedHorse);

      const result = await updateDisciplineScore(horseId, discipline, pointsToAdd);

      expect(mockPrisma.horse.findUnique).toHaveBeenCalledWith({
        where: { id: horseId },
        select: { disciplineScores: true }
      });
      expect(mockPrisma.horse.update).toHaveBeenCalledWith({
        where: { id: horseId },
        data: {
          disciplineScores: { 'Dressage': 5 }
        },
        include: {
          breed: true,
          owner: true,
          stable: true,
          player: true
        }
      });
      expect(result).toEqual(updatedHorse);
    });

    it('should add to existing discipline score', async() => {
      const horseId = 1;
      const discipline = 'Dressage';
      const pointsToAdd = 5;

      const currentHorse = { disciplineScores: { 'Dressage': 5 } };
      const updatedHorse = {
        id: horseId,
        disciplineScores: { 'Dressage': 10 },
        breed: { id: 1, name: 'Arabian' }
      };

      mockPrisma.horse.findUnique.mockResolvedValue(currentHorse);
      mockPrisma.horse.update.mockResolvedValue(updatedHorse);

      const result = await updateDisciplineScore(horseId, discipline, pointsToAdd);

      expect(mockPrisma.horse.update).toHaveBeenCalledWith({
        where: { id: horseId },
        data: {
          disciplineScores: { 'Dressage': 10 }
        },
        include: {
          breed: true,
          owner: true,
          stable: true,
          player: true
        }
      });
      expect(result.disciplineScores['Dressage']).toBe(10);
    });

    it('should handle multiple disciplines independently', async() => {
      const horseId = 1;
      const discipline = 'Show Jumping';
      const pointsToAdd = 3;

      const currentHorse = { disciplineScores: { 'Dressage': 5 } };
      const updatedHorse = {
        id: horseId,
        disciplineScores: { 'Dressage': 5, 'Show Jumping': 3 }
      };

      mockPrisma.horse.findUnique.mockResolvedValue(currentHorse);
      mockPrisma.horse.update.mockResolvedValue(updatedHorse);

      const result = await updateDisciplineScore(horseId, discipline, pointsToAdd);

      expect(mockPrisma.horse.update).toHaveBeenCalledWith({
        where: { id: horseId },
        data: {
          disciplineScores: { 'Dressage': 5, 'Show Jumping': 3 }
        },
        include: {
          breed: true,
          owner: true,
          stable: true,
          player: true
        }
      });
      expect(result.disciplineScores).toEqual({ 'Dressage': 5, 'Show Jumping': 3 });
    });

    it('should throw error for invalid horse ID', async() => {
      await expect(updateDisciplineScore(-1, 'Dressage', 5))
        .rejects.toThrow('Invalid horse ID provided');

      await expect(updateDisciplineScore('invalid', 'Dressage', 5))
        .rejects.toThrow('Invalid horse ID provided');

      expect(mockPrisma.horse.findUnique).not.toHaveBeenCalled();
    });

    it('should throw error for non-existent horse', async() => {
      mockPrisma.horse.findUnique.mockResolvedValue(null);

      await expect(updateDisciplineScore(99999, 'Dressage', 5))
        .rejects.toThrow('Horse with ID 99999 not found');
    });

    it('should throw error for invalid discipline', async() => {
      await expect(updateDisciplineScore(1, '', 5))
        .rejects.toThrow('Discipline must be a non-empty string');

      await expect(updateDisciplineScore(1, null, 5))
        .rejects.toThrow('Discipline must be a non-empty string');
    });

    it('should throw error for invalid points', async() => {
      await expect(updateDisciplineScore(1, 'Dressage', 0))
        .rejects.toThrow('Points to add must be a positive number');

      await expect(updateDisciplineScore(1, 'Dressage', -5))
        .rejects.toThrow('Points to add must be a positive number');

      await expect(updateDisciplineScore(1, 'Dressage', 'invalid'))
        .rejects.toThrow('Points to add must be a positive number');
    });
  });

  describe('getDisciplineScores', () => {
    it('should return empty object for horse with no scores', async() => {
      const horseId = 1;
      const horse = { disciplineScores: null };

      mockPrisma.horse.findUnique.mockResolvedValue(horse);

      const result = await getDisciplineScores(horseId);

      expect(mockPrisma.horse.findUnique).toHaveBeenCalledWith({
        where: { id: horseId },
        select: { disciplineScores: true }
      });
      expect(result).toEqual({});
    });

    it('should return discipline scores for horse with scores', async() => {
      const horseId = 1;
      const horse = {
        disciplineScores: {
          'Dressage': 5,
          'Show Jumping': 3
        }
      };

      mockPrisma.horse.findUnique.mockResolvedValue(horse);

      const result = await getDisciplineScores(horseId);

      expect(result).toEqual({
        'Dressage': 5,
        'Show Jumping': 3
      });
    });

    it('should throw error for invalid horse ID', async() => {
      await expect(getDisciplineScores(-1))
        .rejects.toThrow('Invalid horse ID provided');

      await expect(getDisciplineScores('invalid'))
        .rejects.toThrow('Invalid horse ID provided');

      expect(mockPrisma.horse.findUnique).not.toHaveBeenCalled();
    });

    it('should throw error for non-existent horse', async() => {
      mockPrisma.horse.findUnique.mockResolvedValue(null);

      await expect(getDisciplineScores(99999))
        .rejects.toThrow('Horse with ID 99999 not found');
    });
  });

  describe('incrementDisciplineScore', () => {
    it('should increment discipline score by +5 for existing horse with no scores', async() => {
      const horseId = 1;
      const discipline = 'Dressage';

      const currentHorse = { disciplineScores: null };
      const updatedHorse = {
        id: horseId,
        name: 'Test Horse',
        disciplineScores: { 'Dressage': 5 },
        breed: { id: 1, name: 'Arabian' },
        owner: null,
        stable: null,
        player: null
      };

      mockPrisma.horse.findUnique.mockResolvedValue(currentHorse);
      mockPrisma.horse.update.mockResolvedValue(updatedHorse);

      const result = await incrementDisciplineScore(horseId, discipline);

      expect(mockPrisma.horse.findUnique).toHaveBeenCalledWith({
        where: { id: horseId },
        select: { disciplineScores: true }
      });
      expect(mockPrisma.horse.update).toHaveBeenCalledWith({
        where: { id: horseId },
        data: {
          disciplineScores: { 'Dressage': 5 }
        },
        include: {
          breed: true,
          owner: true,
          stable: true,
          player: true
        }
      });
      expect(result).toEqual(updatedHorse);
      expect(result.disciplineScores['Dressage']).toBe(5);
    });

    it('should increment existing discipline score by +5', async() => {
      const horseId = 1;
      const discipline = 'Dressage';

      const currentHorse = { disciplineScores: { 'Dressage': 10 } };
      const updatedHorse = {
        id: horseId,
        disciplineScores: { 'Dressage': 15 },
        breed: { id: 1, name: 'Arabian' }
      };

      mockPrisma.horse.findUnique.mockResolvedValue(currentHorse);
      mockPrisma.horse.update.mockResolvedValue(updatedHorse);

      const result = await incrementDisciplineScore(horseId, discipline);

      expect(mockPrisma.horse.update).toHaveBeenCalledWith({
        where: { id: horseId },
        data: {
          disciplineScores: { 'Dressage': 15 }
        },
        include: {
          breed: true,
          owner: true,
          stable: true,
          player: true
        }
      });
      expect(result.disciplineScores['Dressage']).toBe(15);
    });

    it('should handle multiple disciplines when incrementing', async() => {
      const horseId = 1;
      const discipline = 'Show Jumping';

      const currentHorse = { disciplineScores: { 'Dressage': 10, 'Racing': 8 } };
      const updatedHorse = {
        id: horseId,
        disciplineScores: { 'Dressage': 10, 'Racing': 8, 'Show Jumping': 5 }
      };

      mockPrisma.horse.findUnique.mockResolvedValue(currentHorse);
      mockPrisma.horse.update.mockResolvedValue(updatedHorse);

      const result = await incrementDisciplineScore(horseId, discipline);

      expect(mockPrisma.horse.update).toHaveBeenCalledWith({
        where: { id: horseId },
        data: {
          disciplineScores: { 'Dressage': 10, 'Racing': 8, 'Show Jumping': 5 }
        },
        include: {
          breed: true,
          owner: true,
          stable: true,
          player: true
        }
      });
      expect(result.disciplineScores).toEqual({ 'Dressage': 10, 'Racing': 8, 'Show Jumping': 5 });
    });

    it('should throw error for invalid horse ID', async() => {
      await expect(incrementDisciplineScore(-1, 'Dressage'))
        .rejects.toThrow('Invalid horse ID provided');

      await expect(incrementDisciplineScore('invalid', 'Dressage'))
        .rejects.toThrow('Invalid horse ID provided');

      expect(mockPrisma.horse.findUnique).not.toHaveBeenCalled();
    });

    it('should throw error for non-existent horse', async() => {
      mockPrisma.horse.findUnique.mockResolvedValue(null);

      await expect(incrementDisciplineScore(99999, 'Dressage'))
        .rejects.toThrow('Horse with ID 99999 not found');
    });

    it('should throw error for invalid discipline', async() => {
      await expect(incrementDisciplineScore(1, ''))
        .rejects.toThrow('Discipline must be a non-empty string');

      await expect(incrementDisciplineScore(1, null))
        .rejects.toThrow('Discipline must be a non-empty string');
    });
  });
});
