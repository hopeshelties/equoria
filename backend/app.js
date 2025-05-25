const express = require('express');
const morgan = require('morgan'); // Re-import morgan
const config = require('./config/config');
const logger = require('./utils/logger'); // Updated logger import path
const pingRoute = require('./routes/ping'); // Require the new ping route
const breedRoutes = require('./routes/breedRoutes'); // <--- Add this line
const competitionRoutes = require('./routes/competitionRoutes'); // Competition routes
const { handleValidationErrors } = require('./middleware/validationErrorHandler'); // Example, if you create it
const errorHandler = require('./middleware/errorHandler'); // Import error handler

const app = express();

// Middleware
// Integrate morgan with winston for HTTP request logging
if (config.env !== 'test') {
  // Morgan stream piped to Winston
  const morganStream = {
    write: (message) => {
      // Remove newline characters from morgan's output to avoid double newlines in winston logs
      logger.info(message.trim());
    },
  };
  app.use(morgan('dev', { stream: morganStream }));
}

app.use(express.json()); // Middleware to parse JSON bodies

// Mount the ping route
app.use('/ping', pingRoute);
app.use('/api/breeds', breedRoutes); // <--- Add this line to mount the breed routes
app.use('/api/competition', competitionRoutes); // Mount competition routes

// Old direct routes removed as per refactoring for /ping.
// The default '/' route can be re-added or managed elsewhere if needed.

// Error handling middleware - must be last
app.use(errorHandler);

module.exports = app; 