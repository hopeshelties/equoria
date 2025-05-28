import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env file from backend directory
const envPath = path.resolve(__dirname, '../.env');
const result = dotenv.config({ path: envPath });

if (result.error) {
  console.error('[config] Failed to load .env file:', result.error.message);
  process.exit(1);
}

const requiredVars = ['DATABASE_URL', 'PORT', 'JWT_SECRET'];
const missingVars = requiredVars.filter(key => !process.env[key]);

if (missingVars.length > 0) {
  console.error('[config] Missing required environment variables:', missingVars.join(', '));
  process.exit(1);
}

// NODE_ENV is optional, default to 'development' if not set
const NODE_ENV = process.env.NODE_ENV || 'development';
if (process.env.NODE_ENV === undefined) {
    console.warn('[config] NODE_ENV environment variable is not set. Defaulting to development.');
}

const {
  PORT,
  DATABASE_URL,
  JWT_SECRET,
  ALLOWED_ORIGINS,
} = process.env;

if (!PORT) {
  console.error('PORT environment variable is not set.');
  process.exit(1);
}

const config = {
  port: PORT,
  dbUrl: DATABASE_URL,
  env: NODE_ENV,
  jwtSecret: JWT_SECRET,
  allowedOrigins: ALLOWED_ORIGINS,
};

// Log successful configuration
console.log('[config] Environment variables loaded.');

export default config;