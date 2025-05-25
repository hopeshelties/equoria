import { jest } from '@jest/globals';

// Mock dependencies
const mockHorseModel = {
  getHorseById: jest.fn()
};

const mockResultModel = {
  saveResult: jest.fn(),
  getResultsByShow: jest.fn()
};

const mockSimulateCompetition = jest.fn();

const mockIsHorseEligibleForShow = jest.fn();

const mockCompetitionRewards = {
  calculatePrizeDistribution: jest.fn(),
  calculateStatGains: jest.fn(),
  calculateEntryFees: jest.fn(),
  hasValidRider: jest.fn()
};

const mockHorseUpdates = {
  updateHorseRewards: jest.fn()
};

const mockPlayerUpdates = {
  transferEntryFees: jest.fn()
};

// Mock the imports
jest.unstable_mockModule('../models/horseModel.js', () => mockHorseModel);
jest.unstable_mockModule('../models/resultModel.js', () => mockResultModel);
jest.unstable_mockModule('../logic/simulateCompetition.js', () => ({
  simulateCompetition: mockSimulateCompetition
}));
jest.unstable_mockModule('../utils/isHorseEligible.js', () => ({
  isHorseEligibleForShow: mockIsHorseEligibleForShow
}));
jest.unstable_mockModule('../utils/competitionRewards.js', () => mockCompetitionRewards);
jest.unstable_mockModule('../utils/horseUpdates.js', () => mockHorseUpdates);
jest.unstable_mockModule('../utils/playerUpdates.js', () => mockPlayerUpdates);

// Import the module under test after mocking
const { enterAndRunShow } = await import('../controllers/competitionController.js');

describe('competitionController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('enterAndRunShow', () => {
    const mockShow = {
      id: 1,
      name: 'Spring Classic',
      discipline: 'Racing',
      levelMin: 1,
      levelMax: 5,
      entryFee: 100,
      prize: 1000,
      runDate: new Date('2024-05-25')
    };

    const createMockHorse = (id, name, overrides = {}) => ({
      id,
      name,
      age: 5,
      speed: 70,
      stamina: 60,
      focus: 50,
      trait: 'Swift',
      health_status: 'Good',
      breed: { name: 'Thoroughbred' },
      owner: { name: 'Test Owner' },
      stable: { name: 'Test Stable' },
      rider: { name: 'Test Rider', skill: 80 }, // Add default rider
      ...overrides
    });

    it('should successfully enter and run show with 5 horses', async () => {
      const horseIds = [1, 2, 3, 4, 5];
      const mockHorses = [
        createMockHorse(1, 'Thunder', { speed: 90 }),
        createMockHorse(2, 'Lightning', { speed: 85 }),
        createMockHorse(3, 'Storm', { speed: 80 }),
        createMockHorse(4, 'Wind', { speed: 75 }),
        createMockHorse(5, 'Breeze', { speed: 70 })
      ];

      const mockSimulationResults = [
        { horseId: 1, name: 'Thunder', score: 95.5, placement: '1st' },
        { horseId: 2, name: 'Lightning', score: 88.2, placement: '2nd' },
        { horseId: 3, name: 'Storm', score: 82.1, placement: '3rd' },
        { horseId: 4, name: 'Wind', score: 76.8, placement: null },
        { horseId: 5, name: 'Breeze', score: 71.3, placement: null }
      ];

      const mockSavedResults = mockSimulationResults.map((result, index) => ({
        id: index + 1,
        ...result,
        showId: mockShow.id,
        discipline: mockShow.discipline,
        runDate: mockShow.runDate,
        createdAt: new Date()
      }));

      // Mock horse retrieval
      mockHorseModel.getHorseById
        .mockResolvedValueOnce(mockHorses[0])
        .mockResolvedValueOnce(mockHorses[1])
        .mockResolvedValueOnce(mockHorses[2])
        .mockResolvedValueOnce(mockHorses[3])
        .mockResolvedValueOnce(mockHorses[4]);

      // Mock rider validation (all have valid riders)
      mockCompetitionRewards.hasValidRider.mockReturnValue(true);

      // Mock eligibility checks (all eligible)
      mockIsHorseEligibleForShow.mockReturnValue(true);

      // Mock existing results check (no previous entries)
      mockResultModel.getResultsByShow.mockResolvedValue([]);

      // Mock prize distribution
      mockCompetitionRewards.calculatePrizeDistribution.mockReturnValue({
        first: 500,
        second: 300,
        third: 200
      });

      // Mock stat gains (no gains for simplicity)
      mockCompetitionRewards.calculateStatGains.mockReturnValue(null);

      // Mock entry fees calculation
      mockCompetitionRewards.calculateEntryFees.mockReturnValue(500);

      // Mock fee transfer
      mockPlayerUpdates.transferEntryFees.mockResolvedValue(null);

      // Mock horse rewards update
      mockHorseUpdates.updateHorseRewards.mockResolvedValue({});

      // Mock competition simulation
      mockSimulateCompetition.mockReturnValue(mockSimulationResults);

      // Mock result saving
      mockResultModel.saveResult
        .mockResolvedValueOnce(mockSavedResults[0])
        .mockResolvedValueOnce(mockSavedResults[1])
        .mockResolvedValueOnce(mockSavedResults[2])
        .mockResolvedValueOnce(mockSavedResults[3])
        .mockResolvedValueOnce(mockSavedResults[4]);

      const result = await enterAndRunShow(horseIds, mockShow);

      // Verify horse retrieval
      expect(mockHorseModel.getHorseById).toHaveBeenCalledTimes(5);
      horseIds.forEach(id => {
        expect(mockHorseModel.getHorseById).toHaveBeenCalledWith(id);
      });

      // Verify eligibility checks
      expect(mockIsHorseEligibleForShow).toHaveBeenCalledTimes(5);

      // Verify existing results check
      expect(mockResultModel.getResultsByShow).toHaveBeenCalledWith(mockShow.id);

      // Verify competition simulation
      expect(mockSimulateCompetition).toHaveBeenCalledWith(mockHorses, mockShow);

      // Verify result saving
      expect(mockResultModel.saveResult).toHaveBeenCalledTimes(5);
      mockSimulationResults.forEach(simResult => {
        expect(mockResultModel.saveResult).toHaveBeenCalledWith({
          horseId: simResult.horseId,
          showId: mockShow.id,
          score: simResult.score,
          placement: simResult.placement,
          discipline: mockShow.discipline,
          runDate: mockShow.runDate,
          showName: mockShow.name,
          prizeWon: simResult.placement === '1st' ? 500 : simResult.placement === '2nd' ? 300 : simResult.placement === '3rd' ? 200 : 0,
          statGains: null
        });
      });

      // Verify return value
      expect(result).toEqual({
        success: true,
        message: 'Competition completed successfully with enhanced features',
        results: mockSavedResults,
        failedFetches: [],
        summary: {
          totalEntries: 5,
          validEntries: 5,
          skippedEntries: 0,
          topThree: [
            { horseId: 1, name: 'Thunder', score: 95.5, placement: '1st', prizeWon: 500 },
            { horseId: 2, name: 'Lightning', score: 88.2, placement: '2nd', prizeWon: 300 },
            { horseId: 3, name: 'Storm', score: 82.1, placement: '3rd', prizeWon: 200 }
          ],
          entryFeesCollected: 0,
          prizesAwarded: 1000,
          prizeDistribution: {
            first: 500,
            second: 300,
            third: 200
          }
        }
      });
    });

    it('should filter out horses that already entered the show', async () => {
      const horseIds = [1, 2, 3];
      const mockHorses = [
        createMockHorse(1, 'Thunder'),
        createMockHorse(2, 'Lightning'),
        createMockHorse(3, 'Storm')
      ];

      // Mock existing results (horse 2 already entered)
      const existingResults = [
        {
          id: 1,
          horseId: 2,
          showId: mockShow.id,
          score: 85.0,
          placement: '1st',
          discipline: mockShow.discipline,
          runDate: mockShow.runDate
        }
      ];

      const mockSimulationResults = [
        { horseId: 1, name: 'Thunder', score: 88.5, placement: '1st' },
        { horseId: 3, name: 'Storm', score: 82.1, placement: '2nd' }
      ];

      // Mock horse retrieval
      mockHorseModel.getHorseById
        .mockResolvedValueOnce(mockHorses[0])
        .mockResolvedValueOnce(mockHorses[1])
        .mockResolvedValueOnce(mockHorses[2]);

      // Mock eligibility checks (all eligible)
      mockIsHorseEligibleForShow.mockReturnValue(true);

      // Mock existing results check
      mockResultModel.getResultsByShow.mockResolvedValue(existingResults);

      // Mock competition simulation (only 2 horses)
      mockSimulateCompetition.mockReturnValue(mockSimulationResults);

      // Mock result saving
      mockResultModel.saveResult
        .mockResolvedValueOnce({ id: 2, ...mockSimulationResults[0] })
        .mockResolvedValueOnce({ id: 3, ...mockSimulationResults[1] });

      const result = await enterAndRunShow(horseIds, mockShow);

      // Verify only 2 horses were simulated (horse 2 was filtered out)
      expect(mockSimulateCompetition).toHaveBeenCalledWith([mockHorses[0], mockHorses[2]], mockShow);
      expect(mockResultModel.saveResult).toHaveBeenCalledTimes(2);

      expect(result.summary.totalEntries).toBe(3);
      expect(result.summary.validEntries).toBe(2);
      expect(result.summary.skippedEntries).toBe(1);
    });

    it('should filter out ineligible horses', async () => {
      const horseIds = [1, 2, 3];
      const mockHorses = [
        createMockHorse(1, 'Thunder', { age: 2 }), // Too young
        createMockHorse(2, 'Lightning', { age: 5 }), // Eligible
        createMockHorse(3, 'Storm', { age: 25 }) // Too old
      ];

      const mockSimulationResults = [
        { horseId: 2, name: 'Lightning', score: 88.5, placement: '1st' }
      ];

      // Mock horse retrieval
      mockHorseModel.getHorseById
        .mockResolvedValueOnce(mockHorses[0])
        .mockResolvedValueOnce(mockHorses[1])
        .mockResolvedValueOnce(mockHorses[2]);

      // Mock eligibility checks
      mockIsHorseEligibleForShow
        .mockReturnValueOnce(false) // Horse 1 ineligible
        .mockReturnValueOnce(true)  // Horse 2 eligible
        .mockReturnValueOnce(false); // Horse 3 ineligible

      // Mock existing results check (no previous entries)
      mockResultModel.getResultsByShow.mockResolvedValue([]);

      // Mock competition simulation (only 1 horse)
      mockSimulateCompetition.mockReturnValue(mockSimulationResults);

      // Mock result saving
      mockResultModel.saveResult.mockResolvedValueOnce({ id: 1, ...mockSimulationResults[0] });

      const result = await enterAndRunShow(horseIds, mockShow);

      // Verify only 1 horse was simulated
      expect(mockSimulateCompetition).toHaveBeenCalledWith([mockHorses[1]], mockShow);
      expect(mockResultModel.saveResult).toHaveBeenCalledTimes(1);

      expect(result.summary.totalEntries).toBe(3);
      expect(result.summary.validEntries).toBe(1);
      expect(result.summary.skippedEntries).toBe(2);
    });

    it('should handle case where no horses are valid for entry', async () => {
      const horseIds = [1, 2];
      const mockHorses = [
        createMockHorse(1, 'Thunder'),
        createMockHorse(2, 'Lightning')
      ];

      // Mock horse retrieval
      mockHorseModel.getHorseById
        .mockResolvedValueOnce(mockHorses[0])
        .mockResolvedValueOnce(mockHorses[1]);

      // Mock eligibility checks (all ineligible)
      mockIsHorseEligibleForShow.mockReturnValue(false);

      // Mock existing results check
      mockResultModel.getResultsByShow.mockResolvedValue([]);

      const result = await enterAndRunShow(horseIds, mockShow);

      // Verify no simulation or saving occurred
      expect(mockSimulateCompetition).not.toHaveBeenCalled();
      expect(mockResultModel.saveResult).not.toHaveBeenCalled();

      expect(result).toEqual({
        success: false,
        message: 'No valid horses available for competition',
        results: [],
        failedFetches: [],
        summary: {
          totalEntries: 2,
          validEntries: 0,
          skippedEntries: 2,
          topThree: [],
          entryFeesCollected: 0,
          prizesAwarded: 0
        }
      });
    });

    it('should handle horses that do not exist', async () => {
      const horseIds = [1, 999, 3]; // Horse 999 doesn't exist
      const mockHorses = [
        createMockHorse(1, 'Thunder'),
        null, // Horse 999 not found
        createMockHorse(3, 'Storm')
      ];

      const mockSimulationResults = [
        { horseId: 1, name: 'Thunder', score: 88.5, placement: '1st' },
        { horseId: 3, name: 'Storm', score: 82.1, placement: '2nd' }
      ];

      // Mock horse retrieval
      mockHorseModel.getHorseById
        .mockResolvedValueOnce(mockHorses[0])
        .mockResolvedValueOnce(mockHorses[1]) // null
        .mockResolvedValueOnce(mockHorses[2]);

      // Mock eligibility checks (for existing horses)
      mockIsHorseEligibleForShow.mockReturnValue(true);

      // Mock existing results check
      mockResultModel.getResultsByShow.mockResolvedValue([]);

      // Mock competition simulation
      mockSimulateCompetition.mockReturnValue(mockSimulationResults);

      // Mock result saving
      mockResultModel.saveResult
        .mockResolvedValueOnce({ id: 1, ...mockSimulationResults[0] })
        .mockResolvedValueOnce({ id: 2, ...mockSimulationResults[1] });

      const result = await enterAndRunShow(horseIds, mockShow);

      // Verify only 2 horses were simulated (non-existent horse filtered out)
      expect(mockSimulateCompetition).toHaveBeenCalledWith([mockHorses[0], mockHorses[2]], mockShow);
      expect(mockResultModel.saveResult).toHaveBeenCalledTimes(2);

      expect(result.summary.totalEntries).toBe(3);
      expect(result.summary.validEntries).toBe(2);
      expect(result.summary.skippedEntries).toBe(1);
    });

    it('should validate required parameters', async () => {
      // Test missing horseIds
      await expect(enterAndRunShow(null, mockShow)).rejects.toThrow('Horse IDs array is required');
      await expect(enterAndRunShow(undefined, mockShow)).rejects.toThrow('Horse IDs array is required');

      // Test empty horseIds array
      await expect(enterAndRunShow([], mockShow)).rejects.toThrow('At least one horse ID is required');

      // Test missing show
      await expect(enterAndRunShow([1, 2], null)).rejects.toThrow('Show object is required');
      await expect(enterAndRunShow([1, 2], undefined)).rejects.toThrow('Show object is required');

      // Test invalid horseIds array
      await expect(enterAndRunShow('not-array', mockShow)).rejects.toThrow('Horse IDs must be an array');
    });

    it('should handle database errors gracefully', async () => {
      const horseIds = [1, 2];

      // Mock horse retrieval error
      mockHorseModel.getHorseById.mockRejectedValue(new Error('Database connection failed'));
      
      // Mock other required functions
      mockCompetitionRewards.hasValidRider.mockReturnValue(true);
      mockResultModel.getResultsByShow.mockResolvedValue([]);

      const result = await enterAndRunShow(horseIds, mockShow);

      // Should handle errors gracefully by collecting failed fetches
      expect(result.success).toBe(false);
      expect(result.failedFetches).toHaveLength(2);
      expect(result.failedFetches[0].reason).toBe('Database connection failed');
      expect(result.failedFetches[1].reason).toBe('Database connection failed');
    });

    it('should handle simulation errors gracefully', async () => {
      const horseIds = [1];
      const mockHorse = createMockHorse(1, 'Thunder');

      // Mock successful horse retrieval
      mockHorseModel.getHorseById.mockResolvedValue(mockHorse);
      mockIsHorseEligibleForShow.mockReturnValue(true);
      mockResultModel.getResultsByShow.mockResolvedValue([]);

      // Mock simulation error
      mockSimulateCompetition.mockImplementation(() => {
        throw new Error('Simulation failed');
      });

      await expect(enterAndRunShow(horseIds, mockShow)).rejects.toThrow('Competition simulation error: Simulation failed');
    });

    it('should handle result saving errors gracefully', async () => {
      const horseIds = [1];
      const mockHorse = createMockHorse(1, 'Thunder');
      const mockSimulationResult = { horseId: 1, name: 'Thunder', score: 88.5, placement: '1st' };

      // Mock successful setup
      mockHorseModel.getHorseById.mockResolvedValue(mockHorse);
      mockIsHorseEligibleForShow.mockReturnValue(true);
      mockResultModel.getResultsByShow.mockResolvedValue([]);
      mockSimulateCompetition.mockReturnValue([mockSimulationResult]);

      // Mock result saving error
      mockResultModel.saveResult.mockRejectedValue(new Error('Failed to save result'));

      await expect(enterAndRunShow(horseIds, mockShow)).rejects.toThrow('Failed to save competition results: Failed to save result');
    });

    it('should correctly identify top three placements', async () => {
      const horseIds = [1, 2, 3, 4, 5, 6, 7];
      const mockHorses = horseIds.map(id => createMockHorse(id, `Horse${id}`));

      const mockSimulationResults = [
        { horseId: 3, name: 'Horse3', score: 95.5, placement: '1st' },
        { horseId: 1, name: 'Horse1', score: 88.2, placement: '2nd' },
        { horseId: 5, name: 'Horse5', score: 82.1, placement: '3rd' },
        { horseId: 2, name: 'Horse2', score: 76.8, placement: null },
        { horseId: 7, name: 'Horse7', score: 71.3, placement: null },
        { horseId: 4, name: 'Horse4', score: 68.9, placement: null },
        { horseId: 6, name: 'Horse6', score: 65.2, placement: null }
      ];

      // Mock all successful
      mockHorseModel.getHorseById.mockImplementation(id => 
        Promise.resolve(mockHorses.find(h => h.id === id))
      );
      mockIsHorseEligibleForShow.mockReturnValue(true);
      mockResultModel.getResultsByShow.mockResolvedValue([]);
      mockSimulateCompetition.mockReturnValue(mockSimulationResults);
      mockResultModel.saveResult.mockImplementation(data => 
        Promise.resolve({ id: Math.random(), ...data })
      );

      const result = await enterAndRunShow(horseIds, mockShow);

      expect(result.summary.topThree).toEqual([
        { horseId: 3, name: 'Horse3', score: 95.5, placement: '1st', prizeWon: 500 },
        { horseId: 1, name: 'Horse1', score: 88.2, placement: '2nd', prizeWon: 300 },
        { horseId: 5, name: 'Horse5', score: 82.1, placement: '3rd', prizeWon: 200 }
      ]);
    });
  });
}); 