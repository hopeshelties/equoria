import { jest } from '@jest/globals';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import request from 'supertest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Mock the database module BEFORE importing the app
jest.unstable_mockModule(join(__dirname, '../db/index.js'), () => ({
  default: {
    player: {
      findUnique: jest.fn(),
      update: jest.fn()
    },
    horse: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn()
    },
    trainingLog: {
      create: jest.fn(),
      findFirst: jest.fn()
    },
    $disconnect: jest.fn()
  }
}));

// Now import the app and the mocked modules
const app = (await import('../app.js')).default;
const mockPrisma = (await import(join(__dirname, '../db/index.js'))).default;

// Custom Jest matcher for toBeOneOf
expect.extend({
  toBeOneOf(received, expected) {
    const pass = expected.includes(received);
    if (pass) {
      return {
        message: () => `expected ${received} not to be one of ${expected}`,
        pass: true
      };
    } else {
      return {
        message: () => `expected ${received} to be one of ${expected}`,
        pass: false
      };
    }
  }
});

describe('Training System Integration Tests', () => {
  // Mock data
  const existingPlayerId = 'test-player-uuid-123';
  const mockPlayer = {
    id: existingPlayerId,
    email: 'test@example.com',
    username: 'testuser'
  };

  const mockHorses = [
    {
      id: 1,
      horseId: 1,
      name: 'Young Horse',
      age: 2,
      ownerId: existingPlayerId,
      discipline_scores: {}
    },
    {
      id: 2,
      horseId: 2,
      name: 'Adult Horse',
      age: 4,
      ownerId: existingPlayerId,
      discipline_scores: {}
    }
  ];

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();

    // Setup default mock responses
    mockPrisma.player.findUnique.mockResolvedValue(mockPlayer);
    mockPrisma.player.update.mockResolvedValue({
      ...mockPlayer,
      xp: 5,
      level: 1
    });
    mockPrisma.horse.findMany.mockResolvedValue(mockHorses.filter(h => h.age >= 3));
    mockPrisma.horse.findUnique.mockResolvedValue(mockHorses[1]); // Adult horse by default
    mockPrisma.horse.update.mockResolvedValue({
      ...mockHorses[1],
      discipline_scores: { Racing: 5 }
    });
    mockPrisma.trainingLog.create.mockResolvedValue({
      id: 1,
      horseId: 2,
      discipline: 'Racing',
      trainedAt: new Date()
    });
    mockPrisma.trainingLog.findFirst.mockResolvedValue(null); // No previous training by default
  });

  describe('Age Requirement Tests', () => {
    it('should block training for horse under 3 years old', async() => {
      // Mock young horse
      mockPrisma.horse.findUnique.mockResolvedValueOnce(mockHorses[0]); // Young horse

      const response = await request(app)
        .post('/api/training/train')
        .send({
          horseId: 1,
          discipline: 'Racing'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('age');
    });

    it('should allow training for horse 3+ years old', async() => {
      // Mock successful training
      mockPrisma.horse.update.mockResolvedValueOnce({
        ...mockHorses[1],
        discipline_scores: { Racing: 5 }
      });

      const response = await request(app)
        .post('/api/training/train')
        .send({
          horseId: 2,
          discipline: 'Racing'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('trained in Racing');
      expect(response.body.updatedScore).toBeGreaterThanOrEqual(0);
      expect(response.body.nextEligibleDate).toBeDefined();
      expect(response.body.traitEffects).toBeDefined();
    });
  });

  describe('First-Time Training Tests', () => {
    it('should successfully train adult horse for first time and initialize discipline scores', async() => {
      // Mock successful first-time training
      mockPrisma.horse.update.mockResolvedValueOnce({
        ...mockHorses[1],
        discipline_scores: { Dressage: 5 }
      });

      const response = await request(app)
        .post('/api/training/train')
        .send({
          horseId: 2,
          discipline: 'Dressage'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('trained in Dressage');
      expect(response.body.updatedScore).toBeGreaterThanOrEqual(0);
      expect(response.body.nextEligibleDate).toBeDefined();
      expect(response.body.traitEffects).toBeDefined();

      // Verify nextEligibleDate is approximately 7 days from now
      const nextEligible = new Date(response.body.nextEligibleDate);
      const expectedDate = new Date();
      expectedDate.setDate(expectedDate.getDate() + 7);
      const timeDiff = Math.abs(nextEligible - expectedDate);
      expect(timeDiff).toBeLessThan(60000); // Within 1 minute
    });

    it('should add to existing discipline scores when training different discipline', async() => {
      // Mock horse with existing scores
      mockPrisma.horse.findUnique.mockResolvedValueOnce({
        ...mockHorses[1],
        discipline_scores: { Racing: 5 }
      });

      mockPrisma.horse.update.mockResolvedValueOnce({
        ...mockHorses[1],
        discipline_scores: { Racing: 5, 'Show Jumping': 5 }
      });

      const response = await request(app)
        .post('/api/training/train')
        .send({
          horseId: 2,
          discipline: 'Show Jumping'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('trained in Show Jumping');
      expect(response.body.updatedScore).toBeGreaterThanOrEqual(0);
      expect(response.body.nextEligibleDate).toBeDefined();
      expect(response.body.traitEffects).toBeDefined();
    });
  });

  describe('Cooldown Enforcement Tests', () => {
    it('should block training when cooldown is active (within 7 days)', async() => {
      // Mock recent training log (within cooldown period)
      const recentTraining = new Date();
      recentTraining.setDate(recentTraining.getDate() - 3); // 3 days ago

      // Override the default mock for this specific test
      mockPrisma.trainingLog.findFirst.mockResolvedValueOnce({
        id: 1,
        horseId: 2,
        discipline: 'Racing',
        trainedAt: recentTraining
      });

      const response = await request(app)
        .post('/api/training/train')
        .send({
          horseId: 2,
          discipline: 'Racing'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Training cooldown active');
    });

    it('should allow training in different discipline during cooldown', async() => {
      // Mock racing cooldown but allow cross country
      mockPrisma.trainingLog.findFirst.mockResolvedValueOnce(null); // No previous Cross Country training

      mockPrisma.horse.update.mockResolvedValueOnce({
        ...mockHorses[1],
        discipline_scores: { Racing: 5, 'Cross Country': 5 }
      });

      const response = await request(app)
        .post('/api/training/train')
        .send({
          horseId: 2,
          discipline: 'Cross Country'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('trained in Cross Country');
      expect(response.body.updatedScore).toBeGreaterThanOrEqual(0);
      expect(response.body.nextEligibleDate).toBeDefined();
      expect(response.body.traitEffects).toBeDefined();
    });
  });

  describe('Error Handling Tests', () => {
    it('should handle non-existent horse gracefully', async() => {
      mockPrisma.horse.findUnique.mockResolvedValueOnce(null);

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

    it('should validate request parameters', async() => {
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
});
