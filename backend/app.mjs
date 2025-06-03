import express from 'express';
import morgan from 'morgan';
import config from './config/config.mjs';
import logger from './utils/logger.mjs';
import pingRoute from './routes/ping.mjs';
import breedRoutes from './routes/breedRoutes.mjs';
import competitionRoutes from './routes/competitionRoutes.mjs';
import authRoutes from './routes/authRoutes.mjs';
import horseRoutes from './routes/horseRoutes.mjs';
import userRoutes from './routes/userRoutes.mjs';
import trainingRoutes from './routes/trainingRoutes.mjs';
import foalRoutes from './routes/foalRoutes.mjs';
import traitRoutes from './routes/traitRoutes.mjs';
import groomRoutes from './routes/groomRoutes.mjs';
import adminRoutes from './routes/adminRoutes.mjs';
import leaderboardRoutes from './routes/leaderboardRoutes.mjs';
import errorHandler from './middleware/errorHandler.mjs';
import { createSecurityMiddleware } from './middleware/security.mjs';
import { requestLogger, errorRequestLogger } from './middleware/requestLogger.mjs';
import { specs, swaggerUi } from './docs/swagger.mjs';
import cronJobService from './services/cronJobs.mjs';
import { validateDatabaseSchemaOrExit } from './utils/schemaValidator.mjs';

const app = express();

// Security middleware (applied first)
app.use(createSecurityMiddleware());

// Request logging middleware
if (config.env !== 'test') {
  app.use(requestLogger);
}

// Morgan logging middleware
if (config.env !== 'test') {
  // Morgan stream piped to Winston
  const morganStream = {
    write: message => {
      // Remove newline characters from morgan's output to avoid double newlines in winston logs
      logger.info(message.trim());
    },
  };
  app.use(morgan('dev', { stream: morganStream }));
}

// Body parsing middleware
app.use(express.json({ limit: '10mb' })); // Middleware to parse JSON bodies with size limit
app.use(express.urlencoded({ extended: true, limit: '10mb' })); // Parse URL-encoded bodies

// API Documentation
app.use(
  '/api-docs',
  swaggerUi.serve,
  swaggerUi.setup(specs, {
    explorer: true,
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Equoria API Documentation',
  }),
);

// API Documentation JSON
app.get('/api-docs.json', (_req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(specs);
});

// Validate database schema compatibility
if (config.env !== 'test') {
  logger.info('[app] Validating database schema compatibility...');
  // This is an async operation, but we want it to block startup if it fails
  // The function will exit the process if validation fails
  validateDatabaseSchemaOrExit().catch(error => {
    logger.error('[app] Fatal error during schema validation:', error);
    process.exit(1);
  });
  logger.info('[app] Database schema validation completed');
}

// Routes
app.use('/ping', pingRoute);
app.use('/api/auth', authRoutes);
app.use('/api/breeds', breedRoutes);
app.use('/api/competition', competitionRoutes);
app.use('/api/horses', horseRoutes);
app.use('/api/user', userRoutes);
app.use('/api/training', trainingRoutes);
app.use('/api/foals', foalRoutes);
app.use('/api/traits', traitRoutes);
app.use('/api/grooms', groomRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/leaderboard', leaderboardRoutes);

// Initialize cron job service
if (config.env !== 'test') {
  cronJobService.start();
  logger.info('[app] Cron job service initialized');
}

// Old direct routes removed as per refactoring for /ping.
// The default '/' route can be re-added or managed elsewhere if needed.

// Error handling middleware - must be last
app.use(errorRequestLogger); // Log errors before handling them
app.use(errorHandler);

// Test data removed - was unused

export default app;
