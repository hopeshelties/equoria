import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import config from './config/config.js';
import logger from './utils/logger.js';
import errorHandler from './middleware/errorHandler.js';
import { responseHandler } from './utils/apiResponse.js';
import { securityHeaders, corsOptions, sanitizeInput, apiRateLimit } from './middleware/security.js';
import { healthCheckHandler, livenessHandler, readinessHandler } from './utils/healthCheck.js';

// Import routes
import pingRoutes from './routes/ping.js';
import trainingRoutes from './routes/trainingRoutes.js';
import competitionRoutes from './routes/competitionRoutes.js';
import traitDiscoveryRoutes from './routes/traitDiscoveryRoutes.js';
import horseRoutes from './routes/horseRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import foalRoutes from './routes/foalRoutes.js';

const app = express();

// Trust proxy for accurate IP addresses
app.set('trust proxy', 1);

// Security headers (must be first)
app.use(securityHeaders);

// CORS configuration
app.use(cors(corsOptions));

// Request logging
app.use(morgan('combined', {
  stream: {
    write: (message) => logger.info(message.trim())
  }
}));

// Body parsing middleware
app.use(express.json({ 
  limit: '10mb',
  verify: (req, res, buf) => {
    // Store raw body for signature verification if needed
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting (apply to all routes)
app.use(apiRateLimit);

// Input sanitization (apply to all routes)
app.use(sanitizeInput);

// Response helper middleware
app.use(responseHandler);

// Health check endpoints (no auth required)
app.get('/health', healthCheckHandler);
app.get('/health/live', livenessHandler);
app.get('/health/ready', readinessHandler);

// API routes
app.use('/ping', pingRoutes);
app.use('/api/training', trainingRoutes);
app.use('/api/competition', competitionRoutes);
app.use('/api/traits', traitDiscoveryRoutes);
app.use('/api/horses', horseRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/foals', foalRoutes);

// 404 handler for undefined routes
app.use('*', (req, res) => {
  logger.warn(`[app] 404 - Route not found: ${req.method} ${req.originalUrl} from IP: ${req.ip}`);
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.originalUrl,
    method: req.method
  });
});

// Global error handler (must be last)
app.use(errorHandler);

// Graceful shutdown handling
process.on('SIGTERM', () => {
  logger.info('[app] SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('[app] SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Unhandled promise rejection handler
process.on('unhandledRejection', (reason, promise) => {
  logger.error('[app] Unhandled Promise Rejection:', reason);
  // Don't exit in production, just log
  if (config.env === 'development') {
    process.exit(1);
  }
});

// Uncaught exception handler
process.on('uncaughtException', (error) => {
  logger.error('[app] Uncaught Exception:', error);
  process.exit(1);
});

export default app; 