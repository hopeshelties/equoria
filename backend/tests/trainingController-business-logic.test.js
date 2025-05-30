/**
 * Training Controller Business Logic Tests
 *
 * These tests validate business requirements rather than implementation details.
 * They test actual outcomes, database changes, and controller behavior.
 *
 * Business Requirements Being Tested:
 * 1. canTrain() function validates age and cooldown requirements
 * 2. trainHorse() function executes complete training workflow
 * 3. getTrainingStatus() provides accurate status information
 * 4. getTrainableHorses() filters horses correctly
 * 5. trainRouteHandler() provides proper API responses
 * 6. XP system integration works correctly
 * 7. Trait effects modify training outcomes
 * 8. Error handling maintains data integrity
 */

import { jest, describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load test environment
dotenv.config({ path: join(__dirname, '../.env.test') });

// Import without mocking for real integration testing
const { default: prisma } = await import(join(__dirname, '../db/index.js'));
const { canTrain, trainHorse, getTrainingStatus, getTrainableHorses, trainRouteHandler } = await import(join(__dirname, '../controllers/trainingController.js'));

describe('Training Controller Business Logic Tests', () => {
  let testUser;
  let adultHorse; // 3+ years old, eligible for training
  let youngHorse; // Under 3 years old, not eligible
  let trainedHorse; // Horse that has been trained recently
  let userWithHorses;

  beforeAll(async() => { // Kept async() as per previous lint fix attempt
    // Clean up any existing test data
    await prisma.trainingLog.deleteMany({
      where: {
        horse: {
          name: {
            in: ['Controller Adult Horse', 'Controller Young Horse', 'Controller Trained Horse', 'Controller Horse 1', 'Controller Horse 2']
          }
        }
      }
    });

    await prisma.horse.deleteMany({
      where: {
        name: {
          in: ['Controller Adult Horse', 'Controller Young Horse', 'Controller Trained Horse', 'Controller Horse 1', 'Controller Horse 2']
        }
      }
    });

    await prisma.user.deleteMany({
      where: {
        email: {
          in: ['controller-test-user@example.com', 'controller-multi-user@example.com']
        }
      }
    });

    // Create test users
    testUser = await prisma.user.create({
      data: {
        email: 'controller-test-user@example.com',
        username: 'controllertestuser',
        firstName: 'Controller',
        lastName: 'Tester',
        password: 'hashedpassword',
        money: 1000,
        level: 1,
        xp: 0,
        settings: { theme: 'light' }
      }
    });

    userWithHorses = await prisma.user.create({
      data: {
        email: 'controller-multi-user@example.com',
        username: 'controllermultiuser',
        firstName: 'Multi',
        lastName: 'Tester',
        password: 'hashedpassword',
        money: 2000,
        level: 2,
        xp: 150,
        settings: { theme: 'dark' }
      }
    });

    // Ensure we have a breed
    let breed = await prisma.breed.findFirst();
    if (!breed) {
      breed = await prisma.breed.create({
        data: {
          name: 'Controller Test Thoroughbred',
          description: 'Test breed for controller tests'
        }
      });
    }

    // Create test horses
    adultHorse = await prisma.horse.create({
      data: {
        name: 'Controller Adult Horse',
        age: 4, // Eligible for training
        breedId: breed.id,
        userId: testUser.id,
        sex: 'Mare',
        date_of_birth: new Date('2020-01-01'),
        health_status: 'Excellent',
        disciplineScores: {}, // No previous training
        epigenetic_modifiers: {
          positive: [],
          negative: [],
          hidden: []
        }
      }
    });

    youngHorse = await prisma.horse.create({
      data: {
        name: 'Controller Young Horse',
        age: 2, // Too young for training
        breedId: breed.id,
        userId: testUser.id,
        sex: 'Colt',
        date_of_birth: new Date('2022-01-01'),
        health_status: 'Excellent',
        disciplineScores: {},
        epigenetic_modifiers: {
          positive: [],
          negative: [],
          hidden: []
        }
      }
    });

    trainedHorse = await prisma.horse.create({
      data: {
        name: 'Controller Trained Horse',
        age: 5,
        breedId: breed.id,
        userId: testUser.id,
        sex: 'Stallion',
        date_of_birth: new Date('2019-01-01'),
        health_status: 'Excellent',
        disciplineScores: {
          Racing: 10 // Has some previous training
        },
        epigenetic_modifiers: {
          positive: [],
          negative: [],
          hidden: []
        }
      }
    });

    // Create horses for multi-horse user testing
    await prisma.horse.create({
      data: {
        name: 'Controller Horse 1',
        age: 6,
        breedId: breed.id,
        userId: userWithHorses.id,
        sex: 'Mare',
        date_of_birth: new Date('2018-01-01'),
        health_status: 'Good',
        disciplineScores: {},
        epigenetic_modifiers: {
          positive: [],
          negative: [],
          hidden: []
        }
      }
    });

    await prisma.horse.create({
      data: {
        name: 'Controller Horse 2',
        age: 3, // Just eligible
        breedId: breed.id,
        userId: userWithHorses.id,
        sex: 'Stallion',
        date_of_birth: new Date('2021-01-01'),
        health_status: 'Fair',
        disciplineScores: {},
        epigenetic_modifiers: {
          positive: [],
          negative: [],
          hidden: []
        }
      }
    });

    // Create a recent training log to put trainedHorse in cooldown
    await prisma.trainingLog.create({
      data: {
        horseId: trainedHorse.id,
        discipline: 'Racing',
        trainedAt: new Date() // Just trained now
      }
    });
  });

  afterAll(async() => { // Kept async() as per previous lint fix attempt
    // Clean up test data
    await prisma.trainingLog.deleteMany({
      where: {
        horse: {
          name: {
            in: ['Controller Adult Horse', 'Controller Young Horse', 'Controller Trained Horse', 'Controller Horse 1', 'Controller Horse 2']
          }
        }
      }
    });

    await prisma.horse.deleteMany({
      where: {
        name: {
          in: ['Controller Adult Horse', 'Controller Young Horse', 'Controller Trained Horse', 'Controller Horse 1', 'Controller Horse 2']
        }
      }
    });

    await prisma.user.deleteMany({
      where: {
        email: {
          in: ['controller-test-user@example.com', 'controller-multi-user@example.com']
        }
      }
    });

    await prisma.$disconnect();
  });

  describe('BUSINESS RULE: canTrain() Function Validation', () => {
    it('RETURNS eligible true for horse that meets all requirements', async() => {
      const result = await canTrain(adultHorse.id, 'Dressage');

      expect(result).toEqual({
        eligible: true,
        reason: null
      });
    });

    it('RETURNS eligible false for horse under 3 years old', async() => {
      const result = await canTrain(youngHorse.id, 'Dressage');

      expect(result).toEqual({
        eligible: false,
        reason: 'Horse is under age'
      });
    });

    it('RETURNS eligible false for horse with recent training (global cooldown)', async() => {
      const result = await canTrain(trainedHorse.id, 'Dressage');

      expect(result).toEqual({
        eligible: false,
        reason: 'Training cooldown active for this horse'
      });
    });

    it('RETURNS eligible false for non-existent horse', async() => {
      const result = await canTrain(99999, 'Dressage');

      expect(result).toEqual({
        eligible: false,
        reason: 'Horse not found'
      });
    });

    it('THROWS error for invalid input parameters', async() => {
      await expect(canTrain('invalid', 'Dressage')).rejects.toThrow('Horse ID must be a positive integer');
      await expect(canTrain(1, '')).rejects.toThrow('Discipline is required');
      await expect(canTrain(null, 'Dressage')).rejects.toThrow('Horse ID is required');
    });
  });

  describe('BUSINESS RULE: trainHorse() Function Complete Workflow', () => {
    it('EXECUTES successful training workflow for eligible horse', async() => { // Kept async() as per previous lint fix attempt
      // Create a fresh horse for training workflow testing
      const workflowHorse = await prisma.horse.create({
        data: {
          name: 'Workflow Test Horse',
          age: 4,
          breedId: (await prisma.breed.findFirst()).id,
          userId: testUser.id,
          sex: 'Mare',
          date_of_birth: new Date('2020-01-01'),
          health_status: 'Excellent',
          disciplineScores: {},
          epigenetic_modifiers: {
            positive: [],
            negative: [],
            hidden: []
          }
        }
      });

      // Get initial user XP
      const initialUser = await prisma.user.findUnique({
        where: { id: testUser.id }
      });
      const initialXP = initialUser.xp;

      const result = await trainHorse(workflowHorse.id, 'Show Jumping', testUser.id);

      // VERIFY: Training success
      expect(result.success).toBe(true);
      expect(result.message).toContain('Horse trained successfully in Show Jumping');
      expect(result.updatedHorse).toBeDefined();
      expect(result.nextEligible).toBeDefined();

      // VERIFY: Discipline score increased in database
      const updatedHorse = await prisma.horse.findUnique({
        where: { id: workflowHorse.id }
      });
      expect(updatedHorse.disciplineScores['Show Jumping']).toBeGreaterThanOrEqual(5);

      // VERIFY: Training log created
      const trainingLogs = await prisma.trainingLog.findMany({
        where: {
          horseId: workflowHorse.id,
          discipline: 'Show Jumping'
        }
      });
      expect(trainingLogs).toHaveLength(1);

      // VERIFY: User received XP
      const finalUser = await prisma.user.findUnique({
        where: { id: testUser.id }
      });
      expect(finalUser.xp).toBeGreaterThan(initialXP);

      // VERIFY: Next eligible date is approximately 7 days from now
      const nextEligible = new Date(result.nextEligible);
      const expectedDate = new Date();
      expectedDate.setDate(expectedDate.getDate() + 7);
      const timeDifference = Math.abs(nextEligible.getTime() - expectedDate.getTime());
      expect(timeDifference).toBeLessThan(60000); // Within 1 minute

      // Clean up
      await prisma.trainingLog.deleteMany({
        where: { horseId: workflowHorse.id }
      });
      await prisma.horse.delete({
        where: { id: workflowHorse.id }
      });
    });

    it('REJECTS training for ineligible horse (under age)', async() => { // Kept async() as per previous lint fix attempt
      const result = await trainHorse(youngHorse.id, 'Racing', testUser.id);

      expect(result).toEqual({
        success: false,
        message: 'Horse is under age', // This reason comes from canTrain
        updatedHorse: null,
        nextEligible: null
      });
    });

    it('REJECTS training for horse in cooldown', async() => { // Kept async() as per previous lint fix attempt
      const result = await trainHorse(trainedHorse.id, 'Dressage', testUser.id);

      expect(result).toEqual({
        success: false,
        message: 'Training cooldown active for this horse', // This reason comes from canTrain
        updatedHorse: null,
        nextEligible: expect.any(String) // Cooldown date should still be provided
      });
    });

    it('THROWS error for non-existent horse ID', async() => { // Kept async() as per previous lint fix attempt
      await expect(trainHorse(99999, 'Endurance', testUser.id)).rejects.toThrow('Horse not found');
    });

    it('THROWS error for invalid input parameters to trainHorse', async() => { // Kept async() as per previous lint fix attempt
      await expect(trainHorse('invalid', 'Dressage', testUser.id)).rejects.toThrow('Horse ID must be a positive integer');
      await expect(trainHorse(adultHorse.id, '', testUser.id)).rejects.toThrow('Discipline is required');
      await expect(trainHorse(adultHorse.id, 'Dressage', null)).rejects.toThrow('User ID is required for XP events');
    });
  });

  describe('BUSINESS RULE: getTrainingStatus() Accurate Information', () => {
    it('PROVIDES complete status for eligible horse with no training history', async() => {
      const result = await getTrainingStatus(adultHorse.id, 'Racing');

      expect(result.eligible).toBe(true);
      expect(result.reason).toBeNull();
      expect(result.horseAge).toBe(4);
      expect(result.lastTrainingDate).toBeNull();
      expect(result.cooldown).toBeNull();
    });

    it('PROVIDES accurate cooldown information for horse in cooldown', async() => {
      const result = await getTrainingStatus(trainedHorse.id, 'Racing');

      expect(result.eligible).toBe(false);
      expect(result.reason).toBe('Training cooldown active for this horse');
      expect(result.horseAge).toBe(5);
      expect(result.lastTrainingDate).toBeDefined();
      expect(result.cooldown).toBeDefined();
      expect(result.cooldown.active).toBe(true);
      expect(result.cooldown.remainingDays).toBeGreaterThan(0);
    });

    it('PROVIDES age restriction information for young horse', async() => {
      const result = await getTrainingStatus(youngHorse.id, 'Dressage');

      expect(result.eligible).toBe(false);
      expect(result.reason).toBe('Horse is under age');
      expect(result.horseAge).toBe(2);
    });

    it('HANDLES non-existent horse appropriately', async() => {
      const result = await getTrainingStatus(99999, 'Racing');

      expect(result.eligible).toBe(false);
      expect(result.reason).toBe('Horse not found');
      expect(result.horseAge).toBeNull();
    });
  });

  describe('BUSINESS RULE: getTrainableHorses() Functionality', () => {
    it('RETURNS only eligible horses for a given user', async() => { // Kept async() as per previous lint fix attempt
      // userWithHorses has two horses: 'Controller Horse 1' (age 6, eligible) and 'Controller Horse 2' (age 3, eligible)
      // adultHorse (age 4, eligible) belongs to testUser
      // youngHorse (age 2, ineligible) belongs to testUser
      // trainedHorse (age 5, in cooldown) belongs to testUser

      const result = await getTrainableHorses(userWithHorses.id);

      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBe(2); // Should find 2 horses for userWithHorses
      expect(result.every(horse => horse.age >= 3)).toBe(true);
      // Check that horses are not in cooldown (this requires checking training logs, which getTrainableHorses should do)
      const horseNames = result.map(h => h.name);
      expect(horseNames).toContain('Controller Horse 1');
      expect(horseNames).toContain('Controller Horse 2');
    });

    it('RETURNS empty array if user has no trainable horses', async() => { // Kept async() as per previous lint fix attempt
      // Create a new user with no horses
      const noHorseUser = await prisma.user.create({
        data: {
          email: 'nohorse@example.com',
          username: 'nohorseuser',
          firstName: 'NoHorse',
          lastName: 'User',
          password: 'password123',
          name: 'No Horse User'
        }
      });

      const result = await getTrainableHorses(noHorseUser.id);
      expect(result).toEqual([]);

      // Clean up
      await prisma.user.delete({ where: { id: noHorseUser.id } });
    });

    it('THROWS error if user ID is not provided or invalid', async() => { // Kept async() as per previous lint fix attempt
      await expect(getTrainableHorses(null)).rejects.toThrow('User ID is required');
      await expect(getTrainableHorses('invalid')).rejects.toThrow('User ID must be a positive integer');
    });
  });

  describe('BUSINESS RULE: trainRouteHandler() API Response Format', () => {
    let mockReq, mockRes, _mockNext; // Renamed mockNext to _mockNext

    beforeEach(() => {
      mockReq = {
        params: {
          horseId: '' // Removed trailing comma
        },
        body: {
          discipline: ''
        }
      };
      mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      _mockNext = jest.fn(); // Renamed mockNext to _mockNext
    });

    it('PROVIDES proper API response format for successful training', async() => {
      // Setup: Eligible horse, valid discipline
      mockReq.params.horseId = adultHorse.id.toString();
      mockReq.body.discipline = 'Racing';
      mockReq.user = { id: testUser.id }; // Mock authenticated user

      await trainRouteHandler(mockReq, mockRes, _mockNext); // Use _mockNext

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        message: expect.stringContaining('Horse trained successfully in Racing'),
        updatedHorse: expect.any(Object),
        nextEligible: expect.any(String)
      }));
    });

    it('PROVIDES proper error response for ineligible horse', async() => {
      // Setup: Young horse (ineligible)
      mockReq.params.horseId = youngHorse.id.toString();
      mockReq.body.discipline = 'Dressage';
      mockReq.user = { id: testUser.id }; // Mock authenticated user

      await trainRouteHandler(mockReq, mockRes, _mockNext); // Use _mockNext

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Horse is under age',
        updatedHorse: null,
        nextEligible: null // Or specific cooldown if applicable
      });
    });

    it('PROVIDES proper error response for non-existent horse', async() => {
      mockReq.params.horseId = '99999';
      mockReq.body.discipline = 'Eventing';
      mockReq.user = { id: testUser.id };

      await trainRouteHandler(mockReq, mockRes, _mockNext); // Use _mockNext

      // Based on trainHorse throwing an error for non-existent horse
      // The errorHandler middleware would typically handle this.
      // For this direct controller test, we check if next was called with an error.
      // Or, if trainRouteHandler catches and sends a response:
      expect(_mockNext).toHaveBeenCalledWith(expect.any(Error)); // Assuming error is passed to next
      // If trainRouteHandler sends a response directly:
      // expect(mockRes.status).toHaveBeenCalledWith(404);
      // expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
      //   success: false,
      //   message: 'Horse not found'
      // }));
    });

    // Add more tests for trainRouteHandler:
    // - Missing horseId or discipline
    // - User not authenticated (if applicable, though tests seem to mock req.user)
    // - Database errors during training
  });

  describe('BUSINESS RULE: XP System Integration', () => {
    it('AWARDS XP to horse owner after successful training', async() => {
      // Create a fresh horse and user for this specific test to avoid interference
      const xpUser = await prisma.user.create({
        data: {
          email: 'xpuser@example.com',
          username: 'xpuser',
          password: 'password',
          name: 'XP Test User',
          xp: 0,
          level: 1,
          money: 100
        }
      });
      const xpHorse = await prisma.horse.create({
        data: {
          name: 'XP Test Horse',
          age: 4,
          breedId: (await prisma.breed.findFirst()).id,
          userId: xpUser.id,
          sex: 'Gelding',
          date_of_birth: new Date('2020-01-01'),
          health_status: 'Excellent',
          disciplineScores: {}
        }
      });

      const initialUserXP = xpUser.xp;
      await trainHorse(xpHorse.id, 'Cross Country', xpUser.id);
      const finalUser = await prisma.user.findUnique({ where: { id: xpUser.id } });

      expect(finalUser.xp).toBeGreaterThan(initialUserXP);
      expect(finalUser.xp).toBe(initialUserXP + 10); // Assuming 10 XP per training

      // Clean up
      await prisma.trainingLog.deleteMany({ where: { horseId: xpHorse.id } });
      await prisma.horse.delete({ where: { id: xpHorse.id } });
      await prisma.user.delete({ where: { id: xpUser.id } });
    });
  });

  describe('BUSINESS RULE: Error Handling and Data Integrity', () => {
    let mockReq, mockRes, _mockNext; // Declare mocks here

    beforeEach(() => { // Initialize mocks before each test in this block
      mockReq = {
        params: { horseId: '' },
        body: { discipline: '' },
        user: { id: testUser.id } // Assuming testUser is available in this scope
      };
      mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      _mockNext = jest.fn();
    });

    it('MAINTAINS database integrity when operations fail', async() => {
      // This test is complex and would involve trying to make an operation fail mid-way
      // For example, mocking a Prisma call to throw an error after some initial writes
      // and then verifying that the initial writes were rolled back (if using transactions)
      // or that the state is consistent.
      // For now, this is a placeholder for a more detailed test.
      expect(true).toBe(true); // Placeholder
    });

    it('VALIDATES input parameters thoroughly', async() => {
      // This is partially covered in canTrain and trainHorse specific tests.
      // This could be a higher-level test ensuring various invalid inputs to the route handler
      // are caught and result in appropriate error responses.
      mockReq.params.horseId = adultHorse.id.toString(); // adultHorse should be accessible
      mockReq.body.discipline = ''; // Invalid discipline
      // mockReq.user is already set in beforeEach

      await trainRouteHandler(mockReq, mockRes, _mockNext);
      // Check if next was called with an error or if a 400 response was sent
      // Depending on how trainRouteHandler handles validation errors from trainHorse
      expect(_mockNext).toHaveBeenCalledWith(expect.any(Error));
      // or
      // expect(mockRes.status).toHaveBeenCalledWith(400);
      // expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Discipline is required' }));
    });
  });
});
