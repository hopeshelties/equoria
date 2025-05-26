import prisma from '../db/index.js';
import logger from './logger.js';
import { TRAIT_DEFINITIONS } from './traitEvaluation.js';

/**
 * Trait Discovery System
 * Reveals hidden traits when specific conditions are met
 */

/**
 * Discovery conditions for revealing hidden traits
 */
export const DISCOVERY_CONDITIONS = {
  // Bonding-based revelations
  high_bonding: {
    name: 'High Bonding Achievement',
    description: 'Reveals traits when bonding score exceeds 80',
    condition: (foal, activities) => foal.bond_score >= 80,
    revealableTraits: ['intelligent', 'calm', 'trainability_boost', 'legendary_bloodline']
  },
  
  // Stress-based revelations
  low_stress: {
    name: 'Low Stress Achievement',
    description: 'Reveals traits when stress level drops below 20',
    condition: (foal, activities) => foal.stress_level <= 20,
    revealableTraits: ['resilient', 'athletic', 'bold', 'weather_immunity']
  },
  
  // Activity-based revelations
      social_activities: {
      name: 'Social Development',
      description: 'Reveals traits after completing social enrichment activities',
      condition: (foal, activities) => {
        const socialActivities = activities.filter(a => 
          ['gentle_handling', 'human_interaction', 'social_play'].includes(a.activity || a.activityType)
        );
        return socialActivities.length >= 3;
      },
      revealableTraits: ['calm', 'intelligent', 'trainability_boost']
    },
    
    physical_activities: {
      name: 'Physical Development',
      description: 'Reveals traits after completing physical enrichment activities',
      condition: (foal, activities) => {
        const physicalActivities = activities.filter(a => 
          ['exercise', 'obstacle_course', 'free_play'].includes(a.activity || a.activityType)
        );
        return physicalActivities.length >= 3;
      },
      revealableTraits: ['athletic', 'bold', 'resilient']
    },
    
    mental_activities: {
      name: 'Mental Development',
      description: 'Reveals traits after completing mental enrichment activities',
      condition: (foal, activities) => {
        const mentalActivities = activities.filter(a => 
          ['puzzle_feeding', 'sensory_exposure', 'learning_games'].includes(a.activity || a.activityType)
        );
        return mentalActivities.length >= 3;
      },
      revealableTraits: ['intelligent', 'trainability_boost', 'night_vision']
    },
  
  // Combined conditions
  perfect_care: {
    name: 'Perfect Care Achievement',
    description: 'Reveals rare traits with optimal bonding and low stress',
    condition: (foal, activities) => foal.bond_score >= 90 && foal.stress_level <= 15,
    revealableTraits: ['legendary_bloodline', 'weather_immunity', 'night_vision']
  },
  
  // Development milestone
  development_complete: {
    name: 'Development Completion',
    description: 'Reveals remaining traits when development period ends',
    condition: (foal, activities, development) => !!(development && development.currentDay >= 6),
    revealableTraits: ['all_hidden'] // Special case to reveal all remaining hidden traits
  }
};

/**
 * Check if a foal meets discovery conditions and reveal appropriate traits
 * @param {number} foalId - ID of the foal to check
 * @returns {Object} Discovery results with revealed traits and conditions met
 */
export async function revealTraits(foalId) {
  try {
    logger.info(`[traitDiscovery.revealTraits] Checking trait discovery for foal ${foalId}`);
    
    // Validate input
    if (!foalId || !Number.isInteger(Number(foalId)) || Number(foalId) <= 0) {
      throw new Error('Invalid foal ID provided');
    }

    // Get foal data with current traits and development info
    const foal = await prisma.horse.findUnique({
      where: { id: Number(foalId) },
      include: {
        foalDevelopment: true,
        breed: true
      }
    });

    if (!foal) {
      throw new Error(`Foal with ID ${foalId} not found`);
    }

    // Verify this is actually a foal
    if (foal.age > 1) {
      throw new Error(`Horse ${foalId} is not a foal (age: ${foal.age})`);
    }

    // Get foal's enrichment activity history
    const activities = await prisma.foalTrainingHistory.findMany({
      where: { horse_id: Number(foalId) },
      orderBy: { createdAt: 'desc' }
    });

    // Get current traits
    const currentTraits = foal.epigenetic_modifiers || { positive: [], negative: [], hidden: [] };
    
    // Track discovery results
    const discoveryResults = {
      foalId: Number(foalId),
      foalName: foal.name,
      conditionsMet: [],
      traitsRevealed: [],
      newTraitStructure: { ...currentTraits },
      totalHiddenBefore: currentTraits.hidden?.length || 0,
      totalHiddenAfter: 0
    };

    // Check each discovery condition
    for (const [conditionKey, condition] of Object.entries(DISCOVERY_CONDITIONS)) {
      try {
        const conditionMet = condition.condition(foal, activities, foal.foalDevelopment);
        
        if (conditionMet) {
          logger.info(`[traitDiscovery.revealTraits] Foal ${foalId} met condition: ${condition.name}`);
          
          discoveryResults.conditionsMet.push({
            key: conditionKey,
            name: condition.name,
            description: condition.description
          });

          // Reveal appropriate traits
          const revealedTraits = revealTraitsForCondition(
            discoveryResults.newTraitStructure,
            condition.revealableTraits,
            conditionKey
          );

          discoveryResults.traitsRevealed.push(...revealedTraits);
        }
      } catch (conditionError) {
        logger.warn(`[traitDiscovery.revealTraits] Error checking condition ${conditionKey}: ${conditionError.message}`);
      }
    }

    // Update final hidden count
    discoveryResults.totalHiddenAfter = discoveryResults.newTraitStructure.hidden?.length || 0;

    // Update database if traits were revealed
    if (discoveryResults.traitsRevealed.length > 0) {
      await prisma.horse.update({
        where: { id: Number(foalId) },
        data: {
          epigenetic_modifiers: discoveryResults.newTraitStructure
        }
      });

      // Log the discovery event
      await logTraitDiscovery(foalId, discoveryResults, foal);
      
      logger.info(`[traitDiscovery.revealTraits] Revealed ${discoveryResults.traitsRevealed.length} traits for foal ${foalId}`);
    } else {
      logger.info(`[traitDiscovery.revealTraits] No new traits revealed for foal ${foalId}`);
    }

    return discoveryResults;

  } catch (error) {
    logger.error(`[traitDiscovery.revealTraits] Error: ${error.message}`);
    throw error;
  }
}

/**
 * Reveal traits for a specific condition
 * @param {Object} traitStructure - Current trait structure to modify
 * @param {Array} revealableTraits - Traits that can be revealed by this condition
 * @param {string} conditionKey - Key of the condition being met
 * @returns {Array} Array of revealed trait objects
 */
function revealTraitsForCondition(traitStructure, revealableTraits, conditionKey) {
  const revealed = [];
  
  if (!traitStructure.hidden || traitStructure.hidden.length === 0) {
    return revealed;
  }

  // Special case: reveal all hidden traits
  if (revealableTraits.includes('all_hidden')) {
    const allHidden = [...traitStructure.hidden];
    
    allHidden.forEach(traitKey => {
      const traitDef = getTraitDefinition(traitKey);
      const category = getTraitCategory(traitKey);
      
      if (category && traitDef) {
        // Move from hidden to appropriate category
        traitStructure.hidden = traitStructure.hidden.filter(t => t !== traitKey);
        traitStructure[category] = traitStructure[category] || [];
        traitStructure[category].push(traitKey);
        
        revealed.push({
          traitKey,
          traitName: traitDef.name,
          category,
          revealedBy: conditionKey,
          description: traitDef.description
        });
      }
    });
    
    return revealed;
  }

  // Normal trait revelation
  revealableTraits.forEach(traitKey => {
    if (traitStructure.hidden.includes(traitKey)) {
      const traitDef = getTraitDefinition(traitKey);
      const category = getTraitCategory(traitKey);
      
      if (category && traitDef) {
        // Move from hidden to appropriate category
        traitStructure.hidden = traitStructure.hidden.filter(t => t !== traitKey);
        traitStructure[category] = traitStructure[category] || [];
        traitStructure[category].push(traitKey);
        
        revealed.push({
          traitKey,
          traitName: traitDef.name,
          category,
          revealedBy: conditionKey,
          description: traitDef.description
        });
        
        logger.info(`[traitDiscovery.revealTraitsForCondition] Revealed trait ${traitKey} (${traitDef.name}) via ${conditionKey}`);
      }
    }
  });

  return revealed;
}

/**
 * Get trait definition from trait evaluation system
 * @param {string} traitKey - Key of the trait
 * @returns {Object|null} Trait definition or null if not found
 */
function getTraitDefinition(traitKey) {
  for (const category of Object.values(TRAIT_DEFINITIONS)) {
    if (category[traitKey]) {
      return category[traitKey];
    }
  }
  return null;
}

/**
 * Get the category (positive, negative, rare) of a trait
 * @param {string} traitKey - Key of the trait
 * @returns {string|null} Category name or null if not found
 */
function getTraitCategory(traitKey) {
  for (const [categoryName, traits] of Object.entries(TRAIT_DEFINITIONS)) {
    if (traits[traitKey]) {
      return categoryName === 'rare' ? 'positive' : categoryName; // Rare traits go to positive
    }
  }
  return null;
}

/**
 * Log trait discovery event for audit trail
 * @param {number} foalId - ID of the foal
 * @param {Object} discoveryResults - Results of the discovery process
 * @param {Object} foal - Foal object with development data
 */
async function logTraitDiscovery(foalId, discoveryResults, foal) {
  try {
    const logEntry = {
      foalId: Number(foalId),
      event: 'trait_discovery',
      conditionsMet: discoveryResults.conditionsMet,
      traitsRevealed: discoveryResults.traitsRevealed,
      timestamp: new Date(),
      summary: `Revealed ${discoveryResults.traitsRevealed.length} traits via ${discoveryResults.conditionsMet.length} conditions`
    };

    // Log to foal training history for now (could be separate discovery log table)
    await prisma.foalTrainingHistory.create({
      data: {
        horse_id: Number(foalId),
        day: foal.foalDevelopment?.currentDay || 0,
        activity: 'trait_discovery',
        outcome: `Trait Discovery Event: ${logEntry.summary}`,
        bond_change: 0,
        stress_change: 0
      }
    });

    logger.info(`[traitDiscovery.logTraitDiscovery] Logged discovery event for foal ${foalId}`);
  } catch (error) {
    logger.error(`[traitDiscovery.logTraitDiscovery] Failed to log discovery: ${error.message}`);
  }
}

/**
 * Check trait discovery for multiple foals (batch processing)
 * @param {Array} foalIds - Array of foal IDs to check
 * @returns {Array} Array of discovery results
 */
export async function batchRevealTraits(foalIds) {
  const results = [];
  
  for (const foalId of foalIds) {
    try {
      const result = await revealTraits(foalId);
      results.push(result);
    } catch (error) {
      logger.error(`[traitDiscovery.batchRevealTraits] Failed for foal ${foalId}: ${error.message}`);
      results.push({
        foalId,
        error: error.message,
        success: false
      });
    }
  }
  
  return results;
}

/**
 * Get discovery progress for a foal (what conditions they're close to meeting)
 * @param {number} foalId - ID of the foal
 * @returns {Object} Discovery progress information
 */
export async function getDiscoveryProgress(foalId) {
  try {
    logger.info(`[traitDiscovery.getDiscoveryProgress] Getting discovery progress for foal ${foalId}`);
    
    const foal = await prisma.horse.findUnique({
      where: { id: Number(foalId) },
      include: {
        foalDevelopment: true
      }
    });

    if (!foal) {
      throw new Error(`Foal with ID ${foalId} not found`);
    }

    const activities = await prisma.foalTrainingHistory.findMany({
      where: { horse_id: Number(foalId) }
    });

    const progress = {
      foalId: Number(foalId),
      foalName: foal.name,
      currentStats: {
        bondScore: foal.bond_score || 0,
        stressLevel: foal.stress_level || 0,
        developmentDay: foal.foalDevelopment?.currentDay || 0
      },
      conditions: {},
      hiddenTraitsCount: foal.epigenetic_modifiers?.hidden?.length || 0
    };

    // Check progress for each condition
    for (const [conditionKey, condition] of Object.entries(DISCOVERY_CONDITIONS)) {
      const conditionMet = condition.condition(foal, activities, foal.foalDevelopment);
      
      progress.conditions[conditionKey] = {
        name: condition.name,
        description: condition.description,
        met: conditionMet,
        revealableTraits: condition.revealableTraits,
        progress: calculateConditionProgress(conditionKey, foal, activities)
      };
    }

    return progress;

  } catch (error) {
    logger.error(`[traitDiscovery.getDiscoveryProgress] Error: ${error.message}`);
    throw error;
  }
}

/**
 * Calculate progress percentage for a specific condition
 * @param {string} conditionKey - Key of the condition
 * @param {Object} foal - Foal data
 * @param {Array} activities - Activity history
 * @returns {number} Progress percentage (0-100)
 */
function calculateConditionProgress(conditionKey, foal, activities) {
  switch (conditionKey) {
    case 'high_bonding':
      return Math.min(100, Math.round((foal.bond_score || 0) / 80 * 100));
    
    case 'low_stress':
      return foal.stress_level <= 20 ? 100 : Math.round((100 - (foal.stress_level || 100)) / 80 * 100);
    
    case 'perfect_care':
      const bondProgress = Math.min(100, (foal.bond_score || 0) / 90 * 100);
      const stressProgress = foal.stress_level <= 15 ? 100 : (100 - (foal.stress_level || 100)) / 85 * 100;
      return Math.round((bondProgress + stressProgress) / 2);
    
    case 'social_activities':
      const socialCount = activities.filter(a => 
        ['gentle_handling', 'human_interaction', 'social_play'].includes(a.activity)
      ).length;
      return Math.min(100, Math.round(socialCount / 3 * 100));
    
    case 'physical_activities':
      const physicalCount = activities.filter(a => 
        ['exercise', 'obstacle_course', 'free_play'].includes(a.activity)
      ).length;
      return Math.min(100, Math.round(physicalCount / 3 * 100));
    
    case 'mental_activities':
      const mentalCount = activities.filter(a => 
        ['puzzle_feeding', 'sensory_exposure', 'learning_games'].includes(a.activity)
      ).length;
      return Math.min(100, Math.round(mentalCount / 3 * 100));
    
    case 'development_complete':
      const currentDay = foal.foalDevelopment?.currentDay || 0;
      return Math.min(100, Math.round(currentDay / 6 * 100));
    
    default:
      return 0;
  }
}

export default {
  revealTraits,
  batchRevealTraits,
  getDiscoveryProgress,
  DISCOVERY_CONDITIONS
}; 