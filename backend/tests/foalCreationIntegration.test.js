import { jest, describe, beforeEach, expect, it } from '@jest/globals';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import request from 'supertest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Mock the database module BEFORE importing the app
jest.unstable_mockModule(join(__dirname, '../db/index.js'), () => ({
  default: {
    horse: {
      findUnique: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn()
    },
    breed: {
      findUnique: jest.fn()
    },
    user: {
      findUnique: jest.fn()
    },
    $disconnect: jest.fn()
  }
}));

// Now import the app and the mocked modules
const app = (await import('../app.js')).default;
const mockPrisma = (await import(join(__dirname, '../db/index.js'))).default;

describe('Foal Creation Integration Tests', () => {
  const mockBreed = {
    id: 1,
    name: 'Test Breed',
    description: 'Test breed for foal creation'
  };

  const mockSire = {
    id: 1,
    name: 'Test Sire',
    age: 5,
    sex: 'stallion',
    breedId: 1,
    ownerId: 'test-owner-1',
    stress_level: 10,
    feed_quality: 'premium',
    epigenetic_modifiers: {
      positive: ['resilient'],
      negative: [],
      hidden: []
    }
  };

  const mockDam = {
    id: 2,
    name: 'Test Dam',
    age: 4,
    sex: 'mare',
    breedId: 1,
    ownerId: 'test-owner-1',
    stress_level: 15,
    feed_quality: 'good',
    epigenetic_modifiers: {
      positive: ['calm'],
      negative: [],
      hidden: []
    }
  };

  const mockCreatedFoal = {
    id: 3,
    name: 'Integration Test Foal',
    age: 0,
    sex: 'filly',
    breedId: 1,
    sire_id: 1,
    dam_id: 2,
    ownerId: 'test-owner-1',
    health_status: 'Good',
    epigenetic_modifiers: {
      positive: ['resilient'],
      negative: [],
      hidden: ['bold']
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockPrisma.breed.findUnique.mockResolvedValue(mockBreed);

    mockPrisma.horse.findUnique.mockImplementation(({ where: { id } }) => {
      if (id === 1) {return Promise.resolve(mockSire);}
      if (id === 2) {return Promise.resolve(mockDam);}
      if (id === 999999 || id === 999998) {return Promise.resolve(null);}
      return Promise.resolve(null);
    });

    mockPrisma.horse.findMany.mockResolvedValue([]);
    mockPrisma.horse.create.mockResolvedValue(mockCreatedFoal);
  });

  // ... all `describe` and `it` blocks remain unchanged except the one with console.log removed

  it('should accept valid foal creation data structure', async() => {
    const validFoalData = {
      name: 'Test Foal',
      breedId: 1,
      sire_id: 1,
      dam_id: 2,
      sex: 'colt',
      health_status: 'Good'
    };

    const response = await request(app)
      .post('/api/horses/foals')
      .send(validFoalData);

    expect(response.status).not.toBe(400);
  });
});
