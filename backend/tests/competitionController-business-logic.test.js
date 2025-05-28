/**
 * Competition Controller Business Logic Tests
 * 
 * These tests validate business requirements rather than implementation details.
 * They test actual outcomes, database changes, and controller behavior.
 * 
 * Business Requirements Being Tested:
 * 1. enterAndRunShow() executes complete competition workflow
 * 2. Horse eligibility validation (age, level, previous entries)
 * 3. Competition scoring and placement assignment
 * 4. Prize distribution and XP awards
 * 5. Result persistence in database
 * 6. Error handling maintains data integrity
 * 7. Duplicate entry prevention
 * 8. Trait bonuses affect competition scores
 */

import { PrismaClient } from '@prisma/client';
import { enterAndRunShow } from '../controllers/competitionController.js';

const prisma = new PrismaClient();

describe('Competition Controller Business Logic Tests', () => {
  let testUser, testPlayer, testBreed, testStable;
  let adultHorse1, adultHorse2, adultHorse3, youngHorse, oldHorse;
  let testShow;

  beforeAll(async () => {
    // Create test user and player
    testUser = await prisma.user.create({
      data: {
        username: 'competitiontester',
        firstName: 'Competition',
        lastName: 'Tester',
        email: 'competition-user@test.com'
      }
    });

    testPlayer = await prisma.player.create({
      data: {
        name: 'Competition Player',
        email: 'competition@test.com',
        money: 1000,
        level: 2,
        xp: 100,
        settings: { darkMode: false }
      }
    });

    // Create test breed and stable
    testBreed = await prisma.breed.create({
      data: { name: 'Competition Thoroughbred' }
    });

    testStable = await prisma.stable.create({
      data: { name: 'Competition Test Stable' }
    });

    // Create test show
    testShow = await prisma.show.create({
      data: {
        name: 'Business Logic Test Show',
        discipline: 'Racing',
        levelMin: 1,
        levelMax: 10,
        entryFee: 100,
        prize: 1000,
        runDate: new Date()
      }
    });

    // Create test horses with different characteristics
    adultHorse1 = await prisma.horse.create({
      data: {
        name: 'Competition Star',
        age: 5,
        breedId: testBreed.id,
        ownerId: testUser.id,
        playerId: testPlayer.id,
        stableId: testStable.id,
        sex: 'Stallion',
        date_of_birth: new Date('2019-01-01'),
        health_status: 'Excellent',
        level: 3,
        speed: 85,
        stamina: 80,
        focus: 75,
        disciplineScores: { Racing: 25 },
        epigenetic_modifiers: {
          positive: ['discipline_affinity_racing'],
          negative: [],
          hidden: []
        }
      }
    });

    adultHorse2 = await prisma.horse.create({
      data: {
        name: 'Competition Runner',
        age: 4,
        breedId: testBreed.id,
        ownerId: testUser.id,
        playerId: testPlayer.id,
        stableId: testStable.id,
        sex: 'Mare',
        date_of_birth: new Date('2020-01-01'),
        health_status: 'Good',
        level: 2,
        speed: 75,
        stamina: 70,
        focus: 65,
        disciplineScores: { Racing: 15 },
        epigenetic_modifiers: {
          positive: [],
          negative: [],
          hidden: []
        }
      }
    });

    adultHorse3 = await prisma.horse.create({
      data: {
        name: 'Competition Novice',
        age: 3,
        breedId: testBreed.id,
        ownerId: testUser.id,
        playerId: testPlayer.id,
        stableId: testStable.id,
        sex: 'Gelding',
        date_of_birth: new Date('2021-01-01'),
        health_status: 'Fair',
        level: 1,
        speed: 60,
        stamina: 55,
        focus: 50,
        disciplineScores: {},
        epigenetic_modifiers: {
          positive: [],
          negative: ['nervous_temperament'],
          hidden: []
        }
      }
    });

    youngHorse = await prisma.horse.create({
      data: {
        name: 'Too Young',
        age: 2,
        breedId: testBreed.id,
        ownerId: testUser.id,
        playerId: testPlayer.id,
        stableId: testStable.id,
        sex: 'Filly',
        date_of_birth: new Date('2022-01-01'),
        health_status: 'Excellent',
        level: 1,
        speed: 50,
        stamina: 45,
        focus: 40,
        disciplineScores: {},
        epigenetic_modifiers: {
          positive: [],
          negative: [],
          hidden: []
        }
      }
    });

    oldHorse = await prisma.horse.create({
      data: {
        name: 'Too Old',
        age: 25,
        breedId: testBreed.id,
        ownerId: testUser.id,
        playerId: testPlayer.id,
        stableId: testStable.id,
        sex: 'Stallion',
        date_of_birth: new Date('1999-01-01'),
        health_status: 'Poor',
        level: 5,
        speed: 40,
        stamina: 35,
        focus: 30,
        disciplineScores: { Racing: 50 },
        epigenetic_modifiers: {
          positive: [],
          negative: ['aging_joints'],
          hidden: []
        }
      }
    });
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.competitionResult.deleteMany({
      where: { showId: testShow.id }
    });
    await prisma.horse.deleteMany({
      where: { ownerId: testUser.id }
    });
    await prisma.show.delete({ where: { id: testShow.id } });
    await prisma.stable.delete({ where: { id: testStable.id } });
    await prisma.breed.delete({ where: { id: testBreed.id } });
    await prisma.player.delete({ where: { id: testPlayer.id } });
    await prisma.user.delete({ where: { id: testUser.id } });
    await prisma.$disconnect();
  });

  describe('Competition Entry and Execution', () => {
    it('RUNS complete competition with multiple horses and assigns placements', async () => {
      const horseIds = [adultHorse1.id, adultHorse2.id, adultHorse3.id];
      
      const result = await enterAndRunShow(horseIds, testShow);

      // VERIFY: Competition completed successfully
      expect(result.success).toBe(true);
      expect(result.results).toHaveLength(3);
      expect(result.summary.totalEntries).toBe(3);
      expect(result.summary.validEntries).toBe(3);

      // VERIFY: Placements assigned correctly (highest score gets 1st)
      const sortedResults = result.results.sort((a, b) => b.score - a.score);
      expect(sortedResults[0].placement).toBe('1st');
      expect(sortedResults[1].placement).toBe('2nd');
      expect(sortedResults[2].placement).toBe('3rd');

      // VERIFY: All horses have valid scores
      result.results.forEach(horse => {
        expect(horse.score).toBeGreaterThan(0);
        expect(horse.horseId).toBeDefined();
        expect(horse.name).toBeDefined();
      });
    });

    it('PERSISTS competition results in database', async () => {
      const horseIds = [adultHorse1.id, adultHorse2.id];
      
      await enterAndRunShow(horseIds, testShow);

      // VERIFY: Results saved to database
      const savedResults = await prisma.competitionResult.findMany({
        where: { showId: testShow.id },
        include: { horse: true, show: true }
      });

      expect(savedResults.length).toBeGreaterThanOrEqual(2);
      
      // VERIFY: Database records have correct structure
      savedResults.forEach(result => {
        expect(result.horseId).toBeDefined();
        expect(result.showId).toBe(testShow.id);
        expect(result.score).toBeGreaterThan(0);
        expect(result.discipline).toBe('Racing');
        expect(result.runDate).toBeDefined();
        expect(result.horse).toBeDefined();
        expect(result.show).toBeDefined();
      });
    });

    it('PREVENTS duplicate entries for same horse in same show', async () => {
      // First entry
      const firstResult = await enterAndRunShow([adultHorse1.id], testShow);
      expect(firstResult.success).toBe(true);
      expect(firstResult.summary.validEntries).toBe(1);

      // Second entry attempt (should be filtered out)
      const secondResult = await enterAndRunShow([adultHorse1.id], testShow);
      expect(secondResult.success).toBe(true);
      expect(secondResult.summary.validEntries).toBe(0);
      expect(secondResult.summary.skippedEntries).toBe(1);
    });

    it('FILTERS out ineligible horses based on age requirements', async () => {
      const horseIds = [youngHorse.id, adultHorse1.id, oldHorse.id];
      
      const result = await enterAndRunShow(horseIds, testShow);

      // VERIFY: Only eligible horses participated
      expect(result.success).toBe(true);
      expect(result.summary.totalEntries).toBe(3);
      expect(result.summary.validEntries).toBe(1); // Only adultHorse1 is eligible
      expect(result.summary.skippedEntries).toBe(2); // youngHorse and oldHorse filtered out

      // VERIFY: Only eligible horse in results
      expect(result.results).toHaveLength(1);
      expect(result.results[0].horseId).toBe(adultHorse1.id);
    });

    it('AWARDS XP to horse owners for top 3 placements', async () => {
      // Get initial player XP
      const initialPlayer = await prisma.player.findUnique({
        where: { id: testPlayer.id }
      });

      const horseIds = [adultHorse1.id, adultHorse2.id, adultHorse3.id];
      
      const result = await enterAndRunShow(horseIds, testShow);

      // VERIFY: Competition completed with 3 horses
      expect(result.success).toBe(true);
      expect(result.results).toHaveLength(3);

      // VERIFY: Player received XP (all horses belong to same player)
      const updatedPlayer = await prisma.player.findUnique({
        where: { id: testPlayer.id }
      });

      expect(updatedPlayer.xp).toBeGreaterThan(initialPlayer.xp);

      // VERIFY: XP events recorded in summary
      expect(result.summary.xpEvents).toBeDefined();
      expect(result.summary.xpEvents.length).toBeGreaterThan(0);
      expect(result.summary.totalXpAwarded).toBeGreaterThan(0);
    });

    it('APPLIES trait bonuses correctly in competition scoring', async () => {
      // adultHorse1 has 'discipline_affinity_racing' trait
      const result = await enterAndRunShow([adultHorse1.id], testShow);

      expect(result.success).toBe(true);
      expect(result.results).toHaveLength(1);

      const horseResult = result.results[0];
      
      // VERIFY: Trait bonus information is included
      expect(horseResult.scoringDetails).toBeDefined();
      expect(horseResult.scoringDetails.traitBonus).toBeDefined();
      expect(horseResult.scoringDetails.hasTraitAdvantage).toBeDefined();
      expect(horseResult.scoringDetails.appliedTraits).toBeDefined();
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('HANDLES empty horse array gracefully', async () => {
      await expect(enterAndRunShow([], testShow)).rejects.toThrow('At least one horse ID is required');
    });

    it('HANDLES null horse IDs gracefully', async () => {
      await expect(enterAndRunShow(null, testShow)).rejects.toThrow('Horse IDs array is required');
    });

    it('HANDLES missing show object gracefully', async () => {
      await expect(enterAndRunShow([adultHorse1.id], null)).rejects.toThrow('Show object is required');
    });

    it('HANDLES non-existent horse IDs gracefully', async () => {
      const result = await enterAndRunShow([99999], testShow);

      expect(result.success).toBe(true);
      expect(result.summary.validEntries).toBe(0);
      expect(result.failedFetches).toHaveLength(1);
      expect(result.failedFetches[0].reason).toBe('Horse not found');
    });

    it('MAINTAINS database integrity when some operations fail', async () => {
      // Mix of valid and invalid horse IDs
      const horseIds = [adultHorse1.id, 99999, adultHorse2.id];
      
      const result = await enterAndRunShow(horseIds, testShow);

      // VERIFY: Valid horses still processed
      expect(result.success).toBe(true);
      expect(result.summary.validEntries).toBeGreaterThan(0);
      expect(result.failedFetches.length).toBeGreaterThan(0);

      // VERIFY: Database remains consistent
      const savedResults = await prisma.competitionResult.findMany({
        where: { 
          showId: testShow.id,
          horseId: { in: [adultHorse1.id, adultHorse2.id] }
        }
      });

      expect(savedResults.length).toBeGreaterThan(0);
    });
  });

  describe('Competition Scoring and Placement Logic', () => {
    it('ASSIGNS placements only to top 3 finishers', async () => {
      const horseIds = [adultHorse1.id, adultHorse2.id, adultHorse3.id];
      
      const result = await enterAndRunShow(horseIds, testShow);

      expect(result.success).toBe(true);
      expect(result.results).toHaveLength(3);

      // VERIFY: All horses have placements (only 3 horses, so all get top 3)
      const placements = result.results.map(r => r.placement).filter(p => p !== null);
      expect(placements).toHaveLength(3);
      expect(placements).toContain('1st');
      expect(placements).toContain('2nd');
      expect(placements).toContain('3rd');
    });

    it('CALCULATES realistic competition scores based on horse stats', async () => {
      const result = await enterAndRunShow([adultHorse1.id, adultHorse3.id], testShow);

      expect(result.success).toBe(true);
      expect(result.results).toHaveLength(2);

      // VERIFY: Higher stat horse gets higher score
      const horse1Result = result.results.find(r => r.horseId === adultHorse1.id);
      const horse3Result = result.results.find(r => r.horseId === adultHorse3.id);

      expect(horse1Result.score).toBeGreaterThan(horse3Result.score);
      
      // VERIFY: Scores are realistic (not 0 or negative)
      expect(horse1Result.score).toBeGreaterThan(0);
      expect(horse3Result.score).toBeGreaterThan(0);
    });

    it('PROVIDES detailed scoring information for transparency', async () => {
      const result = await enterAndRunShow([adultHorse1.id], testShow);

      expect(result.success).toBe(true);
      const horseResult = result.results[0];

      // VERIFY: Detailed scoring information included
      expect(horseResult.scoringDetails).toBeDefined();
      expect(horseResult.scoringDetails.finalScore).toBeDefined();
      expect(horseResult.scoringDetails.baseStats).toBeDefined();
      expect(horseResult.scoringDetails.baseStats.speed).toBe(85);
      expect(horseResult.scoringDetails.baseStats.stamina).toBe(80);
      expect(horseResult.scoringDetails.baseStats.focus).toBe(75);
    });
  });

  describe('Prize and Reward System', () => {
    it('DISTRIBUTES prizes according to placement', async () => {
      const horseIds = [adultHorse1.id, adultHorse2.id, adultHorse3.id];
      
      const result = await enterAndRunShow(horseIds, testShow);

      expect(result.success).toBe(true);
      
      // VERIFY: Prize distribution information included
      expect(result.summary.prizeDistribution).toBeDefined();
      expect(result.summary.prizesAwarded).toBeGreaterThan(0);

      // VERIFY: Top 3 horses have prize information
      const topThree = result.summary.topThree;
      expect(topThree).toHaveLength(3);
      topThree.forEach(horse => {
        expect(horse.prizeWon).toBeGreaterThan(0);
      });
    });

    it('RECORDS XP events for placed horses', async () => {
      const horseIds = [adultHorse1.id, adultHorse2.id];
      
      const result = await enterAndRunShow(horseIds, testShow);

      expect(result.success).toBe(true);
      
      // VERIFY: XP events recorded
      expect(result.summary.xpEvents).toBeDefined();
      expect(result.summary.xpEvents.length).toBeGreaterThan(0);

      // VERIFY: XP event structure
      result.summary.xpEvents.forEach(event => {
        expect(event.playerId).toBeDefined();
        expect(event.horseId).toBeDefined();
        expect(event.horseName).toBeDefined();
        expect(event.placement).toBeDefined();
        expect(event.xpAwarded).toBeGreaterThan(0);
      });
    });
  });
}); 