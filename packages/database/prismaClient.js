// backend/prismaClient.js
import dotenv from 'dotenv';
dotenv.config({ path: process.env.NODE_ENV === 'test' ? '../../backend/env.test' : '../../backend/.env' }); // Adjusted path

import { PrismaClient } from '@prisma/client';

let prisma;
if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient();
} else {
  if (!global.__prisma) {
    global.__prisma = new PrismaClient();
  }
  prisma = global.__prisma;
}

// Register for cleanup during tests
if (process.env.NODE_ENV === 'test') {
  // Import the cleanup function dynamically to avoid circular dependencies
  import('../../backend/jest.setup.js').then(({ registerPrismaForCleanup }) => {
    registerPrismaForCleanup(prisma);
  }).catch(() => {
    // Ignore if jest.setup.js is not available (non-test environments)
  });
}

export default prisma;