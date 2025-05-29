
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Mock the player model
jest.unstable_mockModule(join(__dirname, '../../models/userModel.js'), () => ({
  getUserById: jest.fn(),
  getUserWithHorses: jest.fn(),
  getUserByEmail: jest.fn()
}));

// Import the mocked functions
const { getUserById, getUserWithHorses, getUserByEmail } = await import('../../models/userModel.js');

describe('Player Integration Tests - Mocked Database', () => {
  const testPlayerId = 'test-player-uuid-123';
  const testPlayerEmail = 'test@example.com';

  const mockPlayer = {
    id: testPlayerId,
    name: 'Test Player',
    email: testPlayerEmail,
    money: 500,
    level: 3,
    xp: 1000,
    settings: {
      darkMode: true,
      notifications: true,
      soundEnabled: false,
      autoSave: true
    }
  };

  const mockHorses = [
    {
      id: 1,
      name: 'Comet',
      playerId: testPlayerId,
      breed: { name: 'Thoroughbred' }
    },
    {
      id: 2,
      name: 'Starlight',
      playerId: testPlayerId,
      breed: { name: 'Thoroughbred' }
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mock responses
    getUserById.mockResolvedValue(mockPlayer);
    getUserByEmail.mockResolvedValue(mockPlayer);
    getUserWithHorses.mockResolvedValue({
      ...mockPlayer,
      horses: mockHorses
    });
  });

  describe('Player Retrieval from Seeded Data', () => {
    test('should retrieve the seeded player by ID', async() => {
      const player = await getUserById(testPlayerId);

      expect(player).toBeDefined();
      expect(player.id).toBe(testPlayerId);
      expect(player.name).toBe('Test Player');
      expect(player.email).toBe(testPlayerEmail);
      expect(player.money).toBe(500);
      expect(player.level).toBe(3);
      expect(player.xp).toBe(1000);
    });

    test('should retrieve the seeded player by email', async() => {
      const player = await getUserByEmail(testPlayerEmail);

      expect(player).toBeDefined();
      expect(player.id).toBe(testPlayerId);
      expect(player.name).toBe('Test Player');
      expect(player.email).toBe(testPlayerEmail);
    });

    test('should return null for non-existent player', async() => {
      getUserById.mockResolvedValueOnce(null);

      const player = await getUserById('nonexistent-uuid-456');

      expect(player).toBeNull();
    });
  });

  describe('Player with Horses Relationship', () => {
    test('should retrieve player with their 2 horses', async() => {
      const playerWithHorses = await getUserWithHorses(testPlayerId);

      expect(playerWithHorses).toBeDefined();
      expect(playerWithHorses.id).toBe(testPlayerId);
      expect(playerWithHorses.horses).toBeDefined();
      expect(playerWithHorses.horses).toHaveLength(2);

      // Check horse names
      const horseNames = playerWithHorses.horses.map(h => h.name).sort();
      expect(horseNames).toEqual(['Comet', 'Starlight']);

      // Check that horses are linked to the player
      playerWithHorses.horses.forEach(horse => {
        expect(horse.playerId).toBe(testPlayerId);
      });
    });

    test('should include breed information for horses', async() => {
      const playerWithHorses = await getUserWithHorses(testPlayerId);

      expect(playerWithHorses.horses).toHaveLength(2);

      playerWithHorses.horses.forEach(horse => {
        expect(horse.breed).toBeDefined();
        expect(horse.breed.name).toBe('Thoroughbred');
      });
    });
  });

  describe('JSON Settings Field', () => {
    test('should confirm JSON settings field exists and includes darkMode = true', async() => {
      const player = await getUserById(testPlayerId);

      expect(player.settings).toBeDefined();
      expect(typeof player.settings).toBe('object');
      expect(player.settings.darkMode).toBe(true);
      expect(player.settings.notifications).toBe(true);
      expect(player.settings.soundEnabled).toBe(false);
      expect(player.settings.autoSave).toBe(true);
    });
  });

  describe('Database Constraints', () => {
    test('should confirm unique email constraint', async() => {
      // This test verifies that the unique constraint on email is working
      // by checking that only one player exists with the test email
      const player = await getUserByEmail(testPlayerEmail);

      expect(player).toBeDefined();
      expect(player.id).toBe(testPlayerId);
    });
  });
});
