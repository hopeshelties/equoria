import express from 'express';
import { body, param, validationResult } from 'express-validator';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { auditAdmin } from '../middleware/auditLog.js';
import logger from '../utils/logger.js';
import { ApiResponse } from '../utils/apiResponse.js';
import prisma from '../db/index.js';

const router = express.Router();

// All admin routes require authentication and admin role
router.use(authenticateToken);
router.use(requireRole('admin'));
router.use(auditAdmin);

/**
 * GET /api/admin/cron/status
 * Get current status of cron job service
 */
router.get('/cron/status', async (req, res) => {
  try {
    logger.info(`[adminRoutes] Admin ${req.user.email} checking cron job status`);
    
    // Mock cron job status - replace with actual implementation
    const cronStatus = {
      serviceRunning: true,
      lastRun: new Date().toISOString(),
      nextRun: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      jobsActive: 3,
      totalJobsRun: 1586,
      errors: 0
    };
    
    return res.status(200).json(ApiResponse.success(
      'Cron job status retrieved successfully',
      cronStatus
    ));
    
  } catch (error) {
    logger.error('[adminRoutes] Error getting cron status:', error);
    return res.status(500).json(ApiResponse.serverError('Failed to retrieve cron status'));
  }
});

/**
 * POST /api/admin/cron/start
 * Start the cron job service
 */
router.post('/cron/start', async (req, res) => {
  try {
    logger.info(`[adminRoutes] Admin ${req.user.email} starting cron job service`);
    
    // Mock cron job start - replace with actual implementation
    const result = {
      success: true,
      message: 'Cron job service started successfully',
      startedAt: new Date().toISOString()
    };
    
    return res.status(200).json(ApiResponse.success(
      'Cron job service started successfully',
      result
    ));
    
  } catch (error) {
    logger.error('[adminRoutes] Error starting cron service:', error);
    return res.status(500).json(ApiResponse.serverError('Failed to start cron service'));
  }
});

/**
 * POST /api/admin/cron/stop
 * Stop the cron job service
 */
router.post('/cron/stop', async (req, res) => {
  try {
    logger.info(`[adminRoutes] Admin ${req.user.email} stopping cron job service`);
    
    // Mock cron job stop - replace with actual implementation
    const result = {
      success: true,
      message: 'Cron job service stopped successfully',
      stoppedAt: new Date().toISOString()
    };
    
    return res.status(200).json(ApiResponse.success(
      'Cron job service stopped successfully',
      result
    ));
    
  } catch (error) {
    logger.error('[adminRoutes] Error stopping cron service:', error);
    return res.status(500).json(ApiResponse.serverError('Failed to stop cron service'));
  }
});

/**
 * POST /api/admin/traits/evaluate
 * Manually trigger trait evaluation for all foals
 */
router.post('/traits/evaluate', async (req, res) => {
  try {
    logger.info(`[adminRoutes] Admin ${req.user.email} manually triggering trait evaluation`);
    
    // Mock trait evaluation - replace with actual implementation
    const startTime = Date.now();
    
    // Simulate processing
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const result = {
      success: true,
      message: 'Trait evaluation completed successfully',
      statistics: {
        foalsProcessed: 1586,
        foalsUpdated: 12,
        errors: 0,
        duration: Date.now() - startTime
      },
      completedAt: new Date().toISOString()
    };
    
    return res.status(200).json(ApiResponse.success(
      'Trait evaluation completed successfully',
      result
    ));
    
  } catch (error) {
    logger.error('[adminRoutes] Error running trait evaluation:', error);
    return res.status(500).json(ApiResponse.serverError('Failed to run trait evaluation'));
  }
});

/**
 * GET /api/admin/foals/development
 * Get all foals currently in development
 */
router.get('/foals/development', async (req, res) => {
  try {
    logger.info(`[adminRoutes] Admin ${req.user.email} getting foals in development`);
    
    // Get foals in development (age <= 1 year)
    const foalsInDevelopment = await prisma.horse.findMany({
      where: {
        age: {
          lte: 1
        }
      },
      include: {
        breed: true,
        player: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    const developmentStats = {
      totalFoals: foalsInDevelopment.length,
      byAge: {
        newborn: foalsInDevelopment.filter(f => f.age === 0).length,
        yearling: foalsInDevelopment.filter(f => f.age === 1).length
      }
    };
    
    return res.status(200).json(ApiResponse.success(
      'Foals in development retrieved successfully',
      {
        foals: foalsInDevelopment,
        statistics: developmentStats
      }
    ));
    
  } catch (error) {
    logger.error('[adminRoutes] Error getting foals in development:', error);
    return res.status(500).json(ApiResponse.serverError('Failed to retrieve foals in development'));
  }
});

/**
 * GET /api/admin/traits/definitions
 * Get all trait definitions for admin management
 */
router.get('/traits/definitions', async (req, res) => {
  try {
    logger.info(`[adminRoutes] Admin ${req.user.email} getting trait definitions`);
    
    // Mock trait definitions - replace with actual implementation
    const traitDefinitions = {
      positive: [
        { key: 'intelligent', name: 'Intelligent', description: 'Quick learner with high problem-solving ability' },
        { key: 'calm', name: 'Calm', description: 'Maintains composure under pressure' },
        { key: 'athletic', name: 'Athletic', description: 'Naturally gifted physical abilities' },
        { key: 'resilient', name: 'Resilient', description: 'Recovers quickly from setbacks' }
      ],
      negative: [
        { key: 'nervous', name: 'Nervous', description: 'Easily startled and anxious' },
        { key: 'stubborn', name: 'Stubborn', description: 'Resistant to training and commands' },
        { key: 'aggressive', name: 'Aggressive', description: 'Tendency toward hostile behavior' }
      ],
      hidden: [
        { key: 'mysterious_trait_1', name: 'Hidden Trait 1', description: 'A trait yet to be discovered' },
        { key: 'mysterious_trait_2', name: 'Hidden Trait 2', description: 'Another undiscovered trait' }
      ]
    };
    
    return res.status(200).json(ApiResponse.success(
      'Trait definitions retrieved successfully',
      traitDefinitions
    ));
    
  } catch (error) {
    logger.error('[adminRoutes] Error getting trait definitions:', error);
    return res.status(500).json(ApiResponse.serverError('Failed to retrieve trait definitions'));
  }
});

/**
 * GET /api/admin/system/health
 * Get system health status for monitoring
 */
router.get('/system/health', async (req, res) => {
  try {
    logger.info(`[adminRoutes] Admin ${req.user.email} checking system health`);
    
    // Check database connection
    const dbHealthy = await prisma.$queryRaw`SELECT 1 as healthy`
      .then(() => true)
      .catch(() => false);
    
    const systemHealth = {
      database: {
        status: dbHealthy ? 'healthy' : 'unhealthy',
        lastChecked: new Date().toISOString()
      },
      server: {
        status: 'healthy',
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        version: process.version
      },
      security: {
        rateLimitActive: true,
        auditLoggingActive: true,
        securityHeadersActive: true
      }
    };
    
    const overallStatus = dbHealthy ? 'healthy' : 'degraded';
    
    return res.status(200).json(ApiResponse.success(
      `System health check completed - ${overallStatus}`,
      systemHealth
    ));
    
  } catch (error) {
    logger.error('[adminRoutes] Error checking system health:', error);
    return res.status(500).json(ApiResponse.serverError('Failed to check system health'));
  }
});

/**
 * GET /api/admin/security/alerts
 * Get recent security alerts and suspicious activity
 */
router.get('/security/alerts', async (req, res) => {
  try {
    logger.info(`[adminRoutes] Admin ${req.user.email} checking security alerts`);
    
    // Mock security alerts - replace with actual implementation
    const securityAlerts = {
      recentAlerts: [
        {
          id: 1,
          type: 'multiple_ip_addresses',
          severity: 'high',
          userId: 'user123',
          description: 'User accessed from 3 different IP addresses',
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
        },
        {
          id: 2,
          type: 'rapid_fire_requests',
          severity: 'medium',
          userId: 'user456',
          description: 'User made 25 requests in 30 seconds',
          timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString()
        }
      ],
      statistics: {
        totalAlertsToday: 5,
        highSeverityAlerts: 2,
        mediumSeverityAlerts: 3,
        lowSeverityAlerts: 0
      }
    };
    
    return res.status(200).json(ApiResponse.success(
      'Security alerts retrieved successfully',
      securityAlerts
    ));
    
  } catch (error) {
    logger.error('[adminRoutes] Error getting security alerts:', error);
    return res.status(500).json(ApiResponse.serverError('Failed to retrieve security alerts'));
  }
});

export default router; 