import { jest } from '@jest/globals';

// Mock the trainingModel functions
const mockGetHorseAge = jest.fn();
const mockGetLastTrainingDate = jest.fn();
const mockLogTrainingSession = jest.fn();

// Mock the horseModel functions
const mockIncrementDisciplineScore = jest.fn();
const mockGetHorseById = jest.fn();

// Mock the playerModel functions
const mockGetPlayerWithHorses = jest.fn();

jest.unstable_mockModule('../models/trainingModel.js', () => ({
  getHorseAge: mockGetHorseAge,
  getLastTrainingDate: mockGetLastTrainingDate,
  logTrainingSession: mockLogTrainingSession
}));

jest.unstable_mockModule('../models/horseModel.js', () => ({
  incrementDisciplineScore: mockIncrementDisciplineScore,
  getHorseById: mockGetHorseById
}));

jest.unstable_mockModule('../models/playerModel.js', () => ({
  getPlayerWithHorses: mockGetPlayerWithHorses
}));

// Import the module after mocking
const { canTrain, trainHorse, getTrainingStatus, getTrainableHorses } = await import('../controllers/trainingController.js');

describe('trainingController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetPlayerWithHorses.mockClear();
  });

  describe('canTrain', () => {
    it('should return eligible true for horse that meets all requirements', async () => {
      mockGetHorseAge.mockResolvedValue(5); // Horse is 5 years old
      mockGetLastTrainingDate.mockResolvedValue(null); // Never trained before

      const result = await canTrain(1, 'Racing');

      expect(result).toEqual({
        eligible: true,
        reason: null
      });
      expect(mockGetHorseAge).toHaveBeenCalledWith(1);
      expect(mockGetLastTrainingDate).toHaveBeenCalledWith(1, 'Racing');
    });

    it('should return eligible false for horse under 3 years old', async () => {
      mockGetHorseAge.mockResolvedValue(2); // Horse is 2 years old

      const result = await canTrain(1, 'Racing');

      expect(result).toEqual({
        eligible: false,
        reason: 'Horse is under age'
      });
      expect(mockGetHorseAge).toHaveBeenCalledWith(1);
      expect(mockGetLastTrainingDate).not.toHaveBeenCalled();
    });

    it('should return eligible false for horse not found', async () => {
      mockGetHorseAge.mockResolvedValue(null); // Horse not found

      const result = await canTrain(999, 'Racing');

      expect(result).toEqual({
        eligible: false,
        reason: 'Horse not found'
      });
      expect(mockGetHorseAge).toHaveBeenCalledWith(999);
      expect(mockGetLastTrainingDate).not.toHaveBeenCalled();
    });

    it('should return eligible false for horse in cooldown period', async () => {
      mockGetHorseAge.mockResolvedValue(4); // Horse is 4 years old
      const twoDaysAgo = new Date(Date.now() - (2 * 24 * 60 * 60 * 1000)); // 2 days ago
      mockGetLastTrainingDate.mockResolvedValue(twoDaysAgo);

      const result = await canTrain(1, 'Racing');

      expect(result).toEqual({
        eligible: false,
        reason: 'Training cooldown active'
      });
      expect(mockGetHorseAge).toHaveBeenCalledWith(1);
      expect(mockGetLastTrainingDate).toHaveBeenCalledWith(1, 'Racing');
    });

    it('should return eligible true for horse past cooldown period', async () => {
      mockGetHorseAge.mockResolvedValue(4); // Horse is 4 years old
      const eightDaysAgo = new Date(Date.now() - (8 * 24 * 60 * 60 * 1000)); // 8 days ago
      mockGetLastTrainingDate.mockResolvedValue(eightDaysAgo);

      const result = await canTrain(1, 'Racing');

      expect(result).toEqual({
        eligible: true,
        reason: null
      });
      expect(mockGetHorseAge).toHaveBeenCalledWith(1);
      expect(mockGetLastTrainingDate).toHaveBeenCalledWith(1, 'Racing');
    });

    it('should return eligible true for horse exactly 3 years old', async () => {
      mockGetHorseAge.mockResolvedValue(3); // Horse is exactly 3 years old
      mockGetLastTrainingDate.mockResolvedValue(null);

      const result = await canTrain(1, 'Racing');

      expect(result).toEqual({
        eligible: true,
        reason: null
      });
    });

    it('should throw error for missing horse ID', async () => {
      await expect(canTrain(null, 'Racing'))
        .rejects.toThrow('Horse ID is required');
      
      await expect(canTrain(undefined, 'Racing'))
        .rejects.toThrow('Horse ID is required');
    });

    it('should throw error for missing discipline', async () => {
      await expect(canTrain(1, ''))
        .rejects.toThrow('Discipline is required');
      
      await expect(canTrain(1, null))
        .rejects.toThrow('Discipline is required');
    });

    it('should throw error for invalid horse ID', async () => {
      await expect(canTrain(-1, 'Racing'))
        .rejects.toThrow('Horse ID must be a positive integer');
      
      await expect(canTrain(0, 'Racing'))
        .rejects.toThrow('Horse ID must be a positive integer');
      
      await expect(canTrain('invalid', 'Racing'))
        .rejects.toThrow('Horse ID must be a positive integer');
    });

    it('should handle database errors gracefully', async () => {
      mockGetHorseAge.mockRejectedValue(new Error('Database connection failed'));

      await expect(canTrain(1, 'Racing'))
        .rejects.toThrow('Training eligibility check failed: Database connection failed');
    });
  });

  describe('trainHorse', () => {
    it('should successfully train eligible horse', async () => {
      mockGetHorseAge.mockResolvedValue(4);
      mockGetLastTrainingDate.mockResolvedValue(null);
      const mockTrainingLog = {
        id: 1,
        horse_id: 1,
        discipline: 'Racing',
        trained_at: new Date()
      };
      const mockUpdatedHorse = {
        id: 1,
        name: 'Test Horse',
        disciplineScores: { 'Racing': 5 },
        breed: { id: 1, name: 'Thoroughbred' }
      };
      mockLogTrainingSession.mockResolvedValue(mockTrainingLog);
      mockIncrementDisciplineScore.mockResolvedValue(mockUpdatedHorse);

      const result = await trainHorse(1, 'Racing');

      expect(result.success).toBe(true);
      expect(result.updatedHorse).toEqual(mockUpdatedHorse);
      expect(result.message).toBe('Horse trained successfully in Racing. +5 added.');
      expect(result.nextEligible).toBeDefined();
      expect(mockLogTrainingSession).toHaveBeenCalledWith({ horseId: 1, discipline: 'Racing' });
      expect(mockIncrementDisciplineScore).toHaveBeenCalledWith(1, 'Racing');
    });

    it('should reject training for ineligible horse (under age)', async () => {
      mockGetHorseAge.mockResolvedValue(2);

      const result = await trainHorse(1, 'Racing');

      expect(result).toEqual({
        success: false,
        reason: 'Horse is under age',
        updatedHorse: null,
        message: 'Training not allowed: Horse is under age',
        nextEligible: null
      });
      expect(mockLogTrainingSession).not.toHaveBeenCalled();
      expect(mockIncrementDisciplineScore).not.toHaveBeenCalled();
    });

    it('should reject training for horse in cooldown', async () => {
      mockGetHorseAge.mockResolvedValue(4);
      const oneDayAgo = new Date(Date.now() - (1 * 24 * 60 * 60 * 1000));
      mockGetLastTrainingDate.mockResolvedValue(oneDayAgo);

      const result = await trainHorse(1, 'Racing');

      expect(result).toEqual({
        success: false,
        reason: 'Training cooldown active',
        updatedHorse: null,
        message: 'Training not allowed: Training cooldown active',
        nextEligible: null
      });
      expect(mockLogTrainingSession).not.toHaveBeenCalled();
      expect(mockIncrementDisciplineScore).not.toHaveBeenCalled();
    });

    it('should handle training log errors gracefully', async () => {
      mockGetHorseAge.mockResolvedValue(4);
      mockGetLastTrainingDate.mockResolvedValue(null);
      mockLogTrainingSession.mockRejectedValue(new Error('Failed to log training'));

      await expect(trainHorse(1, 'Racing'))
        .rejects.toThrow('Training failed: Failed to log training');
    });
  });

  describe('getTrainingStatus', () => {
    it('should return complete status for eligible horse with no training history', async () => {
      mockGetHorseAge.mockResolvedValue(5);
      mockGetLastTrainingDate.mockResolvedValue(null);

      const result = await getTrainingStatus(1, 'Racing');

      expect(result).toEqual({
        eligible: true,
        reason: null,
        horseAge: 5,
        lastTrainingDate: null,
        cooldown: null
      });
    });

    it('should return complete status for horse in active cooldown', async () => {
      mockGetHorseAge.mockResolvedValue(4);
      const twoDaysAgo = new Date(Date.now() - (2 * 24 * 60 * 60 * 1000));
      mockGetLastTrainingDate.mockResolvedValue(twoDaysAgo);

      const result = await getTrainingStatus(1, 'Racing');

      expect(result.eligible).toBe(false);
      expect(result.reason).toBe('Training cooldown active');
      expect(result.horseAge).toBe(4);
      expect(result.lastTrainingDate).toEqual(twoDaysAgo);
      expect(result.cooldown.active).toBe(true);
      expect(result.cooldown.remainingDays).toBeGreaterThan(0);
      expect(result.cooldown.remainingHours).toBeGreaterThan(0);
    });

    it('should return complete status for horse with expired cooldown', async () => {
      mockGetHorseAge.mockResolvedValue(4);
      const eightDaysAgo = new Date(Date.now() - (8 * 24 * 60 * 60 * 1000));
      mockGetLastTrainingDate.mockResolvedValue(eightDaysAgo);

      const result = await getTrainingStatus(1, 'Racing');

      expect(result.eligible).toBe(true);
      expect(result.reason).toBe(null);
      expect(result.horseAge).toBe(4);
      expect(result.lastTrainingDate).toEqual(eightDaysAgo);
      expect(result.cooldown.active).toBe(false);
      expect(result.cooldown.remainingDays).toBe(0);
      expect(result.cooldown.remainingHours).toBe(0);
    });

    it('should return status for ineligible horse (under age)', async () => {
      mockGetHorseAge.mockResolvedValue(2);
      mockGetLastTrainingDate.mockResolvedValue(null);

      const result = await getTrainingStatus(1, 'Racing');

      expect(result).toEqual({
        eligible: false,
        reason: 'Horse is under age',
        horseAge: 2,
        lastTrainingDate: null,
        cooldown: null
      });
    });

    it('should handle database errors gracefully', async () => {
      mockGetHorseAge.mockRejectedValue(new Error('Database error'));

      await expect(getTrainingStatus(1, 'Racing'))
        .rejects.toThrow('Training status check failed: Training eligibility check failed: Database error');
    });
  });

  describe('Integration scenarios', () => {
    it('should handle different disciplines independently', async () => {
      mockGetHorseAge.mockResolvedValue(4);
      
      // Horse trained in Racing 2 days ago, but never in Show Jumping
      mockGetLastTrainingDate
        .mockResolvedValueOnce(new Date(Date.now() - (2 * 24 * 60 * 60 * 1000))) // Racing
        .mockResolvedValueOnce(null); // Show Jumping

      const racingResult = await canTrain(1, 'Racing');
      const jumpingResult = await canTrain(1, 'Show Jumping');

      expect(racingResult.eligible).toBe(false);
      expect(racingResult.reason).toBe('Training cooldown active');
      
      expect(jumpingResult.eligible).toBe(true);
      expect(jumpingResult.reason).toBe(null);
    });

    it('should handle edge case of exactly 7 days cooldown', async () => {
      mockGetHorseAge.mockResolvedValue(4);
      const exactlySevenDaysAgo = new Date(Date.now() - (7 * 24 * 60 * 60 * 1000));
      mockGetLastTrainingDate.mockResolvedValue(exactlySevenDaysAgo);

      const result = await canTrain(1, 'Racing');

      expect(result.eligible).toBe(true);
      expect(result.reason).toBe(null);
    });

    it('should handle complete training workflow', async () => {
      // First check - horse is eligible
      mockGetHorseAge.mockResolvedValue(4);
      mockGetLastTrainingDate.mockResolvedValue(null);
      
      const eligibilityCheck = await canTrain(1, 'Racing');
      expect(eligibilityCheck.eligible).toBe(true);

      // Train the horse
      const mockTrainingLog = { id: 1, horse_id: 1, discipline: 'Racing', trained_at: new Date() };
      mockLogTrainingSession.mockResolvedValue(mockTrainingLog);
      
      const trainingResult = await trainHorse(1, 'Racing');
      expect(trainingResult.success).toBe(true);

      // Check status after training
      mockGetLastTrainingDate.mockResolvedValue(new Date()); // Just trained
      
      const statusResult = await getTrainingStatus(1, 'Racing');
      expect(statusResult.eligible).toBe(false);
      expect(statusResult.reason).toBe('Training cooldown active');
    });
  });

  describe('getTrainableHorses', () => {

    it('should return trainable horses for player with eligible horses', async () => {
      const playerId = 'test-player-123';
      const mockPlayer = {
        id: playerId,
        name: 'Test Player',
        horses: [
          { id: 1, name: 'Thunder', age: 5 },
          { id: 2, name: 'Lightning', age: 4 },
          { id: 3, name: 'Storm', age: 2 } // Too young
        ]
      };

      mockGetPlayerWithHorses.mockResolvedValue(mockPlayer);
      mockGetLastTrainingDate
        .mockResolvedValueOnce(null) // Thunder - Racing: never trained
        .mockResolvedValueOnce(null) // Thunder - Show Jumping: never trained
        .mockResolvedValueOnce(null) // Thunder - Dressage: never trained
        .mockResolvedValueOnce(null) // Thunder - Cross Country: never trained
        .mockResolvedValueOnce(null) // Thunder - Western: never trained
        .mockResolvedValueOnce(new Date(Date.now() - (8 * 24 * 60 * 60 * 1000))) // Lightning - Racing: 8 days ago (eligible)
        .mockResolvedValueOnce(new Date(Date.now() - (2 * 24 * 60 * 60 * 1000))) // Lightning - Show Jumping: 2 days ago (not eligible)
        .mockResolvedValueOnce(null) // Lightning - Dressage: never trained
        .mockResolvedValueOnce(null) // Lightning - Cross Country: never trained
        .mockResolvedValueOnce(null); // Lightning - Western: never trained

      const result = await getTrainableHorses(playerId);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        horseId: 1,
        name: 'Thunder',
        age: 5,
        trainableDisciplines: ['Racing', 'Show Jumping', 'Dressage', 'Cross Country', 'Western']
      });
      expect(result[1]).toEqual({
        horseId: 2,
        name: 'Lightning',
        age: 4,
        trainableDisciplines: ['Racing', 'Dressage', 'Cross Country', 'Western']
      });
    });

    it('should return empty array for player with no horses', async () => {
      const playerId = 'test-player-123';
      const mockPlayer = {
        id: playerId,
        name: 'Test Player',
        horses: []
      };

      mockGetPlayerWithHorses.mockResolvedValue(mockPlayer);

      const result = await getTrainableHorses(playerId);

      expect(result).toEqual([]);
    });

    it('should return empty array for non-existent player', async () => {
      const playerId = 'non-existent-player';
      mockGetPlayerWithHorses.mockResolvedValue(null);

      const result = await getTrainableHorses(playerId);

      expect(result).toEqual([]);
    });

    it('should filter out horses under 3 years old', async () => {
      const playerId = 'test-player-123';
      const mockPlayer = {
        id: playerId,
        name: 'Test Player',
        horses: [
          { id: 1, name: 'Young Horse', age: 1 },
          { id: 2, name: 'Baby Horse', age: 2 },
          { id: 3, name: 'Adult Horse', age: 3 }
        ]
      };

      mockGetPlayerWithHorses.mockResolvedValue(mockPlayer);
      mockGetLastTrainingDate.mockResolvedValue(null); // Adult horse never trained

      const result = await getTrainableHorses(playerId);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Adult Horse');
      expect(result[0].age).toBe(3);
    });

    it('should exclude horses with no trainable disciplines (all in cooldown)', async () => {
      const playerId = 'test-player-123';
      const mockPlayer = {
        id: playerId,
        name: 'Test Player',
        horses: [
          { id: 1, name: 'Busy Horse', age: 5 }
        ]
      };

      mockGetPlayerWithHorses.mockResolvedValue(mockPlayer);
      // All disciplines trained recently (within 7 days)
      const recentDate = new Date(Date.now() - (2 * 24 * 60 * 60 * 1000)); // 2 days ago
      mockGetLastTrainingDate.mockResolvedValue(recentDate);

      const result = await getTrainableHorses(playerId);

      expect(result).toEqual([]);
    });

    it('should handle database errors gracefully for individual disciplines', async () => {
      const playerId = 'test-player-123';
      const mockPlayer = {
        id: playerId,
        name: 'Test Player',
        horses: [
          { id: 1, name: 'Test Horse', age: 5 }
        ]
      };

      mockGetPlayerWithHorses.mockResolvedValue(mockPlayer);
      mockGetLastTrainingDate
        .mockRejectedValueOnce(new Error('Database error for Racing'))
        .mockResolvedValueOnce(null) // Show Jumping: never trained
        .mockResolvedValueOnce(null) // Dressage: never trained
        .mockResolvedValueOnce(null) // Cross Country: never trained
        .mockResolvedValueOnce(null); // Western: never trained

      const result = await getTrainableHorses(playerId);

      expect(result).toHaveLength(1);
      expect(result[0].trainableDisciplines).toEqual(['Show Jumping', 'Dressage', 'Cross Country', 'Western']);
      // Racing should be excluded due to error, but other disciplines should still be included
    });

    it('should throw error for missing player ID', async () => {
      await expect(getTrainableHorses(null))
        .rejects.toThrow('Player ID is required');
      
      await expect(getTrainableHorses(''))
        .rejects.toThrow('Player ID is required');
    });

    it('should handle player model errors', async () => {
      const playerId = 'test-player-123';
      mockGetPlayerWithHorses.mockRejectedValue(new Error('Player database error'));
      
      await expect(getTrainableHorses(playerId))
        .rejects.toThrow('Failed to get trainable horses: Player database error');
    });
  });

  describe('trainRouteHandler', () => {
    let mockReq, mockRes;

    beforeEach(() => {
      mockReq = {
        body: {
          horseId: 1,
          discipline: 'Dressage'
        }
      };
      mockRes = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis()
      };
    });

    it('should return success response with correct format for successful training', async () => {
      // Mock successful training
      mockGetHorseAge.mockResolvedValue(4);
      mockGetLastTrainingDate.mockResolvedValue(null);
      const mockTrainingLog = {
        id: 1,
        horse_id: 1,
        discipline: 'Dressage',
        trained_at: new Date()
      };
      const mockUpdatedHorse = {
        id: 1,
        name: 'Nova',
        disciplineScores: { 'Dressage': 25 },
        breed: { id: 1, name: 'Thoroughbred' }
      };
      mockLogTrainingSession.mockResolvedValue(mockTrainingLog);
      mockIncrementDisciplineScore.mockResolvedValue(mockUpdatedHorse);

      const { trainRouteHandler } = await import('../controllers/trainingController.js');
      await trainRouteHandler(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Nova trained in Dressage. +5 added.',
        updatedScore: 25,
        nextEligibleDate: expect.any(String)
      });
      expect(mockRes.status).not.toHaveBeenCalled(); // Should not set error status
    });

    it('should return failure response for ineligible horse (under age)', async () => {
      mockGetHorseAge.mockResolvedValue(2);

      const { trainRouteHandler } = await import('../controllers/trainingController.js');
      await trainRouteHandler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Training not allowed: Horse is under age'
      });
    });

    it('should return failure response for horse in cooldown', async () => {
      mockGetHorseAge.mockResolvedValue(4);
      const twoDaysAgo = new Date(Date.now() - (2 * 24 * 60 * 60 * 1000));
      mockGetLastTrainingDate.mockResolvedValue(twoDaysAgo);

      const { trainRouteHandler } = await import('../controllers/trainingController.js');
      await trainRouteHandler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Training not allowed: Training cooldown active'
      });
    });

    it('should handle missing discipline score gracefully', async () => {
      mockGetHorseAge.mockResolvedValue(4);
      mockGetLastTrainingDate.mockResolvedValue(null);
      const mockTrainingLog = {
        id: 1,
        horse_id: 1,
        discipline: 'Dressage',
        trained_at: new Date()
      };
      const mockUpdatedHorse = {
        id: 1,
        name: 'Nova',
        disciplineScores: null, // No discipline scores
        breed: { id: 1, name: 'Thoroughbred' }
      };
      mockLogTrainingSession.mockResolvedValue(mockTrainingLog);
      mockIncrementDisciplineScore.mockResolvedValue(mockUpdatedHorse);

      const { trainRouteHandler } = await import('../controllers/trainingController.js');
      await trainRouteHandler(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Nova trained in Dressage. +5 added.',
        updatedScore: 0, // Should default to 0 when no scores exist
        nextEligibleDate: expect.any(String)
      });
    });

    it('should handle server errors gracefully', async () => {
      mockGetHorseAge.mockRejectedValue(new Error('Database connection failed'));

      const { trainRouteHandler } = await import('../controllers/trainingController.js');
      await trainRouteHandler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to train horse',
        error: expect.any(String)
      });
    });
  });
}); 