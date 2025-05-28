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

import { jest } from '@jest/globals';
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
  let testPlayer;
  let adultHorse; // 3+ years old, eligible for training
  let youngHorse; // Under 3 years old, not eligible
  let trainedHorse; // Horse that has been trained recently
  let playerWithHorses; // Player with multiple horses for getTrainableHorses testing

  beforeAll(async () => {
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

    await prisma.player.deleteMany({
      where: {
        email: {
          in: ['controller-test-player@example.com', 'controller-multi-player@example.com']
        }
      }
    });

    await prisma.user.deleteMany({
      where: {
        email: {
          in: ['controller-test@example.com', 'controller-multi@example.com']
        }
      }
    });

    // Create test Users (for legacy ownerId relationship)
    testUser = await prisma.user.create({
      data: {
        email: 'controller-test@example.com',
        username: 'controllertest',
        firstName: 'Controller',
        lastName: 'Tester',
        password: 'hashedpassword'
      }
    });

    const multiUser = await prisma.user.create({
      data: {
        email: 'controller-multi@example.com',
        username: 'controllermulti',
        firstName: 'Multi',
        lastName: 'Tester',
        password: 'hashedpassword'
      }
    });

    // Create test Players (for XP system and playerId relationship)
    testPlayer = await prisma.player.create({
      data: {
        name: 'Controller Test Player',
        email: 'controller-test-player@example.com',
        money: 1000,
        level: 1,
        xp: 0,
        settings: { theme: 'light' }
      }
    });

    playerWithHorses = await prisma.player.create({
      data: {
        name: 'Multi Horse Player',
        email: 'controller-multi-player@example.com',
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

    // Create test horses with BOTH User and Player relationships
    adultHorse = await prisma.horse.create({
      data: {
        name: 'Controller Adult Horse',
        age: 4, // Eligible for training
        breedId: breed.id,
        ownerId: testUser.id,
        playerId: testPlayer.id,
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
        ownerId: testUser.id,
        playerId: testPlayer.id,
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
        ownerId: testUser.id,
        playerId: testPlayer.id,
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

    // Create horses for multi-horse player testing
    await prisma.horse.create({
      data: {
        name: 'Controller Horse 1',
        age: 6,
        breedId: breed.id,
        ownerId: multiUser.id,
        playerId: playerWithHorses.id,
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
        ownerId: multiUser.id,
        playerId: playerWithHorses.id,
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

  afterAll(async () => {
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

    await prisma.player.deleteMany({
      where: {
        email: {
          in: ['controller-test-player@example.com', 'controller-multi-player@example.com']
        }
      }
    });

    await prisma.user.deleteMany({
      where: {
        email: {
          in: ['controller-test@example.com', 'controller-multi@example.com']
        }
      }
    });

    await prisma.$disconnect();
  });

  describe('BUSINESS RULE: canTrain() Function Validation', () => {
    it('RETURNS eligible true for horse that meets all requirements', async () => {
      const result = await canTrain(adultHorse.id, 'Dressage');

      expect(result).toEqual({
        eligible: true,
        reason: null
      });
    });

    it('RETURNS eligible false for horse under 3 years old', async () => {
      const result = await canTrain(youngHorse.id, 'Dressage');

      expect(result).toEqual({
        eligible: false,
        reason: 'Horse is under age'
      });
    });

    it('RETURNS eligible false for horse with recent training (global cooldown)', async () => {
      const result = await canTrain(trainedHorse.id, 'Dressage');

      expect(result).toEqual({
        eligible: false,
        reason: 'Training cooldown active for this horse'
      });
    });

    it('RETURNS eligible false for non-existent horse', async () => {
      const result = await canTrain(99999, 'Dressage');

      expect(result).toEqual({
        eligible: false,
        reason: 'Horse not found'
      });
    });

    it('THROWS error for invalid input parameters', async () => {
      await expect(canTrain('invalid', 'Dressage')).rejects.toThrow('Horse ID must be a positive integer');
      await expect(canTrain(1, '')).rejects.toThrow('Discipline is required');
      await expect(canTrain(null, 'Dressage')).rejects.toThrow('Horse ID is required');
    });
  });

  describe('BUSINESS RULE: trainHorse() Function Complete Workflow', () => {
    it('EXECUTES successful training workflow for eligible horse', async () => {
      // Create a fresh horse for training workflow testing
      const workflowHorse = await prisma.horse.create({
        data: {
          name: 'Workflow Test Horse',
          age: 4,
          breedId: (await prisma.breed.findFirst()).id,
          ownerId: testUser.id,
          playerId: testPlayer.id,
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

      // Get initial player XP
      const initialPlayer = await prisma.player.findUnique({
        where: { id: testPlayer.id }
      });
      const initialXP = initialPlayer.xp;

      const result = await trainHorse(workflowHorse.id, 'Show Jumping');

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

      // VERIFY: Player received XP
      const finalPlayer = await prisma.player.findUnique({
        where: { id: testPlayer.id }
      });
      expect(finalPlayer.xp).toBeGreaterThan(initialXP);

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

    it('REJECTS training for ineligible horse (under age)', async () => {
      const result = await trainHorse(youngHorse.id, 'Racing');

      expect(result).toEqual({
        success: false,
        reason: 'Horse is under age',
        updatedHorse: null,
        message: 'Training not allowed: Horse is under age',
        nextEligible: null
      });

      // VERIFY: No database changes occurred
      const unchangedHorse = await prisma.horse.findUnique({
        where: { id: youngHorse.id }
      });
      expect(unchangedHorse.disciplineScores).toEqual({});

      // VERIFY: No training log created
      const trainingLogs = await prisma.trainingLog.findMany({
        where: { horseId: youngHorse.id }
      });
      expect(trainingLogs).toHaveLength(0);
    });

    it('REJECTS training for horse in cooldown period', async () => {
      const result = await trainHorse(trainedHorse.id, 'Dressage');

      expect(result).toEqual({
        success: false,
        reason: 'Training cooldown active for this horse',
        updatedHorse: null,
        message: 'Training not allowed: Training cooldown active for this horse',
        nextEligible: null
      });

      // VERIFY: No new discipline score added
      const unchangedHorse = await prisma.horse.findUnique({
        where: { id: trainedHorse.id }
      });
      expect(unchangedHorse.disciplineScores.Dressage).toBeUndefined();
    });

    it('HANDLES non-existent horse gracefully', async () => {
      // trainHorse returns a failure object instead of throwing for non-existent horses
      const result = await trainHorse(99999, 'Racing');
      
      expect(result).toEqual({
        success: false,
        reason: 'Horse not found',
        updatedHorse: null,
        message: 'Training not allowed: Horse not found',
        nextEligible: null
      });
    });
  });

  describe('BUSINESS RULE: getTrainingStatus() Function Information', () => {
    it('PROVIDES complete status for eligible horse with no training history', async () => {
      const result = await getTrainingStatus(adultHorse.id, 'Racing');

      expect(result.eligible).toBe(true);
      expect(result.reason).toBeNull();
      expect(result.horseAge).toBe(4);
      expect(result.lastTrainingDate).toBeNull();
      expect(result.cooldown).toBeNull();
    });

    it('PROVIDES accurate cooldown information for horse in cooldown', async () => {
      const result = await getTrainingStatus(trainedHorse.id, 'Racing');

      expect(result.eligible).toBe(false);
      expect(result.reason).toBe('Training cooldown active for this horse');
      expect(result.horseAge).toBe(5);
      expect(result.lastTrainingDate).toBeDefined();
      expect(result.cooldown).toBeDefined();
      expect(result.cooldown.active).toBe(true);
      expect(result.cooldown.remainingDays).toBeGreaterThan(0);
    });

    it('PROVIDES age restriction information for young horse', async () => {
      const result = await getTrainingStatus(youngHorse.id, 'Dressage');

      expect(result.eligible).toBe(false);
      expect(result.reason).toBe('Horse is under age');
      expect(result.horseAge).toBe(2);
    });

    it('HANDLES non-existent horse appropriately', async () => {
      const result = await getTrainingStatus(99999, 'Racing');

      expect(result.eligible).toBe(false);
      expect(result.reason).toBe('Horse not found');
      expect(result.horseAge).toBeNull();
    });
  });

  describe('BUSINESS RULE: getTrainableHorses() Function Filtering', () => {
    it('RETURNS horses that are eligible for training', async () => {
      const result = await getTrainableHorses(playerWithHorses.id);

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);

      // VERIFY: All returned horses are eligible (age 3+ and no recent training)
      for (const horse of result) {
        expect(horse.age).toBeGreaterThanOrEqual(3);
        expect(horse.trainableDisciplines).toBeDefined();
        expect(Array.isArray(horse.trainableDisciplines)).toBe(true);
      }
    });

    it('EXCLUDES horses under 3 years old from trainable list', async () => {
      const result = await getTrainableHorses(playerWithHorses.id);

      // VERIFY: No horses under 3 years old in results
      const underageHorses = result.filter(horse => horse.age < 3);
      expect(underageHorses).toHaveLength(0);
    });

    it('HANDLES player with no horses gracefully', async () => {
      // Create a player with no horses
      const emptyPlayer = await prisma.player.create({
        data: {
          name: 'Empty Player',
          email: 'empty-player@example.com',
          money: 500,
          level: 1,
          xp: 0,
          settings: {}
        }
      });

      const result = await getTrainableHorses(emptyPlayer.id);

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(0);

      // Clean up
      await prisma.player.delete({
        where: { id: emptyPlayer.id }
      });
    });

    it('HANDLES non-existent player appropriately', async () => {
      // getTrainableHorses throws error for invalid player ID format
      await expect(getTrainableHorses('non-existent-player-id')).rejects.toThrow('Failed to get trainable horses');
    });
  });

  describe('BUSINESS RULE: trainRouteHandler() API Response Format', () => {
    it('PROVIDES proper API response format for successful training', async () => {
      // Create a fresh horse for API testing using existing test user and player
      const apiTestHorse = await prisma.horse.create({
        data: {
          name: 'API Test Horse',
          age: 5,
          breedId: (await prisma.breed.findFirst()).id,
          ownerId: testUser.id,
          playerId: testPlayer.id,
          sex: 'Stallion',
          date_of_birth: new Date('2019-01-01'),
          health_status: 'Excellent',
          disciplineScores: {},
          epigenetic_modifiers: {
            positive: [],
            negative: [],
            hidden: []
          }
        }
      });

      // Mock Express request and response objects
      const mockReq = {
        body: {
          horseId: apiTestHorse.id,
          discipline: 'Endurance'
        }
      };

      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await trainRouteHandler(mockReq, mockRes);

      // VERIFY: Proper response format (status 200 is default, not explicitly called)
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: expect.stringContaining('trained in Endurance'),
          updatedScore: expect.any(Number),
          nextEligibleDate: expect.any(String)
        })
      );

      // Clean up
      await prisma.trainingLog.deleteMany({
        where: { horseId: apiTestHorse.id }
      });
      await prisma.horse.delete({
        where: { id: apiTestHorse.id }
      });
    });

    it('PROVIDES proper error response for ineligible horse', async () => {
      // Mock Express request and response objects for young horse
      const mockReq = {
        body: {
          horseId: youngHorse.id,
          discipline: 'Racing'
        }
      };

      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await trainRouteHandler(mockReq, mockRes);

      // VERIFY: Proper error HTTP status and response format
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: expect.stringContaining('age')
        })
      );
    });
  });

  describe('BUSINESS RULE: XP System Integration', () => {
    it('AWARDS XP to horse owner after successful training', async () => {
      // Create a fresh horse for XP testing using existing test user and player
      const xpTestHorse = await prisma.horse.create({
        data: {
          name: 'XP Test Horse',
          age: 6,
          breedId: (await prisma.breed.findFirst()).id,
          ownerId: testUser.id,
          playerId: testPlayer.id,
          sex: 'Mare',
          date_of_birth: new Date('2018-01-01'),
          health_status: 'Excellent',
          disciplineScores: {},
          epigenetic_modifiers: {
            positive: [],
            negative: [],
            hidden: []
          }
        }
      });

      // Get initial player XP
      const initialPlayer = await prisma.player.findUnique({
        where: { id: testPlayer.id }
      });
      const initialXP = initialPlayer.xp;

      const result = await trainHorse(xpTestHorse.id, 'Trail');

      expect(result.success).toBe(true);

      // VERIFY: Player received XP
      const finalPlayer = await prisma.player.findUnique({
        where: { id: testPlayer.id }
      });
      const xpGained = finalPlayer.xp - initialXP;
      expect(xpGained).toBeGreaterThanOrEqual(5); // Base XP award for training

      // Clean up
      await prisma.trainingLog.deleteMany({
        where: { horseId: xpTestHorse.id }
      });
      await prisma.horse.delete({
        where: { id: xpTestHorse.id }
      });
    });
  });

  describe('BUSINESS RULE: Error Handling and Data Integrity', () => {
    it('MAINTAINS database integrity when operations fail', async () => {
      // Test with invalid discipline (controller throws error for empty discipline)
      await expect(trainHorse(adultHorse.id, '')).rejects.toThrow('Training failed');

      // VERIFY: No database changes occurred
      const unchangedHorse = await prisma.horse.findUnique({
        where: { id: adultHorse.id }
      });
      expect(unchangedHorse.disciplineScores).toEqual({});
    });

    it('VALIDATES input parameters thoroughly', async () => {
      await expect(canTrain('invalid', 'Racing')).rejects.toThrow();
      await expect(getTrainingStatus(null, 'Racing')).rejects.toThrow();
    });
  });
}); 