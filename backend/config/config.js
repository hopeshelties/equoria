const path = require('path');
const dotenv = require('dotenv');
const logger = require('../utils/logger');

// Load .env file from backend directory
const envPath = path.resolve(__dirname, '../.env');
const result = dotenv.config({ path: envPath });

if (result.error) {
  logger.error('[config] Failed to load .env file: %s', result.error.message);
  process.exit(1);
}

const requiredVars = ['DATABASE_URL', 'PORT'];
const missingVars = requiredVars.filter(key => !process.env[key]);

if (missingVars.length > 0) {
  logger.error('[config] Missing required environment variables: %s', missingVars.join(', '));
  process.exit(1);
}

// NODE_ENV is optional, default to 'development' if not set
const NODE_ENV = process.env.NODE_ENV || 'development';
if (process.env.NODE_ENV === undefined) {
    logger.warn('[config] NODE_ENV environment variable is not set. Defaulting to development.');
}

const {
  PORT,
  DATABASE_URL,
} = process.env;

if (!PORT) {
  logger.error('PORT environment variable is not set.');
  process.exit(1);
}

module.exports = {
  port: PORT,
  dbUrl: DATABASE_URL,
  env: NODE_ENV,
};

// Log successful configuration
logger.info('[config] Environment variables loaded.');