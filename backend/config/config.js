require('dotenv').config();

const requiredVars = ['DATABASE_URL', 'PORT'];

for (const key of requiredVars) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

module.exports = {
  databaseUrl: process.env.DATABASE_URL,
  port: process.env.PORT,
}; 

console.log('[config] Loaded environment variables.');