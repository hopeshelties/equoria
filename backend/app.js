const express = require('express');
const morgan = require('morgan'); // Import morgan
const config = require('./config/config');
const pingRoute = require('./routes/ping'); // Require the new ping route
const breedRoutes = require('./routes/breedRoutes'); // <--- Add this line
const { handleValidationErrors } = require('./middleware/validationErrorHandler'); // Example, if you create it
const errorHandler = require('./middleware/errorHandler'); // Import error handler

const app = express();

// Middleware
app.use(morgan('dev')); // Use morgan for request logging
app.use(express.json()); // Middleware to parse JSON bodies

// Mount the ping route
app.use('/ping', pingRoute);
app.use('/api/breeds', breedRoutes); // <--- Add this line to mount the breed routes

// Old direct routes removed as per refactoring for /ping.
// The default '/' route can be re-added or managed elsewhere if needed.

// Error handling middleware - must be last
app.use(errorHandler);

module.exports = app; 