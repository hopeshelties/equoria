const { Pool } = require('pg');
const config = require('../config/config');
const logger = require('../utils/logger'); // Import logger

const pool = new Pool({
  connectionString: config.dbUrl, // Corrected property name
});

// Attempt to connect and log status
pool.connect((err, client, release) => {
  if (err) {
    logger.error('[db/index.js] Error connecting to PostgreSQL: %o', err); // Use logger, don't exit
    // Optionally, you might want to throw an error or handle it in a way that tests can catch
    // For now, just logging and allowing the application/tests to handle the pool state.
  }
  if (client) {
    logger.info('[db/index.js] Successfully connected to PostgreSQL and pool initialized.'); // Use logger
    client.release(); // Release the client back to the pool
  }
});

module.exports = pool;