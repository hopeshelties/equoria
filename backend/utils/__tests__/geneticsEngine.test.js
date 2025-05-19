const { determinePhenotype, selectWeightedRandom } = require('../geneticsEngine');

// Mock selectWeightedRandom with a simpler default.
// Specific tests should provide their own mockImplementation as needed.
jest.mock('../geneticsEngine', () => {
    const originalModule = jest.requireActual('../geneticsEngine');
    return {
        ...originalModule,
        selectWeightedRandom: jest.fn(weightedItems => {
            if (weightedItems && typeof weightedItems === 'object') {
                const keys = Object.keys(weightedItems);
                // Default behavior: return the first key. Crucial tests must override.
                return keys.length > 0 ? keys[0] : null;
            }
            return null;
        }),
    };
});

describe('determinePhenotype', () => {
    let mockBreedGeneticProfile;

    beforeEach(() => {
        // Reset the mock call history before each test
        selectWeightedRandom.mockClear();
        // DO NOT add a generic selectWeightedRandom.mockImplementation here.
        // Tests that depend on specific outcomes of selectWeightedRandom
        // must provide their own implementation.

        mockBreedGeneticProfile = {
            name: "Test Breed",
            shade_bias: {
                'Chestnut': { 'standard': 1 },
                'Bay': { 'standard': 1 },
                'Black': { 'standard': 1 },
                'Palomino': { 'light': 0.5, 'standard': 0.5 },
                'Buckskin': { 'standard': 1 },
                'Grulla': { 'standard': 1 },
                'Red Roan': { 'standard': 1 },
                'Sooty Palomino Dun': { 'dark': 1},
                'Light Dapple Gray': { 'standard': 1 }, // Example for a gray stage
                'Leopard Appaloosa': { 'standard': 1},
                'Bay Tobiano': { 'standard': 1},
                'Default': { 'standard': 1 }, // Fallback shade
                'Cremello': { 'standard': 1 },
                'Perlino': { 'standard': 1 },
                'Smoky Cream': { 'standard': 1 },
                'Dunalino': { 'standard': 1 },
                'Buckskin Dun': { 'standard': 1 },
                'Smoky Grulla': { 'standard': 1 }
            },
            marking_bias: {
                face: { 'none': 0.8, 'star': 0.1, 'blaze': 0.1 },
                legs_general_probability: 0.5, // 50% chance a leg has markings
                max_legs_marked: 4,
                leg_specific_probabilities: { // Probabilities for specific marking types if a leg is chosen to be marked
                    'none': 0.2, 
                    'sock': 0.4,
                    'stocking': 0.4
                }
            },
            advanced_markings_bias: { // For Appaloosa patterns
                snowflake_probability_multiplier: 1.0,
                frost_probability_multiplier: 1.0,
                bloody_shoulder_probability_multiplier: 0 // Disable for most tests unless specific
            }
            // Add other profile parts if needed by determinePhenotype, e.g., for specific W allele interpretation
        };
    });

    test('should determine Chestnut base color', async () => {
        selectWeightedRandom.mockImplementation(items => {
            if (items === mockBreedGeneticProfile.shade_bias.Chestnut) return 'standard';
            if (typeof items === 'object' && items !== null && items.star !== undefined && items.blaze !== undefined) return 'none';
            if (items === mockBreedGeneticProfile.marking_bias.leg_specific_probabilities) return 'none';
            // Fallback for any other call to selectWeightedRandom within this test
            if (typeof items === 'object' && items !== null) return Object.keys(items)[0]; 
            return null;
        });
        const genotype = { E_Extension: 'e/e', A_Agouti: 'a/a' };
        const { final_display_color, phenotypic_markings, determined_shade } = await determinePhenotype(genotype, mockBreedGeneticProfile, 3);
        expect(final_display_color).toBe('Chestnut');
        expect(determined_shade).toBe('standard');
        expect(phenotypic_markings.face).toBe('none');
    });

    test('should determine Bay base color', async () => {
        selectWeightedRandom.mockImplementation(items => {
            if (items === mockBreedGeneticProfile.shade_bias.Bay) return 'standard';
            if (items === mockBreedGeneticProfile.marking_bias.face) return 'none';
            if (items === mockBreedGeneticProfile.marking_bias.leg_specific_probabilities) return 'none';
            if (typeof items === 'object' && items !== null) return Object.keys(items)[0];
            return null;
        });
        const genotype = { E_Extension: 'E/e', A_Agouti: 'A/a' };
        const { final_display_color, determined_shade } = await determinePhenotype(genotype, mockBreedGeneticProfile, 3);
        expect(final_display_color).toBe('Bay');
        expect(determined_shade).toBe('standard');
    });

    test('should determine Black base color', async () => {
        const genotype = { E_Extension: 'E/E', A_Agouti: 'a/a' };
        const { final_display_color, determined_shade } = await determinePhenotype(genotype, mockBreedGeneticProfile, 3);
        expect(final_display_color).toBe('Black');
        expect(determined_shade).toBe('standard');
    });

    test('should determine Palomino (Chestnut + Cream)', async () => {
        selectWeightedRandom.mockImplementation(items => {
            if (typeof items === 'object' && items !== null && items.light !== undefined && items.standard !== undefined) return 'light';
            if (items === mockBreedGeneticProfile.marking_bias.face) return 'none';
            if (items === mockBreedGeneticProfile.marking_bias.leg_specific_probabilities) return 'none';
            if (typeof items === 'object' && items !== null) return Object.keys(items)[0];
            return null;
        });
        const genotype = { E_Extension: 'e/e', A_Agouti: 'a/a', Cr_Cream: 'Cr/n' };
        const { final_display_color, determined_shade } = await determinePhenotype(genotype, mockBreedGeneticProfile, 3);
        expect(final_display_color).toBe('Light Palomino');
        expect(determined_shade).toBe('light');
    });

    test('should determine Buckskin (Bay + Cream)', async () => {
        selectWeightedRandom.mockImplementation(items => {
            if (items === mockBreedGeneticProfile.shade_bias.Buckskin) return 'standard';
            if (items === mockBreedGeneticProfile.marking_bias.face) return 'none';
            if (items === mockBreedGeneticProfile.marking_bias.leg_specific_probabilities) return 'none';
            if (typeof items === 'object' && items !== null) return Object.keys(items)[0];
            return null;
        });
        const genotype = { E_Extension: 'E/e', A_Agouti: 'A/A', Cr_Cream: 'Cr/n' };
        const { final_display_color, determined_shade } = await determinePhenotype(genotype, mockBreedGeneticProfile, 3);
        expect(final_display_color).toBe('Buckskin');
        expect(determined_shade).toBe('standard');
    });
    
    test('should determine Grulla (Black + Dun)', async () => {
        selectWeightedRandom.mockImplementation(items => {
            if (items === mockBreedGeneticProfile.shade_bias.Grulla) return 'standard';
            if (items === mockBreedGeneticProfile.marking_bias.face) return 'none';
            if (items === mockBreedGeneticProfile.marking_bias.leg_specific_probabilities) return 'none';
            if (typeof items === 'object' && items !== null) return Object.keys(items)[0];
            return null;
        });
        const genotype = { E_Extension: 'E/e', A_Agouti: 'a/a', D_Dun: 'D/n' };
        const { final_display_color, determined_shade } = await determinePhenotype(genotype, mockBreedGeneticProfile, 3);
        expect(final_display_color).toBe('Grulla');
        expect(determined_shade).toBe('standard');
    });

    test('should determine Red Roan on Chestnut', async () => {
        selectWeightedRandom.mockImplementation(items => {
            if (items === mockBreedGeneticProfile.shade_bias['Red Roan']) return 'standard';
            if (items === mockBreedGeneticProfile.marking_bias.face) return 'none';
            if (items === mockBreedGeneticProfile.marking_bias.leg_specific_probabilities) return 'none';
            if (typeof items === 'object' && items !== null) return Object.keys(items)[0];
            return null;
        });
        const genotype = { E_Extension: 'e/e', A_Agouti: 'a/a', Rn_Roan: 'Rn/n' };
        const { final_display_color, determined_shade } = await determinePhenotype(genotype, mockBreedGeneticProfile, 3);
        expect(final_display_color).toBe('Red Roan');
        expect(determined_shade).toBe('standard');
    });

    test('should determine Sooty Palomino Dun', async () => {
        selectWeightedRandom.mockImplementation(items => {
            if (items === mockBreedGeneticProfile.shade_bias['Sooty Palomino Dun']) return 'dark';
            if (items === mockBreedGeneticProfile.marking_bias.face) return 'none';
            if (items === mockBreedGeneticProfile.marking_bias.leg_specific_probabilities) return 'none';
            if (typeof items === 'object' && items !== null) return Object.keys(items)[0];
            return null;
        });
        const genotype = { E_Extension: 'e/e', Cr_Cream: 'Cr/n', D_Dun: 'D/n', sooty: true };
        const { final_display_color, determined_shade } = await determinePhenotype(genotype, mockBreedGeneticProfile, 3);
        expect(final_display_color).toBe('Dark Sooty Palomino Dun');
        expect(determined_shade).toBe('dark');
    });
    
    test('should determine Gray at 8 years old (Light Dapple Gray stage)', async () => {
        selectWeightedRandom.mockImplementation(items => {
            if (items === mockBreedGeneticProfile.shade_bias['Light Dapple Gray']) return 'standard';
            if (items === mockBreedGeneticProfile.marking_bias.face) return 'none';
            if (items === mockBreedGeneticProfile.marking_bia_specific_probabilities) return 'none'; // Typo fixed: leg_specific_probabilities
            if (typeof items === 'object' && items !== null) return Object.keys(items)[0];
            return null;
        });
        const genotype = { E_Extension: 'E/e', A_Agouti: 'A/a', G_Gray: 'G/g' }; // Bay base
        const { final_display_color, determined_shade } = await determinePhenotype(genotype, mockBreedGeneticProfile, 8); // 8 years old
        expect(final_display_color).toBe('Steel Light Dapple Gray'); // Bay based gray at this age
        expect(determined_shade).toBe('standard');
    });

    test('should determine Leopard Appaloosa', async () => {
        const genotype = { E_Extension: 'e/e', A_Agouti: 'a/a', LP_LeopardComplex: 'LP/lp', PATN1_Pattern1: 'PATN1/n' };
        const { final_display_color, phenotypic_markings } = await determinePhenotype(genotype, mockBreedGeneticProfile, 5);
        expect(final_display_color).toBe('Chestnut Leopard Appaloosa'); // Base color + LP pattern
        expect(phenotypic_markings.mottling).toBe(true);
        expect(phenotypic_markings.striping).toBe(true);
    });
    
    test('should determine Bay Tobiano', async () => {
        const genotype = { E_Extension: 'E/e', A_Agouti: 'A/A', TO_Tobiano: 'TO/to' };
        const { final_display_color } = await determinePhenotype(genotype, mockBreedGeneticProfile, 3);
        expect(final_display_color).toBe('Bay Tobiano');
    });

    test('should handle Mushroom on Chestnut', async () => {
        mockBreedGeneticProfile.shade_bias['Mushroom'] = { 'standard': 1 };
        const genotype = { E_Extension: 'e/e', MFSD12_Mushroom: 'Mu/Mu' };
        const { final_display_color } = await determinePhenotype(genotype, mockBreedGeneticProfile, 3);
        expect(final_display_color).toBe('Mushroom Chestnut');
    });

    test('should handle Champagne on Black (Classic Champagne)', async () => {
        mockBreedGeneticProfile.shade_bias['Classic Champagne'] = { 'standard': 1 };
        const genotype = { E_Extension: 'E/E', A_Agouti: 'a/a', CH_Champagne: 'Ch/n' };
        const { final_display_color } = await determinePhenotype(genotype, mockBreedGeneticProfile, 3);
        expect(final_display_color).toBe('Classic Champagne');
    });

    test('should handle Silver on Bay (Silver Bay)', async () => {
        mockBreedGeneticProfile.shade_bias['Silver Bay'] = { 'standard': 1 };
        const genotype = { E_Extension: 'E/e', A_Agouti: 'A/A', Z_Silver: 'Z/n' };
        const { final_display_color } = await determinePhenotype(genotype, mockBreedGeneticProfile, 3);
        expect(final_display_color).toBe('Silver Bay');
    });
    
    test('should handle Pearl on Chestnut (Apricot)', async () => {
        mockBreedGeneticProfile.shade_bias['Apricot'] = { 'standard': 1 };
        const genotype = { E_Extension: 'e/e', PRL_Pearl: 'prl/prl' };
        const { final_display_color } = await determinePhenotype(genotype, mockBreedGeneticProfile, 3);
        expect(final_display_color).toBe('Apricot');
    });

    test('should correctly identify Dominant White (W13 all white)', async () => {
        mockBreedGeneticProfile.shade_bias['Dominant White'] = { 'standard': 1 };
        const genotype = { E_Extension: 'e/e', A_Agouti: 'a/a', W_DominantWhite: 'W13/w' };
        const { final_display_color, determined_shade } = await determinePhenotype(genotype, mockBreedGeneticProfile, 3);
        expect(final_display_color).toBe('White');
        expect(determined_shade).toBe('standard'); // Shade key "Dominant White" yields "standard" shade.
    });

    // --- Double Cream Dilutions ---
    test('should determine Cremello (Chestnut + Double Cream)', async () => {
        selectWeightedRandom.mockImplementation(items => {
            // Check for a key characteristic of the Cremello shade bias object
            if (typeof items === 'object' && items !== null && items.standard !== undefined) { 
                // Further check if it's indeed the Cremello one if multiple 'standard' shades exist
                if (mockBreedGeneticProfile.shade_bias.Cremello && items.standard === mockBreedGeneticProfile.shade_bias.Cremello.standard) return 'standard';
            }
            if (items === mockBreedGeneticProfile.marking_bias.face) return 'none';
            if (items === mockBreedGeneticProfile.marking_bias.leg_specific_probabilities) return 'none';
            // Fallback for any other call to selectWeightedRandom within this test
            if (typeof items === 'object' && items !== null) return Object.keys(items)[0]; 
            return null;
        });
        mockBreedGeneticProfile.shade_bias['Cremello'] = { 'standard': 1 }; // Ensure shade bias exists in profile for the test
        const genotype = { E_Extension: 'e/e', A_Agouti: 'a/a', Cr_Cream: 'Cr/Cr' };
        const { final_display_color, determined_shade } = await determinePhenotype(genotype, mockBreedGeneticProfile, 3);
        expect(final_display_color).toBe('Cremello');
        expect(determined_shade).toBe('standard');
    });

    test('should determine Perlino (Bay + Double Cream)', async () => {
        selectWeightedRandom.mockImplementation(items => {
            if (typeof items === 'object' && items !== null && items.standard !== undefined) {
                if (mockBreedGeneticProfile.shade_bias.Perlino && items.standard === mockBreedGeneticProfile.shade_bias.Perlino.standard) return 'standard';
            }
            if (items === mockBreedGeneticProfile.marking_bias.face) return 'none';
            if (items === mockBreedGeneticProfile.marking_bias.leg_specific_probabilities) return 'none';
            if (typeof items === 'object' && items !== null) return Object.keys(items)[0];
            return null;
        });
        mockBreedGeneticProfile.shade_bias['Perlino'] = { 'standard': 1 };
        const genotype = { E_Extension: 'E/e', A_Agouti: 'A/A', Cr_Cream: 'Cr/Cr' };
        const { final_display_color, determined_shade } = await determinePhenotype(genotype, mockBreedGeneticProfile, 3);
        expect(final_display_color).toBe('Perlino');
        expect(determined_shade).toBe('standard');
    });

    test('should determine Smoky Cream (Black + Double Cream)', async () => {
        selectWeightedRandom.mockImplementation(items => {
            if (typeof items === 'object' && items !== null && items.standard !== undefined) {
                if (mockBreedGeneticProfile.shade_bias['Smoky Cream'] && items.standard === mockBreedGeneticProfile.shade_bias['Smoky Cream'].standard) return 'standard';
            }
            if (items === mockBreedGeneticProfile.marking_bias.face) return 'none';
            if (items === mockBreedGeneticProfile.marking_bias.leg_specific_probabilities) return 'none';
            if (typeof items === 'object' && items !== null) return Object.keys(items)[0];
            return null;
        });
        mockBreedGeneticProfile.shade_bias['Smoky Cream'] = { 'standard': 1 };
        const genotype = { E_Extension: 'E/E', A_Agouti: 'a/a', Cr_Cream: 'Cr/Cr' };
        const { final_display_color, determined_shade } = await determinePhenotype(genotype, mockBreedGeneticProfile, 3);
        expect(final_display_color).toBe('Smoky Cream');
        expect(determined_shade).toBe('standard');
    });

    // --- Dun + Cream Interactions ---
    test('should determine Dunalino (Chestnut + Cream + Dun)', async () => {
        selectWeightedRandom.mockImplementation(items => {
            if (typeof items === 'object' && items !== null && items.standard !== undefined) {
                 // Check if items is the shade_bias for Dunalino
                if (mockBreedGeneticProfile.shade_bias.Dunalino && items.standard === mockBreedGeneticProfile.shade_bias.Dunalino.standard) return 'standard';
            }
            if (items === mockBreedGeneticProfile.marking_bias.face) return 'none';
            if (items === mockBreedGeneticProfile.marking_bias.leg_specific_probabilities) return 'none';
            if (typeof items === 'object' && items !== null) return Object.keys(items)[0];
            return null;
        });
        const genotype = { E_Extension: 'e/e', A_Agouti: 'a/a', Cr_Cream: 'Cr/n', D_Dun: 'D/n' };
        const { final_display_color, determined_shade } = await determinePhenotype(genotype, mockBreedGeneticProfile, 3);
        expect(final_display_color).toBe('Dunalino'); // Or 'Red Dunskin', 'Palomino Dun' depending on naming convention
        expect(determined_shade).toBe('standard');
    });

    test('should determine Dunskin (Bay + Cream + Dun)', async () => {
        selectWeightedRandom.mockImplementation(items => {
            if (typeof items === 'object' && items !== null && items.standard !== undefined) {
                // Check if items is the shade_bias for Buckskin Dun (as Dunskin is often called Buckskin Dun)
                if (mockBreedGeneticProfile.shade_bias['Buckskin Dun'] && items.standard === mockBreedGeneticProfile.shade_bias['Buckskin Dun'].standard) return 'standard';
            }
            if (items === mockBreedGeneticProfile.marking_bias.face) return 'none';
            if (items === mockBreedGeneticProfile.marking_bias.leg_specific_probabilities) return 'none';
            if (typeof items === 'object' && items !== null) return Object.keys(items)[0];
            return null;
        });
        const genotype = { E_Extension: 'E/e', A_Agouti: 'A/A', Cr_Cream: 'Cr/n', D_Dun: 'D/n' };
        const { final_display_color, determined_shade } = await determinePhenotype(genotype, mockBreedGeneticProfile, 3);
        expect(final_display_color).toBe('Buckskin Dun'); // Common name for this combination
        expect(determined_shade).toBe('standard');
    });

    test('should determine Smoky Grulla (Black + Cream + Dun)', async () => {
        selectWeightedRandom.mockImplementation(items => {
            if (typeof items === 'object' && items !== null && items.standard !== undefined) {
                 // Check if items is the shade_bias for Smoky Grulla
                if (mockBreedGeneticProfile.shade_bias['Smoky Grulla'] && items.standard === mockBreedGeneticProfile.shade_bias['Smoky Grulla'].standard) return 'standard';
            }
            if (items === mockBreedGeneticProfile.marking_bias.face) return 'none';
            if (items === mockBreedGeneticProfile.marking_bias.leg_specific_probabilities) return 'none';
            if (typeof items === 'object' && items !== null) return Object.keys(items)[0];
            return null;
        });
        const genotype = { E_Extension: 'E/E', A_Agouti: 'a/a', Cr_Cream: 'Cr/n', D_Dun: 'D/n' };
        const { final_display_color, determined_shade } = await determinePhenotype(genotype, mockBreedGeneticProfile, 3);
        expect(final_display_color).toBe('Smoky Grulla'); // Or Smoky Black Dun
        expect(determined_shade).toBe('standard');
    });

    // Add more tests here for:
    // - Double dilutions (Cremello, Perlino, Smoky Cream)
    // - Interactions between different dilutions (e.g., Dun + Cream = Dunalino/Dunskin)
    // - Champagne interactions with Cream, Dun
    // - Silver on Black
    // - Pearl interactions with Cream
    // - All white patterns: Frame, Sabino, Splash variations, other Dominant White alleles (W20)
    // - Appaloosa: LP/LP (Fewspot/Snowcap), LP/lp without PATN1 (Snowflake/Frost based on age)
    // - Gray over various patterns (Appaloosa, Roan, Tobiano)
    // - Complex combinations (e.g., Sooty Buckskin Dun Roan with Tobiano)
    // - Boolean modifiers like Pangare, Rabicano in various contexts
    // - Edge cases: undefined genes, missing profiles etc. (though the function might assume valid inputs mostly)
}); 