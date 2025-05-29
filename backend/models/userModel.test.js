// filepath: c:\\Users\\heirr\\OneDrive\\Desktop\\Equoria\\backend\\models\\userModel.test.js

// filepath: c:\\Users\\heirr\\OneDrive\\Desktop\\Equoria\\backend\\models\\userModel.test.js
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Determine __dirname for ES module scope
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Mock Prisma client and logger
jest.unstable_mockModule(join(__dirname, '../db/index.js'), () => ({
  default: {
    user: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn()
    }
    // Mock other models if they were ever interacted with directly by userModel (not typical)
  }
}));

jest.unstable_mockModule(join(__dirname, '../utils/logger.js'), () => ({
  default: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
  }
}));

// Import userModel functions after mocks are set up
const {
  createUser,
  getUserById,
  getUserByEmail,
  getUserWithHorses,
  updateUser,
  deleteUser,
  addUserXp,
  checkAndLevelUpUser,
  getUserProgress,
  getUserStats
} = await import(join(__dirname, './userModel.js'));

const mockPrisma = (await import(join(__dirname, '../db/index.js'))).default;
const mockLogger = (await import(join(__dirname, '../utils/logger.js'))).default;
const { DatabaseError } = await import(join(__dirname, '../errors/index.js'));

describe('userModel', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe('createUser', () => {
    const baseUserData = {
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123',
      name: 'Test User',
      money: 1000,
      level: 1,
      xp: 0,
      settings: { theme: 'dark' }
    };

    it('should create a user successfully', async() => {
      const mockCreatedUser = { id: 1, ...baseUserData, role: 'user', createdAt: new Date(), updatedAt: new Date() };
      mockPrisma.user.create.mockResolvedValue(mockCreatedUser);

      const result = await createUser(baseUserData);
      expect(mockPrisma.user.create).toHaveBeenCalledWith({ data: baseUserData });
      expect(result).toEqual(mockCreatedUser);
      expect(mockLogger.info).toHaveBeenCalled();
    });

    it('should throw error if username is missing', async() => {
      const { username: _username, ...incompleteData } = baseUserData;
      await expect(createUser(incompleteData)).rejects.toThrow('Username, email, and password are required');
    });

    it('should throw error for invalid initial money', async() => {
      await expect(createUser({ ...baseUserData, money: -100 })).rejects.toThrow('Initial money must be a non-negative number.');
    });

    it('should throw error for invalid initial level', async() => {
      await expect(createUser({ ...baseUserData, level: 0 })).rejects.toThrow('Initial level must be a positive integer, at least 1.');
    });

    it('should throw error for invalid initial xp', async() => {
      await expect(createUser({ ...baseUserData, xp: -10 })).rejects.toThrow('Initial XP must be a non-negative number.');
    });

    it('should throw error on unique constraint violation', async() => {
      const dbError = { code: 'P2002', meta: { target: ['email'] } };
      mockPrisma.user.create.mockRejectedValue(dbError);
      await expect(createUser(baseUserData)).rejects.toThrow('User with this email already exists.');
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should throw DatabaseError for other Prisma errors', async() => {
      const dbError = new Error('Some other DB error');
      mockPrisma.user.create.mockRejectedValue(dbError);
      await expect(createUser(baseUserData)).rejects.toThrow(DatabaseError);
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('getUserById', () => {
    it('should retrieve a user by ID', async() => {
      const mockUser = { id: 1, name: 'Test User' };
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      const user = await getUserById(1);
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(user).toEqual(mockUser);
      expect(mockLogger.info).toHaveBeenCalled();
    });

    it('should return null if user not found', async() => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      const user = await getUserById(99);
      expect(user).toBeNull();
    });

    it('should throw error for invalid ID format', async() => {
      await expect(getUserById('invalid-id')).rejects.toThrow('Invalid user ID format.');
      await expect(getUserById(0)).rejects.toThrow('Invalid user ID format.');
      await expect(getUserById(-1)).rejects.toThrow('Invalid user ID format.');
    });
  });

  describe('getUserByEmail', () => {
    it('should retrieve a user by email', async() => {
      const mockUser = { id: 1, email: 'test@example.com' };
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      const user = await getUserByEmail('test@example.com');
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({ where: { email: 'test@example.com' } });
      expect(user).toEqual(mockUser);
      expect(mockLogger.info).toHaveBeenCalled();
    });

    it('should throw error for invalid email format', async() => {
      await expect(getUserByEmail('')).rejects.toThrow('Invalid email format');
      await expect(getUserByEmail(null)).rejects.toThrow('Invalid email format');
    });
  });

  describe('getUserWithHorses', () => {
    it('should retrieve a user with their horses', async() => {
      const mockUser = { id: 1, name: 'Test User', horses: [{ id: 101, name: 'Spirit' }] };
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      const user = await getUserWithHorses(1);
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
        include: { horses: { include: { breed: true, stable: true } } }
      });
      expect(user).toEqual(mockUser);
      expect(mockLogger.info).toHaveBeenCalled();
    });
  });

  describe('updateUser', () => {
    const updateData = { name: 'Updated Name', money: 1500 };
    it('should update a user successfully', async() => {
      const mockUpdatedUser = { id: 1, username: 'testuser', ...updateData };
      mockPrisma.user.update.mockResolvedValue(mockUpdatedUser);
      const result = await updateUser(1, updateData);
      expect(mockPrisma.user.update).toHaveBeenCalledWith({ where: { id: 1 }, data: updateData });
      expect(result).toEqual(mockUpdatedUser);
      expect(mockLogger.info).toHaveBeenCalled();
    });

    it('should throw error if user not found for update', async() => {
      mockPrisma.user.update.mockRejectedValue({ code: 'P2025' });
      await expect(updateUser(99, updateData)).rejects.toThrow('User not found for update.');
    });

    it('should throw error if no update data provided', async() => {
      await expect(updateUser(1, {})).rejects.toThrow('No update data provided.');
    });
  });

  describe('deleteUser', () => {
    it('should delete a user successfully', async() => {
      const mockDeletedUser = { id: 1, username: 'testuser' };
      mockPrisma.user.delete.mockResolvedValue(mockDeletedUser);
      const result = await deleteUser(1);
      expect(mockPrisma.user.delete).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(result).toEqual(mockDeletedUser);
      expect(mockLogger.info).toHaveBeenCalled();
    });

    it('should throw error if user not found for deletion', async() => {
      mockPrisma.user.delete.mockRejectedValue({ code: 'P2025' });
      await expect(deleteUser(99)).rejects.toThrow('User not found for deletion.');
    });
  });

  describe('addUserXp', () => {
    const baseUser = { id: 1, username: 'testuser', level: 1, xp: 50, money: 1000, settings: {} };

    it('should add XP without leveling up', async() => {
      mockPrisma.user.findUnique.mockResolvedValue(baseUser);
      const updatedUser = { ...baseUser, xp: 70 };
      mockPrisma.user.update.mockResolvedValue(updatedUser);

      const result = await addUserXp(1, 20);
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(mockPrisma.user.update).toHaveBeenCalledWith({ where: { id: 1 }, data: { xp: 70 } });
      expect(result).toEqual(expect.objectContaining({ xp: 70, leveledUp: false, levelsGained: 0 }));
    });

    it('should add XP and level up once', async() => {
      mockPrisma.user.findUnique.mockResolvedValue(baseUser); // xp: 50, level: 1
      const updatedUser = { ...baseUser, xp: 10, level: 2 }; // 50 + 60 = 110 -> level 2, 10xp
      mockPrisma.user.update.mockResolvedValue(updatedUser);

      const result = await addUserXp(1, 60); // xpPerLevel is 100
      expect(mockPrisma.user.update).toHaveBeenCalledWith({ where: { id: 1 }, data: { xp: 10, level: 2 } });
      expect(result).toEqual(expect.objectContaining({ xp: 10, level: 2, leveledUp: true, levelsGained: 1 }));
    });

    it('should add XP and level up multiple times', async() => {
      mockPrisma.user.findUnique.mockResolvedValue(baseUser); // xp: 50, level: 1
      const updatedUser = { ...baseUser, xp: 70, level: 3 }; // 50 + 220 = 270 -> level 3, 70xp
      mockPrisma.user.update.mockResolvedValue(updatedUser);

      const result = await addUserXp(1, 220);
      expect(mockPrisma.user.update).toHaveBeenCalledWith({ where: { id: 1 }, data: { xp: 70, level: 3 } });
      expect(result).toEqual(expect.objectContaining({ xp: 70, level: 3, leveledUp: true, levelsGained: 2 }));
    });

    it('should throw error for invalid XP amount', async() => {
      await expect(addUserXp(1, -10)).rejects.toThrow('XP amount must be a positive number.');
      await expect(addUserXp(1, 0)).rejects.toThrow('XP amount must be a positive number.');
    });

    it('should throw error if user not found for addUserXp', async() => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(addUserXp(99, 20)).rejects.toThrow('User not found to add XP.');
    });
  });

  describe('checkAndLevelUpUser', () => {
    const baseUser = { id: 1, username: 'testuser', level: 1, xp: 50, money: 1000, settings: {} };

    it('should not level up if XP is less than 100', async() => {
      mockPrisma.user.findUnique.mockResolvedValue(baseUser); // xp: 50
      const result = await checkAndLevelUpUser(1);
      expect(mockPrisma.user.update).not.toHaveBeenCalled();
      expect(result).toEqual(expect.objectContaining({ ...baseUser, leveledUp: false, levelsGained: 0 }));
    });

    it('should level up if XP is 100 or more', async() => {
      const userWithEnoughXp = { ...baseUser, xp: 120 }; // level 1, xp 120
      mockPrisma.user.findUnique.mockResolvedValue(userWithEnoughXp);
      const updatedUser = { ...userWithEnoughXp, xp: 20, level: 2 };
      mockPrisma.user.update.mockResolvedValue(updatedUser);

      const result = await checkAndLevelUpUser(1);
      expect(mockPrisma.user.update).toHaveBeenCalledWith({ where: { id: 1 }, data: { xp: 20, level: 2 } });
      expect(result).toEqual(expect.objectContaining({ xp: 20, level: 2, leveledUp: true, levelsGained: 1 }));
    });
    it('should throw error if user not found for checkAndLevelUpUser', async() => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(checkAndLevelUpUser(99)).rejects.toThrow('User not found for level up check.');
    });
  });

  describe('getUserProgress', () => {
    it('should retrieve user progress', async() => {
      const mockUser = { id: 1, username: 'testuser', name: 'Test User', level: 2, xp: 30 };
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      const progress = await getUserProgress(1);
      expect(progress).toEqual({
        userId: 1,
        username: 'testuser',
        name: 'Test User',
        level: 2,
        xp: 30,
        xpToNextLevel: 70, // 100 - 30
        xpForCurrentLevel: 100
      });
    });
    it('should throw error if user not found for getUserProgress', async() => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(getUserProgress(99)).rejects.toThrow('User not found for progress check.');
    });
  });

  describe('getUserStats', () => {
    it('should retrieve user stats including horse count and average age', async() => {
      const mockUserWithHorses = {
        id: 1,
        username: 'statsuser',
        email: 'stats@example.com',
        role: 'user',
        createdAt: new Date(),
        name: 'Stats User',
        money: 2000,
        level: 5,
        xp: 50,
        horses: [
          { id: 101, name: 'HorseA', age: 5 },
          { id: 102, name: 'HorseB', age: 7 }
        ]
      };
      mockPrisma.user.findUnique.mockResolvedValue(mockUserWithHorses);
      const stats = await getUserStats(1);
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
        include: { horses: true }
      });
      expect(stats).toEqual(expect.objectContaining({
        id: 1,
        username: 'statsuser',
        name: 'Stats User',
        money: 2000,
        level: 5,
        xp: 50,
        horseCount: 2,
        averageHorseAge: 6 // (5+7)/2
      }));
    });

    it('should handle user with no horses for stats', async() => {
      const mockUserNoHorses = {
        id: 2,
        username: 'nohorseuser',
        email: 'nohorse@example.com',
        role: 'user',
        createdAt: new Date(),
        name: 'No Horse User',
        money: 500,
        level: 2,
        xp: 10,
        horses: []
      };
      mockPrisma.user.findUnique.mockResolvedValue(mockUserNoHorses);
      const stats = await getUserStats(2);
      expect(stats).toEqual(expect.objectContaining({
        horseCount: 0,
        averageHorseAge: 0
      }));
    });

    it('should return null if user not found for getUserStats', async() => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      const stats = await getUserStats(99);
      expect(stats).toBeNull();
      expect(mockLogger.warn).toHaveBeenCalled();
    });
  });
});
