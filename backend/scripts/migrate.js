#!/usr/bin/env node

/**
 * Database Migration Script
 * Handles database migrations for production deployment
 */

import { fileURLToPath } from 'url';
import path from 'path';
import { execSync } from 'child_process';
import dotenv from 'dotenv';

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
const envPath = path.resolve(__dirname, '../.env');
dotenv.config({ path: envPath });

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is required');
  process.exit(1);
}

console.log('🔄 Starting database migration...');

try {
  // Change to the database package directory
  const databaseDir = path.resolve(__dirname, '../../packages/database');
  process.chdir(databaseDir);
  
  console.log('📦 Generating Prisma client...');
  execSync('npx prisma generate', { stdio: 'inherit' });
  
  console.log('🗄️ Running database migrations...');
  execSync('npx prisma migrate deploy', { stdio: 'inherit' });
  
  console.log('✅ Database migration completed successfully!');
  
} catch (error) {
  console.error('❌ Database migration failed:', error.message);
  process.exit(1);
}
