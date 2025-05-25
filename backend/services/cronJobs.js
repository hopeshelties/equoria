import cron from 'node-cron';
import prisma from '../db/index.js';
import logger from '../utils/logger.js';
import { evaluateTraitRevelation } from '../utils/traitEvaluation.js';
import { revealTraits } from '../utils/traitDiscovery.js';

/**
 * Daily trait evaluation cron job that runs at midnight
 * Evaluates all foals aged 0-6 days for trait revelation
 */
class CronJobService {
  constructor() {
    this.jobs = new Map();
    this.isRunning = false;
  }

  /**
   * Initialize and start all cron jobs
   */
  start() {
    if (this.isRunning) {
      logger.warn('[CronJobService] Cron jobs are already running');
      return;
    }

    logger.info('[CronJobService] Starting cron job service');

    // Daily trait evaluation job - runs at midnight
    const dailyTraitJob = cron.schedule('0 0 * * *', async () => {
      await this.evaluateDailyFoalTraits();
    }, {
      scheduled: false,
      timezone: 'UTC'
    });

    this.jobs.set('dailyTraitEvaluation', dailyTraitJob);

    // Start all jobs
    this.jobs.forEach((job, name) => {
      job.start();
      logger.info(`[CronJobService] Started job: ${name}`);
    });

    this.isRunning = true;
    logger.info('[CronJobService] All cron jobs started successfully');
  }

  /**
   * Stop all cron jobs
   */
  stop() {
    if (!this.isRunning) {
      logger.warn('[CronJobService] Cron jobs are not running');
      return;
    }

    logger.info('[CronJobService] Stopping cron job service');

    this.jobs.forEach((job, name) => {
      job.stop();
      logger.info(`[CronJobService] Stopped job: ${name}`);
    });

    this.isRunning = false;
    logger.info('[CronJobService] All cron jobs stopped');
  }

  /**
   * Main daily trait evaluation function
   * Iterates through all foals aged 0-6 days and evaluates traits
   */
  async evaluateDailyFoalTraits() {
    const startTime = Date.now();
    logger.info('[CronJobService.evaluateDailyFoalTraits] Starting daily foal trait evaluation');

    try {
      // Get all foals aged 0-1 years (foals in development period)
      const foals = await prisma.horse.findMany({
        where: {
          age: {
            in: [0, 1] // 0 = newborn, 1 = yearling
          }
        },
        include: {
          foalDevelopment: true
        }
      });

      if (foals.length === 0) {
        logger.info('[CronJobService.evaluateDailyFoalTraits] No foals found for evaluation');
        return;
      }

      logger.info(`[CronJobService.evaluateDailyFoalTraits] Found ${foals.length} foals for evaluation`);

      let processedCount = 0;
      let updatedCount = 0;
      let errorCount = 0;

      // Process each foal
      for (const foal of foals) {
        try {
          const result = await this.evaluateFoalTraits(foal);
          processedCount++;
          
          if (result.traitsRevealed > 0) {
            updatedCount++;
          }

        } catch (error) {
          errorCount++;
          logger.error(`[CronJobService.evaluateDailyFoalTraits] Error processing foal ${foal.id}: ${error.message}`);
        }
      }

      const duration = Date.now() - startTime;
      logger.info(`[CronJobService.evaluateDailyFoalTraits] Completed evaluation in ${duration}ms`);
      logger.info(`[CronJobService.evaluateDailyFoalTraits] Summary: ${processedCount} processed, ${updatedCount} updated, ${errorCount} errors`);

      // Log audit summary
      await this.logAuditSummary({
        timestamp: new Date(),
        foalsProcessed: processedCount,
        foalsUpdated: updatedCount,
        errors: errorCount,
        duration: duration
      });

    } catch (error) {
      logger.error(`[CronJobService.evaluateDailyFoalTraits] Critical error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Evaluate traits for a single foal
   * @param {Object} foal - Foal data with development information
   * @returns {Object} - Evaluation result
   */
  async evaluateFoalTraits(foal) {
    try {
      logger.info(`[CronJobService.evaluateFoalTraits] Evaluating foal ${foal.id} (${foal.name})`);

      // Get current development day
      const currentDay = foal.foalDevelopment?.currentDay || 0;
      
      // Skip foals that have completed development (day > 6)
      if (currentDay > 6) {
        logger.info(`[CronJobService.evaluateFoalTraits] Foal ${foal.id} has completed development (day ${currentDay})`);
        return { traitsRevealed: 0, reason: 'development_complete' };
      }

      // Get current epigenetic modifiers
      const currentTraits = foal.epigenetic_modifiers || {
        positive: [],
        negative: [],
        hidden: []
      };

      // Evaluate new traits
      const newTraits = evaluateTraitRevelation(foal, currentTraits, currentDay);

      // Check if any new traits were revealed
      const totalNewTraits = newTraits.positive.length + newTraits.negative.length + newTraits.hidden.length;

      if (totalNewTraits === 0) {
        logger.info(`[CronJobService.evaluateFoalTraits] No new traits revealed for foal ${foal.id}`);
        return { traitsRevealed: 0, reason: 'no_new_traits' };
      }

      // Merge new traits with existing traits
      const updatedTraits = {
        positive: [...(currentTraits.positive || []), ...newTraits.positive],
        negative: [...(currentTraits.negative || []), ...newTraits.negative],
        hidden: [...(currentTraits.hidden || []), ...newTraits.hidden]
      };

      // Update the horse record
      await prisma.horse.update({
        where: { id: foal.id },
        data: {
          epigenetic_modifiers: updatedTraits
        }
      });

      // Log the action for auditing
      await this.logTraitRevelation(foal.id, foal.name, newTraits, currentDay);

      // Also check for trait discovery conditions after trait evaluation
      try {
        const discoveryResults = await revealTraits(foal.id);
        if (discoveryResults.traitsRevealed.length > 0) {
          logger.info(`[CronJobService.evaluateFoalTraits] Trait discovery revealed ${discoveryResults.traitsRevealed.length} additional traits for foal ${foal.id}`);
        }
      } catch (discoveryError) {
        logger.warn(`[CronJobService.evaluateFoalTraits] Trait discovery failed for foal ${foal.id}: ${discoveryError.message}`);
      }

      logger.info(`[CronJobService.evaluateFoalTraits] Updated foal ${foal.id} with ${totalNewTraits} new traits`);

      return {
        traitsRevealed: totalNewTraits,
        newTraits: newTraits,
        updatedTraits: updatedTraits
      };

    } catch (error) {
      logger.error(`[CronJobService.evaluateFoalTraits] Error evaluating foal ${foal.id}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Log trait revelation for auditing purposes
   * @param {number} foalId - Foal ID
   * @param {string} foalName - Foal name
   * @param {Object} newTraits - New traits revealed
   * @param {number} currentDay - Current development day
   */
  async logTraitRevelation(foalId, foalName, newTraits, currentDay) {
    try {
      const logEntry = {
        timestamp: new Date().toISOString(),
        foalId: foalId,
        foalName: foalName,
        developmentDay: currentDay,
        traitsRevealed: {
          positive: newTraits.positive,
          negative: newTraits.negative,
          hidden: newTraits.hidden
        },
        totalCount: newTraits.positive.length + newTraits.negative.length + newTraits.hidden.length
      };

      // Log to application logs
      logger.info(`[CronJobService.AUDIT] Trait revelation: ${JSON.stringify(logEntry)}`);

      // Could also store in a dedicated audit table if needed
      // await prisma.traitAuditLog.create({ data: logEntry });

    } catch (error) {
      logger.error(`[CronJobService.logTraitRevelation] Error logging trait revelation: ${error.message}`);
    }
  }

  /**
   * Log daily audit summary
   * @param {Object} summary - Summary data
   */
  async logAuditSummary(summary) {
    try {
      const auditSummary = {
        type: 'DAILY_TRAIT_EVALUATION_SUMMARY',
        timestamp: summary.timestamp.toISOString(),
        statistics: {
          foalsProcessed: summary.foalsProcessed,
          foalsUpdated: summary.foalsUpdated,
          errors: summary.errors,
          duration: summary.duration
        }
      };

      logger.info(`[CronJobService.AUDIT] Daily summary: ${JSON.stringify(auditSummary)}`);

    } catch (error) {
      logger.error(`[CronJobService.logAuditSummary] Error logging audit summary: ${error.message}`);
    }
  }

  /**
   * Manually trigger trait evaluation (for testing/admin purposes)
   * @returns {Object} - Evaluation results
   */
  async manualTraitEvaluation() {
    logger.info('[CronJobService.manualTraitEvaluation] Manual trait evaluation triggered');
    return await this.evaluateDailyFoalTraits();
  }

  /**
   * Get cron job status
   * @returns {Object} - Status information
   */
  getStatus() {
    const jobStatuses = {};
    this.jobs.forEach((job, name) => {
      jobStatuses[name] = {
        running: job.running,
        scheduled: job.scheduled
      };
    });

    return {
      serviceRunning: this.isRunning,
      jobs: jobStatuses,
      totalJobs: this.jobs.size
    };
  }
}

// Create singleton instance
const cronJobService = new CronJobService();

export default cronJobService; 