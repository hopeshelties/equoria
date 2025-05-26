// Verification script to ensure tests use the correct database
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load test environment
dotenv.config({ path: join(__dirname, '.env.test') });

console.log('🔍 Database Configuration Verification');
console.log('=====================================');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('DATABASE_URL:', process.env.DATABASE_URL?.replace(/:[^:@]*@/, ':***@'));

// Check if using test database
if (process.env.DATABASE_URL?.includes('equoria_test')) {
  console.log('✅ Correctly configured to use test database');
} else {
  console.log('❌ NOT using test database - this is a problem!');
  process.exit(1);
}

// Test database connection
import { Client } from 'pg';

const client = new Client({
  connectionString: process.env.DATABASE_URL
});

try {
  await client.connect();
  const result = await client.query('SELECT current_database()');
  console.log('✅ Connected to database:', result.rows[0].current_database);
  
  if (result.rows[0].current_database === 'equoria_test') {
    console.log('✅ Confirmed: Using test database');
  } else {
    console.log('❌ ERROR: Connected to wrong database!');
    process.exit(1);
  }
} catch (error) {
  console.error('❌ Database connection failed:', error.message);
  process.exit(1);
} finally {
  await client.end();
}

console.log('🎉 Test database configuration is correct!'); 