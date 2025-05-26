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

// Define all required and optional environment variables
const requiredVars = ['DATABASE_URL', 'PORT'];
const optionalVars = {
  NODE_ENV: 'development',
  JWT_SECRET: 'your-super-secret-jwt-key-change-in-production',
  JWT_EXPIRES_IN: '7d',
  BCRYPT_ROUNDS: '12',
  RATE_LIMIT_WINDOW_MS: '900000', // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: '100',
  LOG_LEVEL: 'info',
  CORS_ORIGIN: 'http://localhost:3000',
  SESSION_SECRET: 'your-session-secret-change-in-production'
};

// Check for missing required variables
const missingVars = requiredVars.filter(key => !process.env[key]);

if (missingVars.length > 0) {
  console.error('[config] Missing required environment variables:', missingVars.join(', '));
  console.error('[config] Please check your .env file and ensure all required variables are set.');
  process.exit(1);
}

// Set defaults for optional variables
Object.entries(optionalVars).forEach(([key, defaultValue]) => {
  if (!process.env[key]) {
    process.env[key] = defaultValue;
    console.warn(`[config] ${key} not set, using default: ${defaultValue}`);
  }
});

// Validate specific environment variables
const NODE_ENV = process.env.NODE_ENV;
const validEnvironments = ['development', 'production', 'test'];
if (!validEnvironments.includes(NODE_ENV)) {
  console.error(`[config] Invalid NODE_ENV: ${NODE_ENV}. Must be one of: ${validEnvironments.join(', ')}`);
  process.exit(1);
}

// Validate PORT is a number
const PORT = parseInt(process.env.PORT, 10);
if (isNaN(PORT) || PORT < 1 || PORT > 65535) {
  console.error(`[config] Invalid PORT: ${process.env.PORT}. Must be a number between 1 and 65535.`);
  process.exit(1);
}

// Validate DATABASE_URL format
const { DATABASE_URL } = process.env;
if (!DATABASE_URL.startsWith('postgresql://') && !DATABASE_URL.startsWith('postgres://')) {
  console.error('[config] Invalid DATABASE_URL format. Must start with postgresql:// or postgres://');
  process.exit(1);
}

// Validate numeric environment variables
const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS, 10);
if (isNaN(BCRYPT_ROUNDS) || BCRYPT_ROUNDS < 10 || BCRYPT_ROUNDS > 15) {
  console.error(`[config] Invalid BCRYPT_ROUNDS: ${process.env.BCRYPT_ROUNDS}. Must be between 10 and 15.`);
  process.exit(1);
}

const RATE_LIMIT_WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10);
const RATE_LIMIT_MAX_REQUESTS = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10);

if (isNaN(RATE_LIMIT_WINDOW_MS) || RATE_LIMIT_WINDOW_MS < 60000) {
  console.error(`[config] Invalid RATE_LIMIT_WINDOW_MS: ${process.env.RATE_LIMIT_WINDOW_MS}. Must be at least 60000 (1 minute).`);
  process.exit(1);
}

if (isNaN(RATE_LIMIT_MAX_REQUESTS) || RATE_LIMIT_MAX_REQUESTS < 1) {
  console.error(`[config] Invalid RATE_LIMIT_MAX_REQUESTS: ${process.env.RATE_LIMIT_MAX_REQUESTS}. Must be at least 1.`);
  process.exit(1);
}

// Security warnings for production
if (NODE_ENV === 'production') {
  const productionWarnings = [];
  
  if (process.env.JWT_SECRET === optionalVars.JWT_SECRET) {
    productionWarnings.push('JWT_SECRET is using default value');
  }
  
  if (process.env.SESSION_SECRET === optionalVars.SESSION_SECRET) {
    productionWarnings.push('SESSION_SECRET is using default value');
  }
  
  if (BCRYPT_ROUNDS < 12) {
    productionWarnings.push('BCRYPT_ROUNDS should be at least 12 in production');
  }
  
  if (productionWarnings.length > 0) {
    console.warn('[config] PRODUCTION SECURITY WARNINGS:');
    productionWarnings.forEach(warning => console.warn(`  - ${warning}`));
  }
}

const config = {
  port: PORT,
  dbUrl: DATABASE_URL,
  env: NODE_ENV,
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN,
  },
  bcrypt: {
    rounds: BCRYPT_ROUNDS,
  },
  rateLimit: {
    windowMs: RATE_LIMIT_WINDOW_MS,
    maxRequests: RATE_LIMIT_MAX_REQUESTS,
  },
  cors: {
    origin: process.env.CORS_ORIGIN.split(',').map(origin => origin.trim()),
  },
  session: {
    secret: process.env.SESSION_SECRET,
  },
  logging: {
    level: process.env.LOG_LEVEL,
  },
};

// Log successful configuration (without sensitive data)
console.log('[config] Environment variables loaded successfully.');
console.log(`[config] Environment: ${NODE_ENV}`);
console.log(`[config] Port: ${PORT}`);
console.log(`[config] Database: ${DATABASE_URL.split('@')[1] || 'configured'}`); // Hide credentials

export default config;