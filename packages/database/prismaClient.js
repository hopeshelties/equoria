// packages/database/prismaClient.js or backend/prismaClient.js
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

dotenv.config({ path: process.env.NODE_ENV === 'test' ? './env.test' : './.env' });

let prisma;

if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient();
} else {
  // Use global to prevent multiple instances during development/hot reloads
  if (!global.__prisma) {
    global.__prisma = new PrismaClient();
  }
  prisma = global.__prisma;
}

// For tests: register for cleanup
if (process.env.NODE_ENV === 'test') {
  try {
    // Dynamic import to prevent circular dependency
    const { registerPrismaForCleanup } = await import('./jest.setup.js');
    registerPrismaForCleanup(prisma);
  } catch (err) {
    console.warn('[PrismaClient] Could not register for test cleanup:', err.message);
  }
}

export default prisma;
