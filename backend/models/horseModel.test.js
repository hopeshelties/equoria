import { jest } from '@jest/globals'; // Import jest explicitly for ES modules

// Mock the modules BEFORE importing the module under test
jest.unstable_mockModule('../db/index.js', () => ({
  default: {
    horse: {
      create: jest.fn(),
      findUnique: jest.fn(),
    },
  }
}));

jest.unstable_mockModule('../utils/logger.js', () => ({
  default: {
    error: jest.fn(),
    info: jest.fn(),
  }
}));

// Now import the module under test and the mocks
const { createHorse, getHorseById } = await import('./horseModel.js');
const mockPrisma = (await import('../db/index.js')).default;
const mockLogger = (await import('../utils/logger.js')).default;

describe('horseModel', () => {
  beforeEach(() => {
    // Clear all mock implementations and calls before each test
    mockPrisma.horse.create.mockClear();
    mockPrisma.horse.findUnique.mockClear();
    mockLogger.error.mockClear();
    mockLogger.info.mockClear();
  });

  describe('createHorse', () => {
    it('should create a horse with breedId and return it', async () => {
      const horseData = {
        name: 'Test Horse',
        age: 5,
        breedId: 1
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
          breedId: 1
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

    it('should create a horse with breed connection and return it', async () => {
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

    it('should create a horse with all optional fields', async () => {
      const horseData = {
        name: 'Full Horse',
        age: 7,
        breedId: 1,
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
            breedId: 1,
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

    it('should throw an error if name is missing', async () => {
      const horseData = { age: 3, breedId: 1 };

      await expect(createHorse(horseData)).rejects.toThrow('Horse name is required');
      expect(mockPrisma.horse.create).not.toHaveBeenCalled();
    });

    it('should throw an error if age is missing', async () => {
      const horseData = { name: 'No Age Horse', breedId: 1 };

      await expect(createHorse(horseData)).rejects.toThrow('Horse age is required');
      expect(mockPrisma.horse.create).not.toHaveBeenCalled();
    });

    it('should throw an error if neither breedId nor breed is provided', async () => {
      const horseData = { name: 'No Breed Horse', age: 5 };

      await expect(createHorse(horseData)).rejects.toThrow('Either breedId or breed connection is required');
      expect(mockPrisma.horse.create).not.toHaveBeenCalled();
    });

    it('should throw an error if breed format is invalid', async () => {
      const horseData = { name: 'Invalid Breed Horse', age: 5, breed: 'invalid' };

      await expect(createHorse(horseData)).rejects.toThrow('Invalid breed format. Use breedId (number) or breed: { connect: { id: number } }');
      expect(mockPrisma.horse.create).not.toHaveBeenCalled();
    });

    it('should handle breed as a number (treat as breedId)', async () => {
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
          breedId: 3
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

    it('should throw an error if Prisma client fails to create', async () => {
      const horseData = { name: 'Error Horse', age: 3, breedId: 1 };
      const dbError = new Error('DB create error');
      mockPrisma.horse.create.mockRejectedValue(dbError);

      await expect(createHorse(horseData)).rejects.toThrow('Database error in createHorse: DB create error');
      expect(mockLogger.error).toHaveBeenCalledTimes(1);
      expect(mockLogger.error).toHaveBeenCalledWith('[horseModel.createHorse] Database error: %o', dbError);
    });
  });

  describe('getHorseById', () => {
    it('should return a horse with relations if found by ID', async () => {
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

    it('should return null if horse is not found by ID', async () => {
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

    it('should throw an error for invalid ID (NaN)', async () => {
      const invalidId = 'invalid';

      await expect(getHorseById(invalidId)).rejects.toThrow('Invalid horse ID provided');
      expect(mockPrisma.horse.findUnique).not.toHaveBeenCalled();
    });

    it('should throw an error for invalid ID (negative)', async () => {
      const invalidId = -1;

      await expect(getHorseById(invalidId)).rejects.toThrow('Invalid horse ID provided');
      expect(mockPrisma.horse.findUnique).not.toHaveBeenCalled();
    });

    it('should throw an error for invalid ID (zero)', async () => {
      const invalidId = 0;

      await expect(getHorseById(invalidId)).rejects.toThrow('Invalid horse ID provided');
      expect(mockPrisma.horse.findUnique).not.toHaveBeenCalled();
    });

    it('should throw an error if Prisma client fails to find by ID', async () => {
      const horseId = 1;
      const dbError = new Error('DB findUnique error');
      mockPrisma.horse.findUnique.mockRejectedValue(dbError);

      await expect(getHorseById(horseId)).rejects.toThrow('Database error in getHorseById: DB findUnique error');
      expect(mockLogger.error).toHaveBeenCalledTimes(1);
      expect(mockLogger.error).toHaveBeenCalledWith('[horseModel.getHorseById] Database error: %o', dbError);
    });
  });
}); 