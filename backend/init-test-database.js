/**
 * This script initializes the test database by generating Prisma client
 * and applying migrations for testing purposes
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config({ path: '.env.test' });

const execAsync = promisify(exec);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function initTestDatabase() {
  try {
    console.log('Starting test database initialization...');

    const backendDir = path.resolve(__dirname);
    const packagesDatabaseDir = path.join(backendDir, '..', 'packages', 'database');
    const schemaPath = path.join(packagesDatabaseDir, 'prisma', 'schema.prisma');

    console.log(`Using schema: ${schemaPath}`);
    console.log(`Executing Prisma commands in: ${packagesDatabaseDir}`);

    const prismaCommand = async(command) => {
      return execAsync(command, { cwd: packagesDatabaseDir });
    };

    // 1. Generate Prisma client
    console.log('Generating Prisma client...');
    await prismaCommand(`npx prisma generate --schema="${schemaPath}"`);
    console.log('Prisma client generated successfully.');

    // 2. Apply migrations to test database
    console.log('Applying migrations to test database...');
    try {
      await prismaCommand(`npx prisma migrate dev --name init_test_db --create-only --schema="${schemaPath}"`);
      console.log('Migration creation step completed.');
    } catch (err) {
      console.warn('Migration creation step may have failed, continuing with reset:', err.message);
    }

    // 3. Force reset the database with migrations
    console.log('Resetting database with schema...');
    await prismaCommand(`npx prisma migrate reset --force --schema="${schemaPath}"`);
    console.log('Database reset and migrations applied successfully.');

    console.log('Test database initialization complete!');
  } catch (error) {
    console.error('Error initializing test database:', error.message);
    console.error(error.stderr || error);
    process.exit(1);
  }
}

// Run the initialization
initTestDatabase();
