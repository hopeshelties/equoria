import request from 'supertest';
import app from '../app.js';

describe('Foal Creation Integration Tests', () => {
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
      // Use existing horses from the test database (IDs 1 and 2 exist)
      const validFoalData = {
        name: 'Integration Test Foal',
        breedId: 1,
        sire_id: 1,
        dam_id: 2,
        sex: 'filly'
        // No foreign key references that might not exist
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
