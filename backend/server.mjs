// Initialize database connection
import './db/index.js';

import app from './app.js';
import config from './config/config.js';
import logger from './utils/logger.js';

const { port } = config;

const server = app.listen(port, () => {
  logger.info(`🚀 Server running on port ${port}`);
  logger.info(`📊 Environment: ${config.env}`);
  logger.info(`📚 API Documentation: http://localhost:${port}/api-docs`);
  logger.info(`❤️ Health Check: http://localhost:${port}/health`);
});

// Graceful shutdown handler
const gracefulShutdown = signal => {
  logger.info(`[shutdown] Received ${signal}. Starting graceful shutdown...`);

  server.close(err => {
    if (err) {
      logger.error('[shutdown] Error during server close:', err);
      process.exit(1);
    }

    logger.info('[shutdown] HTTP server closed');

    // Close database connections
    import('./db/index.js')
      .then(({ default: prisma }) => {
        return prisma.$disconnect();
      })
      .then(() => {
        logger.info('[shutdown] Database connections closed');
        logger.info('[shutdown] Graceful shutdown completed');
        process.exit(0);
      })
      .catch(err => {
        logger.error('[shutdown] Error closing database connections:', err);
        process.exit(1);
      });
  });

  // Force shutdown after 30 seconds
  setTimeout(() => {
    logger.error('[shutdown] Forced shutdown after timeout');
    process.exit(1);
  }, 30000);
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', err => {
  logger.error('[fatal] Uncaught Exception:', err);
  gracefulShutdown('uncaughtException');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('[fatal] Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('unhandledRejection');
});
