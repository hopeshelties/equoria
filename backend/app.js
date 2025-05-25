import express from 'express';
import morgan from 'morgan'; // Re-import morgan
import config from './config/config.js';
import logger from './utils/logger.js'; // Updated logger import path
import pingRoute from './routes/ping.js'; // Require the new ping route
import breedRoutes from './routes/breedRoutes.js'; // <--- Add this line
import competitionRoutes from './routes/competitionRoutes.js'; // Competition routes
import horseRoutes from './routes/horseRoutes.js'; // Horse routes
import trainingRoutes from './routes/trainingRoutes.js'; // Training routes
import foalRoutes from './routes/foalRoutes.js'; // Foal routes
import adminRoutes from './routes/adminRoutes.js'; // Admin routes
// import { handleValidationErrors } from './middleware/validationErrorHandler.js'; // Example, if you create it
import errorHandler from './middleware/errorHandler.js'; // Import error handler
import cronJobService from './services/cronJobs.js'; // Cron job service

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
app.use('/api/horses', horseRoutes); // Mount horse routes
app.use('/api/training', trainingRoutes); // Mount training routes
app.use('/api/foals', foalRoutes); // Mount foal routes
app.use('/api/admin', adminRoutes); // Mount admin routes

// Initialize cron job service
if (config.env !== 'test') {
  cronJobService.start();
  logger.info('[app] Cron job service initialized');
}

// Old direct routes removed as per refactoring for /ping.
// The default '/' route can be re-added or managed elsewhere if needed.

// Error handling middleware - must be last
app.use(errorHandler);

export default app; 