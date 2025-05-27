import express from 'express';
import leaderboardController from '../controllers/leaderboardController.js';
import auth from '../middleware/auth.js';

const router = express.Router();

/**
 * @swagger
 * /api/leaderboard/players/level:
 *   get:
 *     summary: Get top players ranked by level and XP
 *     tags: [Leaderboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Number of players to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           minimum: 0
 *           default: 0
 *         description: Number of players to skip for pagination
 *     responses:
 *       200:
 *         description: List of top players by level
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     players:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           rank:
 *                             type: integer
 *                           playerId:
 *                             type: integer
 *                           username:
 *                             type: string
 *                           level:
 *                             type: integer
 *                           xp:
 *                             type: integer
 *                           progressToNext:
 *                             type: number
 *                           xpToNext:
 *                             type: integer
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: integer
 *                         limit:
 *                           type: integer
 *                         offset:
 *                           type: integer
 *                         hasMore:
 *                           type: boolean
 */
router.get('/players/level', auth, leaderboardController.getTopPlayersByLevel);

/**
 * @swagger
 * /api/leaderboard/players/xp:
 *   get:
 *     summary: Get top players ranked by XP earned
 *     tags: [Leaderboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [week, month, year, all]
 *           default: all
 *         description: Time period for XP ranking
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Number of players to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           minimum: 0
 *           default: 0
 *         description: Number of players to skip for pagination
 *     responses:
 *       200:
 *         description: List of top players by XP
 */
router.get('/players/xp', auth, leaderboardController.getTopPlayersByXP);

/**
 * @swagger
 * /api/leaderboard/horses/earnings:
 *   get:
 *     summary: Get top horses ranked by total earnings
 *     tags: [Leaderboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: breed
 *         schema:
 *           type: string
 *         description: Filter by specific breed
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Number of horses to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           minimum: 0
 *           default: 0
 *         description: Number of horses to skip for pagination
 *     responses:
 *       200:
 *         description: List of top horses by earnings
 */
router.get('/horses/earnings', auth, leaderboardController.getTopHorsesByEarnings);

/**
 * @swagger
 * /api/leaderboard/horses/performance:
 *   get:
 *     summary: Get top horses ranked by performance metrics
 *     tags: [Leaderboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: metric
 *         schema:
 *           type: string
 *           enum: [wins, placements, average_score]
 *           default: wins
 *         description: Performance metric to rank by
 *       - in: query
 *         name: discipline
 *         schema:
 *           type: string
 *         description: Filter by specific discipline
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Number of horses to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           minimum: 0
 *           default: 0
 *         description: Number of horses to skip for pagination
 *     responses:
 *       200:
 *         description: List of top horses by performance
 */
router.get('/horses/performance', auth, leaderboardController.getTopHorsesByPerformance);

/**
 * @swagger
 * /api/leaderboard/players/horse-earnings:
 *   get:
 *     summary: Get top players ranked by combined horse earnings
 *     tags: [Leaderboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Number of players to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           minimum: 0
 *           default: 0
 *         description: Number of players to skip for pagination
 *     responses:
 *       200:
 *         description: List of top players by horse earnings
 */
router.get('/players/horse-earnings', auth, leaderboardController.getTopPlayersByHorseEarnings);

/**
 * @swagger
 * /api/leaderboard/recent-winners:
 *   get:
 *     summary: Get recent competition winners
 *     tags: [Leaderboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: discipline
 *         schema:
 *           type: string
 *         description: Filter by specific discipline
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           default: 20
 *         description: Number of recent winners to return
 *     responses:
 *       200:
 *         description: List of recent competition winners
 */
router.get('/recent-winners', auth, leaderboardController.getRecentWinners);

/**
 * @swagger
 * /api/leaderboard/stats:
 *   get:
 *     summary: Get comprehensive leaderboard statistics
 *     tags: [Leaderboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Comprehensive leaderboard statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     playerStats:
 *                       type: object
 *                     horseStats:
 *                       type: object
 *                     competitionStats:
 *                       type: object
 *                     topPerformers:
 *                       type: object
 */
router.get('/stats', auth, leaderboardController.getLeaderboardStats);

export default router;
