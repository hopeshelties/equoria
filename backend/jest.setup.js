/**
 * Jest Setup File
 * Handles global test setup and teardown for proper resource cleanup
 */

import { jest } from '@jest/globals';

// Global test timeout
jest.setTimeout(30000);

// Track all Prisma instances for cleanup
const prismaInstances = new Set();

// Mock console methods to reduce test noise (optional)
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

beforeAll(() => {
  // Optionally suppress console noise during tests
  // Uncomment if you want quieter test output
  // console.error = jest.fn(); // eslint-disable-line no-console
  // console.warn = jest.fn(); // eslint-disable-line no-console
});

afterAll(async() => {
  // Restore console methods
  // eslint-disable-next-line no-console
  console.error = originalConsoleError;
  // eslint-disable-next-line no-console
  console.warn = originalConsoleWarn;

  // Clean up all Prisma instances
  for (const prisma of prismaInstances) {
    try {
      await prisma.$disconnect();
    } catch (error) {
      // Ignore errors during cleanup
    }
  }

  // Clear the set
  prismaInstances.clear();
});

// Global error handler for unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  // eslint-disable-next-line no-console
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Export a function to register Prisma instances for cleanup
export function registerPrismaForCleanup(prisma) {
  prismaInstances.add(prisma);
}

// Export a function to manually disconnect a Prisma instance
export async function disconnectPrisma(prisma) {
  try {
    await prisma.$disconnect();
    prismaInstances.delete(prisma);
  } catch (error) {
    // Ignore errors during cleanup
  }
}
