
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
    player: {
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
    // Reset all mocks before each test
    jest.clearAllMocks();

    // Setup default mock responses
    mockPrisma.breed.findUnique.mockResolvedValue(mockBreed);

    mockPrisma.horse.findUnique.mockImplementation(({ where }) => {
      if (where.id === 1) {
        return Promise.resolve(mockSire);
      }
      if (where.id === 2) {
        return Promise.resolve(mockDam);
      }
      if (where.id === 999999 || where.id === 999998) {
        return Promise.resolve(null);
      }
      return Promise.resolve(null);
    });

    mockPrisma.horse.findMany.mockResolvedValue([]);

    mockPrisma.horse.create.mockResolvedValue(mockCreatedFoal);
  });

  describe('POST /api/horses/foals', () => {
    it('should validate required fields for foal creation', async() => {
      const response = await request(app)
        .post('/api/horses/foals')
        .send({
          name: 'Test Foal'
          // Missing required fields: breedId, sire_id, dam_id
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Validation failed');
      expect(response.body.errors).toBeDefined();
      expect(Array.isArray(response.body.errors)).toBe(true);

      // Check that validation errors include the missing required fields
      const errorMessages = response.body.errors.map(error => error.msg);
      expect(errorMessages).toContain('Breed ID must be a positive integer');
      expect(errorMessages).toContain('Sire ID must be a positive integer');
      expect(errorMessages).toContain('Dam ID must be a positive integer');
    });

    it('should validate field types for foal creation', async() => {
      const response = await request(app)
        .post('/api/horses/foals')
        .send({
          name: '', // Invalid: empty name
          breedId: 'invalid', // Invalid: not a number
          sire_id: -1, // Invalid: negative number
          dam_id: 0, // Invalid: zero
          sex: 'invalid_sex', // Invalid: not in allowed values
          ownerId: 'not_a_number', // Invalid: not a number
          stableId: -5, // Invalid: negative number
          health_status: 'Invalid Status' // Invalid: not in allowed values
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Validation failed');
      expect(response.body.errors).toBeDefined();

      const errorMessages = response.body.errors.map(error => error.msg);
      expect(errorMessages).toContain('Name must be between 1 and 100 characters');
      expect(errorMessages).toContain('Breed ID must be a positive integer');
      expect(errorMessages).toContain('Sire ID must be a positive integer');
      expect(errorMessages).toContain('Dam ID must be a positive integer');
      expect(errorMessages).toContain('Sex must be one of: stallion, mare, gelding, filly, colt');
      expect(errorMessages).toContain('Health status must be one of: Excellent, Good, Fair, Poor, Critical');
    });

    it('should accept valid foal creation data structure', async() => {
      const validFoalData = {
        name: 'Test Foal',
        breedId: 1,
        sire_id: 1,
        dam_id: 2,
        sex: 'colt',
        // Remove problematic foreign key references for validation test
        health_status: 'Good'
      };

      const response = await request(app)
        .post('/api/horses/foals')
        .send(validFoalData);

      // The response might be 404 (sire/dam not found) or 500 (other errors)
      // but it should NOT be 400 (validation error) since the data structure is valid
      expect(response.status).not.toBe(400);

      // If it's a validation error, the test should fail
      if (response.status === 400) {
        console.log('Unexpected validation errors:', response.body.errors);
        expect(response.status).not.toBe(400);
      }
    });

    it('should handle optional fields correctly', async() => {
      const minimalValidData = {
        name: 'Minimal Foal',
        breedId: 1,
        sire_id: 1,
        dam_id: 2
        // All other fields are optional
      };

      const response = await request(app)
        .post('/api/horses/foals')
        .send(minimalValidData);

      // Should not fail validation (might fail for other reasons like missing horses)
      expect(response.status).not.toBe(400);
    });

    it('should validate sex field values', async() => {
      const validSexValues = ['stallion', 'mare', 'gelding', 'filly', 'colt'];

      for (const sex of validSexValues) {
        const response = await request(app)
          .post('/api/horses/foals')
          .send({
            name: `Test ${sex}`,
            breedId: 1,
            sire_id: 1,
            dam_id: 2,
            sex
          });

        // Should not fail validation for valid sex values
        expect(response.status).not.toBe(400);
      }
    });

    it('should validate health_status field values', async() => {
      const validHealthStatuses = ['Excellent', 'Good', 'Fair', 'Poor', 'Critical'];

      for (const healthStatus of validHealthStatuses) {
        const response = await request(app)
          .post('/api/horses/foals')
          .send({
            name: `Test ${healthStatus} Foal`,
            breedId: 1,
            sire_id: 1,
            dam_id: 2,
            health_status: healthStatus
          });

        // Should not fail validation for valid health status values
        expect(response.status).not.toBe(400);
      }
    });

    it('should handle large valid values', async() => {
      const response = await request(app)
        .post('/api/horses/foals')
        .send({
          name: 'A'.repeat(100), // Maximum length name
          breedId: 999999,
          sire_id: 999999,
          dam_id: 999998
          // Remove foreign key references that don't exist
        });

      // Should not fail validation for large but valid values
      expect(response.status).not.toBe(400);
    });

    it('should successfully create a foal with existing sire and dam', async() => {
      // Update the mock to return the foal with the correct name
      const customFoal = {
        ...mockCreatedFoal,
        name: 'Integration Test Foal',
        sex: 'filly'
      };
      mockPrisma.horse.create.mockResolvedValue(customFoal);

      const validFoalData = {
        name: 'Integration Test Foal',
        breedId: 1,
        sire_id: 1,
        dam_id: 2,
        sex: 'filly'
      };

      const response = await request(app)
        .post('/api/horses/foals')
        .send(validFoalData);

      // Should successfully create the foal
      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('created successfully with epigenetic traits');
      expect(response.body.data).toBeDefined();
      expect(response.body.data.foal).toBeDefined();
      expect(response.body.data.appliedTraits).toBeDefined();
      expect(response.body.data.breedingAnalysis).toBeDefined();

      // Verify foal data
      expect(response.body.data.foal.name).toBe('Integration Test Foal');
      expect(response.body.data.foal.age).toBe(0);
      expect(response.body.data.foal.sire_id).toBe(1);
      expect(response.body.data.foal.dam_id).toBe(2);
      expect(response.body.data.foal.sex).toBe('filly');

      // Verify epigenetic modifiers structure
      expect(response.body.data.foal.epigenetic_modifiers).toBeDefined();
      expect(response.body.data.foal.epigenetic_modifiers.positive).toBeDefined();
      expect(response.body.data.foal.epigenetic_modifiers.negative).toBeDefined();
      expect(response.body.data.foal.epigenetic_modifiers.hidden).toBeDefined();

      // Verify breeding analysis
      expect(response.body.data.breedingAnalysis.mareStress).toBeDefined();
      expect(response.body.data.breedingAnalysis.feedQuality).toBeDefined();
      expect(response.body.data.breedingAnalysis.lineageCount).toBeDefined();
      expect(response.body.data.breedingAnalysis.sire).toBeDefined();
      expect(response.body.data.breedingAnalysis.dam).toBeDefined();
    });
  });

  describe('Foal Creation Route Integration', () => {
    it('should have the foal creation route properly configured', async() => {
      // Test that the route exists and responds (even if with an error due to missing data)
      const response = await request(app)
        .post('/api/horses/foals')
        .send({});

      // Should not be 404 (route not found)
      expect(response.status).not.toBe(404);

      // Should be 400 (validation error) since we sent empty data
      expect(response.status).toBe(400);
    });

    it('should return proper error structure', async() => {
      const response = await request(app)
        .post('/api/horses/foals')
        .send({
          name: 'Test'
          // Missing required fields
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('errors');
      expect(response.body.success).toBe(false);
      expect(typeof response.body.message).toBe('string');
      expect(Array.isArray(response.body.errors)).toBe(true);
    });
  });
});
