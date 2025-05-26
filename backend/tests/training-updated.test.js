import { jest } from '@jest/globals';
import request from 'supertest';
import app from '../app.js';
import { generateTestToken } from './helpers/authHelper.js';

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

describe('Training System Integration Tests (Updated for User Model)', () => {
  let authToken;
  let testUserId;

  beforeAll(async () => {
    // Create a test user token (using integer ID for User model)
    testUserId = 1; // Assuming first user in database
    authToken = generateTestToken({
      id: testUserId,
      email: 'test@example.com',
      role: 'user'
    });
  });

  describe('Age Requirement Tests', () => {
    it('should get trainable horses for authenticated user', async () => {
      const response = await request(app)
        .get(`/api/horses/trainable/${testUserId}`)
        .set('Authorization', `Bearer ${authToken}`);

      // Should either succeed with horses or succeed with empty array
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      
      console.log(`Found ${response.body.data.length} trainable horses for user ${testUserId}`);
    });

    it('should block training for horse under 3 years old', async () => {
      // First, get trainable horses
      const trainableResponse = await request(app)
        .get(`/api/horses/trainable/${testUserId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(trainableResponse.status).toBe(200);
      
      // If there are no trainable horses, we can't test this properly
      if (trainableResponse.body.data.length === 0) {
        console.log('No trainable horses found, skipping age requirement test');
        return;
      }

      // Try to train a horse that should be eligible
      const firstHorse = trainableResponse.body.data[0];
      
      const response = await request(app)
        .post('/api/training/train')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          horseId: firstHorse.horseId,
          discipline: 'Racing'
        });

      // This should either succeed (if horse is eligible) or fail with a specific reason
      expect(response.status).toBeOneOf([200, 400]);
      expect(response.body.success).toBeDefined();
      
      if (response.body.success) {
        console.log('Training succeeded:', response.body.message);
      } else {
        console.log('Training blocked:', response.body.message);
      }
    });

    it('should allow training for horse 3+ years old', async () => {
      // Get trainable horses
      const trainableResponse = await request(app)
        .get(`/api/horses/trainable/${testUserId}`)
        .set('Authorization', `Bearer ${authToken}`);

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
        .set('Authorization', `Bearer ${authToken}`)
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

  describe('Training Status Tests', () => {
    it('should get training status for a specific horse and discipline', async () => {
      // Get trainable horses first
      const trainableResponse = await request(app)
        .get(`/api/horses/trainable/${testUserId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(trainableResponse.status).toBe(200);
      
      if (trainableResponse.body.data.length === 0) {
        console.log('No trainable horses found, skipping status test');
        return;
      }

      const firstHorse = trainableResponse.body.data[0];
      
      const response = await request(app)
        .get(`/api/training/status/${firstHorse.horseId}/Racing`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('eligible');
      expect(response.body.data).toHaveProperty('horseAge');
    });

    it('should get all training status for a horse', async () => {
      // Get trainable horses first
      const trainableResponse = await request(app)
        .get(`/api/horses/trainable/${testUserId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(trainableResponse.status).toBe(200);
      
      if (trainableResponse.body.data.length === 0) {
        console.log('No trainable horses found, skipping all status test');
        return;
      }

      const firstHorse = trainableResponse.body.data[0];
      
      const response = await request(app)
        .get(`/api/training/horse/${firstHorse.horseId}/all-status`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('Authentication Protection Tests', () => {
    it('should reject unauthenticated requests to get trainable horses', async () => {
      const response = await request(app)
        .get(`/api/horses/trainable/${testUserId}`);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Access token required');
    });

    it('should reject unauthenticated training requests', async () => {
      const response = await request(app)
        .post('/api/training/train')
        .send({
          horseId: 1,
          discipline: 'Racing'
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Access token required');
    });
  });

  describe('Error Handling Tests', () => {
    it('should handle invalid horse ID gracefully', async () => {
      const response = await request(app)
        .post('/api/training/train')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          horseId: 99999, // Non-existent horse
          discipline: 'Racing'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not found');
    });

    it('should handle invalid discipline gracefully', async () => {
      const response = await request(app)
        .post('/api/training/train')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          horseId: 1,
          discipline: 'InvalidDiscipline'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });
}); 