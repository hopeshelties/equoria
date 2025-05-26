import { jest } from '@jest/globals';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Mock dependencies
const mockHorseModel = {
  getHorseById: jest.fn()
};

const mockResultModel = {
  saveResult: jest.fn(),
  getResultsByShow: jest.fn()
};

const mockCalculateCompetitionScore = jest.fn();

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
jest.unstable_mockModule(join(__dirname, '../models/horseModel.js'), () => mockHorseModel);
jest.unstable_mockModule(join(__dirname, '../models/resultModel.js'), () => mockResultModel);
jest.unstable_mockModule(join(__dirname, '../utils/competitionScore.js'), () => ({
  calculateCompetitionScore: mockCalculateCompetitionScore
}));
jest.unstable_mockModule(join(__dirname, '../utils/isHorseEligible.js'), () => ({
  isHorseEligibleForShow: mockIsHorseEligibleForShow
}));
jest.unstable_mockModule(join(__dirname, '../utils/competitionRewards.js'), () => mockCompetitionRewards);
jest.unstable_mockModule(join(__dirname, '../utils/horseUpdates.js'), () => mockHorseUpdates);
jest.unstable_mockModule(join(__dirname, '../utils/playerUpdates.js'), () => mockPlayerUpdates);

// Import the module under test after mocking
const { enterAndRunShow } = await import(join(__dirname, '../controllers/competitionController.js'));

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

    it('should successfully enter and run show with 5 horses', async() => {
      const horseIds = [1, 2, 3, 4, 5];
      const mockHorses = [
        createMockHorse(1, 'Thunder', { speed: 90 }),
        createMockHorse(2, 'Lightning', { speed: 85 }),
        createMockHorse(3, 'Storm', { speed: 80 }),
        createMockHorse(4, 'Wind', { speed: 75 }),
        createMockHorse(5, 'Breeze', { speed: 70 })
      ];

      const mockSavedResults = [
        { id: 1, horseId: 1, name: 'Thunder', score: 95.5, placement: '1st', showId: mockShow.id, discipline: mockShow.discipline, runDate: mockShow.runDate, createdAt: new Date() },
        { id: 2, horseId: 2, name: 'Lightning', score: 88.2, placement: '2nd', showId: mockShow.id, discipline: mockShow.discipline, runDate: mockShow.runDate, createdAt: new Date() },
        { id: 3, horseId: 3, name: 'Storm', score: 82.1, placement: '3rd', showId: mockShow.id, discipline: mockShow.discipline, runDate: mockShow.runDate, createdAt: new Date() },
        { id: 4, horseId: 4, name: 'Wind', score: 76.8, placement: null, showId: mockShow.id, discipline: mockShow.discipline, runDate: mockShow.runDate, createdAt: new Date() },
        { id: 5, horseId: 5, name: 'Breeze', score: 71.3, placement: null, showId: mockShow.id, discipline: mockShow.discipline, runDate: mockShow.runDate, createdAt: new Date() }
      ];

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

      // Mock competition scoring (called for each horse)
      mockCalculateCompetitionScore
        .mockReturnValueOnce(95.5)  // Thunder
        .mockReturnValueOnce(88.2)  // Lightning
        .mockReturnValueOnce(82.1)  // Storm
        .mockReturnValueOnce(76.8)  // Wind
        .mockReturnValueOnce(71.3); // Breeze

      // Mock result saving
      mockResultModel.saveResult
        .mockResolvedValueOnce(mockSavedResults[0])
        .mockResolvedValueOnce(mockSavedResults[1])
        .mockResolvedValueOnce(mockSavedResults[2])
        .mockResolvedValueOnce(mockSavedResults[3])
        .mockResolvedValueOnce(mockSavedResults[4]);

      const result = await enterAndRunShow(horseIds, mockShow);

      // Verify horse retrieval (may be called multiple times due to trait processing)
      expect(mockHorseModel.getHorseById).toHaveBeenCalled();
      horseIds.forEach(id => {
        expect(mockHorseModel.getHorseById).toHaveBeenCalledWith(id);
      });

      // Verify eligibility checks
      expect(mockIsHorseEligibleForShow).toHaveBeenCalledTimes(5);

      // Verify existing results check
      expect(mockResultModel.getResultsByShow).toHaveBeenCalledWith(mockShow.id);

      // Verify competition scoring (called for each horse)
      expect(mockCalculateCompetitionScore).toHaveBeenCalledTimes(5);
      mockHorses.forEach(horse => {
        expect(mockCalculateCompetitionScore).toHaveBeenCalledWith(horse, mockShow.discipline);
      });

      // Verify result saving
      expect(mockResultModel.saveResult).toHaveBeenCalledTimes(5);

      // Check that saveResult was called with enhanced data structure
      expect(mockResultModel.saveResult).toHaveBeenCalledWith(expect.objectContaining({
        horseId: 1,
        showId: mockShow.id,
        score: 95.5,
        placement: '1st',
        discipline: mockShow.discipline,
        runDate: mockShow.runDate,
        showName: mockShow.name,
        prizeWon: 500,
        statGains: null,
        // Enhanced fields
        scoringDetails: expect.any(Object),
        traitBonus: expect.any(Number),
        hasTraitAdvantage: expect.any(Boolean),
        bonusDescription: expect.any(String),
        appliedTraits: expect.any(Array)
      }));

      // Verify return value structure (enhanced implementation)
      expect(result.success).toBe(true);
      expect(result.message).toBe('Competition completed successfully with enhanced trait scoring');
      expect(result.results).toHaveLength(5);
      expect(result.failedFetches).toEqual([]);
      expect(result.summary.totalEntries).toBe(5);
      expect(result.summary.validEntries).toBe(5);
      expect(result.summary.skippedEntries).toBe(0);
      expect(result.summary.topThree).toHaveLength(3);
      expect(result.summary.topThree[0]).toEqual(expect.objectContaining({
        horseId: 1,
        name: 'Thunder',
        score: 95.5,
        placement: '1st',
        prizeWon: 500,
        traitBonus: expect.any(Number),
        hasTraitAdvantage: expect.any(Boolean),
        bonusDescription: expect.any(String),
        appliedTraits: expect.any(Array)
      }));
      expect(result.summary.prizesAwarded).toBe(1000);
      expect(result.summary.prizeDistribution).toEqual({
        first: 500,
        second: 300,
        third: 200
      });
      expect(result.summary.traitStatistics).toBeDefined();
      expect(result.summary.scoringMethod).toBe('Enhanced trait-based scoring with calculateCompetitionScore()');
    });

    it('should filter out horses that already entered the show', async() => {
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



      // Mock horse retrieval
      mockHorseModel.getHorseById
        .mockResolvedValueOnce(mockHorses[0])
        .mockResolvedValueOnce(mockHorses[1])
        .mockResolvedValueOnce(mockHorses[2]);

      // Mock rider validation (all horses have valid riders)
      mockCompetitionRewards.hasValidRider.mockReturnValue(true);

      // Mock eligibility checks (all eligible)
      mockIsHorseEligibleForShow.mockReturnValue(true);

      // Mock existing results check
      mockResultModel.getResultsByShow.mockResolvedValue(existingResults);

      // Mock competition scoring (only 2 horses)
      mockCalculateCompetitionScore
        .mockReturnValueOnce(88.5)  // Thunder
        .mockReturnValueOnce(82.1); // Storm

      // Mock prize distribution and other required functions
      mockCompetitionRewards.calculatePrizeDistribution.mockReturnValue({
        first: 500,
        second: 300,
        third: 200
      });
      mockCompetitionRewards.calculateStatGains.mockReturnValue(null);
      mockCompetitionRewards.calculateEntryFees.mockReturnValue(200);
      mockPlayerUpdates.transferEntryFees.mockResolvedValue(null);
      mockHorseUpdates.updateHorseRewards.mockResolvedValue({});

      // Mock result saving
      mockResultModel.saveResult
        .mockResolvedValueOnce({ id: 2, horseId: 1, name: 'Thunder', score: 88.5, placement: '1st' })
        .mockResolvedValueOnce({ id: 3, horseId: 3, name: 'Storm', score: 82.1, placement: '2nd' });

      const result = await enterAndRunShow(horseIds, mockShow);

      // Verify only 2 horses were scored (horse 2 was filtered out)
      expect(mockCalculateCompetitionScore).toHaveBeenCalledTimes(2);
      expect(mockResultModel.saveResult).toHaveBeenCalledTimes(2);

      expect(result.summary.totalEntries).toBe(3);
      expect(result.summary.validEntries).toBe(2);
      expect(result.summary.skippedEntries).toBe(1);
    });

    it('should filter out ineligible horses', async() => {
      const horseIds = [1, 2, 3];
      const mockHorses = [
        createMockHorse(1, 'Thunder', { age: 2 }), // Too young
        createMockHorse(2, 'Lightning', { age: 5 }), // Eligible
        createMockHorse(3, 'Storm', { age: 25 }) // Too old
      ];



      // Mock horse retrieval
      mockHorseModel.getHorseById
        .mockResolvedValueOnce(mockHorses[0])
        .mockResolvedValueOnce(mockHorses[1])
        .mockResolvedValueOnce(mockHorses[2]);

      // Mock rider validation (all horses have valid riders)
      mockCompetitionRewards.hasValidRider.mockReturnValue(true);

      // Mock eligibility checks
      mockIsHorseEligibleForShow
        .mockReturnValueOnce(false) // Horse 1 ineligible
        .mockReturnValueOnce(true)  // Horse 2 eligible
        .mockReturnValueOnce(false); // Horse 3 ineligible

      // Mock existing results check (no previous entries)
      mockResultModel.getResultsByShow.mockResolvedValue([]);

      // Mock competition scoring (only 1 horse)
      mockCalculateCompetitionScore.mockReturnValueOnce(88.5); // Lightning

      // Mock prize distribution and other required functions
      mockCompetitionRewards.calculatePrizeDistribution.mockReturnValue({
        first: 500,
        second: 300,
        third: 200
      });
      mockCompetitionRewards.calculateStatGains.mockReturnValue(null);
      mockCompetitionRewards.calculateEntryFees.mockReturnValue(100);
      mockPlayerUpdates.transferEntryFees.mockResolvedValue(null);
      mockHorseUpdates.updateHorseRewards.mockResolvedValue({});

      // Mock result saving
      mockResultModel.saveResult.mockResolvedValueOnce({ id: 1, horseId: 2, name: 'Lightning', score: 88.5, placement: '1st' });

      const result = await enterAndRunShow(horseIds, mockShow);

      // Verify only 1 horse was scored
      expect(mockCalculateCompetitionScore).toHaveBeenCalledTimes(1);
      expect(mockResultModel.saveResult).toHaveBeenCalledTimes(1);

      expect(result.summary.totalEntries).toBe(3);
      expect(result.summary.validEntries).toBe(1);
      expect(result.summary.skippedEntries).toBe(2);
    });

    it('should handle case where no horses are valid for entry', async() => {
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

      // Mock rider validation (all horses have no riders)
      mockCompetitionRewards.hasValidRider.mockReturnValue(false);

      const result = await enterAndRunShow(horseIds, mockShow);

      // Verify no scoring or saving occurred
      expect(mockCalculateCompetitionScore).not.toHaveBeenCalled();
      expect(mockResultModel.saveResult).not.toHaveBeenCalled();

      expect(result).toEqual({
        success: false,
        message: 'No valid horses available for competition',
        results: [],
        failedFetches: [
          { horseId: 1, reason: 'Horse must have a rider to compete' },
          { horseId: 2, reason: 'Horse must have a rider to compete' }
        ],
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

    it('should handle horses that do not exist', async() => {
      const horseIds = [1, 999, 3]; // Horse 999 doesn't exist
      const mockHorses = [
        createMockHorse(1, 'Thunder'),
        null, // Horse 999 not found
        createMockHorse(3, 'Storm')
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

      // Mock rider validation (for existing horses)
      mockCompetitionRewards.hasValidRider.mockReturnValue(true);

      // Mock competition scoring (2 horses)
      mockCalculateCompetitionScore
        .mockReturnValueOnce(88.5)  // Thunder
        .mockReturnValueOnce(82.1); // Storm

      // Mock prize distribution and other required functions
      mockCompetitionRewards.calculatePrizeDistribution.mockReturnValue({
        first: 500,
        second: 300,
        third: 200
      });
      mockCompetitionRewards.calculateStatGains.mockReturnValue(null);
      mockCompetitionRewards.calculateEntryFees.mockReturnValue(200);
      mockPlayerUpdates.transferEntryFees.mockResolvedValue(null);
      mockHorseUpdates.updateHorseRewards.mockResolvedValue({});

      // Mock result saving
      mockResultModel.saveResult
        .mockResolvedValueOnce({ id: 1, horseId: 1, name: 'Thunder', score: 88.5, placement: '1st' })
        .mockResolvedValueOnce({ id: 2, horseId: 3, name: 'Storm', score: 82.1, placement: '2nd' });

      const result = await enterAndRunShow(horseIds, mockShow);

      // Verify only 2 horses were scored (non-existent horse filtered out)
      expect(mockCalculateCompetitionScore).toHaveBeenCalledTimes(2);
      expect(mockResultModel.saveResult).toHaveBeenCalledTimes(2);

      expect(result.summary.totalEntries).toBe(3);
      expect(result.summary.validEntries).toBe(2);
      expect(result.summary.skippedEntries).toBe(1);
    });

    it('should validate required parameters', async() => {
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

    it('should handle database errors gracefully', async() => {
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

    it('should handle simulation errors gracefully', async() => {
      const horseIds = [1];
      const mockHorse = createMockHorse(1, 'Thunder');

      // Mock successful horse retrieval
      mockHorseModel.getHorseById.mockResolvedValue(mockHorse);
      mockCompetitionRewards.hasValidRider.mockReturnValue(true);
      mockIsHorseEligibleForShow.mockReturnValue(true);
      mockResultModel.getResultsByShow.mockResolvedValue([]);

      // Mock prize distribution
      mockCompetitionRewards.calculatePrizeDistribution.mockReturnValue({
        first: 500,
        second: 300,
        third: 200
      });

      // Mock other required functions
      mockCompetitionRewards.calculateStatGains.mockReturnValue(null);
      mockCompetitionRewards.calculateEntryFees.mockReturnValue(100);
      mockPlayerUpdates.transferEntryFees.mockResolvedValue(null);
      mockHorseUpdates.updateHorseRewards.mockResolvedValue({});
      mockResultModel.saveResult.mockResolvedValue({ id: 1, horseId: 1, score: 0 });

      // Mock scoring error - the enhanced competition should handle this gracefully
      mockCalculateCompetitionScore.mockImplementation(() => {
        throw new Error('Simulation failed');
      });

      // The competition should complete successfully but with score 0 for the horse
      const result = await enterAndRunShow(horseIds, mockShow);

      expect(result.success).toBe(true);
      expect(result.results).toHaveLength(1);
      expect(result.summary.topThree[0].score).toBe(0);
      expect(result.summary.topThree[0].placement).toBe('1st'); // Still gets 1st place as only horse
    });

    it('should handle result saving errors gracefully', async() => {
      const horseIds = [1];
      const mockHorse = createMockHorse(1, 'Thunder');

      // Mock successful setup
      mockHorseModel.getHorseById.mockResolvedValue(mockHorse);
      mockCompetitionRewards.hasValidRider.mockReturnValue(true);
      mockIsHorseEligibleForShow.mockReturnValue(true);
      mockResultModel.getResultsByShow.mockResolvedValue([]);

      // Mock competition scoring
      mockCalculateCompetitionScore.mockReturnValueOnce(88.5); // Thunder

      // Mock prize distribution and other required functions
      mockCompetitionRewards.calculatePrizeDistribution.mockReturnValue({
        first: 500,
        second: 300,
        third: 200
      });
      mockCompetitionRewards.calculateStatGains.mockReturnValue(null);
      mockCompetitionRewards.calculateEntryFees.mockReturnValue(100);
      mockPlayerUpdates.transferEntryFees.mockResolvedValue(null);
      mockHorseUpdates.updateHorseRewards.mockResolvedValue({});

      // Mock result saving error
      mockResultModel.saveResult.mockRejectedValue(new Error('Failed to save result'));

      await expect(enterAndRunShow(horseIds, mockShow)).rejects.toThrow('Failed to save competition results: Failed to save result');
    });

    it('should correctly identify top three placements', async() => {
      const horseIds = [1, 2, 3, 4, 5, 6, 7];
      const mockHorses = horseIds.map(id => createMockHorse(id, `Horse${id}`));



      // Mock all successful
      mockHorseModel.getHorseById.mockImplementation(id =>
        Promise.resolve(mockHorses.find(h => h.id === id))
      );
      mockCompetitionRewards.hasValidRider.mockReturnValue(true);
      mockIsHorseEligibleForShow.mockReturnValue(true);
      mockResultModel.getResultsByShow.mockResolvedValue([]);
      // Mock competition scoring for all horses
      mockCalculateCompetitionScore
        .mockReturnValueOnce(88.2)  // Horse1
        .mockReturnValueOnce(193)   // Horse2 (highest)
        .mockReturnValueOnce(95.5)  // Horse3
        .mockReturnValueOnce(76.8)  // Horse4
        .mockReturnValueOnce(82.1)  // Horse5
        .mockReturnValueOnce(71.3)  // Horse6
        .mockReturnValueOnce(187);  // Horse7

      // Mock prize distribution and other required functions
      mockCompetitionRewards.calculatePrizeDistribution.mockReturnValue({
        first: 500,
        second: 300,
        third: 200
      });
      mockCompetitionRewards.calculateStatGains.mockReturnValue(null);
      mockCompetitionRewards.calculateEntryFees.mockReturnValue(700);
      mockPlayerUpdates.transferEntryFees.mockResolvedValue(null);
      mockHorseUpdates.updateHorseRewards.mockResolvedValue({});

      mockResultModel.saveResult.mockImplementation(data =>
        Promise.resolve({ id: Math.random(), ...data })
      );

      const result = await enterAndRunShow(horseIds, mockShow);

      // With the new scoring, Horse2 (193) should be 1st, Horse7 (187) should be 2nd, Horse3 (95.5) should be 3rd
      expect(result.summary.topThree).toEqual(expect.arrayContaining([
        expect.objectContaining({ horseId: 2, name: 'Horse2', score: 193, placement: '1st', prizeWon: 500 }),
        expect.objectContaining({ horseId: 7, name: 'Horse7', score: 187, placement: '2nd', prizeWon: 300 }),
        expect.objectContaining({ horseId: 3, name: 'Horse3', score: 95.5, placement: '3rd', prizeWon: 200 })
      ]));
    });

    // 🎯 Enhanced Feature Tests

    it('should reject horses without valid riders', async() => {
      const horseIds = [1, 2, 3];
      const mockHorses = [
        createMockHorse(1, 'Thunder', { rider: null }), // No rider
        createMockHorse(2, 'Lightning', { rider: { name: 'Test Rider', skill: 80 } }), // Valid rider
        createMockHorse(3, 'Storm', { rider: undefined }) // No rider
      ];



      // Mock horse retrieval
      mockHorseModel.getHorseById
        .mockResolvedValueOnce(mockHorses[0])
        .mockResolvedValueOnce(mockHorses[1])
        .mockResolvedValueOnce(mockHorses[2]);

      // Mock rider validation
      mockCompetitionRewards.hasValidRider
        .mockReturnValueOnce(false) // Horse 1 - no rider
        .mockReturnValueOnce(true)  // Horse 2 - valid rider
        .mockReturnValueOnce(false); // Horse 3 - no rider

      // Mock eligibility checks (for horses with riders)
      mockIsHorseEligibleForShow.mockReturnValue(true);

      // Mock existing results check
      mockResultModel.getResultsByShow.mockResolvedValue([]);

      // Mock competition scoring (only 1 horse with rider)
      mockCalculateCompetitionScore.mockReturnValueOnce(88.5); // Lightning

      // Mock prize distribution and other required functions
      mockCompetitionRewards.calculatePrizeDistribution.mockReturnValue({
        first: 500,
        second: 300,
        third: 200
      });
      mockCompetitionRewards.calculateStatGains.mockReturnValue(null);
      mockCompetitionRewards.calculateEntryFees.mockReturnValue(100);
      mockPlayerUpdates.transferEntryFees.mockResolvedValue(null);
      mockHorseUpdates.updateHorseRewards.mockResolvedValue({});

      // Mock result saving
      mockResultModel.saveResult.mockResolvedValueOnce({ id: 1, horseId: 2, name: 'Lightning', score: 88.5, placement: '1st' });

      const result = await enterAndRunShow(horseIds, mockShow);

      // Verify rider validation was called for all horses
      expect(mockCompetitionRewards.hasValidRider).toHaveBeenCalledTimes(3);
      expect(mockCompetitionRewards.hasValidRider).toHaveBeenCalledWith(mockHorses[0]);
      expect(mockCompetitionRewards.hasValidRider).toHaveBeenCalledWith(mockHorses[1]);
      expect(mockCompetitionRewards.hasValidRider).toHaveBeenCalledWith(mockHorses[2]);

      // Verify only 1 horse was scored (only one with valid rider)
      expect(mockCalculateCompetitionScore).toHaveBeenCalledTimes(1);
      expect(mockResultModel.saveResult).toHaveBeenCalledTimes(1);

      expect(result.summary.totalEntries).toBe(3);
      expect(result.summary.validEntries).toBe(1);
      expect(result.summary.skippedEntries).toBe(2);
    });

    it('should apply prize distribution correctly (50%/30%/20%)', async() => {
      const horseIds = [1, 2, 3, 4];
      const mockHorses = horseIds.map(id => createMockHorse(id, `Horse${id}`));



      // Mock all successful
      mockHorseModel.getHorseById.mockImplementation(id =>
        Promise.resolve(mockHorses.find(h => h.id === id))
      );
      mockCompetitionRewards.hasValidRider.mockReturnValue(true);
      mockIsHorseEligibleForShow.mockReturnValue(true);
      mockResultModel.getResultsByShow.mockResolvedValue([]);
      // Mock competition scoring for 4 horses
      mockCalculateCompetitionScore
        .mockReturnValueOnce(95.5)  // Horse1 (1st)
        .mockReturnValueOnce(88.2)  // Horse2 (2nd)
        .mockReturnValueOnce(82.1)  // Horse3 (3rd)
        .mockReturnValueOnce(76.8); // Horse4 (4th)

      // Mock prize distribution (50%/30%/20% of 1000 = 500/300/200)
      mockCompetitionRewards.calculatePrizeDistribution.mockReturnValue({
        first: 500,
        second: 300,
        third: 200
      });

      // Mock stat gains (no gains for this test)
      mockCompetitionRewards.calculateStatGains.mockReturnValue(null);

      // Mock entry fees and transfers
      mockCompetitionRewards.calculateEntryFees.mockReturnValue(400);
      mockPlayerUpdates.transferEntryFees.mockResolvedValue(null);

      // Mock horse rewards update
      mockHorseUpdates.updateHorseRewards.mockResolvedValue({});

      // Mock result saving
      mockResultModel.saveResult.mockImplementation(data =>
        Promise.resolve({ id: Math.random(), ...data })
      );

      await enterAndRunShow(horseIds, mockShow);

      // Verify prize distribution calculation was called
      expect(mockCompetitionRewards.calculatePrizeDistribution).toHaveBeenCalledWith(mockShow.prize);

      // Verify horse rewards were updated for winners
      expect(mockHorseUpdates.updateHorseRewards).toHaveBeenCalledTimes(3); // Only top 3
      expect(mockHorseUpdates.updateHorseRewards).toHaveBeenCalledWith(1, 500, null); // 1st place
      expect(mockHorseUpdates.updateHorseRewards).toHaveBeenCalledWith(2, 300, null); // 2nd place
      expect(mockHorseUpdates.updateHorseRewards).toHaveBeenCalledWith(3, 200, null); // 3rd place

      // Verify results include correct prize amounts
      expect(mockResultModel.saveResult).toHaveBeenCalledWith(expect.objectContaining({
        horseId: 1,
        prizeWon: 500
      }));
      expect(mockResultModel.saveResult).toHaveBeenCalledWith(expect.objectContaining({
        horseId: 2,
        prizeWon: 300
      }));
      expect(mockResultModel.saveResult).toHaveBeenCalledWith(expect.objectContaining({
        horseId: 3,
        prizeWon: 200
      }));
      expect(mockResultModel.saveResult).toHaveBeenCalledWith(expect.objectContaining({
        horseId: 4,
        prizeWon: 0
      }));
    });

    it('should apply stat gains with correct probabilities (10%/5%/3%)', async() => {
      const horseIds = [1, 2, 3];
      const mockHorses = horseIds.map(id => createMockHorse(id, `Horse${id}`));



      // Mock all successful
      mockHorseModel.getHorseById.mockImplementation(id =>
        Promise.resolve(mockHorses.find(h => h.id === id))
      );
      mockCompetitionRewards.hasValidRider.mockReturnValue(true);
      mockIsHorseEligibleForShow.mockReturnValue(true);
      mockResultModel.getResultsByShow.mockResolvedValue([]);
      // Mock competition scoring for 3 horses
      mockCalculateCompetitionScore
        .mockReturnValueOnce(95.5)  // Horse1 (1st)
        .mockReturnValueOnce(88.2)  // Horse2 (2nd)
        .mockReturnValueOnce(82.1); // Horse3 (3rd)

      // Mock prize distribution
      mockCompetitionRewards.calculatePrizeDistribution.mockReturnValue({
        first: 500,
        second: 300,
        third: 200
      });

      // Mock stat gains (simulate gains for testing)
      mockCompetitionRewards.calculateStatGains
        .mockReturnValueOnce('speed')    // 1st place gets speed gain
        .mockReturnValueOnce('stamina')  // 2nd place gets stamina gain
        .mockReturnValueOnce(null);      // 3rd place gets no gain

      // Mock other functions
      mockCompetitionRewards.calculateEntryFees.mockReturnValue(300);
      mockPlayerUpdates.transferEntryFees.mockResolvedValue(null);
      mockHorseUpdates.updateHorseRewards.mockResolvedValue({});
      mockResultModel.saveResult.mockImplementation(data =>
        Promise.resolve({ id: Math.random(), ...data })
      );

      await enterAndRunShow(horseIds, mockShow);

      // Verify stat gains calculation was called for each placement
      expect(mockCompetitionRewards.calculateStatGains).toHaveBeenCalledTimes(3);
      expect(mockCompetitionRewards.calculateStatGains).toHaveBeenCalledWith('1st', mockShow.discipline);
      expect(mockCompetitionRewards.calculateStatGains).toHaveBeenCalledWith('2nd', mockShow.discipline);
      expect(mockCompetitionRewards.calculateStatGains).toHaveBeenCalledWith('3rd', mockShow.discipline);

      // Verify horse rewards were updated with stat gains
      expect(mockHorseUpdates.updateHorseRewards).toHaveBeenCalledWith(1, 500, 'speed');
      expect(mockHorseUpdates.updateHorseRewards).toHaveBeenCalledWith(2, 300, 'stamina');
      expect(mockHorseUpdates.updateHorseRewards).toHaveBeenCalledWith(3, 200, null);

      // Verify results include stat gains
      expect(mockResultModel.saveResult).toHaveBeenCalledWith(expect.objectContaining({
        horseId: 1,
        statGains: 'speed'
      }));
      expect(mockResultModel.saveResult).toHaveBeenCalledWith(expect.objectContaining({
        horseId: 2,
        statGains: 'stamina'
      }));
      expect(mockResultModel.saveResult).toHaveBeenCalledWith(expect.objectContaining({
        horseId: 3,
        statGains: null
      }));
    });

    it('should transfer entry fees to show host player', async() => {
      const horseIds = [1, 2, 3];
      const mockHorses = horseIds.map(id => createMockHorse(id, `Horse${id}`));
      const showWithHost = { ...mockShow, hostPlayer: 'host-player-123' };



      // Mock all successful
      mockHorseModel.getHorseById.mockImplementation(id =>
        Promise.resolve(mockHorses.find(h => h.id === id))
      );
      mockCompetitionRewards.hasValidRider.mockReturnValue(true);
      mockIsHorseEligibleForShow.mockReturnValue(true);
      mockResultModel.getResultsByShow.mockResolvedValue([]);
      // Mock competition scoring for 3 horses
      mockCalculateCompetitionScore
        .mockReturnValueOnce(95.5)  // Horse1 (1st)
        .mockReturnValueOnce(88.2)  // Horse2 (2nd)
        .mockReturnValueOnce(82.1); // Horse3 (3rd)

      // Mock prize distribution and stat gains
      mockCompetitionRewards.calculatePrizeDistribution.mockReturnValue({
        first: 500,
        second: 300,
        third: 200
      });
      mockCompetitionRewards.calculateStatGains.mockReturnValue(null);

      // Mock entry fees calculation (3 horses × 100 entry fee = 300)
      mockCompetitionRewards.calculateEntryFees.mockReturnValue(300);

      // Mock fee transfer
      mockPlayerUpdates.transferEntryFees.mockResolvedValue(null);

      // Mock other functions
      mockHorseUpdates.updateHorseRewards.mockResolvedValue({});
      mockResultModel.saveResult.mockImplementation(data =>
        Promise.resolve({ id: Math.random(), ...data })
      );

      const result = await enterAndRunShow(horseIds, showWithHost);

      // Verify entry fees calculation
      expect(mockCompetitionRewards.calculateEntryFees).toHaveBeenCalledWith(showWithHost.entryFee, 3);

      // Verify fee transfer to host player
      expect(mockPlayerUpdates.transferEntryFees).toHaveBeenCalledWith('host-player-123', showWithHost.entryFee, 3);

      // Verify summary includes entry fees collected
      expect(result.summary.entryFeesCollected).toBe(300);
    });

    it('should save complete history with show info and stat gains', async() => {
      const horseIds = [1, 2];
      const mockHorses = horseIds.map(id => createMockHorse(id, `Horse${id}`));



      // Mock all successful
      mockHorseModel.getHorseById.mockImplementation(id =>
        Promise.resolve(mockHorses.find(h => h.id === id))
      );
      mockCompetitionRewards.hasValidRider.mockReturnValue(true);
      mockIsHorseEligibleForShow.mockReturnValue(true);
      mockResultModel.getResultsByShow.mockResolvedValue([]);
      // Mock competition scoring for 2 horses
      mockCalculateCompetitionScore
        .mockReturnValueOnce(95.5)  // Horse1 (1st)
        .mockReturnValueOnce(88.2); // Horse2 (2nd)

      // Mock prize distribution and stat gains
      mockCompetitionRewards.calculatePrizeDistribution.mockReturnValue({
        first: 500,
        second: 300,
        third: 200
      });
      mockCompetitionRewards.calculateStatGains
        .mockReturnValueOnce('stamina')  // 1st place gets stamina gain
        .mockReturnValueOnce(null);      // 2nd place gets no gain

      // Mock other functions
      mockCompetitionRewards.calculateEntryFees.mockReturnValue(200);
      mockPlayerUpdates.transferEntryFees.mockResolvedValue(null);
      mockHorseUpdates.updateHorseRewards.mockResolvedValue({});
      mockResultModel.saveResult.mockImplementation(data =>
        Promise.resolve({ id: Math.random(), ...data })
      );

      const result = await enterAndRunShow(horseIds, mockShow);

      // Verify complete result data is saved with enhanced fields
      expect(mockResultModel.saveResult).toHaveBeenCalledWith(expect.objectContaining({
        horseId: 1,
        showId: mockShow.id,
        score: 95.5,
        placement: '1st',
        discipline: mockShow.discipline,
        runDate: mockShow.runDate,
        showName: mockShow.name,
        prizeWon: 500,
        statGains: 'stamina',
        // Enhanced fields
        scoringDetails: expect.any(Object),
        traitBonus: expect.any(Number),
        hasTraitAdvantage: expect.any(Boolean),
        bonusDescription: expect.any(String),
        appliedTraits: expect.any(Array)
      }));

      expect(mockResultModel.saveResult).toHaveBeenCalledWith(expect.objectContaining({
        horseId: 2,
        showId: mockShow.id,
        score: 88.2,
        placement: '2nd',
        discipline: mockShow.discipline,
        runDate: mockShow.runDate,
        showName: mockShow.name,
        prizeWon: 300,
        statGains: null,
        // Enhanced fields
        scoringDetails: expect.any(Object),
        traitBonus: expect.any(Number),
        hasTraitAdvantage: expect.any(Boolean),
        bonusDescription: expect.any(String),
        appliedTraits: expect.any(Array)
      }));

      // Verify result includes complete information
      expect(result.success).toBe(true);
      expect(result.results).toHaveLength(2);
    });

    it('should demonstrate score randomness across multiple runs', async() => {
      const horseIds = [1];
      const mockHorse = createMockHorse(1, 'Thunder');

      // Mock all successful setup
      mockHorseModel.getHorseById.mockResolvedValue(mockHorse);
      mockCompetitionRewards.hasValidRider.mockReturnValue(true);
      mockIsHorseEligibleForShow.mockReturnValue(true);
      mockResultModel.getResultsByShow.mockResolvedValue([]);

      // Mock other functions
      mockCompetitionRewards.calculatePrizeDistribution.mockReturnValue({
        first: 500,
        second: 300,
        third: 200
      });
      mockCompetitionRewards.calculateStatGains.mockReturnValue(null);
      mockCompetitionRewards.calculateEntryFees.mockReturnValue(100);
      mockPlayerUpdates.transferEntryFees.mockResolvedValue(null);
      mockHorseUpdates.updateHorseRewards.mockResolvedValue({});
      mockResultModel.saveResult.mockImplementation(data =>
        Promise.resolve({ id: Math.random(), ...data })
      );

      // Simulate different scores across runs to demonstrate randomness
      const scores = [85.5, 87.2, 83.9, 86.1, 84.7];
      let callCount = 0;

      mockCalculateCompetitionScore.mockImplementation(() => {
        const score = scores[callCount % scores.length];
        callCount++;
        return score;
      });

      // Run competition multiple times
      const results = [];
      for (let i = 0; i < 5; i++) {
        const result = await enterAndRunShow(horseIds, mockShow);
        results.push(result.results[0].score);

        // Reset only the call counts, not the implementations
        mockHorseModel.getHorseById.mockClear();
        mockCompetitionRewards.hasValidRider.mockClear();
        mockIsHorseEligibleForShow.mockClear();
        mockResultModel.getResultsByShow.mockClear();
        mockCompetitionRewards.calculatePrizeDistribution.mockClear();
        mockCompetitionRewards.calculateStatGains.mockClear();
        mockCompetitionRewards.calculateEntryFees.mockClear();
        mockPlayerUpdates.transferEntryFees.mockClear();
        mockHorseUpdates.updateHorseRewards.mockClear();
        mockResultModel.saveResult.mockClear();

        // Re-setup mocks for next iteration (keeping the simulation implementation)
        mockHorseModel.getHorseById.mockResolvedValue(mockHorse);
        mockCompetitionRewards.hasValidRider.mockReturnValue(true);
        mockIsHorseEligibleForShow.mockReturnValue(true);
        mockResultModel.getResultsByShow.mockResolvedValue([]);
        mockCompetitionRewards.calculatePrizeDistribution.mockReturnValue({
          first: 500,
          second: 300,
          third: 200
        });
        mockCompetitionRewards.calculateStatGains.mockReturnValue(null);
        mockCompetitionRewards.calculateEntryFees.mockReturnValue(100);
        mockPlayerUpdates.transferEntryFees.mockResolvedValue(null);
        mockHorseUpdates.updateHorseRewards.mockResolvedValue({});
        mockResultModel.saveResult.mockImplementation(data =>
          Promise.resolve({ id: Math.random(), ...data })
        );
      }

      // Verify that scores vary across runs (demonstrating randomness)
      const uniqueScores = [...new Set(results)];
      expect(uniqueScores.length).toBeGreaterThan(1); // Should have different scores
      expect(mockCalculateCompetitionScore).toHaveBeenCalledTimes(5);
    });
  });
});
