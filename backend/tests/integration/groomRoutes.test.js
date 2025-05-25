/**
 * Groom Routes Integration Tests
 * Tests for groom management API endpoints
 */

import request from 'supertest';
import app from '../../app.js';
import prisma from '../../db/index.js';

describe('Groom Routes Integration Tests', () => {
  let testFoal;
  let testGroom;
  let testBreed;
  let testPlayer;

  beforeAll(async () => {
    // Create test player
    testPlayer = await prisma.player.create({
      data: {
        name: `Test Player for Grooms ${Date.now()}`,
        email: `test-grooms-${Date.now()}@example.com`,
        money: 10000,
        level: 1,
        xp: 0,
        settings: {}
      }
    });

    // Create test breed
    testBreed = await prisma.breed.create({
      data: {
        name: `Test Breed for Grooms ${Date.now()}`,
        description: 'Test breed for groom testing'
      }
    });

    // Create test foal
    testFoal = await prisma.horse.create({
      data: {
        name: `Test Foal for Grooms ${Date.now()}`,
        age: 1,
        breedId: testBreed.id,
        playerId: testPlayer.id,
        bond_score: 50,
        stress_level: 20
      }
    });

    // Create test groom
    testGroom = await prisma.groom.create({
      data: {
        name: `Test Groom ${Date.now()}`,
        speciality: 'foal_care',
        experience: 5,
        skill_level: 'intermediate',
        personality: 'gentle',
        hourly_rate: 18.0,
        playerId: testPlayer.id,
        availability: { monday: true, tuesday: true, wednesday: true }
      }
    });
  });

  afterAll(async () => {
    // Clean up test data
    if (testFoal?.id) {
      await prisma.groomInteraction.deleteMany({ where: { foalId: testFoal.id } });
      await prisma.groomAssignment.deleteMany({ where: { foalId: testFoal.id } });
      await prisma.horse.delete({ where: { id: testFoal.id } });
    }
    if (testGroom?.id) {
      await prisma.groom.delete({ where: { id: testGroom.id } });
    }
    if (testBreed?.id) {
      await prisma.breed.delete({ where: { id: testBreed.id } });
    }
    if (testPlayer?.id) {
      await prisma.player.delete({ where: { id: testPlayer.id } });
    }
  });

  describe('POST /api/grooms/assign', () => {
    it('should assign groom to foal successfully', async () => {
      const response = await request(app)
        .post('/api/grooms/assign')
        .send({
          foalId: testFoal.id,
          groomId: testGroom.id,
          priority: 1,
          notes: 'Test assignment'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('foalId', testFoal.id);
      expect(response.body.data).toHaveProperty('groomId', testGroom.id);
      expect(response.body.data).toHaveProperty('priority', 1);
      expect(response.body.data).toHaveProperty('notes', 'Test assignment');
      expect(response.body.data).toHaveProperty('isActive', true);
    });

    it('should return validation error for missing required fields', async () => {
      const response = await request(app)
        .post('/api/grooms/assign')
        .send({
          foalId: testFoal.id
          // Missing groomId
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Validation failed');
      expect(response.body.errors).toBeDefined();
    });

    it('should return validation error for invalid foal ID', async () => {
      const response = await request(app)
        .post('/api/grooms/assign')
        .send({
          foalId: 'invalid',
          groomId: testGroom.id
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Validation failed');
    });

    it('should handle assignment to non-existent foal', async () => {
      const response = await request(app)
        .post('/api/grooms/assign')
        .send({
          foalId: 99999,
          groomId: testGroom.id
        })
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not found');
    });
  });

  describe('POST /api/grooms/ensure-default/:foalId', () => {
    it('should ensure default assignment for foal', async () => {
      // First, remove any existing assignments
      await prisma.groomAssignment.deleteMany({ where: { foalId: testFoal.id } });

      const response = await request(app)
        .post(`/api/grooms/ensure-default/${testFoal.id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('assignment');
      expect(response.body.data.assignment).toHaveProperty('foalId', testFoal.id);
      expect(response.body.data.assignment).toHaveProperty('isDefault', true);
    });

    it('should return existing assignment if one exists', async () => {
      // Ensure there's an assignment
      await request(app)
        .post('/api/grooms/assign')
        .send({
          foalId: testFoal.id,
          groomId: testGroom.id
        });

      const response = await request(app)
        .post(`/api/grooms/ensure-default/${testFoal.id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('isExisting', true);
    });

    it('should return validation error for invalid foal ID', async () => {
      const response = await request(app)
        .post('/api/grooms/ensure-default/invalid')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Validation failed');
    });
  });

  describe('GET /api/grooms/assignments/:foalId', () => {
    it('should get assignments for foal', async () => {
      const response = await request(app)
        .get(`/api/grooms/assignments/${testFoal.id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('foalId', testFoal.id);
      expect(response.body.data).toHaveProperty('assignments');
      expect(response.body.data).toHaveProperty('activeAssignments');
      expect(response.body.data).toHaveProperty('totalAssignments');
      expect(Array.isArray(response.body.data.assignments)).toBe(true);
    });

    it('should return validation error for invalid foal ID', async () => {
      const response = await request(app)
        .get('/api/grooms/assignments/invalid')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Validation failed');
    });
  });

  describe('POST /api/grooms/interact', () => {
    it('should record groom interaction successfully', async () => {
      const response = await request(app)
        .post('/api/grooms/interact')
        .send({
          foalId: testFoal.id,
          groomId: testGroom.id,
          interactionType: 'daily_care',
          duration: 60,
          notes: 'Test interaction'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('interaction');
      expect(response.body.data).toHaveProperty('effects');
      expect(response.body.data).toHaveProperty('foalUpdates');

      const interaction = response.body.data.interaction;
      expect(interaction).toHaveProperty('foalId', testFoal.id);
      expect(interaction).toHaveProperty('groomId', testGroom.id);
      expect(interaction).toHaveProperty('interactionType', 'daily_care');
      expect(interaction).toHaveProperty('duration', 60);

      const effects = response.body.data.effects;
      expect(effects).toHaveProperty('bondingChange');
      expect(effects).toHaveProperty('stressChange');
      expect(effects).toHaveProperty('cost');
      expect(effects).toHaveProperty('quality');
    });

    it('should return validation error for missing required fields', async () => {
      const response = await request(app)
        .post('/api/grooms/interact')
        .send({
          foalId: testFoal.id,
          groomId: testGroom.id
          // Missing interactionType and duration
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Validation failed');
    });

    it('should return validation error for invalid interaction type', async () => {
      const response = await request(app)
        .post('/api/grooms/interact')
        .send({
          foalId: testFoal.id,
          groomId: testGroom.id,
          interactionType: 'invalid_type',
          duration: 60
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Validation failed');
    });

    it('should return validation error for invalid duration', async () => {
      const response = await request(app)
        .post('/api/grooms/interact')
        .send({
          foalId: testFoal.id,
          groomId: testGroom.id,
          interactionType: 'daily_care',
          duration: 1000 // Too long
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Validation failed');
    });

    it('should return 404 for non-existent foal', async () => {
      const response = await request(app)
        .post('/api/grooms/interact')
        .send({
          foalId: 99999,
          groomId: testGroom.id,
          interactionType: 'daily_care',
          duration: 60
        })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Foal not found');
    });

    it('should return 404 for non-existent groom', async () => {
      const response = await request(app)
        .post('/api/grooms/interact')
        .send({
          foalId: testFoal.id,
          groomId: 99999,
          interactionType: 'daily_care',
          duration: 60
        })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Groom not found');
    });
  });

  describe('GET /api/grooms/player/:playerId', () => {
    it('should get grooms for player', async () => {
      const response = await request(app)
        .get(`/api/grooms/player/${testPlayer.id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('playerId', testPlayer.id);
      expect(response.body.data).toHaveProperty('grooms');
      expect(response.body.data).toHaveProperty('activeGrooms');
      expect(response.body.data).toHaveProperty('totalGrooms');
      expect(Array.isArray(response.body.data.grooms)).toBe(true);
      expect(response.body.data.grooms.length).toBeGreaterThan(0);
    });

    it('should return empty array for player with no grooms', async () => {
      const emptyPlayer = await prisma.player.create({
        data: {
          name: `Empty Player ${Date.now()}`,
          email: `empty-${Date.now()}@example.com`,
          money: 1000,
          level: 1,
          xp: 0,
          settings: {}
        }
      });

      const response = await request(app)
        .get(`/api/grooms/player/${emptyPlayer.id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.grooms).toHaveLength(0);

      // Clean up
      await prisma.player.delete({ where: { id: emptyPlayer.id } });
    });
  });

  describe('POST /api/grooms/hire', () => {
    it('should hire new groom successfully', async () => {
      const response = await request(app)
        .post('/api/grooms/hire')
        .send({
          name: 'New Test Groom',
          speciality: 'training',
          experience: 3,
          skill_level: 'novice',
          personality: 'energetic',
          hourly_rate: 15.0,
          bio: 'A new groom for testing'
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('name', 'New Test Groom');
      expect(response.body.data).toHaveProperty('speciality', 'training');
      expect(response.body.data).toHaveProperty('skill_level', 'novice');
      expect(response.body.data).toHaveProperty('personality', 'energetic');
      expect(response.body.data).toHaveProperty('hourly_rate', 15.0);

      // Clean up
      await prisma.groom.delete({ where: { id: response.body.data.id } });
    });

    it('should return validation error for missing required fields', async () => {
      const response = await request(app)
        .post('/api/grooms/hire')
        .send({
          name: 'Incomplete Groom'
          // Missing required fields
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Validation failed');
    });

    it('should return validation error for invalid speciality', async () => {
      const response = await request(app)
        .post('/api/grooms/hire')
        .send({
          name: 'Invalid Groom',
          speciality: 'invalid_specialty',
          skill_level: 'novice',
          personality: 'gentle'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Validation failed');
    });
  });

  describe('GET /api/grooms/definitions', () => {
    it('should get groom system definitions', async () => {
      const response = await request(app)
        .get('/api/grooms/definitions')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('specialties');
      expect(response.body.data).toHaveProperty('skillLevels');
      expect(response.body.data).toHaveProperty('personalities');
      expect(response.body.data).toHaveProperty('defaultGrooms');

      // Check structure of definitions
      const specialties = response.body.data.specialties;
      expect(specialties).toHaveProperty('foal_care');
      expect(specialties).toHaveProperty('general');
      expect(specialties).toHaveProperty('training');
      expect(specialties).toHaveProperty('medical');

      const skillLevels = response.body.data.skillLevels;
      expect(skillLevels).toHaveProperty('novice');
      expect(skillLevels).toHaveProperty('intermediate');
      expect(skillLevels).toHaveProperty('expert');
      expect(skillLevels).toHaveProperty('master');

      const personalities = response.body.data.personalities;
      expect(personalities).toHaveProperty('gentle');
      expect(personalities).toHaveProperty('energetic');
      expect(personalities).toHaveProperty('patient');
      expect(personalities).toHaveProperty('strict');
    });
  });
});
