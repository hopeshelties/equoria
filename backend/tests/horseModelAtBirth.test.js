/**
 * Horse Model At-Birth Traits Integration Tests
 * Tests for at-birth trait application during horse creation
 */


import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Mock dependencies
const mockPrisma = {
  horse: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn()
  },
  competitionResult: {
    findMany: jest.fn()
  }
};

const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn()
};

const mockAtBirthTraits = {
  applyEpigeneticTraitsAtBirth: jest.fn()
};

// Mock the imports
jest.unstable_mockModule(join(__dirname, '../db/index.js'), () => ({
  default: mockPrisma
}));

jest.unstable_mockModule(join(__dirname, '../utils/logger.js'), () => ({
  default: mockLogger
}));

jest.unstable_mockModule(join(__dirname, '../utils/atBirthTraits.js'), () => mockAtBirthTraits);

// Import the function after mocking
const { createHorse } = await import(join(__dirname, '../models/horseModel.js'));

describe('Horse Model At-Birth Traits Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createHorse with at-birth traits', () => {
    const mockCreatedHorse = {
      id: 1,
      name: 'Test Foal',
      age: 0,
      sire_id: 10,
      dam_id: 20,
      epigenetic_modifiers: {
        positive: ['hardy'],
        negative: [],
        hidden: []
      },
      breed: { id: 1, name: 'Thoroughbred' }
    };

    it('should apply at-birth traits for newborn with parents', async() => {
      const horseData = {
        name: 'Test Foal',
        age: 0,
        breedId: 1,
        sire_id: 10,
        dam_id: 20
      };

      const mockAtBirthResult = {
        traits: {
          positive: ['hardy'],
          negative: [],
          hidden: []
        },
        breedingAnalysis: {
          lineage: { disciplineSpecialization: false },
          inbreeding: { inbreedingDetected: false },
          conditions: { mareStress: 25, feedQuality: 70 }
        }
      };

      mockAtBirthTraits.applyEpigeneticTraitsAtBirth.mockResolvedValue(mockAtBirthResult);
      mockPrisma.horse.create.mockResolvedValue(mockCreatedHorse);

      const result = await createHorse(horseData);

      // Verify at-birth trait function was called
      expect(mockAtBirthTraits.applyEpigeneticTraitsAtBirth).toHaveBeenCalledWith({
        sireId: 10,
        damId: 20,
        mareStress: undefined,
        feedQuality: undefined
      });

      // Verify horse was created with traits
      expect(mockPrisma.horse.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'Test Foal',
          age: 0,
          breedId: 1,
          sire_id: 10,
          dam_id: 20,
          epigenetic_modifiers: {
            positive: ['hardy'],
            negative: [],
            hidden: []
          }
        }),
        include: {
          breed: true,
          owner: true,
          stable: true,
          player: true
        }
      });

      expect(result).toEqual(mockCreatedHorse);
    });

    it('should pass custom mare stress and feed quality', async() => {
      const horseData = {
        name: 'Test Foal',
        age: 0,
        breedId: 1,
        sire_id: 10,
        dam_id: 20,
        mareStress: 15,
        feedQuality: 85
      };

      const mockAtBirthResult = {
        traits: {
          positive: ['hardy', 'premium_care'],
          negative: [],
          hidden: []
        },
        breedingAnalysis: {
          lineage: { disciplineSpecialization: false },
          inbreeding: { inbreedingDetected: false },
          conditions: { mareStress: 15, feedQuality: 85 }
        }
      };

      mockAtBirthTraits.applyEpigeneticTraitsAtBirth.mockResolvedValue(mockAtBirthResult);
      mockPrisma.horse.create.mockResolvedValue({
        ...mockCreatedHorse,
        epigenetic_modifiers: mockAtBirthResult.traits
      });

      await createHorse(horseData);

      expect(mockAtBirthTraits.applyEpigeneticTraitsAtBirth).toHaveBeenCalledWith({
        sireId: 10,
        damId: 20,
        mareStress: 15,
        feedQuality: 85
      });
    });

    it('should merge at-birth traits with existing traits', async() => {
      const horseData = {
        name: 'Test Foal',
        age: 0,
        breedId: 1,
        sire_id: 10,
        dam_id: 20,
        epigenetic_modifiers: {
          positive: ['existing_trait'],
          negative: ['existing_negative'],
          hidden: []
        }
      };

      const mockAtBirthResult = {
        traits: {
          positive: ['hardy'],
          negative: [],
          hidden: ['hidden_trait']
        },
        breedingAnalysis: {}
      };

      mockAtBirthTraits.applyEpigeneticTraitsAtBirth.mockResolvedValue(mockAtBirthResult);
      mockPrisma.horse.create.mockResolvedValue(mockCreatedHorse);

      await createHorse(horseData);

      expect(mockPrisma.horse.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          epigenetic_modifiers: {
            positive: ['existing_trait', 'hardy'],
            negative: ['existing_negative'],
            hidden: ['hidden_trait']
          }
        }),
        include: expect.any(Object)
      });
    });

    it('should not apply at-birth traits for older horses', async() => {
      const horseData = {
        name: 'Adult Horse',
        age: 5,
        breedId: 1,
        sire_id: 10,
        dam_id: 20
      };

      mockPrisma.horse.create.mockResolvedValue({
        ...mockCreatedHorse,
        name: 'Adult Horse',
        age: 5
      });

      await createHorse(horseData);

      // Should not call at-birth trait function
      expect(mockAtBirthTraits.applyEpigeneticTraitsAtBirth).not.toHaveBeenCalled();

      // Should create horse with default empty traits
      expect(mockPrisma.horse.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          epigenetic_modifiers: { positive: [], negative: [], hidden: [] }
        }),
        include: expect.any(Object)
      });
    });

    it('should not apply at-birth traits for horses without parents', async() => {
      const horseData = {
        name: 'Foundling Horse',
        age: 0,
        breedId: 1
        // No sire_id or dam_id
      };

      mockPrisma.horse.create.mockResolvedValue({
        ...mockCreatedHorse,
        name: 'Foundling Horse',
        sire_id: null,
        dam_id: null
      });

      await createHorse(horseData);

      expect(mockAtBirthTraits.applyEpigeneticTraitsAtBirth).not.toHaveBeenCalled();
    });

    it('should continue horse creation even if at-birth trait application fails', async() => {
      const horseData = {
        name: 'Test Foal',
        age: 0,
        breedId: 1,
        sire_id: 10,
        dam_id: 20
      };

      // Mock trait application failure
      mockAtBirthTraits.applyEpigeneticTraitsAtBirth.mockRejectedValue(new Error('Trait application failed'));
      mockPrisma.horse.create.mockResolvedValue(mockCreatedHorse);

      const result = await createHorse(horseData);

      // Should still create the horse
      expect(mockPrisma.horse.create).toHaveBeenCalled();
      expect(result).toEqual(mockCreatedHorse);

      // Should log the error
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Error applying at-birth traits: Trait application failed')
      );
    });

    it('should handle missing sire_id gracefully', async() => {
      const horseData = {
        name: 'Test Foal',
        age: 0,
        breedId: 1,
        dam_id: 20
        // Missing sire_id
      };

      mockPrisma.horse.create.mockResolvedValue(mockCreatedHorse);

      await createHorse(horseData);

      expect(mockAtBirthTraits.applyEpigeneticTraitsAtBirth).not.toHaveBeenCalled();
    });

    it('should handle missing dam_id gracefully', async() => {
      const horseData = {
        name: 'Test Foal',
        age: 0,
        breedId: 1,
        sire_id: 10
        // Missing dam_id
      };

      mockPrisma.horse.create.mockResolvedValue(mockCreatedHorse);

      await createHorse(horseData);

      expect(mockAtBirthTraits.applyEpigeneticTraitsAtBirth).not.toHaveBeenCalled();
    });

    it('should log breeding analysis information', async() => {
      const horseData = {
        name: 'Test Foal',
        age: 0,
        breedId: 1,
        sire_id: 10,
        dam_id: 20
      };

      const mockAtBirthResult = {
        traits: {
          positive: ['specialized_lineage'],
          negative: ['inbred'],
          hidden: []
        },
        breedingAnalysis: {
          lineage: {
            disciplineSpecialization: true,
            specializedDiscipline: 'Racing'
          },
          inbreeding: {
            inbreedingDetected: true,
            commonAncestors: [{ id: 100, name: 'CommonAncestor' }]
          },
          conditions: { mareStress: 25, feedQuality: 70 }
        }
      };

      mockAtBirthTraits.applyEpigeneticTraitsAtBirth.mockResolvedValue(mockAtBirthResult);
      mockPrisma.horse.create.mockResolvedValue(mockCreatedHorse);

      await createHorse(horseData);

      // Should log the breeding analysis
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Breeding analysis - Lineage specialization: true, Inbreeding: true')
      );
    });
  });
});
