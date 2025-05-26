/**
 * Groom System Tests
 * Tests for the groom assignment and management system
 */

import { jest } from '@jest/globals';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Mock dependencies
const mockPrisma = {
  horse: {
    findUnique: jest.fn(),
    update: jest.fn()
  },
  groom: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    findMany: jest.fn()
  },
  groomAssignment: {
    findFirst: jest.fn(),
    updateMany: jest.fn(),
    create: jest.fn(),
    findMany: jest.fn()
  },
  groomInteraction: {
    create: jest.fn(),
    findMany: jest.fn()
  }
};

const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
};

// Mock the imports
jest.unstable_mockModule(join(__dirname, '../db/index.js'), () => ({
  default: mockPrisma
}));

jest.unstable_mockModule(join(__dirname, '../utils/logger.js'), () => ({
  default: mockLogger
}));

// Import the module under test
const {
  assignGroomToFoal,
  ensureDefaultGroomAssignment,
  getOrCreateDefaultGroom,
  calculateGroomInteractionEffects,
  GROOM_SPECIALTIES,
  SKILL_LEVELS,
  PERSONALITY_TRAITS
} = await import(join(__dirname, '../utils/groomSystem.js'));

describe('Groom Assignment System', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('assignGroomToFoal', () => {
    const mockFoal = {
      id: 1,
      name: 'Test Foal',
      age: 1
    };

    const mockGroom = {
      id: 1,
      name: 'Sarah Johnson',
      speciality: 'foal_care',
      skill_level: 'intermediate',
      is_active: true,
      availability: { monday: true, tuesday: true }
    };

    it('should assign groom to foal successfully', async () => {
      mockPrisma.horse.findUnique.mockResolvedValue(mockFoal);
      mockPrisma.groom.findUnique.mockResolvedValue(mockGroom);
      mockPrisma.groomAssignment.findFirst.mockResolvedValue(null); // No existing assignment
      mockPrisma.groomAssignment.updateMany.mockResolvedValue({ count: 0 });
      mockPrisma.groomAssignment.create.mockResolvedValue({
        id: 1,
        foalId: 1,
        groomId: 1,
        priority: 1,
        isActive: true,
        groom: mockGroom,
        foal: mockFoal
      });

      const result = await assignGroomToFoal(1, 1, 'player-1');

      expect(result.success).toBe(true);
      expect(result.assignment.foalId).toBe(1);
      expect(result.assignment.groomId).toBe(1);
      expect(mockPrisma.groomAssignment.create).toHaveBeenCalledWith({
        data: {
          foalId: 1,
          groomId: 1,
          playerId: 'player-1',
          priority: 1,
          notes: null,
          isDefault: false,
          isActive: true
        },
        include: {
          groom: true,
          foal: {
            select: { id: true, name: true }
          }
        }
      });
    });

    it('should throw error when foal not found', async () => {
      mockPrisma.horse.findUnique.mockResolvedValue(null);

      await expect(assignGroomToFoal(999, 1, 'player-1')).rejects.toThrow('Foal with ID 999 not found');
    });

    it('should throw error when groom not found', async () => {
      mockPrisma.horse.findUnique.mockResolvedValue(mockFoal);
      mockPrisma.groom.findUnique.mockResolvedValue(null);

      await expect(assignGroomToFoal(1, 999, 'player-1')).rejects.toThrow('Groom with ID 999 not found');
    });

    it('should throw error when groom is not active', async () => {
      mockPrisma.horse.findUnique.mockResolvedValue(mockFoal);
      mockPrisma.groom.findUnique.mockResolvedValue({
        ...mockGroom,
        is_active: false
      });

      await expect(assignGroomToFoal(1, 1, 'player-1')).rejects.toThrow('Groom Sarah Johnson is not currently active');
    });

    it('should throw error when groom already assigned', async () => {
      mockPrisma.horse.findUnique.mockResolvedValue(mockFoal);
      mockPrisma.groom.findUnique.mockResolvedValue(mockGroom);
      mockPrisma.groomAssignment.findFirst.mockResolvedValue({
        id: 1,
        foalId: 1,
        groomId: 1,
        isActive: true
      });

      await expect(assignGroomToFoal(1, 1, 'player-1')).rejects.toThrow('Groom Sarah Johnson is already assigned to this foal');
    });

    it('should deactivate existing primary assignments when assigning new primary', async () => {
      mockPrisma.horse.findUnique.mockResolvedValue(mockFoal);
      mockPrisma.groom.findUnique.mockResolvedValue(mockGroom);
      mockPrisma.groomAssignment.findFirst.mockResolvedValue(null);
      mockPrisma.groomAssignment.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.groomAssignment.create.mockResolvedValue({
        id: 2,
        foalId: 1,
        groomId: 1,
        priority: 1,
        isActive: true,
        groom: mockGroom,
        foal: mockFoal
      });

      await assignGroomToFoal(1, 1, 'player-1', { priority: 1 });

      expect(mockPrisma.groomAssignment.updateMany).toHaveBeenCalledWith({
        where: {
          foalId: 1,
          priority: 1,
          isActive: true
        },
        data: {
          isActive: false,
          endDate: expect.any(Date)
        }
      });
    });
  });

  describe('ensureDefaultGroomAssignment', () => {
    it('should return existing assignment if one exists', async () => {
      const existingAssignment = {
        id: 1,
        foalId: 1,
        groomId: 1,
        isActive: true,
        groom: {
          id: 1,
          name: 'Sarah Johnson'
        }
      };

      mockPrisma.groomAssignment.findFirst.mockResolvedValue(existingAssignment);

      const result = await ensureDefaultGroomAssignment(1, 'player-1');

      expect(result.success).toBe(true);
      expect(result.isExisting).toBe(true);
      expect(result.assignment).toEqual(existingAssignment);
    });

    it('should create default assignment if none exists', async () => {
      mockPrisma.groomAssignment.findFirst.mockResolvedValue(null);
      mockPrisma.groom.findFirst.mockResolvedValue(null); // No existing groom
      mockPrisma.groom.create.mockResolvedValue({
        id: 1,
        name: 'Sarah Johnson',
        speciality: 'foal_care',
        playerId: 'player-1'
      });

      // Mock the assignGroomToFoal call
      mockPrisma.horse.findUnique.mockResolvedValue({ id: 1, name: 'Test Foal', age: 1 });
      mockPrisma.groom.findUnique.mockResolvedValue({
        id: 1,
        name: 'Sarah Johnson',
        speciality: 'foal_care',
        is_active: true
      });
      mockPrisma.groomAssignment.create.mockResolvedValue({
        id: 1,
        foalId: 1,
        groomId: 1,
        isDefault: true
      });

      const result = await ensureDefaultGroomAssignment(1, 'player-1');

      expect(result.success).toBe(true);
      expect(result.isNew).toBe(true);
    });
  });

  describe('calculateGroomInteractionEffects', () => {
    const mockGroom = {
      id: 1,
      name: 'Sarah Johnson',
      speciality: 'foal_care',
      skill_level: 'intermediate',
      personality: 'gentle',
      experience: 5,
      hourly_rate: 18.0
    };

    const mockFoal = {
      id: 1,
      name: 'Test Foal',
      bond_score: 50,
      stress_level: 20
    };

    it('should calculate bonding and stress effects correctly', () => {
      const effects = calculateGroomInteractionEffects(mockGroom, mockFoal, 'daily_care', 60);

      expect(effects).toHaveProperty('bondingChange');
      expect(effects).toHaveProperty('stressChange');
      expect(effects).toHaveProperty('cost');
      expect(effects).toHaveProperty('quality');
      expect(effects).toHaveProperty('modifiers');

      expect(effects.bondingChange).toBeGreaterThanOrEqual(0);
      expect(effects.bondingChange).toBeLessThanOrEqual(10);
      expect(effects.stressChange).toBeLessThanOrEqual(5);
      expect(effects.stressChange).toBeGreaterThanOrEqual(-10);
      expect(effects.cost).toBeGreaterThan(0);
      expect(['poor', 'fair', 'good', 'excellent']).toContain(effects.quality);
    });

    it('should apply specialty modifiers correctly', () => {
      const foalCareGroom = { ...mockGroom, speciality: 'foal_care' };
      const generalGroom = { ...mockGroom, speciality: 'general' };

      const foalCareEffects = calculateGroomInteractionEffects(foalCareGroom, mockFoal, 'daily_care', 60);
      const generalEffects = calculateGroomInteractionEffects(generalGroom, mockFoal, 'daily_care', 60);

      // Foal care specialist should generally have better bonding effects
      expect(foalCareEffects.modifiers.specialty).toBeGreaterThan(generalEffects.modifiers.specialty);
    });

    it('should apply skill level modifiers correctly', () => {
      const expertGroom = { ...mockGroom, skill_level: 'expert' };
      const noviceGroom = { ...mockGroom, skill_level: 'novice' };

      const expertEffects = calculateGroomInteractionEffects(expertGroom, mockFoal, 'daily_care', 60);
      const noviceEffects = calculateGroomInteractionEffects(noviceGroom, mockFoal, 'daily_care', 60);

      expect(expertEffects.modifiers.skillLevel).toBeGreaterThan(noviceEffects.modifiers.skillLevel);
      expect(expertEffects.cost).toBeGreaterThan(noviceEffects.cost);
    });

    it('should apply experience bonus correctly', () => {
      const experiencedGroom = { ...mockGroom, experience: 15 };
      const newGroom = { ...mockGroom, experience: 1 };

      const experiencedEffects = calculateGroomInteractionEffects(experiencedGroom, mockFoal, 'daily_care', 60);
      const newGroomEffects = calculateGroomInteractionEffects(newGroom, mockFoal, 'daily_care', 60);

      expect(experiencedEffects.modifiers.experience).toBeGreaterThan(newGroomEffects.modifiers.experience);
    });

    it('should scale effects with duration', () => {
      const shortEffects = calculateGroomInteractionEffects(mockGroom, mockFoal, 'daily_care', 30);
      const longEffects = calculateGroomInteractionEffects(mockGroom, mockFoal, 'daily_care', 120);

      expect(longEffects.cost).toBeGreaterThan(shortEffects.cost);
      // Longer interactions should generally have more effect (though randomness may affect this)
    });
  });

  describe('System Constants', () => {
    it('should have all required groom specialties', () => {
      expect(GROOM_SPECIALTIES).toHaveProperty('foal_care');
      expect(GROOM_SPECIALTIES).toHaveProperty('general');
      expect(GROOM_SPECIALTIES).toHaveProperty('training');
      expect(GROOM_SPECIALTIES).toHaveProperty('medical');

      Object.values(GROOM_SPECIALTIES).forEach(specialty => {
        expect(specialty).toHaveProperty('name');
        expect(specialty).toHaveProperty('description');
        expect(specialty).toHaveProperty('bondingModifier');
        expect(specialty).toHaveProperty('stressReduction');
        expect(specialty).toHaveProperty('preferredActivities');
      });
    });

    it('should have all required skill levels', () => {
      expect(SKILL_LEVELS).toHaveProperty('novice');
      expect(SKILL_LEVELS).toHaveProperty('intermediate');
      expect(SKILL_LEVELS).toHaveProperty('expert');
      expect(SKILL_LEVELS).toHaveProperty('master');

      Object.values(SKILL_LEVELS).forEach(level => {
        expect(level).toHaveProperty('name');
        expect(level).toHaveProperty('bondingModifier');
        expect(level).toHaveProperty('costModifier');
        expect(level).toHaveProperty('errorChance');
        expect(level).toHaveProperty('description');
      });
    });

    it('should have all required personality traits', () => {
      expect(PERSONALITY_TRAITS).toHaveProperty('gentle');
      expect(PERSONALITY_TRAITS).toHaveProperty('energetic');
      expect(PERSONALITY_TRAITS).toHaveProperty('patient');
      expect(PERSONALITY_TRAITS).toHaveProperty('strict');

      Object.values(PERSONALITY_TRAITS).forEach(trait => {
        expect(trait).toHaveProperty('name');
        expect(trait).toHaveProperty('bondingModifier');
        expect(trait).toHaveProperty('stressReduction');
        expect(trait).toHaveProperty('description');
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      mockPrisma.horse.findUnique.mockRejectedValue(new Error('Database connection failed'));

      await expect(assignGroomToFoal(1, 1, 'player-1')).rejects.toThrow('Database connection failed');
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should handle invalid groom data in calculations', () => {
      const invalidGroom = {
        id: 1,
        name: 'Invalid Groom',
        speciality: 'invalid_specialty',
        skill_level: 'invalid_level',
        personality: 'invalid_personality',
        experience: 5,
        hourly_rate: 18.0
      };

      // Should not throw error, should use defaults
      const effects = calculateGroomInteractionEffects(invalidGroom, { id: 1, bond_score: 50 }, 'daily_care', 60);

      expect(effects).toHaveProperty('bondingChange');
      expect(effects).toHaveProperty('stressChange');
      expect(effects).toHaveProperty('cost');
    });
  });
});
