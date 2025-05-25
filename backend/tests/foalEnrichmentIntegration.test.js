import request from 'supertest';
import app from '../app.js';
import prisma from '../db/index.js';

describe('Foal Enrichment API Integration Tests', () => {
  let testFoal;
  let testBreed;

  beforeAll(async () => {
    // Try to find existing breed or create a unique one
    const uniqueBreedName = `Test Breed for Enrichment ${Date.now()}`;
    testBreed = await prisma.breed.create({
      data: {
        name: uniqueBreedName,
        description: 'Test breed for foal enrichment testing'
      }
    });

    // Create test foal
    testFoal = await prisma.horse.create({
      data: {
        name: `Test Enrichment Foal ${Date.now()}`,
        age: 0,
        breedId: testBreed.id,
        bond_score: 50,
        stress_level: 20
      }
    });
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.foalTrainingHistory.deleteMany({
      where: { horse_id: testFoal.id }
    });
    await prisma.horse.delete({ where: { id: testFoal.id } });
    await prisma.breed.delete({ where: { id: testBreed.id } });
    await prisma.$disconnect();
  });

  describe('POST /api/foals/:foalId/enrichment', () => {
    it('should complete enrichment activity successfully', async () => {
      const response = await request(app)
        .post(`/api/foals/${testFoal.id}/enrichment`)
        .send({
          day: 3,
          activity: 'Trailer Exposure'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Trailer Exposure');
      expect(response.body.data).toHaveProperty('foal');
      expect(response.body.data).toHaveProperty('activity');
      expect(response.body.data).toHaveProperty('updated_levels');
      expect(response.body.data).toHaveProperty('changes');
      expect(response.body.data).toHaveProperty('training_record_id');

      // Verify foal data
      expect(response.body.data.foal.id).toBe(testFoal.id);
      expect(response.body.data.foal.name).toBe(testFoal.name);

      // Verify activity data
      expect(response.body.data.activity.name).toBe('Trailer Exposure');
      expect(response.body.data.activity.day).toBe(3);
      expect(response.body.data.activity.outcome).toMatch(/success|excellent|challenging/);

      // Verify levels are within bounds
      expect(response.body.data.updated_levels.bond_score).toBeGreaterThanOrEqual(0);
      expect(response.body.data.updated_levels.bond_score).toBeLessThanOrEqual(100);
      expect(response.body.data.updated_levels.stress_level).toBeGreaterThanOrEqual(0);
      expect(response.body.data.updated_levels.stress_level).toBeLessThanOrEqual(100);

      // Verify changes are reported
      expect(response.body.data.changes).toHaveProperty('bond_change');
      expect(response.body.data.changes).toHaveProperty('stress_change');

      // Verify training record was created
      const trainingRecord = await prisma.foalTrainingHistory.findUnique({
        where: { id: response.body.data.training_record_id }
      });
      expect(trainingRecord).toBeTruthy();
      expect(trainingRecord.horse_id).toBe(testFoal.id);
      expect(trainingRecord.day).toBe(3);
      expect(trainingRecord.activity).toBe('Trailer Exposure');
    });

    it('should update horse bond_score and stress_level in database', async () => {
      // Get initial values
      const initialHorse = await prisma.horse.findUnique({
        where: { id: testFoal.id },
        select: { bond_score: true, stress_level: true }
      });

      const response = await request(app)
        .post(`/api/foals/${testFoal.id}/enrichment`)
        .send({
          day: 3,
          activity: 'Halter Introduction'
        })
        .expect(200);

      // Get updated values
      const updatedHorse = await prisma.horse.findUnique({
        where: { id: testFoal.id },
        select: { bond_score: true, stress_level: true }
      });

      // Verify database was updated
      expect(updatedHorse.bond_score).not.toBe(initialHorse.bond_score);
      expect(updatedHorse.stress_level).not.toBe(initialHorse.stress_level);

      // Verify response matches database
      expect(response.body.data.updated_levels.bond_score).toBe(updatedHorse.bond_score);
      expect(response.body.data.updated_levels.stress_level).toBe(updatedHorse.stress_level);
    });

    it('should validate request parameters', async () => {
      // Missing day
      await request(app)
        .post(`/api/foals/${testFoal.id}/enrichment`)
        .send({
          activity: 'Trailer Exposure'
        })
        .expect(400);

      // Missing activity
      await request(app)
        .post(`/api/foals/${testFoal.id}/enrichment`)
        .send({
          day: 3
        })
        .expect(400);

      // Invalid day (too high)
      await request(app)
        .post(`/api/foals/${testFoal.id}/enrichment`)
        .send({
          day: 7,
          activity: 'Trailer Exposure'
        })
        .expect(400);

      // Invalid day (negative)
      await request(app)
        .post(`/api/foals/${testFoal.id}/enrichment`)
        .send({
          day: -1,
          activity: 'Trailer Exposure'
        })
        .expect(400);

      // Empty activity
      await request(app)
        .post(`/api/foals/${testFoal.id}/enrichment`)
        .send({
          day: 3,
          activity: ''
        })
        .expect(400);
    });

    it('should return 404 for non-existent foal', async () => {
      const response = await request(app)
        .post('/api/foals/99999/enrichment')
        .send({
          day: 3,
          activity: 'Trailer Exposure'
        })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not found');
    });

    it('should return 400 for inappropriate activity for day', async () => {
      const response = await request(app)
        .post(`/api/foals/${testFoal.id}/enrichment`)
        .send({
          day: 0,
          activity: 'Trailer Exposure' // This is a day 3 activity
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not appropriate for day 0');
    });

    it('should accept different activity name formats', async () => {
      // Test exact type
      await request(app)
        .post(`/api/foals/${testFoal.id}/enrichment`)
        .send({
          day: 3,
          activity: 'leading_practice'
        })
        .expect(200);

      // Test exact name
      await request(app)
        .post(`/api/foals/${testFoal.id}/enrichment`)
        .send({
          day: 3,
          activity: 'Leading Practice'
        })
        .expect(200);

      // Test case insensitive
      await request(app)
        .post(`/api/foals/${testFoal.id}/enrichment`)
        .send({
          day: 3,
          activity: 'HANDLING EXERCISES'
        })
        .expect(200);
    });

    it('should handle all day 3 activities', async () => {
      const day3Activities = [
        'Halter Introduction',
        'Leading Practice',
        'Handling Exercises',
        'Trailer Exposure'
      ];

      for (const activity of day3Activities) {
        const response = await request(app)
          .post(`/api/foals/${testFoal.id}/enrichment`)
          .send({
            day: 3,
            activity: activity
          })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.activity.name).toBe(activity);
        expect(response.body.data.activity.day).toBe(3);
      }
    });

    it('should create training history records for each activity', async () => {
      const initialCount = await prisma.foalTrainingHistory.count({
        where: { horse_id: testFoal.id }
      });

      await request(app)
        .post(`/api/foals/${testFoal.id}/enrichment`)
        .send({
          day: 1,
          activity: 'Feeding Assistance'
        })
        .expect(200);

      const finalCount = await prisma.foalTrainingHistory.count({
        where: { horse_id: testFoal.id }
      });

      expect(finalCount).toBe(initialCount + 1);

      // Verify the record details
      const latestRecord = await prisma.foalTrainingHistory.findFirst({
        where: { horse_id: testFoal.id },
        orderBy: { timestamp: 'desc' }
      });

      expect(latestRecord.day).toBe(1);
      expect(latestRecord.activity).toBe('Feeding Assistance');
      expect(latestRecord.outcome).toMatch(/success|excellent|challenging/);
      expect(latestRecord.bond_change).toBeGreaterThanOrEqual(4);
      expect(latestRecord.bond_change).toBeLessThanOrEqual(8);
      expect(latestRecord.stress_change).toBeGreaterThanOrEqual(-1);
      expect(latestRecord.stress_change).toBeLessThanOrEqual(3);
    });

    it('should handle edge cases with bond and stress levels', async () => {
      // Create a foal with extreme values
      const extremeFoal = await prisma.horse.create({
        data: {
          name: 'Extreme Test Foal',
          age: 0,
          breedId: testBreed.id,
          bond_score: 95,
          stress_level: 5
        }
      });

      try {
        const response = await request(app)
          .post(`/api/foals/${extremeFoal.id}/enrichment`)
          .send({
            day: 3,
            activity: 'Trailer Exposure'
          })
          .expect(200);

        // Values should be capped at bounds
        expect(response.body.data.updated_levels.bond_score).toBeLessThanOrEqual(100);
        expect(response.body.data.updated_levels.stress_level).toBeGreaterThanOrEqual(0);

      } finally {
        // Clean up
        await prisma.foalTrainingHistory.deleteMany({
          where: { horse_id: extremeFoal.id }
        });
        await prisma.horse.delete({ where: { id: extremeFoal.id } });
      }
    });
  });
});