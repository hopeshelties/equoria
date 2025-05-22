const path = require('path');
const dotenv = require('dotenv');

// Load .env file explicitly from project root
const envPath = path.resolve(__dirname, '../../.env');
const result = dotenv.config({ path: envPath });

if (result.error) {
  console.error('[config] Failed to load .env file:', result.error.message);
  process.exit(1);
}

const requiredVars = ['DATABASE_URL', 'PORT'];
const missingVars = requiredVars.filter(key => !process.env[key]);

if (missingVars.length > 0) {
  console.error('[config] Missing required environment variables:', missingVars.join(', '));
  process.exit(1);
}

module.exports = {
  databaseUrl: process.env.DATABASE_URL,
  port: parseInt(process.env.PORT, 10), // Ensure port is a number
};

// Log successful configuration
console.log('[config] Environment variables loaded successfully.');