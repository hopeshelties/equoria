import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env file from backend directory
const envPath = path.resolve(__dirname, '../.env');
dotenv.config({ path: envPath });

const requiredVars = ['DATABASE_URL', 'PORT', 'JWT_SECRET'];
const missingVars = requiredVars.filter(key => !process.env[key]);

if (missingVars.length > 0) {
  // console.error('[config] Missing required environment variables:', missingVars.join(', '));
  process.exit(1);
}

// NODE_ENV is optional, default to 'development' if not set
const NODE_ENV = process.env.NODE_ENV || 'development';
// if (process.env.NODE_ENV === undefined) {
//   console.warn('[config] NODE_ENV environment variable is not set. Defaulting to development.');
// }

// Determine which database URL to use
let resolvedDbUrl = process.env.DATABASE_URL;
if (NODE_ENV === 'test' && process.env.DATABASE_URL_TEST) {
  resolvedDbUrl = process.env.DATABASE_URL_TEST;
  // console.log('[config] Using test database URL for test environment.');
} else if (NODE_ENV === 'test') {
  // console.warn('[config] NODE_ENV is test, but DATABASE_URL_TEST is not set. Using default DATABASE_URL.');
}

const {
  PORT,
  JWT_SECRET,
  ALLOWED_ORIGINS
} = process.env;

if (!PORT) {
  // console.error('PORT environment variable is not set.');
  process.exit(1);
}

const config = {
  port: PORT,
  dbUrl: resolvedDbUrl, // Use the potentially overridden DATABASE_URL
  env: NODE_ENV,
  jwtSecret: JWT_SECRET,
  allowedOrigins: ALLOWED_ORIGINS
};

// console.log('[config] Environment variables loaded.');

export default config;