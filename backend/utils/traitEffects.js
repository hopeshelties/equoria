/**
 * Trait Effects System
 * Maps each epigenetic trait to its specific game mechanics effects
 * Used throughout training, competition, and display logic
 */

import logger from './logger.js';

/**
 * Comprehensive trait effects mapping
 * Each trait defines specific game mechanics it affects
 */
const traitEffects = {
  // ===== POSITIVE TRAITS =====

  resilient: {
    // Training effects
    suppressTemperamentDrift: true,
    trainingStressReduction: 0.15, // 15% less stress from training
    trainingConsistencyBonus: 0.10, // 10% more consistent training results

    // Competition effects
    competitionStressResistance: 0.15, // 15% less stress impact in competitions
    competitionScoreModifier: 0.03, // +3% to final competition score

    // Recovery effects
    stressRecoveryRate: 1.25, // 25% faster stress recovery
    injuryRecoveryBonus: 0.20, // 20% faster injury recovery

    // Discipline-specific bonuses
    disciplineModifiers: {
      'Cross Country': 0.05,
      'Endurance': 0.06,
      'Racing': 0.04
    }
  },

  calm: {
    // Training effects
    suppressTemperamentDrift: true,
    trainingStressReduction: 0.20, // 20% less stress from training
    trainingFocusBonus: 0.15, // 15% better focus during training

    // Competition effects
    competitionStressResistance: 0.25, // 25% less stress impact
    competitionFocusBonus: 0.10, // 10% better focus in competitions
    competitionScoreModifier: 0.025, // +2.5% to final score

    // General effects
    baseStressReduction: 5, // -5 base stress level
    temperamentStability: true, // Prevents negative temperament changes

    // Discipline-specific bonuses
    disciplineModifiers: {
      'Dressage': 0.05,
      'Driving': 0.04,
      'Trail': 0.03
    }
  },

  bold: {
    // Training effects
    trainingConfidenceBonus: 0.15, // 15% confidence boost during training
    newExperienceAdaptation: 0.25, // 25% faster adaptation to new training

    // Competition effects
    competitionConfidenceBoost: 5, // +5 confidence in competitions
    competitionScoreModifier: 0.035, // +3.5% to final score
    competitionNerveBonus: 0.20, // 20% better performance under pressure

    // General effects
    explorationBonus: true, // Better results from enrichment activities

    // Discipline-specific bonuses
    disciplineModifiers: {
      'Show Jumping': 0.06,
      'Cross Country': 0.05,
      'Racing': 0.04
    }
  },

  intelligent: {
    // Training effects
    trainingXpModifier: 0.25, // 25% more XP from training
    statGainChanceModifier: 0.15, // 15% higher chance of stat gains
    trainingTimeReduction: 0.10, // 10% faster training sessions

    // Competition effects
    competitionScoreModifier: 0.03, // +3% to final score
    learningBonus: 0.25, // 25% faster skill acquisition

    // General effects
    problemSolvingBonus: true, // Better at overcoming obstacles
    memoryBonus: true, // Remembers training better

    // Discipline-specific bonuses
    disciplineModifiers: {
      'Dressage': 0.06,
      'Reining': 0.05,
      'Eventing': 0.04
    }
  },

  athletic: {
    // Training effects
    physicalTrainingBonus: 0.20, // 20% better results from physical training
    staminaTrainingBonus: 0.25, // 25% better stamina gains

    // Competition effects
    competitionScoreModifier: 0.05, // +5% to final score
    physicalBonus: 0.15, // 15% boost to physical performance
    enduranceBonus: 0.20, // 20% better endurance

    // Stat effects
    baseStatBoost: {
      stamina: 2,
      agility: 2,
      balance: 1
    },

    // Discipline-specific bonuses
    disciplineModifiers: {
      'Racing': 0.07,
      'Show Jumping': 0.06,
      'Cross Country': 0.06
    }
  },

  trainability_boost: {
    // Training effects
    trainingXpModifier: 0.30, // 30% more XP from training
    statGainChanceModifier: 0.20, // 20% higher chance of stat gains
    trainingSuccessRate: 0.25, // 25% higher training success rate

    // Competition effects
    competitionScoreModifier: 0.04, // +4% to final score
    consistencyBonus: 0.30, // 30% more consistent performance

    // General effects
    learningAcceleration: true, // Learns new skills faster
    adaptabilityBonus: true, // Adapts to new situations better

    // Discipline-specific bonuses
    disciplineModifiers: {
      'Dressage': 0.07,
      'Reining': 0.06,
      'Driving': 0.05
    }
  },

  // ===== NEGATIVE TRAITS =====

  nervous: {
    // Training effects
    trainingStressIncrease: 0.25, // 25% more stress from training
    trainingInconsistency: 0.15, // 15% more inconsistent results

    // Competition effects
    competitionStressRisk: 10, // +10 stress risk in competitions
    competitionScoreModifier: -0.04, // -4% to final score
    competitionNervePenalty: 0.25, // 25% worse under pressure

    // General effects
    stressAccumulation: 1.20, // 20% faster stress accumulation
    temperamentInstability: true, // More prone to temperament changes

    // Discipline-specific penalties
    disciplineModifiers: {
      'Racing': -0.06,
      'Show Jumping': -0.05,
      'Eventing': -0.04
    }
  },

  lazy: {
    // Training effects
    trainingXpModifier: -0.20, // 20% less XP from training
    trainingMotivationPenalty: 0.25, // 25% less motivation
    trainingTimeIncrease: 0.15, // 15% longer training sessions needed

    // Competition effects
    competitionScoreModifier: -0.035, // -3.5% to final score
    endurancePenalty: 0.20, // 20% worse endurance

    // General effects
    activityAvoidance: true, // Avoids strenuous activities
    motivationDecay: 0.10, // 10% faster motivation decay

    // Discipline-specific penalties
    disciplineModifiers: {
      'Endurance': -0.08,
      'Cross Country': -0.06,
      'Racing': -0.05
    }
  },

  fragile: {
    // Training effects
    trainingInjuryRisk: 0.30, // 30% higher injury risk from training
    trainingIntensityLimit: 0.20, // 20% lower max training intensity

    // Competition effects
    competitionScoreModifier: -0.035, // -3.5% to final score
    injuryRisk: 0.30, // 30% higher injury risk
    performanceInconsistency: 0.25, // 25% more inconsistent performance

    // Recovery effects
    injuryRecoveryPenalty: 0.30, // 30% slower injury recovery
    stressRecoveryPenalty: 0.15, // 15% slower stress recovery

    // Discipline-specific penalties
    disciplineModifiers: {
      'Cross Country': -0.08,
      'Show Jumping': -0.06,
      'Racing': -0.05
    }
  },

  aggressive: {
    // Training effects
    trainingDifficultyIncrease: 0.25, // 25% harder to train
    trainerSafetyRisk: true, // Risk to trainer safety

    // Competition effects
    competitionScoreModifier: -0.045, // -4.5% to final score
    controlPenalty: 0.35, // 35% harder to control
    disqualificationRisk: 0.15, // 15% chance of disqualification

    // General effects
    socialDifficulty: true, // Harder to handle in groups
    unpredictableBehavior: true, // May act unpredictably

    // Discipline-specific penalties
    disciplineModifiers: {
      'Dressage': -0.08,
      'Driving': -0.07,
      'Trail': -0.06
    }
  },

  stubborn: {
    // Training effects
    trainingXpModifier: -0.15, // 15% less XP from training
    trainingResistance: 0.30, // 30% more resistance to training
    newSkillPenalty: 0.25, // 25% slower to learn new skills

    // Competition effects
    competitionScoreModifier: -0.03, // -3% to final score
    adaptabilityPenalty: 0.20, // 20% worse at adapting

    // General effects
    commandResistance: true, // Resists commands more often
    routinePreference: true, // Prefers familiar routines

    // Discipline-specific penalties
    disciplineModifiers: {
      'Dressage': -0.06,
      'Reining': -0.05,
      'Eventing': -0.04
    }
  },

  // ===== RARE TRAITS =====

  legendary_bloodline: {
    // Training effects
    trainingXpModifier: 0.50, // 50% more XP from training
    statGainChanceModifier: 0.30, // 30% higher chance of stat gains
    eliteTrainingAccess: true, // Access to elite training methods

    // Competition effects
    competitionScoreModifier: 0.08, // +8% to final score
    prestigeBonus: true, // Bonus prestige from competitions

    // Stat effects
    baseStatBoost: {
      stamina: 3,
      agility: 3,
      balance: 2,
      focus: 2
    },

    // Breeding effects
    breedingValueBonus: 0.50, // 50% higher breeding value
    traitInheritanceBonus: 0.25, // 25% better trait inheritance

    // All disciplines benefit
    disciplineModifiers: {
      'Racing': 0.10,
      'Dressage': 0.08,
      'Show Jumping': 0.08,
      'Cross Country': 0.08,
      'Endurance': 0.08,
      'Reining': 0.06,
      'Driving': 0.06,
      'Trail': 0.06,
      'Eventing': 0.08
    }
  },

  burnout: {
    // Training effects
    statGainBlocked: true, // Blocks all stat gains from training
    trainingXpModifier: -0.50, // 50% less XP from training
    trainingMotivationPenalty: 0.50, // 50% less motivation

    // Competition effects
    competitionScoreModifier: -0.10, // -10% to final score
    performanceDecline: 0.30, // 30% performance decline

    // Recovery effects
    extendedRestRequired: true, // Requires extended rest periods
    stressRecoveryPenalty: 0.40, // 40% slower stress recovery

    // General effects
    activityAvoidance: true, // Avoids all strenuous activities
    motivationDecay: 0.25, // 25% faster motivation decay

    // All disciplines affected negatively
    disciplineModifiers: {
      'Racing': -0.12,
      'Dressage': -0.10,
      'Show Jumping': -0.10,
      'Cross Country': -0.12,
      'Endurance': -0.15,
      'Reining': -0.08,
      'Driving': -0.08,
      'Trail': -0.06,
      'Eventing': -0.10
    }
  }
};

/**
 * Get trait effects for a specific trait
 * @param {string} traitName - Name of the trait
 * @returns {Object|null} Trait effects object or null if not found
 */
export function getTraitEffects(traitName) {
  if (!traitName || typeof traitName !== 'string') {
    logger.warn(`[traitEffects.getTraitEffects] Invalid trait name: ${traitName}`);
    return null;
  }

  const effects = traitEffects[traitName];
  if (!effects) {
    logger.warn(`[traitEffects.getTraitEffects] No effects defined for trait: ${traitName}`);
    return null;
  }

  return effects;
}

/**
 * Get all trait effects
 * @returns {Object} Complete trait effects mapping
 */
export function getAllTraitEffects() {
  return traitEffects;
}

/**
 * Check if a trait has a specific effect
 * @param {string} traitName - Name of the trait
 * @param {string} effectName - Name of the effect to check
 * @returns {boolean} Whether the trait has the specified effect
 */
export function hasTraitEffect(traitName, effectName) {
  const effects = getTraitEffects(traitName);
  return effects ? Object.prototype.hasOwnProperty.call(effects, effectName) : false;
}

/**
 * Get trait effects for multiple traits
 * @param {string[]} traitNames - Array of trait names
 * @returns {Object} Combined effects from all traits
 */
export function getCombinedTraitEffects(traitNames) {
  if (!Array.isArray(traitNames)) {
    logger.warn('[traitEffects.getCombinedTraitEffects] Invalid trait names array');
    return {};
  }

  const combinedEffects = {};

  traitNames.forEach(traitName => {
    const effects = getTraitEffects(traitName);
    if (effects) {
      // Merge effects, handling different types appropriately
      Object.keys(effects).forEach(effectKey => {
        if (!combinedEffects[effectKey]) {
          combinedEffects[effectKey] = effects[effectKey];
        } else {
          // Handle combining different effect types
          if (typeof effects[effectKey] === 'number' && typeof combinedEffects[effectKey] === 'number') {
            // Add numeric modifiers
            combinedEffects[effectKey] += effects[effectKey];
          } else if (typeof effects[effectKey] === 'boolean') {
            // Boolean effects - true if any trait has it
            combinedEffects[effectKey] = combinedEffects[effectKey] || effects[effectKey];
          } else if (typeof effects[effectKey] === 'object' && effects[effectKey] !== null) {
            // Merge objects (like disciplineModifiers, baseStatBoost)
            if (typeof combinedEffects[effectKey] === 'object' && combinedEffects[effectKey] !== null) {
              // For numeric properties in objects, add them together
              const mergedObject = { ...combinedEffects[effectKey] };
              Object.keys(effects[effectKey]).forEach(subKey => {
                if (typeof effects[effectKey][subKey] === 'number' && typeof mergedObject[subKey] === 'number') {
                  mergedObject[subKey] += effects[effectKey][subKey];
                } else {
                  mergedObject[subKey] = effects[effectKey][subKey];
                }
              });
              combinedEffects[effectKey] = mergedObject;
            } else {
              combinedEffects[effectKey] = { ...effects[effectKey] };
            }
          }
        }
      });
    }
  });

  return combinedEffects;
}

export default traitEffects;
