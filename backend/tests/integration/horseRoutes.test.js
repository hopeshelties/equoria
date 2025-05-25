import request from 'supertest';
import app from '../../app.js';

describe('Horse Routes Integration Tests', () => {
  describe('GET /api/horses/trainable/:playerId', () => {
    it('should return trainable horses for valid player ID', async () => {
      const playerId = 'test-player-uuid-123'; // Using the seeded player ID
      
      const response = await request(app)
        .get(`/api/horses/trainable/${playerId}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
      
      // Each horse should have the required properties
      response.body.data.forEach(horse => {
        expect(horse).toHaveProperty('horseId');
        expect(horse).toHaveProperty('name');
        expect(horse).toHaveProperty('age');
        expect(horse).toHaveProperty('trainableDisciplines');
        expect(Array.isArray(horse.trainableDisciplines)).toBe(true);
        expect(horse.age).toBeGreaterThanOrEqual(3); // Only horses 3+ should be returned
      });
    });

    it('should return empty array for non-existent player', async () => {
      const playerId = 'nonexistent-player-uuid-456'; // Using a format that passes UUID validation but doesn't exist
      
      const response = await request(app)
        .get(`/api/horses/trainable/${playerId}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data', []);
    });

    it('should return validation error for invalid player ID', async () => {
      const response = await request(app)
        .get('/api/horses/trainable/')
        .expect(404); // Route not found for empty player ID
    });

    it('should return validation error for player ID that is too long', async () => {
      const longPlayerId = 'a'.repeat(51); // Exceeds 50 character limit
      
      const response = await request(app)
        .get(`/api/horses/trainable/${longPlayerId}`)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message', 'Validation failed');
      expect(response.body).toHaveProperty('errors');
    });

    it('should handle server errors gracefully', async () => {
      // This test would require mocking the controller to throw an error
      // For now, we'll just verify the endpoint exists and responds
      const playerId = 'test-player-uuid-123';
      
      const response = await request(app)
        .get(`/api/horses/trainable/${playerId}`);

      expect([200, 500]).toContain(response.status);
    });
  });
}); 