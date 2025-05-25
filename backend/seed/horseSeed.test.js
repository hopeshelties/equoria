import { jest } from '@jest/globals';

// Mock modules
jest.unstable_mockModule('../db/index.js', () => ({
  default: {
    breed: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    user: {
      upsert: jest.fn(),
    },
    stable: {
      upsert: jest.fn(),
    },
    horse: {
      findFirst: jest.fn(),
    },
    $disconnect: jest.fn(),
  }
}));

jest.unstable_mockModule('../models/horseModel.js', () => ({
  createHorse: jest.fn(),
}));

// Mock console methods
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

describe('horseSeed', () => {
  let mockPrisma;
  let mockCreateHorse;
  let findOrCreateBreed;
  let ensureReferencedRecordsExist;
  let checkHorseExists;
  let seedHorses;

  beforeAll(async () => {
    // Mock console methods
    console.log = jest.fn();
    console.error = jest.fn();
    console.warn = jest.fn();

    // Get mocked modules
    mockPrisma = (await import('../db/index.js')).default;
    mockCreateHorse = (await import('../models/horseModel.js')).createHorse;
    
    // Import the functions we want to test
    const seedModule = await import('./horseSeed.js');
    findOrCreateBreed = seedModule.findOrCreateBreed;
    ensureReferencedRecordsExist = seedModule.ensureReferencedRecordsExist;
    checkHorseExists = seedModule.checkHorseExists;
    seedHorses = seedModule.seedHorses;
  });

  afterAll(() => {
    // Restore console methods
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
    console.warn = originalConsoleWarn;
  });

  beforeEach(() => {
    // Clear all mocks before each test
    mockPrisma.breed.findUnique.mockClear();
    mockPrisma.breed.create.mockClear();
    mockPrisma.user.upsert.mockClear();
    mockPrisma.stable.upsert.mockClear();
    mockPrisma.horse.findFirst.mockClear();
    mockCreateHorse.mockClear();
    console.log.mockClear();
    console.error.mockClear();
    console.warn.mockClear();
  });

  describe('checkHorseExists', () => {
    it('should return true if horse exists', async () => {
      const existingHorse = { id: 1, name: 'Test Horse' };
      mockPrisma.horse.findFirst.mockResolvedValue(existingHorse);

      const result = await checkHorseExists('Test Horse');

      expect(mockPrisma.horse.findFirst).toHaveBeenCalledWith({
        where: { name: 'Test Horse' }
      });
      expect(result).toBe(true);
    });

    it('should return false if horse does not exist', async () => {
      mockPrisma.horse.findFirst.mockResolvedValue(null);

      const result = await checkHorseExists('Nonexistent Horse');

      expect(mockPrisma.horse.findFirst).toHaveBeenCalledWith({
        where: { name: 'Nonexistent Horse' }
      });
      expect(result).toBe(false);
    });

    it('should return false and log warning on database error', async () => {
      const error = new Error('Database error');
      mockPrisma.horse.findFirst.mockRejectedValue(error);

      const result = await checkHorseExists('Error Horse');

      expect(result).toBe(false);
      expect(console.warn).toHaveBeenCalledWith('[seed] Failed to check if horse "Error Horse" exists: Database error');
    });
  });

  describe('findOrCreateBreed', () => {
    it('should return existing breed if found', async () => {
      const existingBreed = { id: 1, name: 'Thoroughbred' };
      
      mockPrisma.breed.findUnique.mockResolvedValue(existingBreed);

      const result = await findOrCreateBreed('Thoroughbred');

      expect(mockPrisma.breed.findUnique).toHaveBeenCalledTimes(1);
      expect(mockPrisma.breed.findUnique).toHaveBeenCalledWith({
        where: { name: 'Thoroughbred' }
      });
      expect(mockPrisma.breed.create).not.toHaveBeenCalled();
      expect(result).toEqual(existingBreed);
      expect(console.log).toHaveBeenCalledWith('[seed] Found existing breed: Thoroughbred (ID: 1)');
    });

    it('should create new breed if not found', async () => {
      const newBreed = { id: 2, name: 'Arabian', description: 'Seed-created Arabian' };
      
      mockPrisma.breed.findUnique.mockResolvedValue(null);
      mockPrisma.breed.create.mockResolvedValue(newBreed);

      const result = await findOrCreateBreed('Arabian');

      expect(mockPrisma.breed.findUnique).toHaveBeenCalledTimes(1);
      expect(mockPrisma.breed.findUnique).toHaveBeenCalledWith({
        where: { name: 'Arabian' }
      });
      expect(mockPrisma.breed.create).toHaveBeenCalledTimes(1);
      expect(mockPrisma.breed.create).toHaveBeenCalledWith({
        data: { name: 'Arabian', description: 'Seed-created Arabian' }
      });
      expect(result).toEqual(newBreed);
    });

    it('should return null for undefined breed name', async () => {
      const result = await findOrCreateBreed(undefined);

      expect(result).toBeNull();
      expect(console.warn).toHaveBeenCalledWith('[seed] Breed name is undefined or null. Skipping breed creation/connection.');
      expect(mockPrisma.breed.findUnique).not.toHaveBeenCalled();
      expect(mockPrisma.breed.create).not.toHaveBeenCalled();
    });

    it('should throw error if database operation fails', async () => {
      const error = new Error('Database connection failed');
      mockPrisma.breed.findUnique.mockRejectedValue(error);

      await expect(findOrCreateBreed('Test Breed')).rejects.toThrow('Database connection failed');
      expect(console.error).toHaveBeenCalledWith('[seed] Failed to find or create breed "Test Breed": Database connection failed');
    });
  });

  describe('ensureReferencedRecordsExist', () => {
    it('should create users and stables if they do not exist', async () => {
      mockPrisma.user.upsert.mockResolvedValue({ id: 1, name: 'Default Owner' });
      mockPrisma.stable.upsert.mockResolvedValue({ id: 1, name: 'Main Stable' });

      await ensureReferencedRecordsExist();

      expect(mockPrisma.user.upsert).toHaveBeenCalledTimes(2);
      expect(mockPrisma.stable.upsert).toHaveBeenCalledTimes(2);
      
      // Check specific calls
      expect(mockPrisma.user.upsert).toHaveBeenCalledWith({
        where: { id: 1 },
        update: { name: 'Default Owner' },
        create: { id: 1, name: 'Default Owner' }
      });
      
      expect(mockPrisma.user.upsert).toHaveBeenCalledWith({
        where: { id: 2 },
        update: { name: 'Second Owner' },
        create: { id: 2, name: 'Second Owner' }
      });
    });

    it('should handle errors gracefully when user creation fails', async () => {
      const error = new Error('Database connection failed');
      mockPrisma.user.upsert.mockRejectedValue(error);
      mockPrisma.stable.upsert.mockResolvedValue({ id: 1, name: 'Main Stable' });

      await ensureReferencedRecordsExist();

      expect(console.warn).toHaveBeenCalledWith('[seed] Could not ensure User ID 1. If horses rely on it, they may fail to seed or have null ownerId. Error:', error.message);
      expect(console.warn).toHaveBeenCalledWith('[seed] Could not ensure User ID 2. Error:', error.message);
    });
  });
}); 