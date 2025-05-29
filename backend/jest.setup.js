/**
 * Jest Setup File
 * Handles global test setup and teardown for proper resource cleanup
 */

import dotenv from 'dotenv';
dotenv.config({ path: './.env.test' });
import { jest, beforeAll, afterAll } from '@jest/globals';
jest.setTimeout(30000); // Global test timeout

// Log the NODE_ENV and DATABASE_URL to confirm they are set correctly for tests
console.log('JEST_SETUP: NODE_ENV:', process.env.NODE_ENV); // eslint-disable-line no-console
console.log('JEST_SETUP: DATABASE_URL used for tests:', process.env.DATABASE_URL); // eslint-disable-line no-console
console.log('[JEST DEBUG] Using DATABASE_URL:', process.env.DATABASE_URL); // eslint-disable-line no-console

// Track all Prisma instances for cleanup
const prismaInstances = new Set();

// Mock console methods to reduce test noise (optional)
const originalConsoleError = console.error; // eslint-disable-line no-console
const originalConsoleWarn = console.warn; // eslint-disable-line no-console

beforeAll(() => {
  // Optionally suppress console noise during tests
  // console.error = jest.fn();
  // console.warn = jest.fn();
});

afterAll(async() => {
  // Restore console methods
  console.error = originalConsoleError; // eslint-disable-line no-console
  console.warn = originalConsoleWarn; // eslint-disable-line no-console

  // Clean up all Prisma instances
  for (const prisma of prismaInstances) {
    try {
      await prisma.$disconnect();
    } catch (error) {
      // Ignore errors during cleanup
    }
  }
  prismaInstances.clear();
});

// Global error handler for unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason); // eslint-disable-line no-console
});

// Export functions for Prisma cleanup
export function registerPrismaForCleanup(prisma) {
  prismaInstances.add(prisma);
}

export async function disconnectPrisma(prisma) {
  try {
    await prisma.$disconnect();
    prismaInstances.delete(prisma);
  } catch (error) {
    // Ignore errors during cleanup
  }
}

// console.log('[JEST SETUP COMPLETE]'); // eslint-disable-next-line no-console
