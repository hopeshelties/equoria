import express from 'express';
import morgan from 'morgan';
import config from './config/config.js';
import logger from './utils/logger.js';
import pingRoute from './routes/ping.js';
import breedRoutes from './routes/breedRoutes.js';
import competitionRoutes from './routes/competitionRoutes.js';
import authRoutes from './routes/authRoutes.js';
import horseRoutes from './routes/horseRoutes.js';
import userRoutes from './routes/userRoutes.js'; // Changed from playerRoutes
import trainingRoutes from './routes/trainingRoutes.js';
import foalRoutes from './routes/foalRoutes.js';
import traitRoutes from './routes/traitRoutes.js';
import groomRoutes from './routes/groomRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import leaderboardRoutes from './routes/leaderboardRoutes.js';
import errorHandler from './middleware/errorHandler.js';
import { createSecurityMiddleware } from './middleware/security.js';
import { requestLogger, errorRequestLogger } from './middleware/requestLogger.js';
import { specs, swaggerUi } from './docs/swagger.js';
import cronJobService from './services/cronJobs.js';

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

// Routes
app.use('/ping', pingRoute);
app.use('/api/auth', authRoutes);
app.use('/api/breeds', breedRoutes);
app.use('/api/competition', competitionRoutes);
app.use('/api/horses', horseRoutes);
app.use('/api/user', userRoutes); // Changed from /api/player and playerRoutes
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
