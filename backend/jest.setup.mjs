/* eslint-disable no-console */
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { beforeAll, afterAll } from '@jest/globals';

// Import jest explicitly for ESM environments

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '.env.test') });

setTimeout(() => {}, 0); // optional dummy to ensure it's not shadowed

// ✅ Correct Jest timeout setup
// Ensure 'jest' is available in ESM environments
(globalThis.jest ?? globalThis.jest) && globalThis.jest.setTimeout?.(30000);



console.log('JEST_SETUP: NODE_ENV:', process.env.NODE_ENV); // eslint-disable-line no-console
console.log('JEST_SETUP: DATABASE_URL used for tests:', process.env.DATABASE_URL); // eslint-disable-line no-console

const prismaInstances = new Set();

const originalConsoleError = console.error; // eslint-disable-line no-console
const originalConsoleWarn = console.warn; // eslint-disable-line no-console

beforeAll(() => {
  // console.error = jest.fn();
  // console.warn = jest.fn();
});

afterAll(async() => {
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
  for (const prisma of prismaInstances) {
    try {
      await prisma.$disconnect();
    } catch (err) {
      console.warn('[Jest Setup] Error during cleanup registration:', err.message);
    }
  }
  prismaInstances.clear();
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason); // eslint-disable-line no-console
});

export function registerPrismaForCleanup(prisma) {
  prismaInstances.add(prisma);
}

export async function disconnectPrisma(prisma) {
  try {
    await prisma.$disconnect();
    prismaInstances.delete(prisma);
  } catch (err) {
    console.warn('[Jest Setup] Error during cleanup registration:', err.message);
  }
}
