/**
 * Groom Management Controller
 * Handles groom assignments, interactions, and management operations
 */

import {
  assignGroomToFoal,
  ensureDefaultGroomAssignment,
  calculateGroomInteractionEffects,
  GROOM_SPECIALTIES,
  SKILL_LEVELS,
  PERSONALITY_TRAITS,
  DEFAULT_GROOMS,
} from '../utils/groomSystem.js';
import prisma from '../db/index.js';
import logger from '../utils/logger.js';

/**
 * POST /api/grooms/assign
 * Assign a groom to a foal
 */
export async function assignGroom(req, res) {
  try {
    const { foalId, groomId, priority = 1, notes } = req.body;
    const userId = req.user?.id || 'default-user'; // TODO: Get from auth

    logger.info(`[groomController.assignGroom] Assigning groom ${groomId} to foal ${foalId}`);

    // Validate required fields
    if (!foalId || !groomId) {
      return res.status(400).json({
        success: false,
        message: 'foalId and groomId are required',
        data: null,
      });
    }

    const result = await assignGroomToFoal(foalId, groomId, userId, {
      priority,
      notes,
      isDefault: false,
    });

    res.status(200).json({
      success: true,
      message: result.message,
      data: result.assignment,
    });
  } catch (error) {
    logger.error(`[groomController.assignGroom] Error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to assign groom',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
    });
  }
}

/**
 * POST /api/grooms/ensure-default/:foalId
 * Ensure a foal has a default groom assignment
 */
export async function ensureDefaultAssignment(req, res) {
  try {
    const { foalId } = req.params;
    const userId = req.user?.id || 'default-user'; // TODO: Get from auth

    const parsedFoalId = parseInt(foalId, 10);
    if (isNaN(parsedFoalId) || parsedFoalId <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid foal ID. Must be a positive integer.',
        data: null,
      });
    }

    logger.info(
      `[groomController.ensureDefaultAssignment] Ensuring default assignment for foal ${parsedFoalId}`,
    );

    const result = await ensureDefaultGroomAssignment(parsedFoalId, userId);

    res.status(200).json({
      success: true,
      message: result.message,
      data: {
        assignment: result.assignment,
        isNew: result.isNew || false,
        isExisting: result.isExisting || false,
      },
    });
  } catch (error) {
    logger.error(`[groomController.ensureDefaultAssignment] Error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to ensure default assignment',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
    });
  }
}

/**
 * GET /api/grooms/assignments/:foalId
 * Get all assignments for a foal
 */
export async function getFoalAssignments(req, res) {
  try {
    const { foalId } = req.params;

    const parsedFoalId = parseInt(foalId, 10);
    if (isNaN(parsedFoalId) || parsedFoalId <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid foal ID. Must be a positive integer.',
        data: null,
      });
    }

    logger.info(
      `[groomController.getFoalAssignments] Getting assignments for foal ${parsedFoalId}`,
    );

    const assignments = await prisma.groomAssignment.findMany({
      where: { foalId: parsedFoalId },
      include: {
        groom: true,
        foal: {
          select: { id: true, name: true, bond_score: true, stress_level: true },
        },
      },
      orderBy: [{ isActive: 'desc' }, { priority: 'asc' }, { createdAt: 'desc' }],
    });

    res.status(200).json({
      success: true,
      message: `Retrieved ${assignments.length} assignments for foal`,
      data: {
        foalId: parsedFoalId,
        assignments,
        activeAssignments: assignments.filter(a => a.isActive),
        totalAssignments: assignments.length,
      },
    });
  } catch (error) {
    logger.error(`[groomController.getFoalAssignments] Error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve foal assignments',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
    });
  }
}

/**
 * POST /api/grooms/interact
 * Record a groom interaction with a foal
 */
export async function recordInteraction(req, res) {
  try {
    const { foalId, groomId, interactionType, duration, notes, assignmentId } = req.body;

    logger.info(
      `[groomController.recordInteraction] Recording ${interactionType} interaction for foal ${foalId}`,
    );

    // Validate required fields
    if (!foalId || !groomId || !interactionType || !duration) {
      return res.status(400).json({
        success: false,
        message: 'foalId, groomId, interactionType, and duration are required',
        data: null,
      });
    }

    // Get groom and foal data
    const [groom, foal] = await Promise.all([
      prisma.groom.findUnique({ where: { id: groomId } }),
      prisma.horse.findUnique({
        where: { id: foalId },
        select: {
          id: true,
          name: true,
          bond_score: true,
          stress_level: true,
        },
      }),
    ]);

    if (!groom) {
      return res.status(404).json({
        success: false,
        message: 'Groom not found',
        data: null,
      });
    }

    if (!foal) {
      return res.status(404).json({
        success: false,
        message: 'Foal not found',
        data: null,
      });
    }

    // Calculate interaction effects
    const effects = calculateGroomInteractionEffects(groom, foal, interactionType, duration);

    // Record the interaction
    const interaction = await prisma.groomInteraction.create({
      data: {
        foalId,
        groomId,
        assignmentId,
        interactionType,
        duration,
        bondingChange: effects.bondingChange,
        stressChange: effects.stressChange,
        quality: effects.quality,
        cost: effects.cost,
        notes,
      },
    });

    // Update foal's bond score and stress level
    const newBondScore = Math.max(
      0,
      Math.min(100, (foal.bond_score || 50) + effects.bondingChange),
    );
    const newStressLevel = Math.max(
      0,
      Math.min(100, (foal.stress_level || 0) + effects.stressChange),
    );

    await prisma.horse.update({
      where: { id: foalId },
      data: {
        bond_score: newBondScore,
        stress_level: newStressLevel,
      },
    });

    logger.info(
      `[groomController.recordInteraction] Interaction recorded: ${effects.bondingChange} bonding, ${effects.stressChange} stress`,
    );

    res.status(200).json({
      success: true,
      message: `${interactionType} interaction completed successfully`,
      data: {
        interaction,
        effects,
        foalUpdates: {
          previousBondScore: foal.bond_score,
          newBondScore,
          previousStressLevel: foal.stress_level,
          newStressLevel,
          bondingChange: effects.bondingChange,
          stressChange: effects.stressChange,
        },
      },
    });
  } catch (error) {
    logger.error(`[groomController.recordInteraction] Error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Failed to record interaction',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
    });
  }
}

/**
 * GET /api/grooms/user/:userId
 * Get all grooms for a user
 */
export async function getUserGrooms(req, res) {
  try {
    const { userId } = req.params;

    logger.info(`[groomController.getUserGrooms] Getting grooms for user ${userId}`);

    const grooms = await prisma.groom.findMany({
      where: { userId },
      include: {
        assignments: {
          where: { isActive: true },
          include: {
            foal: {
              select: { id: true, name: true },
            },
          },
        },
        _count: {
          select: {
            assignments: true,
            interactions: true,
          },
        },
      },
      orderBy: [{ is_active: 'desc' }, { skill_level: 'desc' }, { experience: 'desc' }],
    });

    res.status(200).json({
      success: true,
      message: `Retrieved ${grooms.length} grooms for user`,
      data: {
        userId,
        grooms,
        activeGrooms: grooms.filter(g => g.is_active),
        totalGrooms: grooms.length,
      },
    });
  } catch (error) {
    logger.error(`[groomController.getUserGrooms] Error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve user grooms',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
    });
  }
}

/**
 * POST /api/grooms/hire
 * Hire a new groom for a user
 */
export async function hireGroom(req, res) {
  try {
    const {
      name,
      speciality,
      experience,
      skill_level,
      personality,
      session_rate,
      bio,
      availability,
    } = req.body;
    const userId = req.user?.id || 'default-user'; // TODO: Get from auth

    logger.info(`[groomController.hireGroom] Hiring new groom ${name} for user ${userId}`);

    // Validate required fields
    if (!name || !speciality || !skill_level || !personality) {
      return res.status(400).json({
        success: false,
        message: 'name, speciality, skill_level, and personality are required',
        data: null,
      });
    }

    // Validate speciality
    if (!GROOM_SPECIALTIES[speciality]) {
      return res.status(400).json({
        success: false,
        message: `Invalid speciality. Must be one of: ${Object.keys(GROOM_SPECIALTIES).join(', ')}`,
        data: null,
      });
    }

    // Validate skill level
    if (!SKILL_LEVELS[skill_level]) {
      return res.status(400).json({
        success: false,
        message: `Invalid skill level. Must be one of: ${Object.keys(SKILL_LEVELS).join(', ')}`,
        data: null,
      });
    }

    // Validate personality
    if (!PERSONALITY_TRAITS[personality]) {
      return res.status(400).json({
        success: false,
        message: `Invalid personality. Must be one of: ${Object.keys(PERSONALITY_TRAITS).join(', ')}`,
        data: null,
      });
    }

    const groom = await prisma.groom.create({
      data: {
        name,
        speciality,
        experience: experience || 1,
        skillLevel: skill_level,
        personality,
        sessionRate: session_rate || SKILL_LEVELS[skill_level].costModifier * 15.0,
        bio,
        availability: availability || {},
        userId,
      },
    });

    logger.info(
      `[groomController.hireGroom] Successfully hired groom ${groom.name} (ID: ${groom.id})`,
    );

    res.status(201).json({
      success: true,
      message: `Successfully hired ${groom.name}`,
      data: groom,
    });
  } catch (error) {
    logger.error(`[groomController.hireGroom] Error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Failed to hire groom',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
    });
  }
}

/**
 * GET /api/grooms/definitions
 * Get groom system definitions (specialties, skill levels, personalities)
 */
export async function getGroomDefinitions(_req, res) {
  try {
    logger.info('[groomController.getGroomDefinitions] Getting groom system definitions');

    res.status(200).json({
      success: true,
      message: 'Retrieved groom system definitions',
      data: {
        specialties: GROOM_SPECIALTIES,
        skillLevels: SKILL_LEVELS,
        personalities: PERSONALITY_TRAITS,
        defaultGrooms: DEFAULT_GROOMS,
      },
    });
  } catch (error) {
    logger.error(`[groomController.getGroomDefinitions] Error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve definitions',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
    });
  }
}
