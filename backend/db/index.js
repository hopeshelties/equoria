const { Pool } = require('pg');
const config = require('../config/config'); // Path to config.js

const pool = new Pool({
  connectionString: config.databaseUrl,
});

// Attempt to connect and log status
pool.connect((err, client, release) => {
  if (err) {
    console.error('[db/index.js] Error connecting to PostgreSQL:', err.stack);
    process.exit(1); // Exit if DB connection fails on module load
  }
  if (client) {
    console.log('[db/index.js] Successfully connected to PostgreSQL and pool initialized.');
    client.release(); // Release the client back to the pool
  }
});

module.exports = pool; // Export the pool for use in other modules