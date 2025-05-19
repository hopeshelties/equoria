/**
 * geneticsEngine.js
 *
 * This utility will handle the generation of horse genotypes based on breed profiles,
 * determination of phenotype (final display color, markings) from genotype,
 * and inheritance logic for breeding.
 */

/**
 * Helper function to select an item based on weights.
 * @param {object} weightedItems - An object where keys are items and values are their weights.
 *                                (e.g., {"e/e": 0.3, "E/e": 0.4, "E/E": 0.3})
 * @returns {string|null} The chosen item (allele pair string) or null if input is invalid.
 */
function selectWeightedRandom(weightedItems) {
  if (
    !weightedItems ||
    typeof weightedItems !== 'object' ||
    Object.keys(weightedItems).length === 0
  ) {
    console.error(
      '[GeneticsEngine] selectWeightedRandom: Invalid or empty weightedItems provided.',
      weightedItems
    );
    return null; // Or throw an error, depending on desired strictness
  }

  let sumOfWeights = 0;
  for (const item in weightedItems) {
    if (
      Object.prototype.hasOwnPropertycall(weightedItems, item) &&
      typeof weightedItems[item] === 'number' &&
      weightedItems[item] >= 0
    ) {
      sumOfWeights += weightedItems[item];
    } else {
      // console.warn(`[GeneticsEngine] selectWeightedRandom: Invalid weight for item ${item}. Skipping.`);
    }
  }

  if (sumOfWeights === 0) {
    // If all valid weights are 0, or no valid weights, can't make a weighted choice.
    // Fallback: could pick a random key, or the first, or return null/error.
    // For now, let's pick the first valid item if any, or null.
    const keys = Object.keys(weightedItems);
    return keys.length > 0 ? keys[0] : null;
  }

  let randomNum = Math.random() * sumOfWeights;

  for (const item in weightedItems) {
    if (
      Object.prototype.hasOwnPropertycall(weightedItems, item) &&
      typeof weightedItems[item] === 'number' &&
      weightedItems[item] >= 0
    ) {
      if (randomNum < weightedItems[item]) {
        return item;
      }
      randomNum -= weightedItems[item];
    }
  }

  // Fallback for potential floating point inaccuracies, should ideally pick the last valid item.
  const validItems = Object.keys(weightedItems).filter(
    (key) => typeof weightedItems[key] === 'number' && weightedItems[key] >= 0
  );
  return validItems.length > 0 ? validItems[validItems.length - 1] : null;
}

/**
 * Generates a complete genotype for a store-bought horse based on the breed's genetic profile.
 * The genotype includes both main gene alleles and boolean modifiers.
 * @param {object} breedGeneticProfile - The breed_genetic_profile JSONB object from the breeds table.
 * @returns {Promise<object>} An object representing the horse's full genotype.
 */
async function generateStoreHorseGenetics(breedGeneticProfile) {
  console.log(
    '[GeneticsEngine] Called generateStoreHorseGenetics with profile:',
    breedGeneticProfile
  );
  const generatedGenotype = {};

  if (!breedGeneticProfile) {
    console.error(
      '[GeneticsEngine] Breed genetic profile is undefined or null.'
    );
    return generatedGenotype; // Return empty or handle error as appropriate
  }

  // 1. Generate Allele Pairs for Genes
  if (
    breedGeneticProfile.allele_weights &&
    typeof breedGeneticProfile.allele_weights === 'object'
  ) {
    for (const geneName in breedGeneticProfile.allele_weights) {
      if (Object.prototype.hasOwnProperty.call(breedGeneticProfile.allele_weights, geneName)) {
        const weightedAlleles = breedGeneticProfile.allele_weights[geneName];
        // Ensure disallowed combinations are respected if not already handled by weights
        // For store generation, this is simpler as we pick from allowed_alleles weighted sets.
        // For breeding, it's more critical.
        const chosenAllelePair = selectWeightedRandom(weightedAlleles);
        if (chosenAllelePair) {
          // Check against disallowed_combinations for safety, though weights should guide this.
          if (
            breedGeneticProfile.disallowed_combinations &&
            breedGeneticProfile.disallowed_combinations[geneName] &&
            breedGeneticProfile.disallowed_combinations[geneName].includes(
              chosenAllelePair
            )
          ) {
            console.warn(
              `[GeneticsEngine] Attempted to generate disallowed allele pair ${chosenAllelePair} for ${geneName}. Re-evaluating or skipping.`
            );
            // This ideally needs a retry mechanism or ensuring weights never allow this.
            // For now, we might get an incomplete genotype if this happens.
            // A robust solution would re-pick ensuring it's not disallowed.
          } else {
            generatedGenotype[geneName] = chosenAllelePair;
          }
        } else {
          console.warn(
            `[GeneticsEngine] Could not determine allele for gene ${geneName}. It will be omitted.`
          );
        }
      }
    }
  } else {
    console.warn(
      '[GeneticsEngine] allele_weights not found or invalid in breed profile.'
    );
  }

  // 2. Determine Boolean Modifiers
  if (
    breedGeneticProfile.boolean_modifiers_prevalence &&
    typeof breedGeneticProfile.boolean_modifiers_prevalence === 'object'
  ) {
    for (const modifierName in breedGeneticProfile.boolean_modifiers_prevalence) {
      if (
  Object.prototype.hasOwnProperty.call(
    breedGeneticProfile.boolean_modifiers_prevalence,
    modifierName
  )
       )
        {
        const prevalence =
          breedGeneticProfile.boolean_modifiers_prevalence[modifierName];
        if (
          typeof prevalence === 'number' &&
          prevalence >= 0 &&
          prevalence <= 1
        ) {
          generatedGenotype[modifierName] = Math.random() < prevalence;
        } else {
          console.warn(
            `[GeneticsEngine] Invalid prevalence for boolean modifier ${modifierName}: ${prevalence}. It will be omitted or defaulted to false.`
          );
          generatedGenotype[modifierName] = false; // Default to false if prevalence is invalid
        }
      }
    }
  } else {
    console.warn(
      '[GeneticsEngine] boolean_modifiers_prevalence not found or invalid in breed profile.'
    );
  }

  console.log('[GeneticsEngine] Generated full genotype:', generatedGenotype);
  return generatedGenotype;
}

function applyPearlDilution(
  currentDisplayColor,
  phenotypeKeyForShade,
  genotype,
  baseColor
) {
  let newDisplayColor = currentDisplayColor.trim();
  let newPhenotypeKeyForShade = phenotypeKeyForShade.trim();
  let pearlDescriptor = '';

  const isHomozygousPearl = genotype.PRL_Pearl === 'prl/prl';
  const isHeterozygousPearl =
    genotype.PRL_Pearl === 'prl/n' || genotype.PRL_Pearl === 'n/prl';
  const hasSingleCream =
    genotype.Cr_Cream === 'Cr/n' || genotype.Cr_Cream === 'n/Cr';
  const hasDoubleCream = genotype.Cr_Cream === 'Cr/Cr';

  console.log(
    '[applyPearlDilution] Entry: CDC=',
    newDisplayColor,
    'PKS=',
    newPhenotypeKeyForShade,
    'baseColor=',
    baseColor,
    'isHomoPrl=',
    isHomozygousPearl,
    'isHetPrl=',
    isHeterozygousPearl,
    'hasSingleCr=',
    hasSingleCream,
    'hasDoubleCr=',
    hasDoubleCream
  );

  if (isHomozygousPearl || (isHeterozygousPearl && hasSingleCream)) {
    const originalColorForPearl = newDisplayColor;
    console.log(
      '[applyPearlDilution] originalColorForPearl=',
      originalColorForPearl
    );

    if (isHomozygousPearl && !hasSingleCream && !hasDoubleCream) {
      pearlDescriptor = 'Pearl';
      if (
        baseColor === 'Chestnut' &&
        !originalColorForPearl.toLowerCase().includes('champagne')
      ) {
        newDisplayColor = 'Apricot';
        newPhenotypeKeyForShade = 'Apricot';
      } else {
        newDisplayColor = `${originalColorForPearl} Pearl`;
        newPhenotypeKeyForShade = `${newPhenotypeKeyForShade} Pearl`;
      }
    } else if (hasSingleCream && isHeterozygousPearl) {
      pearlDescriptor = 'Pearl Cream';
      if (
        originalColorForPearl === 'Palomino' &&
        !originalColorForPearl.toLowerCase().includes('champagne')
      ) {
        newDisplayColor = 'Palomino Pearl';
        newPhenotypeKeyForShade = 'Palomino Pearl';
        console.log(
          '[applyPearlDilution] Set Palomino Pearl: CDC=',
          newDisplayColor,
          'PKS=',
          newPhenotypeKeyForShade
        );
      } else if (
        originalColorForPearl === 'Buckskin' &&
        !originalColorForPearl.toLowerCase().includes('champagne')
      ) {
        newDisplayColor = 'Buckskin Pearl';
        newPhenotypeKeyForShade = 'Buckskin Pearl';
      } else if (
        originalColorForPearl === 'Smoky Black' &&
        !originalColorForPearl.toLowerCase().includes('champagne')
      ) {
        newDisplayColor = 'Smoky Black Pearl';
        newPhenotypeKeyForShade = 'Smoky Black Pearl';
      } else {
        newDisplayColor = `${originalColorForPearl} ${pearlDescriptor}`.replace(
          '  ',
          ' '
        );
        newPhenotypeKeyForShade =
          `${newPhenotypeKeyForShade} ${pearlDescriptor}`.replace('  ', ' ');
      }
    } else if (hasSingleCream && isHomozygousPearl) {
      pearlDescriptor = 'Homozygous Pearl Cream';
      if (
        originalColorForPearl === 'Palomino' ||
        originalColorForPearl === 'Buckskin' ||
        originalColorForPearl === 'Smoky Black'
      ) {
        newDisplayColor = `${originalColorForPearl} ${pearlDescriptor}`;
        newPhenotypeKeyForShade = newDisplayColor;
      } else {
        newDisplayColor = `${originalColorForPearl} ${pearlDescriptor}`.replace(
          '  ',
          ' '
        );
        newPhenotypeKeyForShade =
          `${newPhenotypeKeyForShade} ${pearlDescriptor}`.replace('  ', ' ');
      }
    }

    if (isHomozygousPearl && hasDoubleCream) {
      if (!newDisplayColor.toLowerCase().includes('pearl')) {
        newDisplayColor = `${originalColorForPearl} (Pearl)`;
        newPhenotypeKeyForShade = `${newPhenotypeKeyForShade} (Pearl)`;
      }
    }

    newDisplayColor = newDisplayColor.replace(/\s+/g, ' ').trim();
    newPhenotypeKeyForShade = newPhenotypeKeyForShade
      .replace(/\s+/g, ' ')
      .trim();

    if (newPhenotypeKeyForShade.toLowerCase().includes('pearl pearl')) {
      newPhenotypeKeyForShade = newPhenotypeKeyForShade.replace(
        /Pearl Pearl/gi,
        'Pearl'
      );
    }
    if (newPhenotypeKeyForShade.toLowerCase().includes('pearl cream pearl')) {
      newPhenotypeKeyForShade = newPhenotypeKeyForShade.replace(
        /Pearl Cream Pearl/gi,
        'Pearl Cream'
      );
    }
    if (newDisplayColor.toLowerCase().includes('pearl pearl')) {
      newDisplayColor = newDisplayColor.replace(/Pearl Pearl/gi, 'Pearl');
    }
    if (newDisplayColor.toLowerCase().includes('pearl cream pearl')) {
      newDisplayColor = newDisplayColor.replace(
        /Pearl Cream Pearl/gi,
        'Pearl Cream'
      );
    }
  }

  console.log(
    '[applyPearlDilution] Exit: CDC=',
    newDisplayColor,
    'PKS=',
    newPhenotypeKeyForShade
  );
  return {
    currentDisplayColor: newDisplayColor,
    phenotypeKeyForShade: newPhenotypeKeyForShade,
  };
}

/**
 * Determines the final display color and phenotypic markings of a horse based on its full genotype.
 * @param {object} fullGenotype - The horse's complete genotype (including main genes and boolean modifiers).
 * @param {object} breedGeneticProfile - The breed_genetic_profile from the breeds table (for marking bias etc.).
 * @param {number} ageInYears - The current age of the horse in years.
 * @returns {Promise<object>} An object containing `final_display_color` (string) and `phenotypic_markings` (JSONB).
 */
async function determinePhenotype(
  fullGenotype,
  breedGeneticProfile,
  ageInYears = 0
) {
  console.log(
    '[GeneticsEngine] Called determinePhenotype with fullGenotype:',
    fullGenotype,
    'breedProfile:',
    breedGeneticProfile,
    'ageInYears:',
    ageInYears
  );
  let baseColor = '';
  let phenotypeKeyForShade = '';
  let determined_shade = null;

  let phenotypic_markings = {
    face: 'none',
    legs: { LF: 'none', RF: 'none', LH: 'none', RH: 'none' },
  };

  // Helper to check for presence of specific alleles (e.g., at least one 'E')
  const hasAllele = (gene, allele) =>
    fullGenotype[gene] && fullGenotype[gene].includes(allele);
  const getAlleles = (gene) =>
    fullGenotype[gene] ? fullGenotype[gene].split('/') : [];
  const isHomozygous = (gene, allele) => {
    const alleles = getAlleles(gene);
    return (
      alleles.length === 2 && alleles[0] === allele && alleles[1] === allele
    );
  };
  const isHeterozygous = (gene, allele1, allele2) => {
    const alleles = getAlleles(gene);
    return (
      alleles.length === 2 &&
      ((alleles[0] === allele1 && alleles[1] === allele2) ||
        (alleles[0] === allele2 && alleles[1] === allele1))
    );
  };
  // Check for any dominant W allele other than w/w for Dominant White.
  // TODO: Remove unused 'hasDominantWhiteAllele' function or implement feature that uses it
  // eslint-disable-next-line no-unused-vars
  const hasDominantWhiteAllele = () => {
    // Keep this, might be used generally
    if (!fullGenotype.W_DominantWhite || fullGenotype.W_DominantWhite === 'w/w')
      return false;
    const alleles = getAlleles('W_DominantWhite');
    return alleles.some((a) => a.startsWith('W') && a !== 'w');
  };
  const getDominantWhiteAlleles = () => {
    if (!fullGenotype.W_DominantWhite || fullGenotype.W_DominantWhite === 'w/w')
      return [];
    return getAlleles('W_DominantWhite').filter(
      (a) => a.startsWith('W') && a !== 'w'
    );
  }; 
  // Check for any splash white allele
  const getSplashWhiteAlleles = () => {
    if (!fullGenotype.SW_SplashWhite || fullGenotype.SW_SplashWhite === 'n/n')
      return [];
    return getAlleles('SW_SplashWhite').filter((a) => a.startsWith('SW'));
  };
  // Check for any Eden White allele
  const getEdenWhiteAlleles = () => {
    if (!fullGenotype.EDXW || fullGenotype.EDXW === 'n/n') return [];
    return getAlleles('EDXW').filter((a) => a.startsWith('EDXW'));
  };

  const capitalizeFirstLetter = (string) => {
    return string.charAt(0).toUpperCase() + string.slice(1);
  };

  // --- 1. Determine Base Coat Color ---
  // TODO: Remove unused 'E_Extension' variable or implement feature that uses it
  // eslint-disable-next-line no-unused-vars
  const E_Extension = fullGenotype.E_Extension;
  const A_Agouti = fullGenotype.A_Agouti;
  let isChestnutBase = false;

  if (isHomozygous('E_Extension', 'e')) {
    // e/e
    baseColor = 'Chestnut';
    phenotypeKeyForShade = 'Chestnut';
    isChestnutBase = true;
  } else {
    // E/E or E/e (black pigment can be produced)
    if (A_Agouti && hasAllele('A_Agouti', 'A')) {
      // A/A or A/a
      baseColor = 'Bay';
      phenotypeKeyForShade = 'Bay';
    } else {
      // a/a (or Agouti not present/defined)
      baseColor = 'Black';
      phenotypeKeyForShade = 'Black';
    }
  }

  let currentDisplayColor = baseColor; // Start with the base, this will be modified by dilutions
// After existing line 203 (currentDisplayColor = baseColor)
console.log('[Debug Scope] currentDisplayColor after base color setup (line 203+):', currentDisplayColor, 'phenotypeKeyForShade:', phenotypeKeyForShade);
  
// --- 2. Apply Dilutions ---

  // Mushroom (MFSD12_Mushroom) - only on Chestnut (e/e)
  if (isChestnutBase && hasAllele('MFSD12_Mushroom', 'Mu')) {
    // Mu/Mu or Mu/N
    currentDisplayColor = 'Mushroom Chestnut';
    phenotypeKeyForShade = 'Mushroom'; // Needs a corresponding entry in shade_bias
  }

  // Cream Dilution (Cr_Cream)
  // This block handles cream *before* Champagne. Champagne logic will then check cream status.
  if (fullGenotype.Cr_Cream) {
    if (isHeterozygous('Cr_Cream', 'Cr', 'n')) {
      // n/Cr (single dilution)
      if (baseColor === 'Chestnut' && currentDisplayColor === 'Chestnut') {
        currentDisplayColor = 'Palomino';
        phenotypeKeyForShade = 'Palomino';
      } else if (baseColor === 'Bay') {
        currentDisplayColor = 'Buckskin';
        phenotypeKeyForShade = 'Buckskin';
      } else if (baseColor === 'Black') {
        currentDisplayColor = 'Smoky Black';
        phenotypeKeyForShade = 'Smoky Black';
      } else if (currentDisplayColor === 'Mushroom Chestnut') {
        currentDisplayColor = 'Palomino';
        phenotypeKeyForShade = 'Palomino';
      } // Mushroom + Cream = Palomino
    } else if (isHomozygous('Cr_Cream', 'Cr')) {
      // Cr/Cr (double dilution)
      if (
        baseColor === 'Chestnut' &&
        (currentDisplayColor === 'Chestnut' ||
          currentDisplayColor === 'Palomino' ||
          currentDisplayColor === 'Mushroom Chestnut')
      ) {
        currentDisplayColor = 'Cremello';
        phenotypeKeyForShade = 'Cremello';
      } else if (
        baseColor === 'Bay' &&
        (currentDisplayColor === 'Bay' || currentDisplayColor === 'Buckskin')
      ) {
        currentDisplayColor = 'Perlino';
        phenotypeKeyForShade = 'Perlino';
      } else if (
        baseColor === 'Black' &&
        (currentDisplayColor === 'Black' ||
          currentDisplayColor === 'Smoky Black')
      ) {
        currentDisplayColor = 'Smoky Cream';
        phenotypeKeyForShade = 'Smoky Cream';
      }
    }
  }

  // Dun Dilution (D_Dun)
  // This block handles Dun *before* Champagne. Champagne logic will then check Dun status.
  let dunEffectDescriptor = '';
  if (hasAllele('D_Dun', 'D')) {
    const originalColorForDun = currentDisplayColor; // Color after basic cream, before Dun

    if (baseColor === 'Black' || originalColorForDun === 'Smoky Black') {
      // Black or Smoky Black base
      currentDisplayColor = 'Grulla';
    } else if (baseColor === 'Bay' || originalColorForDun === 'Buckskin') {
      // Bay or Buckskin base
      currentDisplayColor =
        originalColorForDun === 'Buckskin' ? 'Buckskin Dun' : 'Bay Dun';
    } else if (
      baseColor === 'Chestnut' ||
      originalColorForDun === 'Palomino' ||
      originalColorForDun === 'Mushroom Chestnut'
    ) {
      // Chestnut, Palomino, or Mushroom base
      currentDisplayColor =
        originalColorForDun === 'Palomino' ? 'Palomino Dun' : 'Red Dun';
      if (originalColorForDun === 'Mushroom Chestnut')
        currentDisplayColor = 'Red Dun';
    } else if (
      ['Cremello', 'Perlino', 'Smoky Cream'].includes(originalColorForDun)
    ) {
      // Double cream bases
      currentDisplayColor = `${originalColorForDun} Dun`;
    } else {
      currentDisplayColor = `${originalColorForDun} Dun`; // Fallback for other pre-diluted colors
    }
    phenotypeKeyForShade = currentDisplayColor; // Dun color is the new key
    dunEffectDescriptor = '';
  } else if (isHomozygous('D_Dun', 'nd1')) {
    dunEffectDescriptor = ' (Non-Dun 1 - Primitive Markings)';
  } else if (isHeterozygous('D_Dun', 'nd1', 'nd2')) {
    dunEffectDescriptor = ' (Non-Dun 2 - Faint Primitive Markings)';
  }

  // Champagne Dilution (CH_Champagne) - REVISED LOGIC
  if (hasAllele('CH_Champagne', 'Ch')) {
    // Ch/Ch or Ch/n
    const isSingleCream = isHeterozygous('Cr_Cream', 'Cr', 'n');
    const isDoubleCream = isHomozygous('Cr_Cream', 'Cr');
    const isDunActive = hasAllele('D_Dun', 'D'); // This D check reflects if Dun gene made the coat Dun already
    let determinedChampagneColor;

    // Case 1: Champagne ONLY (no Cream, no active Dun)
    if (!isSingleCream && !isDoubleCream && !isDunActive) {
      if (isChestnutBase) {
        determinedChampagneColor = 'Gold Champagne';
      } else if (baseColor === 'Bay') {
        determinedChampagneColor = 'Amber Champagne';
      } else if (baseColor === 'Black') {
        determinedChampagneColor = 'Classic Champagne';
      }
    }
    // Case 2: Champagne + SINGLE CREAM (n/Cr) (no active Dun)
    else if (isSingleCream && !isDoubleCream && !isDunActive) {
      if (isChestnutBase) {
        determinedChampagneColor = 'Gold Cream Champagne';
      } // Was Palomino
      else if (baseColor === 'Bay') {
        determinedChampagneColor = 'Amber Cream Champagne';
      } // Was Buckskin
      else if (baseColor === 'Black') {
        determinedChampagneColor = 'Classic Cream Champagne';
      } // Was Smoky Black
    }
    // Case 3: Champagne + DOUBLE CREAM (Cr/Cr) (no active Dun)
    else if (isDoubleCream && !isDunActive) {
      if (isChestnutBase) {
        determinedChampagneColor = 'Ivory Champagne (Cremello)';
      } // Was Cremello
      else if (baseColor === 'Bay') {
        determinedChampagneColor = 'Ivory Champagne (Perlino)';
      } // Was Perlino
      else if (baseColor === 'Black') {
        determinedChampagneColor = 'Ivory Champagne (Smoky Cream)';
      } // Was Smoky Cream
    }
    // Case 4: Champagne + DUN (D/_) (no Cream)
    else if (isDunActive && !isSingleCream && !isDoubleCream) {
      if (isChestnutBase) {
        determinedChampagneColor = 'Gold Dun Champagne';
      } // Was Red Dun
      else if (baseColor === 'Bay') {
        determinedChampagneColor = 'Amber Dun Champagne';
      } // Was Bay Dun / Buckskin Dun (Bay base for this path)
      else if (baseColor === 'Black') {
        determinedChampagneColor = 'Classic Dun Champagne';
      } // Was Grulla
    }
    // Case 5: Champagne + SINGLE CREAM (n/Cr) + DUN (D/_)
    else if (isSingleCream && !isDoubleCream && isDunActive) {
      if (isChestnutBase) {
        determinedChampagneColor = 'Gold Cream Dun Champagne';
      } // Was Palomino Dun
      else if (baseColor === 'Bay') {
        determinedChampagneColor = 'Amber Cream Dun Champagne';
      } // Was Buckskin Dun
      else if (baseColor === 'Black') {
        determinedChampagneColor = 'Classic Cream Dun Champagne';
      } // Was Grulla (with cream = still Grulla for Dun, then Ch)
    }
    // Case 6: Champagne + DOUBLE CREAM (Cr/Cr) + DUN (D/_)
    else if (isDoubleCream && isDunActive) {
      if (isChestnutBase) {
        determinedChampagneColor = 'Ivory Dun Champagne (Cremello)';
      } // Was Cremello Dun
      else if (baseColor === 'Bay') {
        determinedChampagneColor = 'Ivory Dun Champagne (Perlino)';
      } // Was Perlino Dun
      else if (baseColor === 'Black') {
        determinedChampagneColor = 'Ivory Dun Champagne (Smoky Cream)';
      } // Was Smoky Cream Dun
    }
    // Fallback for unhandled combinations
    else {
      console.warn(
        `[GeneticsEngine] Unhandled Champagne interaction. Base: ${baseColor}, Cream: ${fullGenotype.Cr_Cream}, Dun: ${fullGenotype.D_Dun}, CurrentColor: ${currentDisplayColor}. Defaulting to base Champagne color.`
      );
      // This fallback needs to consider the `currentDisplayColor` if it was already complex
      // For now, we'll base it on the original baseColor for simplicity if no specific case matched.
      if (isChestnutBase) {
        determinedChampagneColor = 'Gold Champagne';
      } else if (baseColor === 'Bay') {
        determinedChampagneColor = 'Amber Champagne';
      } else if (baseColor === 'Black') {
        determinedChampagneColor = 'Classic Champagne';
      }
    }

    if (determinedChampagneColor) {
      currentDisplayColor = determinedChampagneColor;
      phenotypeKeyForShade = currentDisplayColor;
    }
  }

  // Silver Dilution (Z_Silver) - Only expressed on black-based coats (E/_). Carried but not shown on e/e.
  if (hasAllele('Z_Silver', 'Z') && !isChestnutBase) {
    // Z/Z or Z/n, and not e/e (chestnut based)
    const originalColorForSilver = currentDisplayColor;

    // Check if currentDisplayColor implies a black-based phenotype for Silver to act upon
    // This is complex because Champagne names might not include "Black" or "Bay" explicitly
    let silverActsOnBlackPigment = false;
    if (baseColor === 'Black') silverActsOnBlackPigment = true;
    if (baseColor === 'Bay') silverActsOnBlackPigment = true; // Silver on bay affects points

    // More specific checks for Champagne colors that are black/bay based
    if (!silverActsOnBlackPigment) {
      const cdcLower = currentDisplayColor.toLowerCase();
      if (
        cdcLower.includes('classic') ||
        cdcLower.includes('sable') ||
        (cdcLower.includes('amber') && baseColor === 'Bay')
      ) {
        // Classic/Sable are Black based Ch, Amber is Bay based Ch
        silverActsOnBlackPigment = true;
      }
    }

    if (
      silverActsOnBlackPigment &&
      !currentDisplayColor.toLowerCase().includes('silver')
    ) {
      currentDisplayColor = `Silver ${originalColorForSilver}`;
      // Adjust shade key: if "Silver Classic Dun Champagne", shade key might be "Silver Black" or "Silver Grulla"
      // This part needs careful thought if Silver interacts with complex Champagne names.
      // For now, a simple prepend, assuming shade key will be handled by later logic or specific Silver shade biases.
      phenotypeKeyForShade = `Silver ${phenotypeKeyForShade
        .replace(/Classic/i, 'Black')
        .replace(/Amber/i, 'Bay')
        .replace(/Gold/i, 'Chestnut')
        .replace(/Sable/i, 'Black')}`;
    }

    if (phenotypeKeyForShade.toLowerCase().startsWith('silver silver')) {
      phenotypeKeyForShade = phenotypeKeyForShade.substring(7);
    }
    phenotypeKeyForShade = phenotypeKeyForShade
      .replace(/Silver Classic/i, 'Silver Black')
      .replace(/Silver Amber/i, 'Silver Bay')
      .replace(/Silver Sable/i, 'Silver Black');
  }

  // Pearl Dilution (PRL_Pearl)
  const pearlResult = applyPearlDilution(
    currentDisplayColor,
    phenotypeKeyForShade,
    fullGenotype,
    baseColor
  );
  currentDisplayColor = pearlResult.currentDisplayColor;
  phenotypeKeyForShade = pearlResult.phenotypeKeyForShade;

  // Adjust phenotypeKeyForShade for Sooty *before* shade determination if Sooty is present
  if (
    fullGenotype.sooty === true &&
    !phenotypeKeyForShade.toLowerCase().startsWith('sooty')
  ) {
    phenotypeKeyForShade = `Sooty ${phenotypeKeyForShade}`;
  }

  // --- Determine Shade (before constructing displayColorParts) ---
  if (breedGeneticProfile && breedGeneticProfile.shade_bias) {
    if (breedGeneticProfile.shade_bias[phenotypeKeyForShade]) {
      determined_shade = selectWeightedRandom(
        breedGeneticProfile.shade_bias[phenotypeKeyForShade]
      );
    } else if (
      breedGeneticProfile.shade_bias[baseColor] &&
      phenotypeKeyForShade !== baseColor
    ) {
      determined_shade = selectWeightedRandom(
        breedGeneticProfile.shade_bias[baseColor]
      );
    } else {
      const firstWordOfPhenoKey = phenotypeKeyForShade.split(' ')[0];
      if (breedGeneticProfile.shade_bias[firstWordOfPhenoKey]) {
        determined_shade = selectWeightedRandom(
          breedGeneticProfile.shade_bias[firstWordOfPhenoKey]
        );
      } else if (breedGeneticProfile.shade_bias['Default']) {
        determined_shade = selectWeightedRandom(
          breedGeneticProfile.shade_bias['Default']
        );
      }
    }
  }
  if (!determined_shade) determined_shade = 'standard';
  console.log(
    '[Debug] currentDisplayColor before shade:',
    currentDisplayColor,
    'phenotypeKeyForShade:',
    phenotypeKeyForShade,
    'determined_shade:',
    determined_shade
  );

  // Apply shade to currentDisplayColor
  const shadeLower = determined_shade.toLowerCase();
if (
    shadeLower !== 'standard' &&
    shadeLower !== 'medium' &&
    !currentDisplayColor.toLowerCase().includes(shadeLower) &&
    !currentDisplayColor.toLowerCase().includes('gray')
) {
    currentDisplayColor = `${capitalizeFirstLetter(determined_shade)} ${currentDisplayColor}`;
}

console.log('[Debug Scope] currentDisplayColor before displayColorParts (line 444-):', currentDisplayColor, 'phenotypeKeyForShade:', phenotypeKeyForShade);

  // --- Initialize displayColorParts with (potentially shaded) currentDisplayColor ---
  let displayColorParts = [currentDisplayColor];

  console.log(
    '[Debug] displayColorParts JUST BEFORE FINAL JOIN:',
    JSON.stringify(displayColorParts)
  );
  // --- 3. Add Boolean Modifiers & Other Descriptors to displayColorParts ---
  if (fullGenotype.sooty === true) {
    // If shade was applied, Sooty should come before shade, e.g. "Sooty Dark Bay"
    // If currentDisplayColor starts with the shade, and doesn't include "Sooty"
    if (
      displayColorParts[0].toLowerCase().startsWith(shadeLower) &&
      shadeLower !== 'standard' &&
      shadeLower !== 'medium' &&
      !displayColorParts[0].toLowerCase().includes('sooty')
    ) {
      displayColorParts[0] = displayColorParts[0].replace(
        capitalizeFirstLetter(determined_shade),
        `Sooty ${capitalizeFirstLetter(determined_shade)}`
      );
    } else if (!displayColorParts[0].toLowerCase().includes('sooty')) {
      // Otherwise, prepend Sooty if not already part of the name
      displayColorParts.unshift('Sooty');
      // Remove duplicates if currentDisplayColor was just "Sooty" and unshift added another
      displayColorParts = displayColorParts.filter(
        (value, index, self) =>
          self.indexOf(value) === index || value.toLowerCase() !== 'sooty'
      );
    }
    // Ensure Sooty is first if it got added and shade wasn't complex
    if (
      displayColorParts.some((p) => p.toLowerCase() === 'sooty') &&
      displayColorParts[0].toLowerCase() !== 'sooty' &&
      !displayColorParts[0].toLowerCase().startsWith('sooty ')
    ) {
      displayColorParts = ['Sooty'].concat(
        displayColorParts.filter((p) => p.toLowerCase() !== 'sooty')
      );
    }
  }

  if (isChestnutBase && fullGenotype.flaxen === true) {
    // Flaxen applies to Chestnut based coats (e/e).
    // Avoid adding "Flaxen" if color is Palomino or Cremello (already implies flaxen).
    // Or if "Flaxen" is already part of the currentDisplayColor (e.g., "Flaxen Gold Champagne")
    if (
      !currentDisplayColor.toLowerCase().includes('palomino') &&
      !currentDisplayColor.toLowerCase().includes('cremello') &&
      !currentDisplayColor.toLowerCase().includes('flaxen')
    ) {
      // Prepend "Flaxen" to the main color part if it's a Chestnut-derivative
      // This is tricky if currentDisplayColor is complex like "Sooty Dark Gold Champagne"
      // For simplicity, if not already present, add as a separate descriptor.
      if (!displayColorParts.join(' ').toLowerCase().includes('flaxen')) {
        displayColorParts.push('Flaxen');
      }
    }
  }
  if (fullGenotype.pangare === true) {
    if (!displayColorParts.join(' ').toLowerCase().includes('pangare')) {
      displayColorParts.push('Pangare');
    }
  }

  // Roan (Rn_Roan) Gene
  if (
    fullGenotype.Rn_Roan &&
    hasAllele('Rn_Roan', 'Rn') &&
    !displayColorParts.some((p) => p.toLowerCase().includes('gray'))
  ) {
    // Gray overrides Roan display

    let roanColorName = '';
    // Determine Roan base from currentDisplayColor (which includes dilutions, shade, sooty)
    const cdcForRoanDetermination = displayColorParts.join(' ').toLowerCase();

    if (
      baseColor === 'Chestnut' ||
      cdcForRoanDetermination.includes('chestnut') ||
      cdcForRoanDetermination.includes('palomino') ||
      cdcForRoanDetermination.includes('cremello') ||
      cdcForRoanDetermination.includes('gold') ||
      cdcForRoanDetermination.includes('apricot') ||
      cdcForRoanDetermination.includes('mushroom') ||
      cdcForRoanDetermination.includes('ivory')
    ) {
      roanColorName = 'Red Roan';
    } else if (
      baseColor === 'Bay' ||
      cdcForRoanDetermination.includes('bay') ||
      cdcForRoanDetermination.includes('buckskin') ||
      cdcForRoanDetermination.includes('perlino') ||
      cdcForRoanDetermination.includes('amber')
    ) {
      roanColorName = 'Bay Roan';
    } else if (
      baseColor === 'Black' ||
      cdcForRoanDetermination.includes('black') ||
      cdcForRoanDetermination.includes('smoky') ||
      cdcForRoanDetermination.includes('grulla') ||
      cdcForRoanDetermination.includes('classic') ||
      cdcForRoanDetermination.includes('sable')
    ) {
      roanColorName = 'Blue Roan';
    }

    if (roanColorName) {
      // Roan becomes the primary color, other terms become descriptors
      // Keep shade/sooty prefix if it exists
      let prefix = '';
      const firstPart = displayColorParts[0].split(' ')[0].toLowerCase();
      if (
        firstPart === 'sooty' ||
        (determined_shade && firstPart === determined_shade.toLowerCase())
      ) {
        prefix = displayColorParts[0].split(' ')[0] + ' ';
        if (
          firstPart === 'sooty' &&
          determined_shade &&
          displayColorParts[0].split(' ').length > 1 &&
          displayColorParts[0].split(' ')[1].toLowerCase() ===
            determined_shade.toLowerCase()
        ) {
          prefix =
            displayColorParts[0].split(' ')[0] +
            ' ' +
            displayColorParts[0].split(' ')[1] +
            ' ';
        }
      }

      const existingDescriptors = [];
      displayColorParts
        .join(' ')
        .split(' ')
        .forEach((word) => {
          const wLower = word.toLowerCase();
          if (
            (wLower.includes('dun') ||
              wLower.includes('champagne') ||
              wLower.includes('pearl')) &&
            !roanColorName.toLowerCase().includes(wLower) &&
            !prefix.toLowerCase().includes(wLower) &&
            !word.includes('(') &&
            !word.includes(')')
          ) {
            if (
              !existingDescriptors.map((d) => d.toLowerCase()).includes(wLower)
            )
              existingDescriptors.push(capitalizeFirstLetter(wLower));
          }
        });

      displayColorParts = [`${prefix}${roanColorName}`];
      if (existingDescriptors.length > 0)
        displayColorParts.push(...existingDescriptors);

      phenotypeKeyForShade = roanColorName; // Roan type dictates shade key now
    } else {
      if (!displayColorParts.some((p) => p.toLowerCase().includes('roan'))) {
        displayColorParts.push('Roan');
      }
    }
  }

  // --- 4. White Patterns & Markings ---
  let isAllWhiteFromDominant = false;
  const wAlleles = getDominantWhiteAlleles();
  if (wAlleles.length > 0) {
    // Simplified: if any W allele from a list known to cause all/near all white is present.
    if (
      wAlleles.some((w) =>
        ['W2', 'W4', 'W5', 'W10', 'W13', 'W19', 'W22'].includes(w)
      )
    ) {
      // Example list
      displayColorParts = ['White'];
      phenotypeKeyForShade = 'Dominant White';
      isAllWhiteFromDominant = true;
    } else if (wAlleles.includes('W20')) {
      // W20 specific handling
      if (
        !isAllWhiteFromDominant &&
        !displayColorParts.join(' ').toLowerCase().includes('minimal white')
      ) {
        displayColorParts.push('Minimal White (W20)');
      }
    } else {
      // Other W alleles
      if (
        !isAllWhiteFromDominant &&
        !displayColorParts.join(' ').toLowerCase().includes('dominant white') &&
        !displayColorParts.join(' ').toLowerCase().includes('white')
      ) {
        displayColorParts.push('Dominant White');
      }
    }
  }

  if (!isAllWhiteFromDominant) {
    // Other white patterns only show if not all white from W
    if (hasAllele('O_FrameOvero', 'O') && fullGenotype.O_FrameOvero !== 'O/O') {
      if (!displayColorParts.join(' ').toLowerCase().includes('frame overo'))
        displayColorParts.push('Frame Overo');
    }
    if (hasAllele('TO_Tobiano', 'TO')) {
      if (!displayColorParts.join(' ').toLowerCase().includes('tobiano'))
        displayColorParts.push('Tobiano');
    }
    if (hasAllele('SB1_Sabino1', 'SB1')) {
      if (!displayColorParts.join(' ').toLowerCase().includes('sabino'))
        displayColorParts.push('Sabino');
    }
    const splashAlleles = getSplashWhiteAlleles();
    if (splashAlleles.length > 0) {
      const splashTerms = splashAlleles.map(
        (sa) => `Splash White ${sa.replace('SW', '')}`
      );
      splashTerms.forEach((st) => {
        if (
          !displayColorParts.join(' ').toLowerCase().includes(st.toLowerCase())
        )
          displayColorParts.push(st);
      });
    }
    const edenAlleles = getEdenWhiteAlleles();
    if (edenAlleles.length > 0) {
      const edenTerms = edenAlleles.map(
        (ea) => `Eden White ${ea.replace('EDXW', '')}`
      );
      edenTerms.forEach((et) => {
        if (
          !displayColorParts.join(' ').toLowerCase().includes(et.toLowerCase())
        )
          displayColorParts.push(et);
      });
    }
  }

  // --- 5. Leopard Complex (LP_LeopardComplex) and Pattern-1 (PATN1_Pattern1) ---
  const hasLP =
    fullGenotype.LP_LeopardComplex &&
    fullGenotype.LP_LeopardComplex.includes('LP');
  const hasPATN1 =
    fullGenotype.PATN1_Pattern1 &&
    fullGenotype.PATN1_Pattern1.includes('PATN1') &&
    fullGenotype.PATN1_Pattern1 !== 'patn1/patn1';

  if (hasLP && !isAllWhiteFromDominant) {
    phenotypic_markings.mottling = true;
    phenotypic_markings.striping = true;
    let lpPatternName = '';

    if (fullGenotype.LP_LeopardComplex === 'LP/LP') {
      // Homozygous LP
      lpPatternName = hasPATN1
        ? 'Fewspot Leopard Appaloosa'
        : 'Snowcap Appaloosa';
    } else if (fullGenotype.LP_LeopardComplex === 'LP/lp') {
      // Heterozygous LP
      if (hasPATN1) {
        lpPatternName = 'Leopard Appaloosa';
      } else {
        // LP/lp without PATN1
        let agePrefix =
          ageInYears <= 4 ? 'Light' : ageInYears <= 8 ? 'Moderate' : 'Heavy';
        let sfModifier;
        const snowProb =
          (breedGeneticProfile?.advanced_markings_bias
            ?.snowflake_probability_multiplier ?? 1.0) * 0.5;
        const frostProb =
          (breedGeneticProfile?.advanced_markings_bias
            ?.frost_probability_multiplier ?? 1.0) * 0.5;
        sfModifier =
          selectWeightedRandom({ Snowflake: snowProb, Frost: frostProb }) ||
          (Math.random() < 0.5 ? 'Snowflake' : 'Frost');
        const underlyingPattern =
          Math.random() < 0.5 ? 'Blanket Appaloosa' : 'Varnish Roan Appaloosa';
        lpPatternName = `${agePrefix} ${sfModifier} ${underlyingPattern}`;
      }
    }
    if (
      lpPatternName &&
      !displayColorParts
        .join(' ')
        .toLowerCase()
        .includes(lpPatternName.toLowerCase())
    ) {
      displayColorParts.push(lpPatternName);
      if (!displayColorParts.some((p) => p.toLowerCase().includes('gray'))) {
        phenotypeKeyForShade = lpPatternName; // Appy pattern can dictate shade key if not gray
      }
    }
  }

  // --- 6. Gray (G_Gray) ---
  if (hasAllele('G_Gray', 'G') && !isAllWhiteFromDominant) {
    let grayPhenotype;
    let grayBaseTone =
      baseColor === 'Black' || baseColor === 'Bay'
        ? 'Steel'
        : baseColor === 'Chestnut' || baseColor === 'Mushroom Chestnut'
          ? 'Rose'
          : '';

    if (ageInYears <= 3) grayPhenotype = `${grayBaseTone} Gray`.trim();
    else if (ageInYears <= 6)
      grayPhenotype = `${grayBaseTone} Dark Dapple Gray`.trim();
    else if (ageInYears <= 9)
      grayPhenotype = `${grayBaseTone} Light Dapple Gray`.trim();
    else if (ageInYears <= 12) grayPhenotype = 'White Gray';
    else grayPhenotype = 'Fleabitten Gray';

    if (!grayBaseTone && ageInYears <= 9) {
      // Fallback if base tone was empty
      grayPhenotype =
        ageInYears <= 3
          ? 'Gray'
          : ageInYears <= 6
            ? 'Dark Dapple Gray'
            : 'Light Dapple Gray';
    }

    displayColorParts = [grayPhenotype]; // Gray overrides other color parts for the name
    phenotypeKeyForShade = grayPhenotype; // Gray stage dictates shade key

    let bloodyShoulderChance =
      0.001 *
      (breedGeneticProfile?.advanced_markings_bias
        ?.bloody_shoulder_probability_multiplier ?? 1.0);
    if (Math.random() < bloodyShoulderChance) {
      if (!phenotypic_markings.body_markings)
        phenotypic_markings.body_markings = {};
      phenotypic_markings.body_markings.bloody_shoulder = true;
    }
  }

  // --- 7. Rabicano (Boolean Modifier) ---
  if (
    fullGenotype.rabicano === true &&
    !isAllWhiteFromDominant &&
    !displayColorParts.some((p) => p.toLowerCase().includes('gray'))
  ) {
    if (!displayColorParts.join(' ').toLowerCase().includes('rabicano')) {
      displayColorParts.push('Rabicano');
    }
  }

  // --- 8. Dun Primitive Markings (if applicable and not full Dun or other major pattern) ---
  if (
    dunEffectDescriptor &&
    !displayColorParts.some(
      (p) => p.toLowerCase().includes('dun') && !p.includes('(')
    ) && // Check it's not an actual Dun color (e.g. "Bay Dun")
    !displayColorParts.join(' ').includes(dunEffectDescriptor) &&
    !isAllWhiteFromDominant &&
    !displayColorParts.some((p) => p.toLowerCase().includes('gray'))
  ) {
    displayColorParts.push(dunEffectDescriptor);
  }

  // --- Final Assembly ---
  // Filter out empty strings and ensure uniqueness (case-insensitive for basic uniqueness)
  let uniqueParts = [];
  const seenLower = new Set();

  console.log(
    '[Debug] Before assembly: displayColorParts=',
    displayColorParts,
    'currentDisplayColor=',
    currentDisplayColor,
    'phenotypeKeyForShade=',
    phenotypeKeyForShade
  );

  for (const part of displayColorParts) {
    if (part && part.trim() !== '') {
      const partLower = part.toLowerCase();
      if (!seenLower.has(partLower)) {
        uniqueParts.push(part.trim());
        seenLower.add(partLower);
      } else {
        // If a very similar part exists (e.g. "Dun" and "dun"), try to keep the one with correct casing if possible
        // This is complex; for now, first-seen wins for simple duplicates.
      }
    }
  }
  displayColorParts = uniqueParts;

  // Re-ordering logic:
  // Gray or White should be the sole primary descriptor if they rendered the horse as such.
  // Otherwise: [Sooty] [Shade] [Base Color + Dilutions like Champagne/Dun/Roan] [White Patterns] [Appaloosa] [Other Modifiers]
  if (
    displayColorParts.length > 1 &&
    !isAllWhiteFromDominant &&
    !displayColorParts[0].toLowerCase().includes('gray')
  ) {
    const mainColorPart =
      displayColorParts.find(
        (p) =>
          !p.toLowerCase().startsWith('sooty') &&
          !(
            determined_shade &&
            p.toLowerCase().startsWith(determined_shade.toLowerCase()) &&
            p !== determined_shade
          ) && // Not just the shade word itself
          !['pangare', 'flaxen', 'rabicano'].includes(p.toLowerCase()) &&
          !p.toLowerCase().includes('dun (') &&
          !p.toLowerCase().includes('white') &&
          !p.toLowerCase().includes('overo') &&
          !p.toLowerCase().includes('tobiano') &&
          !p.toLowerCase().includes('sabino') &&
          !p.toLowerCase().includes('appaloosa')
      ) || displayColorParts[0]; // Fallback to first part if complex

    const sootyPrefix = displayColorParts.find(
      (p) => p.toLowerCase() === 'sooty'
    );
    const shadePrefix =
      determined_shade &&
      determined_shade.toLowerCase() !== 'standard' &&
      determined_shade.toLowerCase() !== 'medium'
        ? displayColorParts.find(
            (p) =>
              p.toLowerCase().startsWith(determined_shade.toLowerCase()) &&
              p
                .toLowerCase()
                .includes(
                  mainColorPart.split(' ')[mainColorPart.split(' ').length - 1].toLowerCase()
                )
          )
        : null;

    const otherDescriptors = displayColorParts.filter(
      (p) => p !== mainColorPart && p !== sootyPrefix && p !== shadePrefix
    );

    const orderedParts = [];
    if (
      sootyPrefix &&
      sootyPrefix !== mainColorPart &&
      sootyPrefix !== shadePrefix
    )
      orderedParts.push(sootyPrefix);
    // if (shadePrefix && shadePrefix !== mainColorPart) orderedParts.push(shadePrefix); // Shade is part of mainColorPart now typically
    orderedParts.push(mainColorPart);
    orderedParts.push(...otherDescriptors);

    displayColorParts = orderedParts.filter(
      (v, i, a) => v && a.indexOf(v) === i
    ); // Unique and non-empty
  }

  let final_display_color = displayColorParts
    .join(' ')
    .replace(/  +/g, ' ')
    .trim();

  if (!final_display_color.trim()) {
    final_display_color = baseColor || 'Undefined Phenotype';
  }

  // Phenotypic Markings (Face/Legs) - based on breedGeneticProfile.marking_bias
  if (breedGeneticProfile && breedGeneticProfile.marking_bias) {
    const mb = breedGeneticProfile.marking_bias;
    if (mb.face && typeof mb.face === 'object') {
      // console.log('[Debug] mb.face:', mb.face, 'selectWeightedRandom result:', selectWeightedRandom(mb.face));
      phenotypic_markings.face = selectWeightedRandom(mb.face) || 'none';
    }

    const legMarkingTypes = mb.leg_specific_probabilities
      ? Object.keys(mb.leg_specific_probabilities)
      : [];
    if (
      legMarkingTypes.length > 0 &&
      typeof mb.legs_general_probability === 'number'
    ) {
      let legsMarkedCount = 0;
      const maxLegs = mb.max_legs_marked !== undefined ? mb.max_legs_marked : 4;

      ['LF', 'RF', 'LH', 'RH'].forEach((leg) => {
        if (
          legsMarkedCount < maxLegs &&
          Math.random() < mb.legs_general_probability
        ) {
          phenotypic_markings.legs[leg] =
            selectWeightedRandom(mb.leg_specific_probabilities) || 'none';
          if (phenotypic_markings.legs[leg] !== 'none') {
            legsMarkedCount++;
          }
        } else {
          phenotypic_markings.legs[leg] = 'none';
        }
      });
    }
  }

  console.log('[GeneticsEngine] Determined phenotype:', {
    final_display_color,
    phenotypic_markings,
    determined_shade,
    ageInYears,
  });
  return { final_display_color, phenotypic_markings, determined_shade };
}

/**
 * Calculates the genotype of a foal based on sire and dam genotypes.
 * @param {object} sireGenotype - The sire's full genotype object.
 * @param {object} damGenotype - The dam's full genotype object.
 * @param {object} foalBreedGeneticProfile - The genetic profile of the foal's breed (for disallowed_combinations and boolean modifier prevalence).
 * @returns {Promise<object>} An object representing the foal's full genotype.
 */
async function calculateFoalGenetics(
  sireGenotype,
  damGenotype,
  foalBreedGeneticProfile
) {
  console.log(
    '[GeneticsEngine] Calculating foal genetics. Sire:',
    sireGenotype,
    'Dam:',
    damGenotype,
    'Foal Profile:',
    foalBreedGeneticProfile
  );
  const foalGenotype = {};

  if (!sireGenotype || !damGenotype || !foalBreedGeneticProfile) {
    console.error(
      '[GeneticsEngine] Missing sire, dam, or foal breed profile for foal genetics calculation.'
    );
    return {}; // Return empty or throw
  }

  const getParentAllele = (allelePairString) => {
    if (
      !allelePairString ||
      typeof allelePairString !== 'string' ||
      !allelePairString.includes('/')
    ) {
      return null;
    }
    const alleles = allelePairString.split('/');
    return alleles[Math.floor(Math.random() * alleles.length)];
  };

  const combineAlleles = (allele1, allele2) => {
    if (allele1 === null || allele2 === null) return null;

    const orderPreservingGenes = ['W', 'SW', 'EDXW']; // Alleles that should keep dominant form first (e.g. W20/w not w/W20)
    const recessiveLikes = [
      'n',
      'w',
      'patn1',
      'nd1',
      'nd2',
      'lp',
      'g',
      'rn',
      'to',
      'o',
      'sb1',
      'mu',
      'e',
      'a',
      'ch',
      'cr',
      'z',
      'prl',
      'd',
    ]; // Added more recessive-like allele symbols, including 'd' for Dun

    // Prioritize dominant allele first if one is clearly dominant over a common recessive type
    // Example: D over d, E over e, A over a, Cr over n (or cr), Ch over n (or ch)
    if (
      !recessiveLikes.includes(allele1.toLowerCase()) &&
      recessiveLikes.includes(allele2.toLowerCase())
    )
      return `${allele1}/${allele2}`;
    if (
      recessiveLikes.includes(allele1.toLowerCase()) &&
      !recessiveLikes.includes(allele2.toLowerCase())
    )
      return `${allele2}/${allele1}`;

    // For genes like W_DominantWhite where specific alleles W1, W2 etc. are dominant over 'w'
    for (const prefix of orderPreservingGenes) {
      if (allele1.startsWith(prefix) && allele1 !== allele2 && allele2 === 'w')
        return `${allele1}/${allele2}`; // Wx/w
      if (allele2.startsWith(prefix) && allele2 !== allele1 && allele1 === 'w')
        return `${allele2}/${allele1}`; // Wx/w
    }
    // Specific for Ch, Cr, Z, PRL, D etc. vs 'n' or their recessive counterparts if defined (e.g. 'd' for Dun)
    const dominantLike = [
      'Ch',
      'Cr',
      'Z',
      'Prl',
      'D',
      'Mu',
      'Lp',
      'Rn',
      'To',
      'O',
      'Sb1',
    ]; // Add other dominant forms
    if (
      dominantLike.includes(allele1) &&
      (allele2 === 'n' || allele2 === allele1.toLowerCase())
    )
      return `${allele1}/${allele2}`;
    if (
      dominantLike.includes(allele2) &&
      (allele1 === 'n' || allele1 === allele2.toLowerCase())
    )
      return `${allele2}/${allele1}`;

    // Default sort if no other rule applies (e.g. Cr/Cr, Ch/Ch, D/D) or two non-standard alleles
    return [allele1, allele2].sort().join('/');
  };

  const genesToInherit = foalBreedGeneticProfile.allowed_alleles
    ? Object.keys(foalBreedGeneticProfile.allowed_alleles)
    : Object.keys(sireGenotype).filter(
        (g) => !['sooty', 'flaxen', 'pangare', 'rabicano'].includes(g)
      );

  for (const gene of genesToInherit) {
    const sireAllelePair = sireGenotype[gene];
    const damAllelePair = damGenotype[gene];

    if (sireAllelePair === undefined || damAllelePair === undefined) {
      if (
        foalBreedGeneticProfile.allele_weights &&
        foalBreedGeneticProfile.allele_weights[gene]
      ) {
        const randomPairFromFoalProfile = selectWeightedRandom(
          foalBreedGeneticProfile.allele_weights[gene]
        );
        if (randomPairFromFoalProfile) {
          foalGenotype[gene] = randomPairFromFoalProfile;
          // console.log(`[GeneticsEngine] Gene ${gene} missing from one parent, generated ${randomPairFromFoalProfile} for foal from breed profile.`);
          continue;
        }
      }
      // console.warn(`[GeneticsEngine] Gene ${gene} missing from a parent and could not be generated from foal profile. Skipping for foal.`);
      continue;
    }

    let foalAllelePair = null;
    let attempts = 0;
    const MAX_ATTEMPTS = 10;

    while (attempts < MAX_ATTEMPTS) {
      const sirePassedAllele = getParentAllele(sireAllelePair);
      const damPassedAllele = getParentAllele(damAllelePair);

      if (sirePassedAllele === null || damPassedAllele === null) {
        foalAllelePair = null;
        break;
      }

      foalAllelePair = combineAlleles(sirePassedAllele, damPassedAllele);

      if (!foalAllelePair) break;

      const allowedForFoal = foalBreedGeneticProfile.allowed_alleles
        ? foalBreedGeneticProfile.allowed_alleles[gene]
        : null;
      if (allowedForFoal && !allowedForFoal.includes(foalAllelePair)) {
        foalAllelePair = null;
        attempts++;
        continue;
      }

      if (
        foalBreedGeneticProfile.disallowed_combinations &&
        foalBreedGeneticProfile.disallowed_combinations[gene] &&
        foalBreedGeneticProfile.disallowed_combinations[gene].includes(
          foalAllelePair
        )
      ) {
        foalAllelePair = null;
        attempts++;
        continue;
      }
      break;
    }

    if (foalAllelePair) {
      foalGenotype[gene] = foalAllelePair;
    } else {
      // console.warn(`[GeneticsEngine] Failed to determine a valid allele pair for gene ${gene} for foal from parents after ${MAX_ATTEMPTS} attempts. Assigning fallback from foal profile.`);
      const allowedForFoal = foalBreedGeneticProfile.allowed_alleles
        ? foalBreedGeneticProfile.allowed_alleles[gene]
        : null;
      if (allowedForFoal && allowedForFoal.length > 0) {
        let fallbackPair = allowedForFoal.find((p) =>
          [
            'n/n',
            'w/w',
            'e/e',
            'a/a',
            'g/g',
            'rn/rn',
            'lp/lp',
            'to/to',
            'o/o',
            'sb1/sb1',
            'd/d',
            'nd2/nd2',
            'patn1/patn1',
            'ch/ch',
            'cr/cr',
            'z/z',
            'prl/prl',
            'mu/mu',
          ].includes(p)
        );
        if (!fallbackPair) fallbackPair = allowedForFoal[0];

        if (
          foalBreedGeneticProfile.disallowed_combinations &&
          foalBreedGeneticProfile.disallowed_combinations[gene] &&
          foalBreedGeneticProfile.disallowed_combinations[gene].includes(
            fallbackPair
          )
        ) {
          console.error(
            `[GeneticsEngine] CRITICAL: Chosen fallback pair ${fallbackPair} for ${gene} is ALSO disallowed for foal. Gene will be missing. Review breed profile: ${foalBreedGeneticProfile.name}`
          );
        } else {
          foalGenotype[gene] = fallbackPair;
        }
      } else {
        console.error(
          `[GeneticsEngine] CRITICAL: No allowed alleles defined for ${gene} in foal's breed profile to select a fallback. Gene will be missing for foal: ${foalBreedGeneticProfile.name}`
        );
      }
    }
  }

  const booleanModifiers = ['sooty', 'flaxen', 'pangare', 'rabicano'];
  if (foalBreedGeneticProfile.boolean_modifiers_prevalence) {
    const definedModifiers = Object.keys(
      foalBreedGeneticProfile.boolean_modifiers_prevalence
    );

    definedModifiers.forEach((modifier) => {
      if (!booleanModifiers.includes(modifier)) return;

      const sireHasModifier = sireGenotype[modifier];
      const damHasModifier = damGenotype[modifier];
      const prevalence =
        foalBreedGeneticProfile.boolean_modifiers_prevalence[modifier];

      if (sireHasModifier === true && damHasModifier === true) {
        foalGenotype[modifier] = true;
      } else if (sireHasModifier === false && damHasModifier === false) {
        foalGenotype[modifier] = false;
      } else if (
        sireHasModifier !== undefined &&
        damHasModifier !== undefined
      ) {
        foalGenotype[modifier] = Math.random() < 0.5;
      } else if (sireHasModifier !== undefined) {
        foalGenotype[modifier] =
          Math.random() < 0.5
            ? sireHasModifier
            : Math.random() < (prevalence || 0);
      } else if (damHasModifier !== undefined) {
        foalGenotype[modifier] =
          Math.random() < 0.5
            ? damHasModifier
            : Math.random() < (prevalence || 0);
      } else {
        if (typeof prevalence === 'number') {
          foalGenotype[modifier] = Math.random() < prevalence;
        } else {
          foalGenotype[modifier] = false;
        }
      }
    });
  }

  console.log('[GeneticsEngine] Calculated foal genotype:', foalGenotype);
  return foalGenotype;
}

module.exports = {
  generateStoreHorseGenetics,
  determinePhenotype,
  calculateFoalGenetics,
  selectWeightedRandom,
  applyPearlDilution,
};
