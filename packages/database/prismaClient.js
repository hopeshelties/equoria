// packages/database/prismaClient.js or backend/prismaClient.js
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url'; // Added pathToFileURL

// Ensure __dirname resolution works in ESM (Added)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Corrected dotenv path resolution
// Assuming .env and env.test are in the 'backend' directory, relative to the monorepo root
const backendDir = path.resolve(__dirname, '../../backend'); // Navigate up from packages/database to root, then to backend
dotenv.config({ path: process.env.NODE_ENV === 'test' ? path.join(backendDir, '.env.test') : path.join(backendDir, '.env') });


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
    // Corrected path to jest.setup.js in the backend folder
    const jestSetupPath = path.resolve(__dirname, '../../backend/jest.setup.js');
    const jestSetupURL = pathToFileURL(jestSetupPath).href; // Convert to file URL
    const { registerPrismaForCleanup } = await import(jestSetupURL); // Use URL for import
    registerPrismaForCleanup(prisma);
  } catch (err) {
    console.warn('[PrismaClient] Could not register for test cleanup:', err.message);
    // Log the path it tried to import for easier debugging if it still fails
    const attemptedPath = path.resolve(__dirname, '../../backend/jest.setup.js');
    console.warn(`[PrismaClient] Attempted to import path: ${attemptedPath}`);
    if (err.message.includes('ERR_MODULE_NOT_FOUND') && err.message.includes(pathToFileURL(attemptedPath).href)) {
      console.warn(`[PrismaClient] Verified that the file URL ${pathToFileURL(attemptedPath).href} could not be found.`);
    }
  }
}

export default prisma;
