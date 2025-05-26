import logger from './logger.js';

/**
 * Trait definitions with their revelation conditions
 */
const TRAIT_DEFINITIONS = {
  // Positive traits revealed through good bonding and low stress
  positive: {
    resilient: {
      name: 'Resilient',
      description: 'Faster stress recovery and improved training consistency',
      revealConditions: {
        minBondScore: 70,
        maxStressLevel: 30,
        minAge: 2 // days
      },
      rarity: 'common',
      baseChance: 0.25
    },
    calm: {
      name: 'Calm',
      description: 'Reduced stress accumulation and improved focus',
      revealConditions: {
        minBondScore: 60,
        maxStressLevel: 20,
        minAge: 1
      },
      rarity: 'common',
      baseChance: 0.30
    },
    intelligent: {
      name: 'Intelligent',
      description: 'Accelerated learning and improved skill retention',
      revealConditions: {
        minBondScore: 75,
        maxStressLevel: 25,
        minAge: 3
      },
      rarity: 'common',
      baseChance: 0.20
    },
    bold: {
      name: 'Bold',
      description: 'Enhanced competition performance and better adaptability',
      revealConditions: {
        minBondScore: 65,
        maxStressLevel: 40,
        minAge: 4
      },
      rarity: 'common',
      baseChance: 0.22
    },
    athletic: {
      name: 'Athletic',
      description: 'Improved physical stats and better movement quality',
      revealConditions: {
        minBondScore: 80,
        maxStressLevel: 35,
        minAge: 5
      },
      rarity: 'rare',
      baseChance: 0.15
    },
    trainability_boost: {
      name: 'Trainability Boost',
      description: 'Major training efficiency bonus',
      revealConditions: {
        minBondScore: 85,
        maxStressLevel: 15,
        minAge: 6
      },
      rarity: 'rare',
      baseChance: 0.10
    }
  },

  // Negative traits revealed through poor bonding and high stress
  negative: {
    nervous: {
      name: 'Nervous',
      description: 'Increased stress sensitivity, requires gentle approach',
      revealConditions: {
        maxBondScore: 40,
        minStressLevel: 60,
        minAge: 1
      },
      rarity: 'common',
      baseChance: 0.35
    },
    stubborn: {
      name: 'Stubborn',
      description: 'Slower initial learning, increased training time',
      revealConditions: {
        maxBondScore: 30,
        minStressLevel: 50,
        minAge: 2
      },
      rarity: 'common',
      baseChance: 0.25
    },
    fragile: {
      name: 'Fragile',
      description: 'Higher injury risk, requires careful management',
      revealConditions: {
        maxBondScore: 35,
        minStressLevel: 70,
        minAge: 3
      },
      rarity: 'common',
      baseChance: 0.20
    },
    aggressive: {
      name: 'Aggressive',
      description: 'Handling challenges and social difficulties',
      revealConditions: {
        maxBondScore: 25,
        minStressLevel: 80,
        minAge: 4
      },
      rarity: 'common',
      baseChance: 0.30
    },
    lazy: {
      name: 'Lazy',
      description: 'Reduced training efficiency, requires motivation',
      revealConditions: {
        maxBondScore: 45,
        minStressLevel: 40,
        minAge: 5
      },
      rarity: 'common',
      baseChance: 0.18
    }
  },

  // Rare traits with special conditions
  rare: {
    legendary_bloodline: {
      name: 'Legendary Bloodline',
      description: 'Exceptional heritage with superior potential',
      revealConditions: {
        minBondScore: 90,
        maxStressLevel: 10,
        minAge: 6
      },
      rarity: 'legendary',
      baseChance: 0.03
    },
    weather_immunity: {
      name: 'Weather Immunity',
      description: 'Environmental resistance to weather conditions',
      revealConditions: {
        minBondScore: 75,
        maxStressLevel: 20,
        minAge: 4
      },
      rarity: 'rare',
      baseChance: 0.08
    },
    night_vision: {
      name: 'Night Vision',
      description: 'Enhanced performance in low-light conditions',
      revealConditions: {
        minBondScore: 70,
        maxStressLevel: 25,
        minAge: 5
      },
      rarity: 'rare',
      baseChance: 0.06
    }
  }
};

/**
 * Trait conflicts - traits that cannot coexist
 */
const TRAIT_CONFLICTS = {
  calm: ['nervous', 'aggressive'],
  resilient: ['fragile'],
  bold: ['nervous'],
  intelligent: ['lazy'],
  athletic: ['fragile'],
  trainability_boost: ['stubborn'],
  nervous: ['calm', 'bold'],
  aggressive: ['calm'],
  fragile: ['resilient', 'athletic'],
  lazy: ['intelligent'],
  stubborn: ['trainability_boost']
};

/**
 * Evaluate which traits should be revealed for a foal based on current conditions
 * @param {Object} foal - Foal data with bond_score, stress_level, age
 * @param {Object} currentTraits - Current epigenetic_modifiers object
 * @param {number} currentDay - Current development day (0-6)
 * @returns {Object} - New traits to be revealed
 */
function evaluateTraitRevelation(foal, currentTraits, currentDay) {
  try {
    logger.info(`[traitEvaluation.evaluateTraitRevelation] Evaluating traits for foal ${foal.id} on day ${currentDay}`);

    const bondScore = foal.bond_score || 50;
    const stressLevel = foal.stress_level || 0;
    const age = foal.age || 0;

    // Convert age in years to development days for young foals
    const developmentAge = age === 0 ? currentDay : Math.min(currentDay, 6);

    const newTraits = {
      positive: [],
      negative: [],
      hidden: []
    };

    // Get all currently revealed traits to avoid duplicates
    const existingTraits = new Set([
      ...(currentTraits.positive || []),
      ...(currentTraits.negative || []),
      ...(currentTraits.hidden || [])
    ]);

    // Evaluate positive traits
    for (const [traitKey, traitDef] of Object.entries(TRAIT_DEFINITIONS.positive)) {
      if (existingTraits.has(traitKey)) {continue;}

      if (shouldRevealTrait(traitDef, bondScore, stressLevel, developmentAge)) {
        if (Math.random() < traitDef.baseChance) {
          // Check for conflicts
          if (!hasTraitConflict(traitKey, existingTraits)) {
            // Determine if trait should be hidden
            const shouldHide = shouldTraitBeHidden(traitDef, bondScore, stressLevel);
            if (shouldHide) {
              newTraits.hidden.push(traitKey);
            } else {
              newTraits.positive.push(traitKey);
            }
            existingTraits.add(traitKey);
            logger.info(`[traitEvaluation] Revealed positive trait: ${traitKey} (${shouldHide ? 'hidden' : 'visible'})`);
          }
        }
      }
    }

    // Evaluate negative traits
    for (const [traitKey, traitDef] of Object.entries(TRAIT_DEFINITIONS.negative)) {
      if (existingTraits.has(traitKey)) {continue;}

      if (shouldRevealTrait(traitDef, bondScore, stressLevel, developmentAge, 'negative')) {
        if (Math.random() < traitDef.baseChance) {
          // Check for conflicts
          if (!hasTraitConflict(traitKey, existingTraits)) {
            // Negative traits are usually visible as warnings
            const shouldHide = shouldTraitBeHidden(traitDef, bondScore, stressLevel);
            if (shouldHide) {
              newTraits.hidden.push(traitKey);
            } else {
              newTraits.negative.push(traitKey);
            }
            existingTraits.add(traitKey);
            logger.info(`[traitEvaluation] Revealed negative trait: ${traitKey} (${shouldHide ? 'hidden' : 'visible'})`);
          }
        }
      }
    }

    // Evaluate rare traits
    for (const [traitKey, traitDef] of Object.entries(TRAIT_DEFINITIONS.rare)) {
      if (existingTraits.has(traitKey)) {continue;}

      if (shouldRevealTrait(traitDef, bondScore, stressLevel, developmentAge, 'rare')) {
        if (Math.random() < traitDef.baseChance) {
          // Check for conflicts
          if (!hasTraitConflict(traitKey, existingTraits)) {
            // Rare traits are often hidden
            const shouldHide = shouldTraitBeHidden(traitDef, bondScore, stressLevel);
            if (shouldHide || traitDef.rarity === 'legendary') {
              newTraits.hidden.push(traitKey);
            } else {
              newTraits.positive.push(traitKey);
            }
            existingTraits.add(traitKey);
            logger.info(`[traitEvaluation] Revealed rare trait: ${traitKey} (${shouldHide ? 'hidden' : 'visible'})`);
          }
        }
      }
    }

    logger.info(`[traitEvaluation] Evaluation complete. New traits: ${JSON.stringify(newTraits)}`);
    return newTraits;

  } catch (error) {
    logger.error(`[traitEvaluation.evaluateTraitRevelation] Error: ${error.message}`);
    throw error;
  }
}

/**
 * Check if trait revelation conditions are met
 * @param {Object} traitDef - Trait definition
 * @param {number} bondScore - Current bond score
 * @param {number} stressLevel - Current stress level
 * @param {number} developmentAge - Development age in days
 * @returns {boolean} - Whether trait should be revealed
 */
function shouldRevealTrait(traitDef, bondScore, stressLevel, developmentAge) {
  const conditions = traitDef.revealConditions;

  // Check age requirement
  if (developmentAge < conditions.minAge) {
    return false;
  }

  // Check bond score conditions
  if (conditions.minBondScore && bondScore < conditions.minBondScore) {
    return false;
  }
  if (conditions.maxBondScore && bondScore > conditions.maxBondScore) {
    return false;
  }

  // Check stress level conditions
  if (conditions.minStressLevel && stressLevel < conditions.minStressLevel) {
    return false;
  }
  if (conditions.maxStressLevel && stressLevel > conditions.maxStressLevel) {
    return false;
  }

  return true;
}

/**
 * Check if a trait conflicts with existing traits
 * @param {string} traitKey - Trait to check
 * @param {Set} existingTraits - Set of existing trait keys
 * @returns {boolean} - Whether there's a conflict
 */
function hasTraitConflict(traitKey, existingTraits) {
  const conflicts = TRAIT_CONFLICTS[traitKey] || [];
  return conflicts.some(conflictTrait => existingTraits.has(conflictTrait));
}

/**
 * Determine if a trait should be hidden based on conditions
 * @param {Object} traitDef - Trait definition
 * @param {number} bondScore - Current bond score
 * @param {number} stressLevel - Current stress level
 * @returns {boolean} - Whether trait should be hidden
 */
function shouldTraitBeHidden(traitDef, bondScore, stressLevel) {
  // Legendary traits are almost always hidden
  if (traitDef.rarity === 'legendary') {
    return Math.random() < 0.90;
  }

  // Rare traits are often hidden
  if (traitDef.rarity === 'rare') {
    return Math.random() < 0.70;
  }

  // Poor conditions increase chance of traits being hidden
  const conditionScore = bondScore - stressLevel;
  if (conditionScore < 20) {
    return Math.random() < 0.30;
  }

  // Good conditions reduce chance of traits being hidden
  if (conditionScore > 60) {
    return Math.random() < 0.10;
  }

  // Normal conditions
  return Math.random() < 0.20;
}

/**
 * Get trait definition by key
 * @param {string} traitKey - Trait key
 * @returns {Object|null} - Trait definition or null if not found
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
 * Get all available traits
 * @returns {Object} - All trait definitions organized by category
 */
function getAllTraitDefinitions() {
  return TRAIT_DEFINITIONS;
}

export {
  evaluateTraitRevelation,
  getTraitDefinition,
  getAllTraitDefinitions,
  TRAIT_DEFINITIONS,
  TRAIT_CONFLICTS
};
