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
    if (!weightedItems || typeof weightedItems !== 'object' || Object.keys(weightedItems).length === 0) {
        console.error("[GeneticsEngine] selectWeightedRandom: Invalid or empty weightedItems provided.", weightedItems);
        return null; // Or throw an error, depending on desired strictness
    }

    let sumOfWeights = 0;
    for (const item in weightedItems) {
        if (weightedItems.hasOwnProperty(item) && typeof weightedItems[item] === 'number' && weightedItems[item] >= 0) {
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
        if (weightedItems.hasOwnProperty(item) && typeof weightedItems[item] === 'number' && weightedItems[item] >= 0) {
            if (randomNum < weightedItems[item]) {
                return item;
            }
            randomNum -= weightedItems[item];
        }
    }
    
    // Fallback for potential floating point inaccuracies, should ideally pick the last valid item.
    const validItems = Object.keys(weightedItems).filter(key => typeof weightedItems[key] === 'number' && weightedItems[key] >= 0);
    return validItems.length > 0 ? validItems[validItems.length - 1] : null;
}


/**
 * Generates a complete genotype for a store-bought horse based on the breed's genetic profile.
 * The genotype includes both main gene alleles and boolean modifiers.
 * @param {object} breedGeneticProfile - The breed_genetic_profile JSONB object from the breeds table.
 * @returns {Promise<object>} An object representing the horse's full genotype.
 */
async function generateStoreHorseGenetics(breedGeneticProfile) {
    console.log("[GeneticsEngine] Called generateStoreHorseGenetics with profile:", breedGeneticProfile);
    const generatedGenotype = {};

    if (!breedGeneticProfile) {
        console.error("[GeneticsEngine] Breed genetic profile is undefined or null.");
        return generatedGenotype; // Return empty or handle error as appropriate
    }

    // 1. Generate Allele Pairs for Genes
    if (breedGeneticProfile.allele_weights && typeof breedGeneticProfile.allele_weights === 'object') {
        for (const geneName in breedGeneticProfile.allele_weights) {
            if (breedGeneticProfile.allele_weights.hasOwnProperty(geneName)) {
                const weightedAlleles = breedGeneticProfile.allele_weights[geneName];
                // Ensure disallowed combinations are respected if not already handled by weights
                // For store generation, this is simpler as we pick from allowed_alleles weighted sets.
                // For breeding, it's more critical.
                const chosenAllelePair = selectWeightedRandom(weightedAlleles);
                if (chosenAllelePair) {
                    // Check against disallowed_combinations for safety, though weights should guide this.
                    if (breedGeneticProfile.disallowed_combinations && 
                        breedGeneticProfile.disallowed_combinations[geneName] && 
                        breedGeneticProfile.disallowed_combinations[geneName].includes(chosenAllelePair)) {
                        console.warn(`[GeneticsEngine] Attempted to generate disallowed allele pair ${chosenAllelePair} for ${geneName}. Re-evaluating or skipping.`);
                        // This ideally needs a retry mechanism or ensuring weights never allow this.
                        // For now, we might get an incomplete genotype if this happens.
                        // A robust solution would re-pick ensuring it's not disallowed.
                        // However, allele_weights should already exclude impossible/lethal combos for generation.
                    } else {
                        generatedGenotype[geneName] = chosenAllelePair;
                    }
                } else {
                    console.warn(`[GeneticsEngine] Could not determine allele for gene ${geneName}. It will be omitted.`);
                }
            }
        }
    } else {
        console.warn("[GeneticsEngine] allele_weights not found or invalid in breed profile.");
    }

    // 2. Determine Boolean Modifiers
    if (breedGeneticProfile.boolean_modifiers_prevalence && typeof breedGeneticProfile.boolean_modifiers_prevalence === 'object') {
        for (const modifierName in breedGeneticProfile.boolean_modifiers_prevalence) {
            if (breedGeneticProfile.boolean_modifiers_prevalence.hasOwnProperty(modifierName)) {
                const prevalence = breedGeneticProfile.boolean_modifiers_prevalence[modifierName];
                if (typeof prevalence === 'number' && prevalence >= 0 && prevalence <= 1) {
                    generatedGenotype[modifierName] = (Math.random() < prevalence);
                } else {
                    console.warn(`[GeneticsEngine] Invalid prevalence for boolean modifier ${modifierName}: ${prevalence}. It will be omitted or defaulted to false.`);
                    generatedGenotype[modifierName] = false; // Default to false if prevalence is invalid
                }
            }
        }
    } else {
        console.warn("[GeneticsEngine] boolean_modifiers_prevalence not found or invalid in breed profile.");
    }

    console.log("[GeneticsEngine] Generated full genotype:", generatedGenotype);
    return generatedGenotype; 
}

/**
 * Determines the final display color and phenotypic markings of a horse based on its full genotype.
 * @param {object} fullGenotype - The horse's complete genotype (including main genes and boolean modifiers).
 * @param {object} breedGeneticProfile - The breed_genetic_profile from the breeds table (for marking bias etc.).
 * @param {number} ageInYears - The current age of the horse in years.
 * @returns {Promise<object>} An object containing `final_display_color` (string) and `phenotypic_markings` (JSONB).
 */
async function determinePhenotype(fullGenotype, breedGeneticProfile, ageInYears = 0) {
    console.log("[GeneticsEngine] Called determinePhenotype with fullGenotype:", fullGenotype, "breedProfile:", breedGeneticProfile, "ageInYears:", ageInYears);
    let baseColor = '';
    let phenotypeKeyForShade = ''; 
    let determined_shade = null;

    let phenotypic_markings = {
        face: 'none',
        legs: { LF: 'none', RF: 'none', LH: 'none', RH: 'none' }
    };

    // Helper to check for presence of specific alleles (e.g., at least one 'E')
    const hasAllele = (gene, allele) => fullGenotype[gene] && fullGenotype[gene].includes(allele);
    const getAlleles = (gene) => fullGenotype[gene] ? fullGenotype[gene].split('/') : [];
    const isHomozygous = (gene, allele) => {
        const alleles = getAlleles(gene);
        return alleles.length === 2 && alleles[0] === allele && alleles[1] === allele;
    };
    const isHeterozygous = (gene, allele1, allele2) => {
        const alleles = getAlleles(gene);
        return alleles.length === 2 && 
               ((alleles[0] === allele1 && alleles[1] === allele2) || 
                (alleles[0] === allele2 && alleles[1] === allele1));
    };
    // Check for any dominant W allele other than w/w for Dominant White
    const hasDominantWhiteAllele = () => { // Keep this, might be used generally
        if (!fullGenotype.W_DominantWhite || fullGenotype.W_DominantWhite === 'w/w') return false;
        const alleles = getAlleles('W_DominantWhite');
        return alleles.some(a => a.startsWith('W') && a !== 'w');
    };
    const getDominantWhiteAlleles = () => {
        if (!fullGenotype.W_DominantWhite || fullGenotype.W_DominantWhite === 'w/w') return [];
        return getAlleles('W_DominantWhite').filter(a => a.startsWith('W') && a !== 'w');
    };
     // Check for any splash white allele
    const getSplashWhiteAlleles = () => {
        if (!fullGenotype.SW_SplashWhite || fullGenotype.SW_SplashWhite === 'n/n') return [];
        return getAlleles('SW_SplashWhite').filter(a => a.startsWith('SW'));
    };
    // Check for any Eden White allele
    const getEdenWhiteAlleles = () => {
        if (!fullGenotype.EDXW || fullGenotype.EDXW === 'n/n') return [];
        return getAlleles('EDXW').filter(a => a.startsWith('EDXW'));
    };

    const capitalizeFirstLetter = (string) => {
      return string.charAt(0).toUpperCase() + string.slice(1);
    };


    // --- 1. Determine Base Coat Color ---
    const E_Extension = fullGenotype.E_Extension;
    const A_Agouti = fullGenotype.A_Agouti;
    let isChestnutBase = false;

    if (isHomozygous('E_Extension', 'e')) { // e/e
        baseColor = 'Chestnut';
        phenotypeKeyForShade = 'Chestnut';
        isChestnutBase = true;
    } else { // E/E or E/e (black pigment can be produced)
        if (A_Agouti && (hasAllele('A_Agouti', 'A'))) { // A/A or A/a
            baseColor = 'Bay';
            phenotypeKeyForShade = 'Bay';
        } else { // a/a (or Agouti not present/defined)
            baseColor = 'Black';
            phenotypeKeyForShade = 'Black';
        }
    }
    
    let currentDisplayColor = baseColor; // Start with the base, this will be modified by dilutions

    // --- 2. Apply Dilutions ---

    // Mushroom (MFSD12_Mushroom) - only on Chestnut (e/e)
    if (isChestnutBase && (hasAllele('MFSD12_Mushroom', 'Mu'))) { // Mu/Mu or Mu/N
        currentDisplayColor = 'Mushroom Chestnut'; 
        phenotypeKeyForShade = 'Mushroom'; // Needs a corresponding entry in shade_bias
    }

    // Cream Dilution (Cr_Cream)
    if (fullGenotype.Cr_Cream) {
        if (isHeterozygous('Cr_Cream', 'Cr', 'n')) { // n/Cr (single dilution)
            if (baseColor === 'Chestnut' && currentDisplayColor === 'Chestnut') { currentDisplayColor = 'Palomino'; phenotypeKeyForShade = 'Palomino'; }
            else if (baseColor === 'Bay') { currentDisplayColor = 'Buckskin'; phenotypeKeyForShade = 'Buckskin'; }
            else if (baseColor === 'Black') { currentDisplayColor = 'Smoky Black'; phenotypeKeyForShade = 'Smoky Black'; }
            else if (currentDisplayColor === 'Mushroom Chestnut') { currentDisplayColor = 'Palomino'; phenotypeKeyForShade = 'Palomino';} // Mushroom + Cream = Palomino

        } else if (isHomozygous('Cr_Cream', 'Cr')) { // Cr/Cr (double dilution)
            if (baseColor === 'Chestnut' && (currentDisplayColor === 'Chestnut' || currentDisplayColor === 'Palomino' || currentDisplayColor === 'Mushroom Chestnut')) { 
                currentDisplayColor = 'Cremello'; phenotypeKeyForShade = 'Cremello'; 
            }
            else if (baseColor === 'Bay' && (currentDisplayColor === 'Bay' || currentDisplayColor === 'Buckskin')) { 
                currentDisplayColor = 'Perlino'; phenotypeKeyForShade = 'Perlino'; 
            }
            else if (baseColor === 'Black' && (currentDisplayColor === 'Black' || currentDisplayColor === 'Smoky Black')) { 
                currentDisplayColor = 'Smoky Cream'; phenotypeKeyForShade = 'Smoky Cream'; 
            }
        }
    }
    
    
    // Dun Dilution (D_Dun)
    // D/D, D/nd1, D/nd2 = Dun phenotype. nd1/nd1 = primitive, nd1/nd2 = faint, nd2/nd2 = non-dun.
    let dunEffectDescriptor = ''; // To be added to displayColorParts later if not a full Dun
    if (hasAllele('D_Dun', 'D')) { // D/D, D/nd1, D/nd2 - This is the actual Dun effect
        const originalColorForDun = currentDisplayColor; 

        if (originalColorForDun === 'Black' || originalColorForDun === 'Smoky Black') { 
            currentDisplayColor = 'Grulla'; phenotypeKeyForShade = 'Grulla'; 
        }
        else if (originalColorForDun === 'Bay' || originalColorForDun === 'Buckskin') { 
            phenotypeKeyForShade = (originalColorForDun === 'Buckskin') ? 'Buckskin Dun' : 'Bay Dun';
            currentDisplayColor = phenotypeKeyForShade;
        }
        else if (originalColorForDun === 'Chestnut' || originalColorForDun === 'Palomino' || originalColorForDun === 'Mushroom Chestnut') { 
            // Mushroom bases express as Red Dun phenotypes
            phenotypeKeyForShade = (originalColorForDun === 'Palomino') ? 'Palomino Dun' : 'Red Dun';
            if (originalColorForDun === 'Mushroom Chestnut') phenotypeKeyForShade = 'Red Dun'; // Mushroom Chestnut + Dun = Red Dun
            currentDisplayColor = phenotypeKeyForShade;
        }
        else if (['Cremello', 'Perlino', 'Smoky Cream'].includes(originalColorForDun)) {
            currentDisplayColor = `${originalColorForDun} Dun`; // e.g., Cremello Dun
            phenotypeKeyForShade = currentDisplayColor; 
        } else {
            // Handles cases like "Mushroom Dun" if Mushroom didn't get overwritten by Palomino/Cremello first
            // Or other complex combinations not yet explicitly named.
            currentDisplayColor = `${originalColorForDun} Dun`;
            phenotypeKeyForShade = currentDisplayColor;
        }
        // Dun effect is now primary, clear descriptor for non-dun variants.
        dunEffectDescriptor = ''; 
    } else if (isHomozygous('D_Dun', 'nd1')) { // nd1/nd1
        dunEffectDescriptor = " (Non-Dun 1 - Primitive Markings)"; // Add to final description, not base color name
    } else if (isHeterozygous('D_Dun', 'nd1', 'nd2')) { // nd1/nd2
        dunEffectDescriptor = " (Non-Dun 2 - Faint Primitive Markings)"; // Add to final description
    }
    // nd2/nd2 or n/n (or other combinations not resulting in D or nd1 effects) are non-dun and have no descriptor.

    // Champagne Dilution (CH_Champagne) - Affects base, cream, mushroom, dun
    if (hasAllele('CH_Champagne', 'Ch')) { // Ch/Ch or Ch/n
        const originalColorForChampagne = currentDisplayColor;
        let tempPhenotypeKeyForShade = phenotypeKeyForShade; // Preserve the key from previous dilutions for basing Champagne shades

        if (baseColor === 'Chestnut') { // e/e based
            if (currentDisplayColor.includes('Cremello')) { 
                currentDisplayColor = 'Ivory Champagne (Cremello)'; phenotypeKeyForShade = 'Gold Cream Champagne';
            } else if (currentDisplayColor.includes('Palomino')) { 
                currentDisplayColor = 'Gold Cream Champagne'; phenotypeKeyForShade = 'Gold Cream Champagne'; 
            } else { // Chestnut, Mushroom Chestnut, Red Dun (from Chestnut base)
                currentDisplayColor = 'Gold Champagne'; phenotypeKeyForShade = 'Gold Champagne'; 
            }
        } else if (baseColor === 'Bay') { // E/_ A/_ based
            if (currentDisplayColor.includes('Perlino')) { 
                currentDisplayColor = 'Ivory Champagne (Perlino)'; phenotypeKeyForShade = 'Amber Cream Champagne';
            } else if (currentDisplayColor.includes('Buckskin')) { 
                currentDisplayColor = 'Amber Cream Champagne'; phenotypeKeyForShade = 'Amber Cream Champagne'; 
            } else { // Bay, Bay Dun
                currentDisplayColor = 'Amber Champagne'; phenotypeKeyForShade = 'Amber Champagne'; 
            }
        } else { // Black based (E/_ a/a)
            if (currentDisplayColor.includes('Smoky Cream')) { 
                currentDisplayColor = 'Ivory Champagne (Smoky Cream)'; phenotypeKeyForShade = 'Classic Cream Champagne';
            } else if (currentDisplayColor.includes('Smoky Black')) { 
                currentDisplayColor = 'Classic Cream Champagne'; phenotypeKeyForShade = 'Classic Cream Champagne'; 
            } else { // Black, Grulla
                currentDisplayColor = 'Classic Champagne'; phenotypeKeyForShade = 'Classic Champagne'; 
            }
        }

        // If Dun is also present (D allele, not just nd1/nd2), it modifies the Champagne color
        // The currentDisplayColor would already be e.g. "Grulla", "Bay Dun", "Red Dun", "Buckskin Dun"
        // Or "Cremello Dun", "Perlino Dun", "Smoky Cream Dun"
        // Or if Champagne was applied first in a different order, it would be e.g. "Gold Champagne"
        // This logic assumes Dun was processed first, and currentDisplayColor reflects that if Dun is present.
        if (hasAllele('D_Dun', 'D')) {
            if (originalColorForChampagne.includes('Dun') || originalColorForChampagne.includes('Grulla')) { // Check if Dun was the *input* to Champagne
                 // The color name already has "Dun" or "Grulla", now add Champagne
                 // Example: "Bay Dun" + Champagne -> "Amber Dun Champagne"
                 // Example: "Grulla" + Champagne -> "Classic Dun Champagne" (or Grulla Champagne)
                if (phenotypeKeyForShade === 'Gold Champagne') { currentDisplayColor = 'Gold Dun Champagne'; phenotypeKeyForShade = 'Gold Dun Champagne'; }
                else if (phenotypeKeyForShade === 'Amber Champagne') { currentDisplayColor = 'Amber Dun Champagne'; phenotypeKeyForShade = 'Amber Dun Champagne'; }
                else if (phenotypeKeyForShade === 'Classic Champagne') { currentDisplayColor = 'Classic Dun Champagne'; phenotypeKeyForShade = 'Classic Dun Champagne'; }
                else if (phenotypeKeyForShade === 'Gold Cream Champagne') { currentDisplayColor = 'Gold Cream Dun Champagne'; phenotypeKeyForShade = 'Gold Cream Dun Champagne'; }
                else if (phenotypeKeyForShade === 'Amber Cream Champagne') { currentDisplayColor = 'Amber Cream Dun Champagne'; phenotypeKeyForShade = 'Amber Cream Dun Champagne'; }
                else if (phenotypeKeyForShade === 'Classic Cream Champagne') { currentDisplayColor = 'Classic Cream Dun Champagne'; phenotypeKeyForShade = 'Classic Cream Dun Champagne'; }
                // For double creams that were dun prior to champagne
                else if (originalColorForChampagne.includes('Cremello Dun')) { currentDisplayColor = 'Ivory Dun Champagne (Cremello)'; phenotypeKeyForShade = 'Gold Cream Dun Champagne';}
                else if (originalColorForChampagne.includes('Perlino Dun')) { currentDisplayColor = 'Ivory Dun Champagne (Perlino)'; phenotypeKeyForShade = 'Amber Cream Dun Champagne';}
                else if (originalColorForChampagne.includes('Smoky Cream Dun')) { currentDisplayColor = 'Ivory Dun Champagne (Smoky Cream)'; phenotypeKeyForShade = 'Classic Cream Dun Champagne';}
            } 
            // Fallback: if for some reason Dun wasn't in originalColorForChampagne but D is present and Champagne was applied:
            // This is more of a safety net if order of operations implies Champagne hit a non-Dun color first, then we check D_Dun again.
            // However, the main logic above should handle it if Dun was first.
            else if (currentDisplayColor === 'Gold Champagne') { currentDisplayColor = 'Gold Dun Champagne'; phenotypeKeyForShade = 'Gold Dun Champagne'; }
            else if (currentDisplayColor === 'Amber Champagne') { currentDisplayColor = 'Amber Dun Champagne'; phenotypeKeyForShade = 'Amber Dun Champagne'; }
            else if (currentDisplayColor === 'Classic Champagne') { currentDisplayColor = 'Classic Dun Champagne'; phenotypeKeyForShade = 'Classic Dun Champagne'; }
            // Similar for Cream Champagnes if Dun is present but wasn't part of the input color string to Champagne.
            else if (currentDisplayColor === 'Gold Cream Champagne' || currentDisplayColor === 'Ivory Champagne (Cremello)') { currentDisplayColor = 'Gold Cream Dun Champagne'; phenotypeKeyForShade = 'Gold Cream Dun Champagne'; }
            else if (currentDisplayColor === 'Amber Cream Champagne' || currentDisplayColor === 'Ivory Champagne (Perlino)') { currentDisplayColor = 'Amber Cream Dun Champagne'; phenotypeKeyForShade = 'Amber Cream Dun Champagne'; }
            else if (currentDisplayColor === 'Classic Cream Champagne' || currentDisplayColor === 'Ivory Champagne (Smoky Cream)') { currentDisplayColor = 'Classic Cream Dun Champagne'; phenotypeKeyForShade = 'Classic Cream Dun Champagne'; }
        }
    }

    // Silver Dilution (Z_Silver) - Only expressed on black-based coats (E/_). Carried but not shown on e/e.
    if (hasAllele('Z_Silver', 'Z') && !isChestnutBase) { // Z/Z or Z/n, and not e/e (chestnut based)
        const originalColorForSilver = currentDisplayColor;
        let silverApplied = false;

        // Silver primarily affects black pigment.
        // On a black horse (no agouti or agouti is a/a), it dilutes body, mane, and tail.
        // On a bay horse (agouti A/_), it primarily dilutes the black points (mane, tail, legs).
        // It can also affect black pigment influenced by other dilutions like Champagne on black.

        if (baseColor === 'Black' || 
            (currentDisplayColor.toLowerCase().includes('black') && !currentDisplayColor.toLowerCase().includes('buckskin')) || // e.g. Smoky Black
            currentDisplayColor.toLowerCase().includes('grulla') || 
            currentDisplayColor.toLowerCase().includes('classic')) { // Covers Black, Smoky Black, Grulla, Classic Champagne etc.
            
            if (!currentDisplayColor.toLowerCase().includes('silver')) { // Avoid "Silver Silver Black"
                 currentDisplayColor = `Silver ${originalColorForSilver}`;
                 // phenotypeKeyForShade might need adjustment, e.g., "Silver Black", "Silver Grulla"
                 phenotypeKeyForShade = `Silver ${phenotypeKeyForShade.replace(/Classic/i, 'Black').replace(/Amber/i, 'Bay').replace(/Gold/i, 'Chestnut')}`;
                 silverApplied = true;
            }
        } else if (baseColor === 'Bay' || 
                   (currentDisplayColor.toLowerCase().includes('bay') && !isChestnutBase) || 
                   currentDisplayColor.toLowerCase().includes('buckskin') || 
                   currentDisplayColor.toLowerCase().includes('amber')) { // Bay based (Agouti present)
            
            if (!currentDisplayColor.toLowerCase().includes('silver')) {
                currentDisplayColor = `Silver ${originalColorForSilver}`; // e.g. "Silver Bay", "Silver Buckskin Dun"
                phenotypeKeyForShade = `Silver ${phenotypeKeyForShade.replace(/Classic/i, 'Black').replace(/Amber/i, 'Bay').replace(/Gold/i, 'Chestnut')}`;
                silverApplied = true;
            }
        }
        // If it's a double cream on black base (Smoky Cream, Perlino - if Perlino from black base + agouti was targeted by silver),
        // silver's effect is often masked but genetically present.
        // For naming simplicity, if black pigment *could* have been present and Silver is there, we add it.
        // This primarily applies if the color isn't already something like "Silver Bay Perlino".
        else if ((currentDisplayColor.toLowerCase().includes('perlino') || currentDisplayColor.toLowerCase().includes('smoky cream')) && !isChestnutBase) {
             if (!currentDisplayColor.toLowerCase().includes('silver')) {
                currentDisplayColor = `Silver ${originalColorForSilver}`;
                phenotypeKeyForShade = `Silver ${phenotypeKeyForShade}`;
                silverApplied = true;
             }
        }
        // Clean up shade key if it becomes redundant e.g. "Silver Silver Black"
        if (phenotypeKeyForShade.toLowerCase().startsWith("silver silver")) {
            phenotypeKeyForShade = phenotypeKeyForShade.substring(7);
        }
    }
    // Pearl Dilution (PRL_Pearl)
    // Expressed as prl/prl, or n/prl with Cr/n (single cream dilute)
    const isHomozygousPearl = isHomozygous('PRL_Pearl', 'prl');
    const isHeterozygousPearl = isHeterozygous('PRL_Pearl', 'prl', 'n');
    const hasSingleCream = isHeterozygous('Cr_Cream', 'Cr', 'n'); // Cr/n
    const hasDoubleCream = isHomozygous('Cr_Cream', 'Cr'); // Cr/Cr

    if (isHomozygousPearl || (isHeterozygousPearl && hasSingleCream)) {
        const originalColorForPearl = currentDisplayColor;
        let pearlDescriptor = "";

        if (isHomozygousPearl && !hasSingleCream && !hasDoubleCream) { // prl/prl without any cream
            pearlDescriptor = "Pearl";
            if (baseColor === 'Chestnut') { currentDisplayColor = 'Apricot'; phenotypeKeyForShade = 'Apricot'; }
            // For Bay or Black based, often referred to as "Bay Pearl" or "Black Pearl"
            // Or if other dilutions are present, e.g. "Grulla Pearl", "Amber Champagne Pearl"
            else { 
                currentDisplayColor = `${originalColorForPearl} Pearl`; 
                phenotypeKeyForShade = `${phenotypeKeyForShade} Pearl`; 
            }
        } else if (hasSingleCream && (isHeterozygousPearl || isHomozygousPearl)) { // Cr/n with prl/n or prl/prl (Cream Pearl)
            // Homozygous pearl with single cream can be more expressive than het pearl.
            pearlDescriptor = (isHomozygousPearl) ? "Homozygous Pearl Cream" : "Pearl Cream"; // Or "Cream Pearl"
            
            if (originalColorForPearl.includes('Palomino')) { 
                currentDisplayColor = 'Palomino Pearl'; // Often lighter, apricot-like palomino
                phenotypeKeyForShade = 'Palomino Pearl'; 
            } else if (originalColorForPearl.includes('Buckskin')) { 
                currentDisplayColor = 'Buckskin Pearl'; 
                phenotypeKeyForShade = 'Buckskin Pearl'; 
            } else if (originalColorForPearl.includes('Smoky Black')) { 
                currentDisplayColor = 'Smoky Black Pearl'; 
                phenotypeKeyForShade = 'Smoky Black Pearl'; 
            } else if (originalColorForPearl.includes('Gold Cream Champagne')) { // Palomino + Champagne base for Pearl
                 currentDisplayColor = 'Gold Cream Champagne Pearl';
                 phenotypeKeyForShade = 'Gold Cream Champagne Pearl';
            } else if (originalColorForPearl.includes('Amber Cream Champagne')) { // Buckskin + Champagne base for Pearl
                 currentDisplayColor = 'Amber Cream Champagne Pearl';
                 phenotypeKeyForShade = 'Amber Cream Champagne Pearl';
            } else if (originalColorForPearl.includes('Classic Cream Champagne')) { // Smoky Black + Champagne base for Pearl
                 currentDisplayColor = 'Classic Cream Champagne Pearl';
                 phenotypeKeyForShade = 'Classic Cream Champagne Pearl';
            }
            // If the original color wasn't a simple single cream name due to other genes (e.g. "Silver Palomino Dun")
            // then append the pearl descriptor.
            else if (hasSingleCream && !originalColorForPearl.match(/(Palomino|Buckskin|Smoky Black)/i)){
                currentDisplayColor = `${originalColorForPearl} ${pearlDescriptor}`;
                phenotypeKeyForShade = `${phenotypeKeyForShade} ${pearlDescriptor}`;
            }
        }

        // If homozygous pearl is combined with double cream (Cr/Cr prl/prl), 
        // it's often visually very similar to just double cream, but good to note genetically.
        if (isHomozygousPearl && hasDoubleCream) {
            if (!currentDisplayColor.toLowerCase().includes('pearl')) { // Avoid double Pearl if already named
                currentDisplayColor = `${originalColorForPearl} (Pearl)`; // e.g. Cremello (Pearl)
                phenotypeKeyForShade = `${phenotypeKeyForShade} (Pearl)`;
            }
        }
        // Ensure shade key doesn't get messy like "Pearl Pearl"
        if (phenotypeKeyForShade.toLowerCase().includes("pearl pearl")) {
            phenotypeKeyForShade = phenotypeKeyForShade.replace(/Pearl Pearl/i, "Pearl");
        }
         if (phenotypeKeyForShade.toLowerCase().includes("pearl cream pearl")) {
            phenotypeKeyForShade = phenotypeKeyForShade.replace(/Pearl Cream Pearl/i, "Pearl Cream");
        }
    }

    // Adjust phenotypeKeyForShade for Sooty *before* shade determination if Sooty is present
    if (fullGenotype.sooty === true && !phenotypeKeyForShade.toLowerCase().startsWith('sooty')) {
        phenotypeKeyForShade = `Sooty ${phenotypeKeyForShade}`;
    }

    let displayColorParts = [currentDisplayColor];

    // --- 3. Add Boolean Modifiers that affect base/diluted color or add descriptors ---
    if (fullGenotype.sooty === true) {
        // This part primarily ensures "Sooty" is in the final display name parts array
        // The phenotypeKeyForShade has already been adjusted above for shade lookup purposes.
        if (!displayColorParts.join(' ').toLowerCase().includes('sooty') && 
            !displayColorParts.some(p => p.toLowerCase() === 'sooty')) { // Avoid double Sooty if currentDisplayColor already had it somehow
            displayColorParts.unshift("Sooty");
        }
    }
    if (isChestnutBase && fullGenotype.flaxen === true) {
        // Flaxen primarily affects Chestnut based coats (e/e).
        // It can be part of the main color name (e.g. "Flaxen Chestnut") or an addition.
        // If the color is already Palomino (which implies flaxen on chestnut), we might not need to add it again explicitly.
        // Or, if currentDisplayColor is simply "Chestnut", we can make it "Flaxen Chestnut".
        let flaxenAdded = false;
        for (let i = 0; i < displayColorParts.length; i++) {
            if (displayColorParts[i] === "Chestnut" || displayColorParts[i] === "Mushroom Chestnut") {
                displayColorParts[i] = `Flaxen ${displayColorParts[i]}`;
                phenotypeKeyForShade = displayColorParts[i]; // Update shade key potentially
                flaxenAdded = true;
                break;
            }
        }
        if (!flaxenAdded && !displayColorParts.some(p => p.toLowerCase().includes("flaxen"))) {
            // If not directly modifying "Chestnut", add as a general term.
            displayColorParts.push("Flaxen"); 
        }
    }
    if (fullGenotype.pangare === true) {
        // Pangare adds light areas, often appended as a descriptor.
        if (!displayColorParts.includes("Pangare") && !displayColorParts.some(p => p.toLowerCase().includes("pangare"))) {
            displayColorParts.push("Pangare");
        }
    }

    // --- Determine and Apply Shade ---
    if (breedGeneticProfile && breedGeneticProfile.shade_bias && breedGeneticProfile.shade_bias[phenotypeKeyForShade]) {
        determined_shade = selectWeightedRandom(breedGeneticProfile.shade_bias[phenotypeKeyForShade]);
    } else if (breedGeneticProfile && breedGeneticProfile.shade_bias && breedGeneticProfile.shade_bias[baseColor] && phenotypeKeyForShade !== baseColor) {
        determined_shade = selectWeightedRandom(breedGeneticProfile.shade_bias[baseColor]);
    } else {
        const firstWordOfPhenoKey = phenotypeKeyForShade.split(' ')[0];
        if (breedGeneticProfile && breedGeneticProfile.shade_bias && breedGeneticProfile.shade_bias[firstWordOfPhenoKey]) {
            determined_shade = selectWeightedRandom(breedGeneticProfile.shade_bias[firstWordOfPhenoKey]);
        } else if (breedGeneticProfile && breedGeneticProfile.shade_bias && breedGeneticProfile.shade_bias["Default"]) {
            determined_shade = selectWeightedRandom(breedGeneticProfile.shade_bias["Default"]);
        } else {
            determined_shade = "standard";
        }
    }
    if (!determined_shade) determined_shade = "standard";

    // Apply shade to displayColorParts
    if (determined_shade) {
        const shadeLower = determined_shade.toLowerCase();
        const originalCurrentDisplayColorLower = currentDisplayColor.toLowerCase(); 

        const keyLower = phenotypeKeyForShade.toLowerCase(); 

        const shouldPrependShade =
            (shadeLower !== 'standard' && shadeLower !== 'medium') || // This handles cases like "light", "dark"
            (keyLower !== originalCurrentDisplayColorLower && shadeLower === 'standard' && !originalCurrentDisplayColorLower.includes(keyLower));

        if (shouldPrependShade && 
            !originalCurrentDisplayColorLower.includes(shadeLower) && 
            !originalCurrentDisplayColorLower.includes("gray")) { 
            
            // This is where currentDisplayColor gets updated
            currentDisplayColor = `${capitalizeFirstLetter(determined_shade)} ${currentDisplayColor}`; 
            
            // AND THIS IS THE CRITICAL FIX (equivalent to your example)
            // It updates displayColorParts[0] if it was the original unshaded color
            if (displayColorParts.length === 1 && displayColorParts[0].toLowerCase() === originalCurrentDisplayColorLower) {
                displayColorParts[0] = currentDisplayColor; // <-- THIS IS THE KEY PART
            }
        }
    }

    // Roan (Rn_Roan) Gene
    // Rn/n or Rn/Rn. True roan, distinct from Appaloosa varnish roan. Overridden by Gray.
    if (fullGenotype.Rn_Roan && hasAllele('Rn_Roan', 'Rn') &&
        // !isAllWhiteFromDominant && // This check is removed as isAllWhiteFromDominant is set later.
        !displayColorParts.some(p => p.toLowerCase().includes("gray"))) {

        let roanColorName = "";
        // Use currentDisplayColor (post-dilutions, pre-other-patterns string) to determine the base for Roan name.
        const cdcForRoanDetermination = currentDisplayColor.toLowerCase();

        if (baseColor === 'Chestnut' || cdcForRoanDetermination.includes('chestnut') || cdcForRoanDetermination.includes('palomino') || cdcForRoanDetermination.includes('cremello') || cdcForRoanDetermination.includes('gold') || cdcForRoanDetermination.includes('apricot') || cdcForRoanDetermination.includes('mushroom')) {
            roanColorName = "Red Roan";
        } else if (baseColor === 'Bay' || cdcForRoanDetermination.includes('bay') || cdcForRoanDetermination.includes('buckskin') || cdcForRoanDetermination.includes('perlino') || cdcForRoanDetermination.includes('amber')) {
            roanColorName = "Bay Roan";
        } else if (baseColor === 'Black' || cdcForRoanDetermination.includes('black') || cdcForRoanDetermination.includes('smoky') || cdcForRoanDetermination.includes('grulla') || cdcForRoanDetermination.includes('classic')) {
            roanColorName = "Blue Roan";
        }

        if (roanColorName) {
            let mainColorPartIndex = -1;
            // Find the existing main color component in displayColorParts
            for(let i=0; i < displayColorParts.length; i++) {
                if (displayColorParts[i] !== "Sooty" && displayColorParts[i] !== "Pangare" && !displayColorParts[i].toLowerCase().includes("flaxen")) { // Flaxen can be a prefix to the main color
                    mainColorPartIndex = i;
                    break;
                } else if (displayColorParts[i].toLowerCase().includes("flaxen")) { // e.g. "Flaxen Chestnut"
                     mainColorPartIndex = i;
                     break;
                }
            }
             if (mainColorPartIndex === -1 && displayColorParts.length > 0) mainColorPartIndex = 0; // Fallback if only modifiers were found (e.g. ["Sooty"])

            if (mainColorPartIndex !== -1) {
                let originalMainColorPart = displayColorParts[mainColorPartIndex];
                let newMainColorPart = roanColorName;

                const suffixesToKeep = [];
                originalMainColorPart.split(' ').forEach(word => {
                    const wordLower = word.toLowerCase();
                    if ( (wordLower.includes("dun") ||
                           wordLower.includes("champagne") ||
                           wordLower.includes("pearl")) &&
                           !roanColorName.toLowerCase().includes(wordLower) &&
                           !roanColorName.split(' ')[0].toLowerCase().includes(wordLower) // Avoid "Bay Roan Bay Dun"
                        ) {
                         if(!suffixesToKeep.includes(word)) suffixesToKeep.push(word);
                    }
                });

                if (suffixesToKeep.length > 0) {
                    newMainColorPart += " " + suffixesToKeep.join(" ");
                }

                // Preserve "Flaxen" if it was a prefix and new roan name is Red Roan
                if (originalMainColorPart.toLowerCase().startsWith("flaxen ") && roanColorName === "Red Roan" && !newMainColorPart.toLowerCase().startsWith("flaxen")) {
                    newMainColorPart = "Flaxen " + newMainColorPart;
                }

                displayColorParts[mainColorPartIndex] = newMainColorPart;
                phenotypeKeyForShade = roanColorName;
            } else {
                // Fallback: if displayColorParts was empty or only contained Sooty/Pangare in a weird way
                displayColorParts.push(roanColorName);
                phenotypeKeyForShade = roanColorName;
            }
        } else {
            // If no specific roan type (e.g. on a very unusual base), add general "Roan"
            if (!displayColorParts.some(p => p.toLowerCase().includes("roan"))) {
                 displayColorParts.push("Roan");
                 if (!phenotypeKeyForShade.toLowerCase().includes("roan")) {
                     phenotypeKeyForShade = phenotypeKeyForShade ? phenotypeKeyForShade + " Roan" : "Roan";
                 }
            }
        }
        // Ensure displayColorParts are clean
        displayColorParts = displayColorParts.filter(part => part && part.trim() !== '');
    }

    // --- 4. White Patterns & Markings ---
    // Order can matter here. Dominant White (especially all-white versions) can obscure other patterns.
    let isAllWhiteFromDominant = false;
    const wAlleles = getDominantWhiteAlleles();
    if (wAlleles.length > 0) {
        let wEffectDescriptor = "Dominant White"; 
        if (wAlleles.includes('W13')) { // W13 is often considered all white
            wEffectDescriptor = "White"; // Or "All White"
            displayColorParts = ["White"]; 
            phenotypeKeyForShade = "Dominant White"; // Or simply "White"
            isAllWhiteFromDominant = true;
        } else if (wAlleles.includes('W20')) {
            // W20 is a minimal white / enhancer. Add as a descriptor if not already white.
            if (!isAllWhiteFromDominant && !displayColorParts.includes("Minimal White") && !displayColorParts.includes("Dominant White")){
                displayColorParts.push("Minimal White");
            }
        } else {
            // For other W alleles, add "Dominant White" if not already white.
            if (!isAllWhiteFromDominant && !displayColorParts.includes("Dominant White") && !displayColorParts.includes("White")) {
                displayColorParts.push("Dominant White");
            }
        }
    }

    // Frame Overo (O_FrameOvero)
    // O/O is lethal, so we expect O/n if the gene is present and expressed.
    if (hasAllele('O_FrameOvero', 'O') && fullGenotype.O_FrameOvero !== 'O/O') {
        if (!isAllWhiteFromDominant && !displayColorParts.includes("Frame Overo")) {
            displayColorParts.push("Frame Overo");
        }
    }

    // Tobiano (TO_Tobiano)
    if (hasAllele('TO_Tobiano', 'TO')) { // TO/TO or TO/to
        let tobianoTerm = "Tobiano";
        // Homozygous Tobiano might have specific display, but often just "Tobiano" is used.
        // if (isHomozygous('TO_Tobiano', 'TO')) { tobianoTerm = "Homozygous Tobiano"; }
        if (!isAllWhiteFromDominant && !displayColorParts.includes(tobianoTerm)) {
            displayColorParts.push(tobianoTerm);
        }
    }
    
    // Sabino (SB1_Sabino1)
    if (hasAllele('SB1_Sabino1', 'SB1')) { // SB1/n
         if (!isAllWhiteFromDominant && !displayColorParts.includes("Sabino")) {
            displayColorParts.push("Sabino");
        }
    }

     const splashAlleles = getSplashWhiteAlleles();
    if (!isAllWhiteFromDominant && splashAlleles.length > 0) {
        const splashTerms = splashAlleles.map(sa => `Splash White ${sa.replace('SW', '')}`); // Corrected: no semicolon inside .map()
        splashTerms.forEach(st => {
            if (!displayColorParts.includes(st)) {
                displayColorParts.push(st); // Corrected: push(st)
            }
        });
    }
    
    // Eden White (EDXW) - EDXW1, EDXW2, EDXW3
    const edenAlleles = getEdenWhiteAlleles();
    if (!isAllWhiteFromDominant && edenAlleles.length > 0) {
        const edenTerms = edenAlleles.map(ea => `Eden White ${ea.replace('EDXW', '')}`);
        edenTerms.forEach(et => {
             if (!displayColorParts.includes(et)) {
                displayColorParts.push(et);
            }
        });
    }

    // --- 5. Leopard Complex (LP_LeopardComplex) and Pattern-1 (PATN1_Pattern1) ---
    // This needs to come before Gray to allow "Gray over Appaloosa"
    const hasLP = fullGenotype.LP_LeopardComplex && fullGenotype.LP_LeopardComplex.includes('LP');
    const hasPATN1 = fullGenotype.PATN1_Pattern1 && fullGenotype.PATN1_Pattern1.includes('PATN1') && fullGenotype.PATN1_Pattern1 !== 'patn1/patn1';
    const isHomozygousPATN1 = fullGenotype.PATN1_Pattern1 && fullGenotype.PATN1_Pattern1 === 'PATN1/PATN1';
    const isHomozygousRecessivePATN1 = fullGenotype.PATN1_Pattern1 === 'patn1/patn1' || !fullGenotype.PATN1_Pattern1;


    if (hasLP) {
        phenotypic_markings.mottling = true; // Skin mottling
        phenotypic_markings.striping = true; // Hoof striping

        let lpPatternName = '';

        if (fullGenotype.LP_LeopardComplex === 'LP/LP') { // Homozygous LP
            if (hasPATN1 || isHomozygousPATN1) { // LP/LP + PATN1/PATN1 or PATN1/patn1
                lpPatternName = 'Fewspot Leopard Appaloosa';
            } else { // LP/LP + patn1/patn1 (no PATN1 dominant allele)
                lpPatternName = 'Snowcap Appaloosa';
            }
        } else if (fullGenotype.LP_LeopardComplex === 'LP/lp') { // Heterozygous LP
            if (hasPATN1) { // LP/lp + PATN1/PATN1 or PATN1/patn1
                lpPatternName = 'Leopard Appaloosa';
            } else { // LP/lp + patn1/patn1 (no PATN1 dominant allele)
                // New dual-labeling Snowflake/Frost logic
                let agePrefix = "";
                if (ageInYears <= 4) {
                    agePrefix = "Light";
                } else if (ageInYears >= 5 && ageInYears <= 8) {
                    agePrefix = "Moderate";
                } else { // ageInYears >= 9
                    agePrefix = "Heavy";
                }

                let sfModifier; // "Snowflake" or "Frost"
                const snowProbMultiplier = breedGeneticProfile?.advanced_markings_bias?.snowflake_probability_multiplier ?? 1.0;
                const frostProbMultiplier = breedGeneticProfile?.advanced_markings_bias?.frost_probability_multiplier ?? 1.0;

                let snowflakeWeight = 0.5 * Math.max(0, snowProbMultiplier);
                let frostWeight = 0.5 * Math.max(0, frostProbMultiplier);

                const sfChoices = [];
                if (snowflakeWeight > 0) sfChoices.push({ value: "Snowflake", weight: snowflakeWeight });
                if (frostWeight > 0) sfChoices.push({ value: "Frost", weight: frostWeight });

                if (sfChoices.length > 0) {
                    sfModifier = selectWeightedRandom(
                        sfChoices.length === 1 ?
                        {[sfChoices[0].value]: sfChoices[0].weight} :
                        sfChoices.reduce((obj, item) => { obj[item.value] = item.weight; return obj; }, {})
                    );
                    if (!sfModifier && sfChoices.length > 0) { // Fallback
                         sfModifier = sfChoices[Math.floor(Math.random() * sfChoices.length)].value;
                    }
                }
                
                if (!sfModifier) { // Ultimate fallback if multipliers were zero or issues
                    sfModifier = (Math.random() < 0.5) ? "Snowflake" : "Frost";
                }
                
                // Determine underlying Blanket or Varnish Roan
                const underlyingPattern = (Math.random() < 0.5) ? "Blanket Appaloosa" : "Varnish Roan Appaloosa";
                
                lpPatternName = `${agePrefix} ${sfModifier} ${underlyingPattern}`;
            }
        }

        if (lpPatternName) {
            displayColorParts.push(lpPatternName);
            phenotypeKeyForShade = lpPatternName; // This pattern dictates the primary shade key if not gray
        }
    }


    // --- 6. Gray (G_Gray) ---
    // G/g or G/G. If present, it usually becomes the primary identifier as horse ages.
    // For static display, it's added. Overrides roan's phenotypeKeyForShade if present.
    if (hasAllele('G_Gray', 'G')) {
        if (!isAllWhiteFromDominant) { // Gray doesn't show on an all-white horse from W
            let grayPhenotype = "Gray";
            let grayStageKey = "Gray"; // For shade_bias

            // Determine base for steel/rose gray
            let grayBaseTone = "";
            if (baseColor === 'Black' || baseColor === 'Bay') {
                grayBaseTone = "Steel";
            } else if (baseColor === 'Chestnut' || baseColor === 'Mushroom Chestnut') {
                grayBaseTone = "Rose";
            }

            if (ageInYears <= 3) {
                grayPhenotype = `${grayBaseTone} Gray`;
                grayStageKey = grayPhenotype; 
            } else if (ageInYears <= 6) {
                grayPhenotype = `${grayBaseTone} Dark Dapple Gray`;
                grayStageKey = grayPhenotype;
            } else if (ageInYears <= 9) {
                grayPhenotype = `${grayBaseTone} Light Dapple Gray`;
                grayStageKey = grayPhenotype;
            } else if (ageInYears <= 12) {
                grayPhenotype = "White Gray";
                grayStageKey = grayPhenotype;
            } else { // 13+ years
                grayPhenotype = "Fleabitten Gray";
                grayStageKey = grayPhenotype;
            }
            
            // If grayBaseTone is empty (e.g. if baseColor was somehow not Black/Bay/Chestnut - defensive)
            if (!grayBaseTone && ageInYears <= 9) { // For early stages if tone is missing, default to generic Gray
                grayPhenotype = (ageInYears <=6) ? "Dark Dapple Gray" : "Light Dapple Gray";
                if (ageInYears <=3) grayPhenotype = "Gray";
                grayStageKey = grayPhenotype;
            }

            displayColorParts = [grayPhenotype];
            phenotypeKeyForShade = grayStageKey;

            // Bloody Shoulder Marking Logic
            let bloodyShoulderChance = 0.001; // Base 0.1% chance
            if (breedGeneticProfile && 
                breedGeneticProfile.advanced_markings_bias && 
                typeof breedGeneticProfile.advanced_markings_bias.bloody_shoulder_probability_multiplier === 'number') {
                bloodyShoulderChance *= breedGeneticProfile.advanced_markings_bias.bloody_shoulder_probability_multiplier;
            }

            if (Math.random() < bloodyShoulderChance) {
                if (!phenotypic_markings.body_markings) phenotypic_markings.body_markings = {};
                phenotypic_markings.body_markings.bloody_shoulder = true;
                // This doesn't typically change the main color string but is a distinct marking.
                // We could add it to displayColorParts if desired: e.g., "Gray with Bloody Shoulder"
                // displayColorParts.push("(Bloody Shoulder)"); // Optional addition to name string
            }
        }
    }
    
    // --- 7. Rabicano (Boolean Modifier) ---
    // Rabicano adds ticking, usually appended if not obscured by heavy white patterns or Gray.
    if (fullGenotype.rabicano === true) {
        if (!isAllWhiteFromDominant && !displayColorParts.includes("Gray") && !displayColorParts.includes("Rabicano")) {
            displayColorParts.push("Rabicano");
        }
    }

    // --- 8. Dun Primitive Markings (if applicable and not full Dun or other major pattern) ---
    if (dunEffectDescriptor && 
        !displayColorParts.some(p => p.includes("Dun")) && // Don't add if actual Dun (Grulla, Bay Dun, etc.)
        !displayColorParts.includes(dunEffectDescriptor) &&
        !isAllWhiteFromDominant && !displayColorParts.includes("Gray")) {
        displayColorParts.push(dunEffectDescriptor);
    }


    // --- Final Assembly & Shade Determination ---
    let final_display_color_parts = displayColorParts.filter(part => part && part.trim() !== '');
    
    // Remove duplicates that might have occurred, prioritizing earlier occurrences.
    final_display_color_parts = final_display_color_parts.reduce((acc, current) => {
        if (!acc.includes(current)) {
            acc.push(current);
        }
        return acc;
    }, []);

    let final_display_color = final_display_color_parts.join(' ');

    if (!final_display_color.trim() && baseColor) { 
        final_display_color = baseColor; 
        // phenotypeKeyForShade would have been baseColor already if no dilutions/modifiers hit.
        // If it was complex and then got wiped, the determined_shade might be from that complex key.
        // This path implies an issue earlier if displayColorParts became empty.
    } else if (!final_display_color.trim() && !baseColor) {
        final_display_color = "Undefined Phenotype"; 
        // phenotypeKeyForShade = "Undefined"; // This was already done
    }

    // The shade is now part of final_display_color directly from currentDisplayColor via displayColorParts.
    // The old block for shade prefixing based on final_display_color_parts is removed.
    
    // Phenotypic Markings (Face/Legs) - based on breedGeneticProfile.marking_bias
    if (breedGeneticProfile && breedGeneticProfile.marking_bias) {
        const mb = breedGeneticProfile.marking_bias;
        if (mb.face && typeof mb.face === 'object') {
            phenotypic_markings.face = selectWeightedRandom(mb.face) || 'none';
        }

        const legMarkingTypes = mb.leg_specific_probabilities ? Object.keys(mb.leg_specific_probabilities) : [];
        if (legMarkingTypes.length > 0 && typeof mb.legs_general_probability === 'number') {
            let legsMarkedCount = 0;
            const maxLegs = mb.max_legs_marked !== undefined ? mb.max_legs_marked : 4;
            
            ['LF', 'RF', 'LH', 'RH'].forEach(leg => {
                if (legsMarkedCount < maxLegs && Math.random() < mb.legs_general_probability) {
                    phenotypic_markings.legs[leg] = selectWeightedRandom(mb.leg_specific_probabilities) || 'none';
                    if (phenotypic_markings.legs[leg] !== 'none') {
                        legsMarkedCount++;
                    }
                } else {
                    phenotypic_markings.legs[leg] = 'none';
                }
            });
        }
    }
    
    console.log("[GeneticsEngine] Determined phenotype:", { final_display_color, phenotypic_markings, determined_shade, ageInYears });

    return { final_display_color, phenotypic_markings, determined_shade }; 
}

/**
 * Calculates the genotype of a foal based on sire and dam genotypes.
 * @param {object} sireGenotype - The sire's full genotype object.
 * @param {object} damGenotype - The dam's full genotype object.
 * @param {object} foalBreedGeneticProfile - The genetic profile of the foal's breed (for disallowed_combinations and boolean modifier prevalence).
 * @returns {Promise<object>} An object representing the foal's full genotype.
 */
async function calculateFoalGenetics(sireGenotype, damGenotype, foalBreedGeneticProfile) {
    console.log("[GeneticsEngine] Calculating foal genetics. Sire:", sireGenotype, "Dam:", damGenotype, "Foal Profile:", foalBreedGeneticProfile);
    const foalGenotype = {};

    if (!sireGenotype || !damGenotype || !foalBreedGeneticProfile) {
        console.error("[GeneticsEngine] Missing sire, dam, or foal breed profile for foal genetics calculation.");
        return {}; // Return empty or throw
    }

    const getParentAllele = (allelePairString) => {
        if (!allelePairString || typeof allelePairString !== 'string' || !allelePairString.includes('/')) {
            return null; 
        }
        const alleles = allelePairString.split('/');
        return alleles[Math.floor(Math.random() * alleles.length)];
    };

    const combineAlleles = (allele1, allele2) => {
        if (allele1 === null || allele2 === null) return null;
        
        const orderPreservingGenes = ['W', 'SW', 'EDXW']; // Alleles that should keep dominant form first (e.g. W20/w not w/W20)
        const recessiveLikes = ['n', 'w', 'patn1', 'nd2', 'lp', 'g', 'rn', 'to', 'o', 'sb1', 'mu', 'e', 'a'];

        for (const prefix of orderPreservingGenes) {
            if (allele1.startsWith(prefix) && allele1 !== recessiveLikes.find(r => r===allele2) && recessiveLikes.includes(allele2)) return `${allele1}/${allele2}`;
            if (allele2.startsWith(prefix) && allele2 !== recessiveLikes.find(r => r===allele1) && recessiveLikes.includes(allele1)) return `${allele2}/${allele1}`;
        }
        
        if (recessiveLikes.includes(allele2.toLowerCase()) && !recessiveLikes.includes(allele1.toLowerCase())) return `${allele1}/${allele2}`;
        if (recessiveLikes.includes(allele1.toLowerCase()) && !recessiveLikes.includes(allele2.toLowerCase())) return `${allele2}/${allele1}`;
        
        return [allele1, allele2].sort().join('/');
    };

    const genesToInherit = foalBreedGeneticProfile.allowed_alleles ? 
                           Object.keys(foalBreedGeneticProfile.allowed_alleles) :
                           Object.keys(sireGenotype).filter(g => !['sooty', 'flaxen', 'pangare', 'rabicano'].includes(g));

    for (const gene of genesToInherit) {
        const sireAllelePair = sireGenotype[gene];
        const damAllelePair = damGenotype[gene];

        if (sireAllelePair === undefined || damAllelePair === undefined) {
            if (foalBreedGeneticProfile.allele_weights && foalBreedGeneticProfile.allele_weights[gene]) {
                 const randomPairFromFoalProfile = selectWeightedRandom(foalBreedGeneticProfile.allele_weights[gene]);
                 if (randomPairFromFoalProfile) {
                    foalGenotype[gene] = randomPairFromFoalProfile;
                    continue;
                 }
            }
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

            const allowedForFoal = foalBreedGeneticProfile.allowed_alleles[gene];
            if (allowedForFoal && !allowedForFoal.includes(foalAllelePair)) {
                foalAllelePair = null; 
                attempts++;
                continue;
            }

            if (foalBreedGeneticProfile.disallowed_combinations &&
                foalBreedGeneticProfile.disallowed_combinations[gene] &&
                foalBreedGeneticProfile.disallowed_combinations[gene].includes(foalAllelePair)) {
                foalAllelePair = null; 
                attempts++;
                continue;
            }
            break; 
        }

        if (foalAllelePair) {
            foalGenotype[gene] = foalAllelePair;
        } else {
            console.warn(`[GeneticsEngine] Failed to determine a valid allele pair for gene ${gene} for foal after ${MAX_ATTEMPTS} attempts. Assigning fallback.`);
            const allowedForFoal = foalBreedGeneticProfile.allowed_alleles[gene];
            if (allowedForFoal && allowedForFoal.length > 0) {
                let fallbackPair = allowedForFoal.find(p => ['n/n', 'w/w', 'e/e', 'a/a', 'g/g', 'rn/rn', 'lp/lp', 'to/to', 'nd2/nd2', 'patn1/patn1'].includes(p));
                if (!fallbackPair) fallbackPair = allowedForFoal[0]; 

                if (foalBreedGeneticProfile.disallowed_combinations &&
                    foalBreedGeneticProfile.disallowed_combinations[gene] &&
                    foalBreedGeneticProfile.disallowed_combinations[gene].includes(fallbackPair)) {
                    console.error(`[GeneticsEngine] CRITICAL: Fallback pair ${fallbackPair} for ${gene} is ALSO disallowed. Gene will be missing for foal. Review breed profile: ${foalBreedGeneticProfile.name}`);
                } else {
                    foalGenotype[gene] = fallbackPair;
                }
            } else {
                 console.error(`[GeneticsEngine] CRITICAL: No allowed alleles defined for ${gene} in foal's breed profile to select a fallback. Gene will be missing: ${foalBreedGeneticProfile.name}`);
            }
        }
    }

    const booleanModifiers = ['sooty', 'flaxen', 'pangare', 'rabicano']; 
    if (foalBreedGeneticProfile.boolean_modifiers_prevalence) {
        const definedModifiers = Object.keys(foalBreedGeneticProfile.boolean_modifiers_prevalence);
        definedModifiers.forEach(modifier => {
            if (!booleanModifiers.includes(modifier)) return; // Ensure we only process known/expected boolean modifiers

            const sireHasModifier = sireGenotype[modifier]; 
            const damHasModifier = damGenotype[modifier];   
            const prevalence = foalBreedGeneticProfile.boolean_modifiers_prevalence[modifier];

            if (sireHasModifier !== undefined && damHasModifier !== undefined) {
                if (sireHasModifier === true && damHasModifier === true) foalGenotype[modifier] = true;
                else if (sireHasModifier === false && damHasModifier === false) foalGenotype[modifier] = false;
                else foalGenotype[modifier] = (Math.random() < 0.5); // One true, one false: 50/50
            } else if (sireHasModifier !== undefined) {
                foalGenotype[modifier] = (Math.random() < 0.5) ? sireHasModifier : (Math.random() < (prevalence || 0));
            } else if (damHasModifier !== undefined) {
                foalGenotype[modifier] = (Math.random() < 0.5) ? damHasModifier : (Math.random() < (prevalence || 0));
            } else {
                if (typeof prevalence === 'number') {
                    foalGenotype[modifier] = (Math.random() < prevalence);
                } else {
                    foalGenotype[modifier] = false; 
                }
            }
        });
    }
    
    console.log("[GeneticsEngine] Calculated foal genotype:", foalGenotype);
    return foalGenotype;
}

module.exports = {
    generateStoreHorseGenetics,
    determinePhenotype,
    calculateFoalGenetics,
    selectWeightedRandom 
};
