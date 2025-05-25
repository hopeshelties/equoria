import { jest } from '@jest/globals';

// Mock the modules BEFORE importing the module under test
jest.unstable_mockModule('../db/index.js', () => ({
  default: {
    horse: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  }
}));

jest.unstable_mockModule('../utils/logger.js', () => ({
  default: {
    error: jest.fn(),
    info: jest.fn(),
  }
}));

// Now import the module under test and the mocks
const { createHorse, getHorseById, updateDisciplineScore, getDisciplineScores, incrementDisciplineScore } = await import('../models/horseModel.js');
const mockPrisma = (await import('../db/index.js')).default;
const mockLogger = (await import('../utils/logger.js')).default;

describe('horseModel - Additional Tests', () => {
  beforeEach(() => {
    // Clear all mock implementations and calls before each test
    mockPrisma.horse.create.mockClear();
    mockPrisma.horse.findUnique.mockClear();
    mockPrisma.horse.update.mockClear();
    mockLogger.error.mockClear();
    mockLogger.info.mockClear();
  });

describe('updateDisciplineScore', () => {
  it('should update discipline score for existing horse', async () => {
    const mockHorse = { id: 1, name: 'Test Horse', age: 4, breedId: 1 };
    const mockFoundHorse = { 
      id: 1, 
      disciplineScores: null,
      breed: { id: 1, name: 'Arabian' },
      owner: null,
      stable: null,
      player: null
    };
    const mockUpdatedHorse = { 
      id: 1, 
      disciplineScores: { 'Dressage': 5 },
      breed: { id: 1, name: 'Arabian' },
      owner: null,
      stable: null,
      player: null
    };
    
    mockPrisma.horse.create.mockResolvedValue(mockHorse);
    mockPrisma.horse.findUnique.mockResolvedValue(mockFoundHorse);
    mockPrisma.horse.update.mockResolvedValue(mockUpdatedHorse);

    const horse = await createHorse({
      name: 'Test Horse',
      age: 4,
      breedId: 1
    });

    const updatedHorse = await updateDisciplineScore(horse.id, 'Dressage', 5);

    expect(updatedHorse).toBeDefined();
    expect(updatedHorse.disciplineScores).toEqual({ 'Dressage': 5 });
    expect(updatedHorse.breed).toBeDefined();
  });

  it('should add to existing discipline score', async () => {
    const mockHorse = { id: 1, name: 'Test Horse', age: 4, breedId: 1 };
    const mockFoundHorse1 = { id: 1, disciplineScores: null };
    const mockFoundHorse2 = { id: 1, disciplineScores: { 'Dressage': 5 } };
    const mockUpdatedHorse1 = { id: 1, disciplineScores: { 'Dressage': 5 } };
    const mockUpdatedHorse2 = { id: 1, disciplineScores: { 'Dressage': 10 } };
    
    mockPrisma.horse.create.mockResolvedValue(mockHorse);
    mockPrisma.horse.findUnique
      .mockResolvedValueOnce(mockFoundHorse1)
      .mockResolvedValueOnce(mockFoundHorse2);
    mockPrisma.horse.update
      .mockResolvedValueOnce(mockUpdatedHorse1)
      .mockResolvedValueOnce(mockUpdatedHorse2);

    const horse = await createHorse({
      name: 'Test Horse',
      age: 4,
      breedId: 1
    });

    // First training session
    await updateDisciplineScore(horse.id, 'Dressage', 5);
    
    // Second training session
    const updatedHorse = await updateDisciplineScore(horse.id, 'Dressage', 5);

    expect(updatedHorse.disciplineScores).toEqual({ 'Dressage': 10 });
  });

  it('should handle multiple disciplines independently', async () => {
    const mockHorse = { id: 1, name: 'Test Horse', age: 4, breedId: 1 };
    const mockFoundHorse1 = { id: 1, disciplineScores: null };
    const mockFoundHorse2 = { id: 1, disciplineScores: { 'Dressage': 5 } };
    const mockUpdatedHorse1 = { id: 1, disciplineScores: { 'Dressage': 5 } };
    const mockUpdatedHorse2 = { id: 1, disciplineScores: { 'Dressage': 5, 'Show Jumping': 3 } };
    
    mockPrisma.horse.create.mockResolvedValue(mockHorse);
    mockPrisma.horse.findUnique
      .mockResolvedValueOnce(mockFoundHorse1)
      .mockResolvedValueOnce(mockFoundHorse2);
    mockPrisma.horse.update
      .mockResolvedValueOnce(mockUpdatedHorse1)
      .mockResolvedValueOnce(mockUpdatedHorse2);

    const horse = await createHorse({
      name: 'Test Horse',
      age: 4,
      breedId: 1
    });

    await updateDisciplineScore(horse.id, 'Dressage', 5);
    const updatedHorse = await updateDisciplineScore(horse.id, 'Show Jumping', 3);

    expect(updatedHorse.disciplineScores).toEqual({ 
      'Dressage': 5,
      'Show Jumping': 3
    });
  });

  it('should throw error for invalid horse ID', async () => {
    await expect(updateDisciplineScore(-1, 'Dressage', 5))
      .rejects.toThrow('Invalid horse ID provided');
    
    await expect(updateDisciplineScore('invalid', 'Dressage', 5))
      .rejects.toThrow('Invalid horse ID provided');
  });

  it('should throw error for non-existent horse', async () => {
    mockPrisma.horse.findUnique.mockResolvedValue(null);
    
    await expect(updateDisciplineScore(99999, 'Dressage', 5))
      .rejects.toThrow('Horse with ID 99999 not found');
  });

  it('should throw error for invalid discipline', async () => {
    const horse = await createHorse({
      name: 'Test Horse',
      age: 4,
      breedId: 1
    });

    await expect(updateDisciplineScore(horse.id, '', 5))
      .rejects.toThrow('Discipline must be a non-empty string');
    
    await expect(updateDisciplineScore(horse.id, null, 5))
      .rejects.toThrow('Discipline must be a non-empty string');
  });

  it('should throw error for invalid points', async () => {
    const horse = await createHorse({
      name: 'Test Horse',
      age: 4,
      breedId: 1
    });

    await expect(updateDisciplineScore(horse.id, 'Dressage', 0))
      .rejects.toThrow('Points to add must be a positive number');
    
    await expect(updateDisciplineScore(horse.id, 'Dressage', -5))
      .rejects.toThrow('Points to add must be a positive number');
    
    await expect(updateDisciplineScore(horse.id, 'Dressage', 'invalid'))
      .rejects.toThrow('Points to add must be a positive number');
  });
});

describe('getDisciplineScores', () => {
  it('should return empty object for horse with no scores', async () => {
    const mockHorse = { id: 1, name: 'Test Horse', age: 4, breedId: 1 };
    const mockHorseWithNoScores = { 
      id: 1, 
      disciplineScores: null
    };
    
    mockPrisma.horse.create.mockResolvedValue(mockHorse);
    mockPrisma.horse.findUnique.mockResolvedValue(mockHorseWithNoScores);

    const horse = await createHorse({
      name: 'Test Horse',
      age: 4,
      breedId: 1
    });

    const scores = await getDisciplineScores(horse.id);
    expect(scores).toEqual({});
  });

  it('should return discipline scores for horse with scores', async () => {
    const mockHorse = { id: 1, name: 'Test Horse', age: 4, breedId: 1 };
    const mockHorseWithScores = { 
      id: 1, 
      disciplineScores: { 'Dressage': 5, 'Show Jumping': 3 }
    };
    
    mockPrisma.horse.create.mockResolvedValue(mockHorse);
    mockPrisma.horse.findUnique.mockResolvedValue(mockHorseWithScores);

    const horse = await createHorse({
      name: 'Test Horse',
      age: 4,
      breedId: 1
    });

    const scores = await getDisciplineScores(horse.id);
    expect(scores).toEqual({
      'Dressage': 5,
      'Show Jumping': 3
    });
  });

  it('should throw error for invalid horse ID', async () => {
    await expect(getDisciplineScores(-1))
      .rejects.toThrow('Invalid horse ID provided');
    
    await expect(getDisciplineScores('invalid'))
      .rejects.toThrow('Invalid horse ID provided');
  });

  it('should throw error for non-existent horse', async () => {
    mockPrisma.horse.findUnique.mockResolvedValue(null);
    
    await expect(getDisciplineScores(99999))
      .rejects.toThrow('Horse with ID 99999 not found');
  });
}); 

}); // Close main describe block