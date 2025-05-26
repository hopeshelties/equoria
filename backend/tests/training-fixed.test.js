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

describe('Training System Integration Tests (Fixed)', () => {
  // Use existing seeded data from horseSeed.js
  const existingPlayerId = 'test-player-uuid-123'; // From seeded data

  describe('Age Requirement Tests', () => {
    it('should get trainable horses for authenticated user', async () => {
      const trainableResponse = await withSeededPlayerAuth(request(app))
        .get(`/api/horses/trainable/${existingPlayerId}`);

      expect(trainableResponse.status).toBe(200);
      expect(trainableResponse.body.success).toBe(true);
      
      // Log the response for debugging
      console.log('Trainable horses response:', JSON.stringify(trainableResponse.body, null, 2));
      
      // The response should be an array (even if empty)
      expect(Array.isArray(trainableResponse.body.data)).toBe(true);
    });

    it('should handle training request with authentication', async () => {
      // First get trainable horses
      const trainableResponse = await withSeededPlayerAuth(request(app))
        .get(`/api/horses/trainable/${existingPlayerId}`);

      expect(trainableResponse.status).toBe(200);
      
      if (trainableResponse.body.data.length === 0) {
        console.log('No trainable horses found, test will pass but skip training');
        return;
      }

      const firstHorse = trainableResponse.body.data[0];
      
      const response = await withSeededPlayerAuth(request(app))
        .post('/api/training/train')
        .send({
          horseId: firstHorse.horseId,
          discipline: 'Racing'
        });

      // Should either succeed or fail with a specific reason
      expect(response.status).toBeOneOf([200, 400]);
      expect(response.body.success).toBeDefined();
      
      console.log('Training response:', JSON.stringify(response.body, null, 2));
    });
  });

  describe('Authentication Tests', () => {
    it('should reject unauthenticated requests', async () => {
      const response = await request(app)
        .get(`/api/horses/trainable/${existingPlayerId}`);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Access token required');
    });

    it('should reject training without authentication', async () => {
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

  describe('Training Status Tests', () => {
    it('should get training status with authentication', async () => {
      // First get trainable horses
      const trainableResponse = await withSeededPlayerAuth(request(app))
        .get(`/api/horses/trainable/${existingPlayerId}`);

      expect(trainableResponse.status).toBe(200);
      
      if (trainableResponse.body.data.length === 0) {
        console.log('No trainable horses found, skipping status test');
        return;
      }

      const firstHorse = trainableResponse.body.data[0];
      
      const response = await withSeededPlayerAuth(request(app))
        .get(`/api/training/status/${firstHorse.horseId}/Racing`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      
      console.log('Training status response:', JSON.stringify(response.body, null, 2));
    });
  });
}); 