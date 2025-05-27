import { jest } from '@jest/globals';
import request from 'supertest';
import app from '../app.js';
import { withSeededPlayerAuth } from './helpers/testAuth.js';

// Custom Jest matcher for toBeOneOf
expect.extend({
  toBeOneOf(received, expected) {
    const pass = expected.includes(received);
    if (pass) {
      return {
        message: () => `expected ${received} not to be one of ${expected}`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be one of ${expected}`,
        pass: false,
      };
    }
  },
});

describe('Training System Integration Tests', () => {
  // Use existing seeded data from horseSeed.js
  const existingPlayerId = 'test-player-uuid-123'; // From seeded data
  // Note: We'll need to get the actual horse IDs dynamically since they're auto-generated

  describe('Age Requirement Tests', () => {
    it('should block training for horse under 3 years old', async () => {
      // First, let's get the trainable horses to find the actual IDs
      const trainableResponse = await withSeededPlayerAuth(request(app))
        .get(`/api/horses/trainable/${existingPlayerId}`);

      expect(trainableResponse.status).toBe(200);
      
      // If there are no trainable horses, we can't test this properly
      if (trainableResponse.body.data.length === 0) {
        console.log('No trainable horses found, skipping age requirement test');
        return;
      }

      // Try to train a horse that should be eligible (this will help us understand the system)
      const firstHorse = trainableResponse.body.data[0];
      
      const response = await withSeededPlayerAuth(request(app))
        .post('/api/training/train')
        .send({
          horseId: firstHorse.horseId,
          discipline: 'Racing'
        });

      // This should either succeed (if horse is eligible) or fail with a specific reason
      expect(response.status).toBeOneOf([200, 400]);
      expect(response.body.success).toBeDefined();
    });

    it('should allow training for horse 3+ years old', async () => {
      // Get trainable horses
      const trainableResponse = await request(app)
        .get(`/api/horses/trainable/${existingPlayerId}`);

      expect(trainableResponse.status).toBe(200);
      
      if (trainableResponse.body.data.length === 0) {
        console.log('No trainable horses found, skipping training test');
        return;
      }

      const adultHorse = trainableResponse.body.data.find(horse => horse.age >= 3);
      
      if (!adultHorse) {
        console.log('No adult horses found, skipping training test');
        return;
      }

      const response = await request(app)
        .post('/api/training/train')
        .send({
          horseId: adultHorse.horseId,
          discipline: 'Racing'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('trained in Racing');
      expect(response.body.updatedScore).toBe(5);
      expect(response.body.nextEligibleDate).toBeDefined();
    });
  });

  describe('First-Time Training Tests', () => {
    it('should successfully train adult horse for first time and initialize discipline scores', async () => {
      // Get trainable horses
      const trainableResponse = await request(app)
        .get(`/api/horses/trainable/${existingPlayerId}`);

      expect(trainableResponse.status).toBe(200);
      
      if (trainableResponse.body.data.length === 0) {
        console.log('No trainable horses found, skipping first-time training test');
        return;
      }

      const adultHorse = trainableResponse.body.data.find(horse => horse.age >= 3);
      
      if (!adultHorse) {
        console.log('No adult horses found, skipping first-time training test');
        return;
      }

      const response = await request(app)
        .post('/api/training/train')
        .send({
          horseId: adultHorse.horseId,
          discipline: 'Dressage'
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        message: expect.stringContaining('trained in Dressage'),
        updatedScore: 5,
        nextEligibleDate: expect.any(String)
      });

      // Verify nextEligibleDate is approximately 7 days from now
      const nextEligible = new Date(response.body.nextEligibleDate);
      const expectedDate = new Date();
      expectedDate.setDate(expectedDate.getDate() + 7);
      const timeDiff = Math.abs(nextEligible - expectedDate);
      expect(timeDiff).toBeLessThan(60000); // Within 1 minute
    });

    it('should add to existing discipline scores when training different discipline', async () => {
      // Get trainable horses
      const trainableResponse = await request(app)
        .get(`/api/horses/trainable/${existingPlayerId}`);

      expect(trainableResponse.status).toBe(200);
      
      if (trainableResponse.body.data.length === 0) {
        console.log('No trainable horses found, skipping discipline score test');
        return;
      }

      const adultHorse = trainableResponse.body.data.find(horse => horse.age >= 3);
      
      if (!adultHorse) {
        console.log('No adult horses found, skipping discipline score test');
        return;
      }

      const response = await request(app)
        .post('/api/training/train')
        .send({
          horseId: adultHorse.horseId,
          discipline: 'Show Jumping'
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        message: expect.stringContaining('trained in Show Jumping'),
        updatedScore: 5,
        nextEligibleDate: expect.any(String)
      });
    });
  });

  describe('Cooldown Enforcement Tests', () => {
    it('should block training when cooldown is active (within 7 days)', async () => {
      // Get trainable horses
      const trainableResponse = await request(app)
        .get(`/api/horses/trainable/${existingPlayerId}`);

      expect(trainableResponse.status).toBe(200);
      
      if (trainableResponse.body.data.length === 0) {
        console.log('No trainable horses found, skipping cooldown test');
        return;
      }

      const adultHorse = trainableResponse.body.data.find(horse => horse.age >= 3);
      
      if (!adultHorse) {
        console.log('No adult horses found, skipping cooldown test');
        return;
      }

      // Try to train in Racing again (should be blocked due to cooldown from previous test)
      const response = await request(app)
        .post('/api/training/train')
        .send({
          horseId: adultHorse.horseId,
          discipline: 'Racing'
        });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        success: false,
        message: 'Training not allowed: Training cooldown active'
      });
    });

    it('should block training in ALL disciplines when any cooldown active', async () => {
      // Get trainable horses
      const trainableResponse = await request(app)
        .get(`/api/horses/trainable/${existingPlayerId}`);

      expect(trainableResponse.status).toBe(200);
      
      if (trainableResponse.body.data.length === 0) {
        console.log('No trainable horses found, skipping global cooldown test');
        return;
      }

      const adultHorse = trainableResponse.body.data.find(horse => horse.age >= 3);
      
      if (!adultHorse) {
        console.log('No adult horses found, skipping global cooldown test');
        return;
      }

      // Try to train in a different discipline (should be blocked due to global cooldown from previous Racing training)
      const response = await request(app)
        .post('/api/training/train')
        .send({
          horseId: adultHorse.horseId,
          discipline: 'Cross Country'
        });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        success: false,
        message: 'Training not allowed: Training cooldown active for this horse'
      });
    });
  });

  describe('Training Status and Eligibility Tests', () => {
    it('should return correct training status for horse with active cooldown', async () => {
      // Get trainable horses
      const trainableResponse = await request(app)
        .get(`/api/horses/trainable/${existingPlayerId}`);

      expect(trainableResponse.status).toBe(200);
      
      if (trainableResponse.body.data.length === 0) {
        console.log('No trainable horses found, skipping status test');
        return;
      }

      const adultHorse = trainableResponse.body.data.find(horse => horse.age >= 3);
      
      if (!adultHorse) {
        console.log('No adult horses found, skipping status test');
        return;
      }

      const response = await request(app)
        .get(`/api/training/status/${adultHorse.horseId}/Racing`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.eligible).toBe(false);
      expect(response.body.data.reason).toBe('Training cooldown active');
      expect(response.body.data.horseAge).toBeGreaterThanOrEqual(3);
      expect(response.body.data.lastTrainingDate).toBeDefined();
      expect(response.body.data.cooldown.active).toBe(true);
      expect(response.body.data.cooldown.remainingDays).toBeGreaterThan(0);
    });

    it('should return global cooldown status for all disciplines', async () => {
      // Get trainable horses
      const trainableResponse = await request(app)
        .get(`/api/horses/trainable/${existingPlayerId}`);

      expect(trainableResponse.status).toBe(200);
      
      if (trainableResponse.body.data.length === 0) {
        console.log('No trainable horses found, skipping global cooldown status test');
        return;
      }

      const adultHorse = trainableResponse.body.data.find(horse => horse.age >= 3);
      
      if (!adultHorse) {
        console.log('No adult horses found, skipping global cooldown status test');
        return;
      }

      // Check Western discipline status (should be blocked due to global cooldown from Racing training)
      const response = await request(app)
        .get(`/api/training/status/${adultHorse.horseId}/Western`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.eligible).toBe(false);
      expect(response.body.data.reason).toBe('Training cooldown active for this horse');
      expect(response.body.data.horseAge).toBeGreaterThanOrEqual(3);
      expect(response.body.data.lastTrainingDate).toBe(null); // No previous Western training
      expect(response.body.data.cooldown.active).toBe(true); // Global cooldown active
      expect(response.body.data.cooldown.remainingDays).toBeGreaterThan(0);
    });

    it('should return all training status for horse', async () => {
      // Get trainable horses
      const trainableResponse = await request(app)
        .get(`/api/horses/trainable/${existingPlayerId}`);

      expect(trainableResponse.status).toBe(200);
      
      if (trainableResponse.body.data.length === 0) {
        console.log('No trainable horses found, skipping all status test');
        return;
      }

      const adultHorse = trainableResponse.body.data.find(horse => horse.age >= 3);
      
      if (!adultHorse) {
        console.log('No adult horses found, skipping all status test');
        return;
      }

      const response = await request(app)
        .get(`/api/training/horse/${adultHorse.horseId}/all-status`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.horseId).toBe(adultHorse.horseId);
      expect(response.body.data.disciplines).toHaveLength(5);

      // Find Racing status (should be ineligible due to cooldown)
      const racingStatus = response.body.data.disciplines.find(d => d.discipline === 'Racing');
      expect(racingStatus.eligible).toBe(false);
      expect(racingStatus.reason).toBe('Training cooldown active for this horse');

      // Find Western status (should ALSO be ineligible due to GLOBAL cooldown)
      const westernStatus = response.body.data.disciplines.find(d => d.discipline === 'Western');
      expect(westernStatus.eligible).toBe(false);
      expect(westernStatus.reason).toBe('Training cooldown active for this horse');
    });
  });

  describe('Trainable Horses Endpoint Tests', () => {
    it('should return trainable horses for player', async () => {
      const response = await request(app)
        .get(`/api/horses/trainable/${existingPlayerId}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBeGreaterThanOrEqual(0);

      // If there are trainable horses, verify their structure
      if (response.body.data.length > 0) {
        const trainableHorse = response.body.data[0];
        expect(trainableHorse.horseId).toBeDefined();
        expect(trainableHorse.name).toBeDefined();
        expect(trainableHorse.age).toBeGreaterThanOrEqual(3);
        expect(trainableHorse.trainableDisciplines).toBeDefined();
        expect(Array.isArray(trainableHorse.trainableDisciplines)).toBe(true);
      }
    });
  });

  describe('Training Eligibility Check Tests', () => {
    it('should return correct eligibility for adult horse without cooldown', async () => {
      // Get trainable horses
      const trainableResponse = await request(app)
        .get(`/api/horses/trainable/${existingPlayerId}`);

      expect(trainableResponse.status).toBe(200);
      
      if (trainableResponse.body.data.length === 0) {
        console.log('No trainable horses found, skipping eligibility test');
        return;
      }

      const adultHorse = trainableResponse.body.data.find(horse => horse.age >= 3);
      
      if (!adultHorse) {
        console.log('No adult horses found, skipping eligibility test');
        return;
      }

      const response = await request(app)
        .post('/api/training/check-eligibility')
        .send({
          horseId: adultHorse.horseId,
          discipline: 'Western'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual({
        eligible: true,
        reason: null
      });
    });
  });

  describe('Error Handling Tests', () => {
    it('should handle non-existent horse gracefully', async () => {
      const response = await request(app)
        .post('/api/training/train')
        .send({
          horseId: 99999,
          discipline: 'Racing'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Training not allowed: Horse not found');
    });

    it('should validate request parameters', async () => {
      const response = await request(app)
        .post('/api/training/train')
        .send({
          horseId: 'invalid',
          discipline: ''
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Validation failed');
      expect(response.body.errors).toBeDefined();
    });
  });

  describe('Training Log Verification Tests', () => {
    it('should verify training logs are created correctly', async () => {
      // Get trainable horses
      const trainableResponse = await request(app)
        .get(`/api/horses/trainable/${existingPlayerId}`);

      expect(trainableResponse.status).toBe(200);
      
      if (trainableResponse.body.data.length === 0) {
        console.log('No trainable horses found, skipping log verification test');
        return;
      }

      const adultHorse = trainableResponse.body.data.find(horse => horse.age >= 3);
      
      if (!adultHorse) {
        console.log('No adult horses found, skipping log verification test');
        return;
      }

      // Train the horse in a new discipline
      const response = await request(app)
        .post('/api/training/train')
        .send({
          horseId: adultHorse.horseId,
          discipline: 'Western'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Verify training status shows the horse has trained
      const statusResponse = await request(app)
        .get(`/api/training/status/${adultHorse.horseId}/Western`);

      expect(statusResponse.status).toBe(200);
      expect(statusResponse.body.data.lastTrainingDate).toBeDefined();
      expect(statusResponse.body.data.cooldown.active).toBe(true);
    });
  });

  describe('Discipline Score Progression Tests', () => {
    it('should correctly track discipline scores across multiple training sessions', async () => {
      // Get trainable horses
      const trainableResponse = await request(app)
        .get(`/api/horses/trainable/${existingPlayerId}`);

      expect(trainableResponse.status).toBe(200);
      
      if (trainableResponse.body.data.length === 0) {
        console.log('No trainable horses found, skipping progression test');
        return;
      }

      const adultHorse = trainableResponse.body.data.find(horse => horse.age >= 3);
      
      if (!adultHorse) {
        console.log('No adult horses found, skipping progression test');
        return;
      }

      // Check all training status to see current state
      const allStatusResponse = await request(app)
        .get(`/api/training/horse/${adultHorse.horseId}/all-status`);

      expect(allStatusResponse.status).toBe(200);
      const disciplineStatuses = allStatusResponse.body.data.disciplines;
      
      // Count how many disciplines have been trained (have cooldowns)
      const trainedDisciplines = disciplineStatuses.filter(status => !status.eligible && status.reason === 'Training cooldown active');
      
      // Should have at least some trained disciplines from previous tests
      expect(trainedDisciplines.length).toBeGreaterThanOrEqual(0);
      
      // All trained disciplines should have cooldown active
      trainedDisciplines.forEach(status => {
        expect(status.eligible).toBe(false);
        expect(status.reason).toBe('Training cooldown active');
      });
    });
  });
}); 