import { getStatScore } from '../utils/getStatScore.js';
import { getHealthModifier } from '../utils/healthBonus.js';
import { applyRiderModifiers } from '../utils/riderBonus.js';

/**
 * Simulate a competition with multiple horses and return ranked results
 * @param {Array} horses - Array of horse objects with stats, tack, health, rider info
 * @param {Object} show - Show object with discipline and other properties
 * @returns {Array} - Sorted array of results with scores and placements
 */
function simulateCompetition(horses, show) {
  // Validate inputs
  if (!Array.isArray(horses)) {
    throw new Error('Horses must be an array');
  }
  
  if (!show || !show.discipline) {
    throw new Error('Show object with discipline is required');
  }
  
  if (horses.length === 0) {
    return [];
  }
  
  // Calculate scores for each horse
  const results = horses.map(horse => {
    try {
      // 1. Calculate base stat score (weighted 50/30/20)
      const baseScore = getStatScore(horse, show.discipline);
      
      // 2. Add trait bonus (+5 if horse trait matches show discipline)
      const traitBonus = (horse.trait === show.discipline) ? 5 : 0;
      
      // 3. Add training score (0-100, default to 0 if not provided)
      const trainingScore = horse.trainingScore || 0;
      
      // 4. Add tack bonuses (saddle + bridle)
      const saddleBonus = (horse.tack && horse.tack.saddleBonus) || 0;
      const bridleBonus = (horse.tack && horse.tack.bridleBonus) || 0;
      const tackBonus = saddleBonus + bridleBonus;
      
      // 5. Calculate subtotal before percentage modifiers
      const subtotal = baseScore + traitBonus + trainingScore + tackBonus;
      
      // 6. Apply rider modifiers (bonus and penalty as percentages)
      const riderBonusPercent = (horse.rider && horse.rider.bonusPercent) || 0;
      const riderPenaltyPercent = (horse.rider && horse.rider.penaltyPercent) || 0;
      const scoreAfterRider = applyRiderModifiers(subtotal, riderBonusPercent, riderPenaltyPercent);
      
      // 7. Apply health modifier (percentage adjustment)
      const healthModifier = getHealthModifier(horse.health || 'Good');
      const finalScore = scoreAfterRider * (1 + healthModifier);
      
      return {
        horseId: horse.id,
        name: horse.name,
        score: Math.round(finalScore * 10) / 10, // Round to 1 decimal place
        placement: null // Will be assigned after sorting
      };
      
    } catch (error) {
      // If there's an error calculating score for a horse, give them a score of 0
      console.warn(`Error calculating score for horse ${horse.id || 'unknown'}: ${error.message}`);
      return {
        horseId: horse.id,
        name: horse.name || 'Unknown',
        score: 0,
        placement: null
      };
    }
  });
  
  // Sort by score (highest first)
  results.sort((a, b) => b.score - a.score);
  
  // Assign placements to top 3
  const placements = ['1st', '2nd', '3rd'];
  results.forEach((result, index) => {
    if (index < 3) {
      result.placement = placements[index];
    }
  });
  
  return results;
}

export {
  simulateCompetition
}; 