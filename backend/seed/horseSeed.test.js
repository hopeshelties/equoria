import { jest } from '@jest/globals';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Mock modules
jest.unstable_mockModule(join(__dirname, '../db/index.js'), () => ({
  default: {
    breed: {
      findUnique: jest.fn(),
      create: jest.fn()
    },
    user: {
      upsert: jest.fn()
    },
    stable: {
      upsert: jest.fn()
    },
    horse: {
      findFirst: jest.fn(),
      create: jest.fn() // Added create mock for horse
    },
    $disconnect: jest.fn()
  }
}));

jest.unstable_mockModule(join(__dirname, '../models/horseModel.js'), () => ({
  createHorse: jest.fn()
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
  let seedHorses; // Added seedHorses

  beforeAll(async () => {
    // Mock console methods
    console.log = jest.fn();
    console.error = jest.fn();
    console.warn = jest.fn();

    // Get mocked modules
    mockPrisma = (await import(join(__dirname, '../db/index.js'))).default;
    mockCreateHorse = (await import(join(__dirname, '../models/horseModel.js'))).createHorse;

    // Import the functions we want to test
    const seedModule = await import(join(__dirname, './horseSeed.js'));
    ({ findOrCreateBreed, ensureReferencedRecordsExist, checkHorseExists, seedHorses } = seedModule); // Used destructuring
  });

  afterAll(() => {
    // Restore console methods
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
    console.warn = originalConsoleWarn;
  });

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks(); // Simpler way to clear all mocks
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
      mockPrisma.user.upsert.mockResolvedValueOnce({ id: 1, username: 'Default Owner', email: 'owner1@example.com' });
      mockPrisma.user.upsert.mockResolvedValueOnce({ id: 2, username: 'Second Owner', email: 'owner2@example.com' });
      mockPrisma.stable.upsert.mockResolvedValue({ id: 1, name: 'Main Stable' }); // Assuming stable upsert is fine

      await ensureReferencedRecordsExist();

      expect(mockPrisma.user.upsert).toHaveBeenCalledTimes(2);
      expect(mockPrisma.stable.upsert).toHaveBeenCalledTimes(2);

      expect(mockPrisma.user.upsert).toHaveBeenCalledWith({
        where: { id: 1 },
        update: { username: 'Default Owner' },
        create: { id: 1, username: 'Default Owner', email: 'owner1@example.com', password: 'password' }
      });

      expect(mockPrisma.user.upsert).toHaveBeenCalledWith({
        where: { id: 2 },
        update: { username: 'Second Owner' },
        create: { id: 2, username: 'Second Owner', email: 'owner2@example.com', password: 'password' }
      });
    });

    it('should handle errors gracefully when user creation fails', async () => {
      const error = new Error('Database connection failed');
      mockPrisma.user.upsert.mockRejectedValue(error);
      // We still expect stable upsert to be called, so mock it
      mockPrisma.stable.upsert.mockResolvedValue({ id: 1, name: 'Main Stable' });


      await ensureReferencedRecordsExist();

      expect(console.warn).toHaveBeenCalledWith('[seed] Could not ensure User ID 1. Error: Database connection failed');
      expect(console.warn).toHaveBeenCalledWith('[seed] Could not ensure User ID 2. Error: Database connection failed');
    });
  });

  describe('seedHorses', () => {
    it('should log a warning and return an empty array if no users are provided', async () => {
      const result = await seedHorses(mockPrisma, []);
      expect(console.warn).toHaveBeenCalledWith('No users provided for horse seeding. Skipping horse creation.');
      expect(result).toEqual([]);
    });

    it('should create breeds and horses for the provided user', async () => {
      const mockUser = { id: 1, username: 'TestUser' };
      const mockThoroughbredBreed = { id: 1, name: 'Thoroughbred', baseSpeed: 80, baseStamina: 70, baseStrength: 60, rarity: 'Common' };
      const mockArabianBreed = { id: 2, name: 'Arabian', baseSpeed: 75, baseStamina: 80, baseStrength: 50, rarity: 'Rare' };
      // Add other breeds as defined in seedHorses
      const mockQuarterHorseBreed = { id: 3, name: 'Quarter Horse', baseSpeed: 70, baseStamina: 60, baseStrength: 80, rarity: 'Common' };
      const mockAkhalTekeBreed = { id: 4, name: 'Akhal-Teke', baseSpeed: 85, baseStamina: 75, baseStrength: 65, rarity: 'Epic' };


      const mockHorseLightning = { id: 1, name: 'Lightning Bolt', breedId: mockThoroughbredBreed.id, ownerId: mockUser.id, userId: mockUser.id };
      const mockHorseDesertRose = { id: 2, name: 'Desert Rose', breedId: mockArabianBreed.id, ownerId: mockUser.id, userId: mockUser.id };


      mockPrisma.breed.upsert.mockImplementation(async ({ where, create }) => {
        if (where.name === 'Thoroughbred') return mockThoroughbredBreed;
        if (where.name === 'Arabian') return mockArabianBreed;
        if (where.name === 'Quarter Horse') return mockQuarterHorseBreed;
        if (where.name === 'Akhal-Teke') return mockAkhalTekeBreed;
        return { ...create, id: Math.floor(Math.random() * 1000) }; // Fallback for other breeds
      });

      mockPrisma.horse.create.mockImplementation(async (data) => {
        if (data.data.name === 'Lightning Bolt') return mockHorseLightning;
        if (data.data.name === 'Desert Rose') return mockHorseDesertRose;
        return { ...data.data, id: Math.floor(Math.random() * 1000) }; // Fallback
      });

      const result = await seedHorses(mockPrisma, [mockUser]);

      expect(mockPrisma.breed.upsert).toHaveBeenCalledTimes(4); // 4 breeds are defined in seedHorses
      expect(mockPrisma.horse.create).toHaveBeenCalledTimes(2); // 2 horses are defined for creation
      expect(result.length).toBe(2);
      expect(result).toContainEqual(mockHorseLightning);
      expect(result).toContainEqual(mockHorseDesertRose);
      expect(console.log).toHaveBeenCalledWith(`Created horse: ${mockHorseLightning.name} for user ID: ${mockUser.id}`);
      expect(console.log).toHaveBeenCalledWith(`Created horse: ${mockHorseDesertRose.name} for user ID: ${mockUser.id}`);
    });

    it('should log a warning if a horse is skipped due to missing breedId', async () => {
      const mockUser = { id: 1, username: 'TestUser' };
      // Simulate 'Thoroughbred' breed not being found/created, leading to its horses being skipped.
      mockPrisma.breed.upsert.mockImplementation(async ({ where }) => {
        if (where.name === 'Arabian') return { id: 2, name: 'Arabian' };
        if (where.name === 'Quarter Horse') return { id: 3, name: 'Quarter Horse' };
        if (where.name === 'Akhal-Teke') return { id: 4, name: 'Akhal-Teke' };
        // Thoroughbred is intentionally not returned
        return undefined;
      });
      mockPrisma.horse.create.mockResolvedValue({ id: 1, name: 'Some Horse' }); // General mock for any horse creation attempt

      await seedHorses(mockPrisma, [mockUser]);

      // Lightning Bolt is a Thoroughbred, so it should be skipped.
      expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('Skipping horse Lightning Bolt due to missing breedId.'));
      // Desert Rose is an Arabian, it should still be created if its breed is found.
      // We expect horse.create to be called for Desert Rose if Arabian breed is resolved.
      const createCalls = mockPrisma.horse.create.mock.calls;
      const createdDesertRose = createCalls.some(call => call[0].data.name === 'Desert Rose');
      expect(createdDesertRose).toBe(true); // Check if Desert Rose was attempted to be created
    });


    it('should log an error if horse creation fails', async () => {
      const mockUser = { id: 1, username: 'TestUser' };
      const mockBreed = { id: 1, name: 'Thoroughbred' };
      const error = new Error('Failed to create horse');

      mockPrisma.breed.upsert.mockResolvedValue(mockBreed); // All breeds resolve to this for simplicity
      mockPrisma.horse.create.mockRejectedValue(error);

      await seedHorses(mockPrisma, [mockUser]);

      // Assuming 'Lightning Bolt' is one of the horses attempted from the internal data
      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Error seeding horse Lightning Bolt: Failed to create horse'));
      // And 'Desert Rose'
      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Error seeding horse Desert Rose: Failed to create horse'));
    });
  });
});