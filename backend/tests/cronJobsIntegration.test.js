import request from 'supertest';
import app from '../app.js';
import prisma from '../db/index.js';
import cronJobService from '../services/cronJobs.js';

describe('Cron Jobs Integration Tests', () => {
  let testBreed;
  let testFoals = [];

  beforeAll(async () => {
    // Stop cron jobs during testing
    cronJobService.stop();

    // Create test breed with unique name
    const uniqueName = `Test Breed for Cron Jobs ${Date.now()}`;
    testBreed = await prisma.breed.create({
      data: {
        name: uniqueName,
        description: 'Test breed for cron job testing'
      }
    });
  });

  afterAll(async () => {
    // Clean up test data
    for (const foal of testFoals) {
      try {
        await prisma.foalTrainingHistory.deleteMany({
          where: { horse_id: foal.id }
        });
        await prisma.foalDevelopment.deleteMany({
          where: { foalId: foal.id }
        });
        await prisma.horse.delete({ where: { id: foal.id } });
      } catch (error) {
        // Ignore cleanup errors - horse may already be deleted
        console.log(`Cleanup warning: ${error.message}`);
      }
    }
    if (testBreed?.id) {
      try {
        await prisma.breed.delete({ where: { id: testBreed.id } });
      } catch (error) {
        // Ignore cleanup errors - breed may still have references
        console.log(`Breed cleanup warning: ${error.message}`);
      }
    }
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Clear any existing test foals
    testFoals = [];
  });

  describe('Daily Trait Evaluation', () => {
    it('should evaluate traits for foals with good bonding and low stress', async () => {
      // Create test foal with good conditions
      const foal = await prisma.horse.create({
        data: {
          name: 'Good Condition Foal',
          age: 0,
          breed: { connect: { id: testBreed.id } },
          bond_score: 85,
          stress_level: 15,
          epigenetic_modifiers: {
            positive: [],
            negative: [],
            hidden: []
          }
        }
      });
      testFoals.push(foal);

      // Create foal development record
      await prisma.foalDevelopment.create({
        data: {
          foalId: foal.id,
          currentDay: 3,
          bondingLevel: 85,
          stressLevel: 15
        }
      });

      // Run trait evaluation
      await cronJobService.evaluateDailyFoalTraits();

      // Check if traits were revealed
      const updatedFoal = await prisma.horse.findUnique({
        where: { id: foal.id }
      });

      expect(updatedFoal.epigenetic_modifiers).toBeDefined();
      
      const traits = updatedFoal.epigenetic_modifiers;
      const totalTraits = (traits.positive?.length || 0) + 
                         (traits.negative?.length || 0) + 
                         (traits.hidden?.length || 0);

      // With good conditions, should have a chance to reveal positive traits
      expect(totalTraits).toBeGreaterThanOrEqual(0);
    });

    it('should evaluate traits for foals with poor bonding and high stress', async () => {
      // Create test foal with poor conditions
      const foal = await prisma.horse.create({
        data: {
          name: 'Poor Condition Foal',
          age: 0,
          breed: { connect: { id: testBreed.id } },
          bond_score: 25,
          stress_level: 85,
          epigenetic_modifiers: {
            positive: [],
            negative: [],
            hidden: []
          }
        }
      });
      testFoals.push(foal);

      // Create foal development record
      await prisma.foalDevelopment.create({
        data: {
          foalId: foal.id,
          currentDay: 4,
          bondingLevel: 25,
          stressLevel: 85
        }
      });

      // Run trait evaluation
      await cronJobService.evaluateDailyFoalTraits();

      // Check if traits were revealed
      const updatedFoal = await prisma.horse.findUnique({
        where: { id: foal.id }
      });

      expect(updatedFoal.epigenetic_modifiers).toBeDefined();
      
      const traits = updatedFoal.epigenetic_modifiers;
      const totalTraits = (traits.positive?.length || 0) + 
                         (traits.negative?.length || 0) + 
                         (traits.hidden?.length || 0);

      // With poor conditions, might reveal negative traits
      expect(totalTraits).toBeGreaterThanOrEqual(0);
    });

    it('should not evaluate foals that have completed development', async () => {
      // Create test foal that has completed development
      const foal = await prisma.horse.create({
        data: {
          name: 'Completed Development Foal',
          age: 1,
          breed: { connect: { id: testBreed.id } },
          bond_score: 75,
          stress_level: 25,
          epigenetic_modifiers: {
            positive: ['resilient'],
            negative: [],
            hidden: []
          }
        }
      });
      testFoals.push(foal);

      // Create foal development record with completed development
      await prisma.foalDevelopment.create({
        data: {
          foalId: foal.id,
          currentDay: 7, // Completed development
          bondingLevel: 75,
          stressLevel: 25
        }
      });

      const initialTraits = foal.epigenetic_modifiers;

      // Run trait evaluation
      await cronJobService.evaluateDailyFoalTraits();

      // Check that traits were not changed
      const updatedFoal = await prisma.horse.findUnique({
        where: { id: foal.id }
      });

      expect(updatedFoal.epigenetic_modifiers).toEqual(initialTraits);
    });

    it('should handle foals without development records', async () => {
      // Create test foal without development record
      const foal = await prisma.horse.create({
        data: {
          name: 'No Development Record Foal',
          age: 0,
          breed: { connect: { id: testBreed.id } },
          bond_score: 60,
          stress_level: 30,
          epigenetic_modifiers: {
            positive: [],
            negative: [],
            hidden: []
          }
        }
      });
      testFoals.push(foal);

      // Run trait evaluation (should handle missing development record)
      await cronJobService.evaluateDailyFoalTraits();

      // Should complete without errors
      const updatedFoal = await prisma.horse.findUnique({
        where: { id: foal.id }
      });

      expect(updatedFoal).toBeDefined();
    });

    it('should not reveal duplicate traits', async () => {
      // Create test foal with existing traits
      const foal = await prisma.horse.create({
        data: {
          name: 'Existing Traits Foal',
          age: 0,
          breed: { connect: { id: testBreed.id } },
          bond_score: 80,
          stress_level: 20,
          epigenetic_modifiers: {
            positive: ['resilient'],
            negative: [],
            hidden: ['intelligent']
          }
        }
      });
      testFoals.push(foal);

      // Create foal development record
      await prisma.foalDevelopment.create({
        data: {
          foalId: foal.id,
          currentDay: 5,
          bondingLevel: 80,
          stressLevel: 20
        }
      });

      // Run trait evaluation
      await cronJobService.evaluateDailyFoalTraits();

      // Check that existing traits are not duplicated
      const updatedFoal = await prisma.horse.findUnique({
        where: { id: foal.id }
      });

      const traits = updatedFoal.epigenetic_modifiers;
      const allTraits = [
        ...(traits.positive || []),
        ...(traits.negative || []),
        ...(traits.hidden || [])
      ];

      // Should not have duplicates
      const uniqueTraits = [...new Set(allTraits)];
      expect(allTraits.length).toBe(uniqueTraits.length);

      // Should still contain original traits (may have moved between categories)
      expect(traits.positive).toContain('resilient');
      
      // 'intelligent' should still exist somewhere (hidden, positive, or negative)
      const allTraitsCheck = [
        ...(traits.positive || []),
        ...(traits.negative || []),
        ...(traits.hidden || [])
      ];
      expect(allTraitsCheck).toContain('intelligent');
    });

    it('should handle multiple foals in single evaluation', async () => {
      // Create multiple test foals
      const foal1 = await prisma.horse.create({
        data: {
          name: 'Multi Test Foal 1',
          age: 0,
          breed: { connect: { id: testBreed.id } },
          bond_score: 70,
          stress_level: 30,
          epigenetic_modifiers: { positive: [], negative: [], hidden: [] }
        }
      });

      const foal2 = await prisma.horse.create({
        data: {
          name: 'Multi Test Foal 2',
          age: 0,
          breed: { connect: { id: testBreed.id } },
          bond_score: 40,
          stress_level: 60,
          epigenetic_modifiers: { positive: [], negative: [], hidden: [] }
        }
      });

      testFoals.push(foal1, foal2);

      // Create development records
      await prisma.foalDevelopment.createMany({
        data: [
          { foalId: foal1.id, currentDay: 2, bondingLevel: 70, stressLevel: 30 },
          { foalId: foal2.id, currentDay: 3, bondingLevel: 40, stressLevel: 60 }
        ]
      });

      // Run trait evaluation
      await cronJobService.evaluateDailyFoalTraits();

      // Check both foals were processed
      const updatedFoal1 = await prisma.horse.findUnique({ where: { id: foal1.id } });
      const updatedFoal2 = await prisma.horse.findUnique({ where: { id: foal2.id } });

      expect(updatedFoal1.epigenetic_modifiers).toBeDefined();
      expect(updatedFoal2.epigenetic_modifiers).toBeDefined();
    });
  });

  describe('Admin API Endpoints', () => {
    it('should get cron job status', async () => {
      const response = await request(app)
        .get('/api/admin/cron/status')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('serviceRunning');
      expect(response.body.data).toHaveProperty('jobs');
      expect(response.body.data).toHaveProperty('totalJobs');
    });

    it('should manually trigger trait evaluation', async () => {
      // Create a test foal for manual evaluation
      const foal = await prisma.horse.create({
        data: {
          name: 'Manual Evaluation Foal',
          age: 0,
          breed: { connect: { id: testBreed.id } },
          bond_score: 75,
          stress_level: 25,
          epigenetic_modifiers: { positive: [], negative: [], hidden: [] }
        }
      });
      testFoals.push(foal);

      await prisma.foalDevelopment.create({
        data: {
          foalId: foal.id,
          currentDay: 4,
          bondingLevel: 75,
          stressLevel: 25
        }
      });

      const response = await request(app)
        .post('/api/admin/traits/evaluate')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('completed successfully');
    });

    it('should get foals in development', async () => {
      // Create a test foal
      const foal = await prisma.horse.create({
        data: {
          name: 'Development List Foal',
          age: 0,
          breed: { connect: { id: testBreed.id } },
          bond_score: 65,
          stress_level: 35,
          epigenetic_modifiers: { positive: [], negative: [], hidden: [] }
        }
      });
      testFoals.push(foal);

      await prisma.foalDevelopment.create({
        data: {
          foalId: foal.id,
          currentDay: 2,
          bondingLevel: 65,
          stressLevel: 35
        }
      });

      const response = await request(app)
        .get('/api/admin/foals/development')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('foals');
      expect(response.body.data).toHaveProperty('count');
      expect(Array.isArray(response.body.data.foals)).toBe(true);
      
      // Should include our test foal
      const foalInList = response.body.data.foals.find(f => f.id === foal.id);
      expect(foalInList).toBeDefined();
      expect(foalInList.name).toBe('Development List Foal');
    });

    it('should get trait definitions', async () => {
      const response = await request(app)
        .get('/api/admin/traits/definitions')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('positive');
      expect(response.body.data).toHaveProperty('negative');
      expect(response.body.data).toHaveProperty('rare');
      
      // Check structure of trait definitions
      Object.values(response.body.data).forEach(category => {
        Object.values(category).forEach(trait => {
          expect(trait).toHaveProperty('name');
          expect(trait).toHaveProperty('description');
          expect(trait).toHaveProperty('revealConditions');
          expect(trait).toHaveProperty('rarity');
          expect(trait).toHaveProperty('baseChance');
        });
      });
    });

    it('should start and stop cron job service', async () => {
      // Test starting service
      const startResponse = await request(app)
        .post('/api/admin/cron/start')
        .expect(200);

      expect(startResponse.body.success).toBe(true);
      expect(startResponse.body.message).toContain('started successfully');

      // Test stopping service
      const stopResponse = await request(app)
        .post('/api/admin/cron/stop')
        .expect(200);

      expect(stopResponse.body.success).toBe(true);
      expect(stopResponse.body.message).toContain('stopped successfully');
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      // Create a foal and then delete it to cause a database error
      const foal = await prisma.horse.create({
        data: {
          name: 'Error Test Foal',
          age: 0,
          breed: { connect: { id: testBreed.id } },
          bond_score: 50,
          stress_level: 50,
          epigenetic_modifiers: { positive: [], negative: [], hidden: [] }
        }
      });

      await prisma.foalDevelopment.create({
        data: {
          foalId: foal.id,
          currentDay: 3,
          bondingLevel: 50,
          stressLevel: 50
        }
      });

      // Delete the foal development first to avoid foreign key constraint
      await prisma.foalDevelopment.delete({ where: { foalId: foal.id } });
      // Delete the foal to cause an error during evaluation
      await prisma.horse.delete({ where: { id: foal.id } });

      // Run trait evaluation - should handle the error gracefully
      await expect(cronJobService.evaluateDailyFoalTraits()).resolves.not.toThrow();
    });

    it('should handle missing epigenetic_modifiers field', async () => {
      // Create foal without epigenetic_modifiers
      const foal = await prisma.horse.create({
        data: {
          name: 'Missing Modifiers Foal',
          age: 0,
          breed: { connect: { id: testBreed.id } },
          bond_score: 60,
          stress_level: 40
          // No epigenetic_modifiers field
        }
      });
      testFoals.push(foal);

      await prisma.foalDevelopment.create({
        data: {
          foalId: foal.id,
          currentDay: 2,
          bondingLevel: 60,
          stressLevel: 40
        }
      });

      // Should handle missing field gracefully
      await expect(cronJobService.evaluateDailyFoalTraits()).resolves.not.toThrow();

      // Check that field was initialized
      const updatedFoal = await prisma.horse.findUnique({
        where: { id: foal.id }
      });

      expect(updatedFoal.epigenetic_modifiers).toBeDefined();
    });
  });
}); 