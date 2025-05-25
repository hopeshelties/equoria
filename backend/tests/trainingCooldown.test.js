import { jest } from '@jest/globals';
import { canTrain, getCooldownTimeRemaining, setCooldown, formatCooldown } from '../utils/trainingCooldown.js';
import { createHorse, getHorseById } from '../models/horseModel.js';
import prisma from '../db/index.js';

describe('trainingCooldown', () => {
  let testHorse;
  let testBreed;

  beforeAll(async () => {
    // Create a test breed for our horses
    testBreed = await prisma.breed.create({
      data: {
        name: 'Test Training Breed',
        description: 'Breed for training cooldown tests'
      }
    });
  });

  beforeEach(async () => {
    // Create a fresh test horse for each test
    const horseData = {
      name: `Test Training Horse ${Date.now()}`,
      age: 5,
      breedId: testBreed.id,
      sex: 'Mare',
      date_of_birth: new Date('2019-01-01'),
      health_status: 'Excellent'
    };

    testHorse = await createHorse(horseData);
  });

  afterEach(async () => {
    // Clean up the test horse after each test
    if (testHorse && testHorse.id) {
      try {
        await prisma.horse.delete({
          where: { id: testHorse.id }
        });
      } catch (error) {
        // Horse might already be deleted, ignore error
        console.warn(`Could not delete test horse ${testHorse.id}: ${error.message}`);
      }
    }
  });

  afterAll(async () => {
    // Clean up the test breed
    if (testBreed && testBreed.id) {
      try {
        await prisma.breed.delete({
          where: { id: testBreed.id }
        });
      } catch (error) {
        console.warn(`Could not delete test breed ${testBreed.id}: ${error.message}`);
      }
    }
  });

  describe('canTrain', () => {
    it('should return true for horse with no cooldown', () => {
      expect(canTrain(testHorse)).toBe(true);
    });

    it('should return true for horse with cooldown in the past', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1); // 1 day ago
      
      const horseWithPastCooldown = {
        ...testHorse,
        trainingCooldown: pastDate
      };

      expect(canTrain(horseWithPastCooldown)).toBe(true);
    });

    it('should return false for horse with cooldown in the future', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1); // 1 day from now
      
      const horseWithFutureCooldown = {
        ...testHorse,
        trainingCooldown: futureDate
      };

      expect(canTrain(horseWithFutureCooldown)).toBe(false);
    });

    it('should throw error for null horse', () => {
      expect(() => canTrain(null)).toThrow('Horse object is required');
    });

    it('should throw error for undefined horse', () => {
      expect(() => canTrain(undefined)).toThrow('Horse object is required');
    });
  });

  describe('getCooldownTimeRemaining', () => {
    it('should return null for horse with no cooldown', () => {
      expect(getCooldownTimeRemaining(testHorse)).toBeNull();
    });

    it('should return null for horse with cooldown in the past', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1); // 1 day ago
      
      const horseWithPastCooldown = {
        ...testHorse,
        trainingCooldown: pastDate
      };

      expect(getCooldownTimeRemaining(horseWithPastCooldown)).toBeNull();
    });

    it('should return positive milliseconds for horse with cooldown in the future', () => {
      const futureDate = new Date();
      futureDate.setHours(futureDate.getHours() + 1); // 1 hour from now
      
      const horseWithFutureCooldown = {
        ...testHorse,
        trainingCooldown: futureDate
      };

      const remaining = getCooldownTimeRemaining(horseWithFutureCooldown);
      expect(remaining).toBeGreaterThan(0);
      expect(remaining).toBeLessThanOrEqual(60 * 60 * 1000); // Should be <= 1 hour in ms
    });

    it('should return approximately correct time remaining', () => {
      const futureDate = new Date();
      futureDate.setMinutes(futureDate.getMinutes() + 30); // 30 minutes from now
      
      const horseWithFutureCooldown = {
        ...testHorse,
        trainingCooldown: futureDate
      };

      const remaining = getCooldownTimeRemaining(horseWithFutureCooldown);
      const expectedMs = 30 * 60 * 1000; // 30 minutes in milliseconds
      
      // Allow for small timing differences (within 1 second)
      expect(remaining).toBeGreaterThan(expectedMs - 1000);
      expect(remaining).toBeLessThanOrEqual(expectedMs);
    });

    it('should throw error for null horse', () => {
      expect(() => getCooldownTimeRemaining(null)).toThrow('Horse object is required');
    });

    it('should throw error for undefined horse', () => {
      expect(() => getCooldownTimeRemaining(undefined)).toThrow('Horse object is required');
    });
  });

  describe('setCooldown', () => {
    it('should set cooldown 7 days in the future', async () => {
      const beforeTime = new Date();
      const updatedHorse = await setCooldown(testHorse.id);
      const afterTime = new Date();
      
      expect(updatedHorse.trainingCooldown).toBeDefined();
      
      const cooldownDate = new Date(updatedHorse.trainingCooldown);
      const expectedMinDate = new Date(beforeTime);
      expectedMinDate.setDate(expectedMinDate.getDate() + 7);
      
      const expectedMaxDate = new Date(afterTime);
      expectedMaxDate.setDate(expectedMaxDate.getDate() + 7);
      
      expect(cooldownDate.getTime()).toBeGreaterThanOrEqual(expectedMinDate.getTime());
      expect(cooldownDate.getTime()).toBeLessThanOrEqual(expectedMaxDate.getTime());
    });

    it('should return updated horse with relations', async () => {
      const updatedHorse = await setCooldown(testHorse.id);
      
      expect(updatedHorse.id).toBe(testHorse.id);
      expect(updatedHorse.name).toBe(testHorse.name);
      expect(updatedHorse.breed).toBeDefined();
      expect(updatedHorse.breed.id).toBe(testBreed.id);
    });

    it('should throw error for non-existent horse ID', async () => {
      const nonExistentId = 999999;
      
      await expect(setCooldown(nonExistentId))
        .rejects
        .toThrow(`Horse with ID ${nonExistentId} not found`);
    });

    it('should throw error for null horse ID', async () => {
      await expect(setCooldown(null))
        .rejects
        .toThrow('Horse ID is required');
    });

    it('should throw error for undefined horse ID', async () => {
      await expect(setCooldown(undefined))
        .rejects
        .toThrow('Horse ID is required');
    });

    it('should throw error for invalid horse ID (string)', async () => {
      await expect(setCooldown('invalid'))
        .rejects
        .toThrow('Horse ID must be a valid positive integer');
    });

    it('should throw error for invalid horse ID (negative)', async () => {
      await expect(setCooldown(-1))
        .rejects
        .toThrow('Horse ID must be a valid positive integer');
    });

    it('should throw error for invalid horse ID (zero)', async () => {
      await expect(setCooldown(0))
        .rejects
        .toThrow('Horse ID must be a valid positive integer');
    });

    it('should handle string horse ID that can be parsed to integer', async () => {
      const updatedHorse = await setCooldown(testHorse.id.toString());
      expect(updatedHorse.id).toBe(testHorse.id);
      expect(updatedHorse.trainingCooldown).toBeDefined();
    });
  });

  describe('formatCooldown', () => {
    it('should return "Ready to train" for null input', () => {
      expect(formatCooldown(null)).toBe('Ready to train');
    });

    it('should return "Ready to train" for zero milliseconds', () => {
      expect(formatCooldown(0)).toBe('Ready to train');
    });

    it('should return "Ready to train" for negative milliseconds', () => {
      expect(formatCooldown(-1000)).toBe('Ready to train');
    });

    it('should format minutes correctly', () => {
      const fiveMinutes = 5 * 60 * 1000;
      expect(formatCooldown(fiveMinutes)).toBe('5 minute(s) remaining');
    });

    it('should format hours and minutes correctly', () => {
      const twoHoursFiveMinutes = (2 * 60 * 60 * 1000) + (5 * 60 * 1000);
      expect(formatCooldown(twoHoursFiveMinutes)).toBe('2 hour(s), 5 minute(s) remaining');
    });

    it('should format days and hours correctly', () => {
      const threeDaysTwoHours = (3 * 24 * 60 * 60 * 1000) + (2 * 60 * 60 * 1000);
      expect(formatCooldown(threeDaysTwoHours)).toBe('3 day(s), 2 hour(s) remaining');
    });

    it('should format exactly 7 days correctly', () => {
      const sevenDays = 7 * 24 * 60 * 60 * 1000;
      expect(formatCooldown(sevenDays)).toBe('7 day(s), 0 hour(s) remaining');
    });
  });

  describe('Integration Tests', () => {
    it('should complete full training cooldown workflow', async () => {
      // 1. Verify horse can initially train
      expect(canTrain(testHorse)).toBe(true);
      expect(getCooldownTimeRemaining(testHorse)).toBeNull();

      // 2. Set cooldown
      const updatedHorse = await setCooldown(testHorse.id);
      
      // 3. Verify horse cannot train after cooldown is set
      expect(canTrain(updatedHorse)).toBe(false);
      
      // 4. Verify time remaining is approximately 7 days
      const timeRemaining = getCooldownTimeRemaining(updatedHorse);
      expect(timeRemaining).toBeGreaterThan(0);
      
      const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
      expect(timeRemaining).toBeLessThanOrEqual(sevenDaysMs);
      expect(timeRemaining).toBeGreaterThan(sevenDaysMs - 60000); // Within 1 minute of 7 days

      // 5. Verify formatting works
      const formatted = formatCooldown(timeRemaining);
      expect(formatted).toContain('day(s)');
      expect(formatted).toContain('remaining');
    });

    it('should work with horse retrieved from database', async () => {
      // Set cooldown
      await setCooldown(testHorse.id);
      
      // Retrieve horse from database
      const retrievedHorse = await getHorseById(testHorse.id);
      
      // Verify cooldown functions work with retrieved horse
      expect(canTrain(retrievedHorse)).toBe(false);
      expect(getCooldownTimeRemaining(retrievedHorse)).toBeGreaterThan(0);
    });
  });
}); 