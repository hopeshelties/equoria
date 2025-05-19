const {
  determinePhenotype,
  selectWeightedRandom,
} = require('../geneticsEngine');

// Mock selectWeightedRandom with a simpler default.
// Specific tests should provide their own mockImplementation as needed.
jest.mock('../geneticsEngine', () => {
  const originalModule = jest.requireActual('../geneticsEngine');
  return {
    ...originalModule,
    selectWeightedRandom: jest.fn((weightedItems) => {
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
      name: 'Test Breed',
      shade_bias: {
        Chestnut: { standard: 1 },
        Bay: { standard: 1 },
        Black: { standard: 1 },
        Palomino: { light: 0.5, standard: 0.5 },
        Buckskin: { standard: 1 },
        Grulla: { standard: 1 },
        'Red Roan': { standard: 1 },
        'Sooty Palomino Dun': { dark: 1 },
        'Light Dapple Gray': { standard: 1 }, // Example for a gray stage
        'Leopard Appaloosa': { standard: 1 },
        'Bay Tobiano': { standard: 1 },
        Default: { standard: 1 }, // Fallback shade
        Cremello: { standard: 1 },
        Perlino: { standard: 1 },
        'Smoky Cream': { standard: 1 },
        Dunalino: { standard: 1 },
        'Smoky Grulla': { standard: 1 },
        'Palomino Pearl': { copper: 0.5, standard: 0.5 },
      },
      marking_bias: {
        face: { none: 0.8, star: 0.1, blaze: 0.1 },
        legs_general_probability: 0.5, // 50% chance a leg has markings
        max_legs_marked: 4,
        leg_specific_probabilities: {
          // Probabilities for specific marking types if a leg is chosen to be marked
          none: 0.2,
          sock: 0.4,
          stocking: 0.4,
        },
      },
      advanced_markings_bias: {
        // For Appaloosa patterns
        snowflake_probability_multiplier: 1.0,
        frost_probability_multiplier: 1.0,
        bloody_shoulder_probability_multiplier: 0, // Disable for most tests unless specific
      },
      // Add other profile parts if needed by determinePhenotype, e.g., for specific W allele interpretation
    };
  });

  test('should determine Chestnut base color with no face markings', async () => {
    selectWeightedRandom.mockImplementation((items) => {
      if (items === mockBreedGeneticProfile.shade_bias.Chestnut)
        return 'standard';
      if (items === mockBreedGeneticProfile.marking_bias.face) return 'none';
      if (
        items ===
        mockBreedGeneticProfile.marking_bias.leg_specific_probabilities
      )
        return 'none';
      return 'default';
    });
    const genotype = { E_Extension: 'e/e', A_Agouti: 'a/a' };
    // Using a minimal mockBreedGeneticProfile as defined in the user's test for clarity
    const currentTestMockBreedProfile = {
      shade_bias: { Chestnut: { standard: 1 } },
      marking_bias: {
        face: { none: 1 },
        leg_specific_probabilities: { none: 1 },
      },
    };
    const { final_display_color, phenotypic_markings } =
      await determinePhenotype(genotype, currentTestMockBreedProfile, 3);
    expect(final_display_color).toBe('Chestnut');
    expect(phenotypic_markings.face).toBe('none');
  });

  test('should determine Bay base color', async () => {
    selectWeightedRandom.mockImplementation((items) => {
      if (items === mockBreedGeneticProfile.shade_bias.Bay) return 'standard';
      if (items === mockBreedGeneticProfile.marking_bias.face) return 'none';
      if (
        items ===
        mockBreedGeneticProfile.marking_bias.leg_specific_probabilities
      )
        return 'none';
      if (typeof items === 'object' && items !== null)
        return Object.keys(items)[0];
      return null;
    });
    const genotype = { E_Extension: 'E/e', A_Agouti: 'A/a' };
    const { final_display_color, determined_shade } = await determinePhenotype(
      genotype,
      mockBreedGeneticProfile,
      3
    );
    expect(final_display_color).toBe('Bay');
    expect(determined_shade).toBe('standard');
  });

  test('should determine Black base color', async () => {
    const genotype = { E_Extension: 'E/E', A_Agouti: 'a/a' };
    const { final_display_color, determined_shade } = await determinePhenotype(
      genotype,
      mockBreedGeneticProfile,
      3
    );
    expect(final_display_color).toBe('Black');
    expect(determined_shade).toBe('standard');
  });

  test('should determine Palomino with Light shade', async () => {
    selectWeightedRandom.mockImplementation((items) => {
      // Ensuring the mock specifically targets the Palomino shade object
      if (items === mockBreedGeneticProfile.shade_bias.Palomino) return 'light';
      if (items === mockBreedGeneticProfile.marking_bias.face) return 'none';
      if (
        items ===
        mockBreedGeneticProfile.marking_bias.leg_specific_probabilities
      )
        return 'none';
      return 'default';
    });
    const genotype = { E_Extension: 'e/e', A_Agouti: 'a/a', Cr_Cream: 'Cr/n' };
    // Using the globally defined mockBreedGeneticProfile for shade_bias.Palomino
    // but the test-specific mock for marking_bias from the user prompt.
    const currentTestMockBreedProfile = {
      ...mockBreedGeneticProfile, // Inherit general shade biases
      shade_bias: {
        // Ensure Palomino is correctly set up for this test's expectation
        ...mockBreedGeneticProfile.shade_bias,
        Palomino: { light: 0.5, standard: 0.5 },
      },
      marking_bias: {
        face: { none: 1 },
        leg_specific_probabilities: { none: 1 },
      },
    };
    const { final_display_color, phenotypic_markings } =
      await determinePhenotype(genotype, currentTestMockBreedProfile, 3);
    expect(final_display_color).toBe('Light Palomino');
    expect(phenotypic_markings.face).toBe('none');
  });

  test('should determine Buckskin (Bay + Cream)', async () => {
    selectWeightedRandom.mockImplementation((items) => {
      if (items === mockBreedGeneticProfile.shade_bias.Buckskin)
        return 'standard';
      if (items === mockBreedGeneticProfile.marking_bias.face) return 'none';
      if (
        items ===
        mockBreedGeneticProfile.marking_bias.leg_specific_probabilities
      )
        return 'none';
      if (typeof items === 'object' && items !== null)
        return Object.keys(items)[0];
      return null;
    });
    const genotype = { E_Extension: 'E/e', A_Agouti: 'A/A', Cr_Cream: 'Cr/n' };
    const { final_display_color, determined_shade } = await determinePhenotype(
      genotype,
      mockBreedGeneticProfile,
      3
    );
    expect(final_display_color).toBe('Buckskin');
    expect(determined_shade).toBe('standard');
  });

  test('should determine Grulla (Black + Dun)', async () => {
    selectWeightedRandom.mockImplementation((items) => {
      if (items === mockBreedGeneticProfile.shade_bias.Grulla)
        return 'standard';
      if (items === mockBreedGeneticProfile.marking_bias.face) return 'none';
      if (
        items ===
        mockBreedGeneticProfile.marking_bias.leg_specific_probabilities
      )
        return 'none';
      if (typeof items === 'object' && items !== null)
        return Object.keys(items)[0];
      return null;
    });
    const genotype = { E_Extension: 'E/e', A_Agouti: 'a/a', D_Dun: 'D/n' };
    const { final_display_color, determined_shade } = await determinePhenotype(
      genotype,
      mockBreedGeneticProfile,
      3
    );
    expect(final_display_color).toBe('Grulla');
    expect(determined_shade).toBe('standard');
  });

  test('should determine Red Roan on Chestnut', async () => {
    selectWeightedRandom.mockImplementation((items) => {
      if (items === mockBreedGeneticProfile.shade_bias['Red Roan'])
        return 'standard';
      if (items === mockBreedGeneticProfile.marking_bias.face) return 'none';
      if (
        items ===
        mockBreedGeneticProfile.marking_bias.leg_specific_probabilities
      )
        return 'none';
      if (typeof items === 'object' && items !== null)
        return Object.keys(items)[0];
      return null;
    });
    const genotype = { E_Extension: 'e/e', A_Agouti: 'a/a', Rn_Roan: 'Rn/n' };
    const { final_display_color, determined_shade } = await determinePhenotype(
      genotype,
      mockBreedGeneticProfile,
      3
    );
    expect(final_display_color).toBe('Red Roan');
    expect(determined_shade).toBe('standard');
  });

  test('should determine Sooty Palomino Dun', async () => {
    selectWeightedRandom.mockImplementation((items) => {
      if (items === mockBreedGeneticProfile.shade_bias['Sooty Palomino Dun'])
        return 'dark';
      if (items === mockBreedGeneticProfile.marking_bias.face) return 'none';
      if (
        items ===
        mockBreedGeneticProfile.marking_bias.leg_specific_probabilities
      )
        return 'none';
      if (typeof items === 'object' && items !== null)
        return Object.keys(items)[0];
      return null;
    });
    const genotype = {
      E_Extension: 'e/e',
      Cr_Cream: 'Cr/n',
      D_Dun: 'D/n',
      sooty: true,
    };
    const { final_display_color, determined_shade } = await determinePhenotype(
      genotype,
      mockBreedGeneticProfile,
      3
    );
    expect(final_display_color).toBe('Sooty Dark Palomino Dun');
    expect(determined_shade).toBe('dark');
  });

  test('should determine Gray at 8 years old (Light Dapple Gray stage)', async () => {
    selectWeightedRandom.mockImplementation((items) => {
      if (items === mockBreedGeneticProfile.shade_bias['Light Dapple Gray'])
        return 'standard';
      if (items === mockBreedGeneticProfile.marking_bias.face) return 'none';
      if (items === mockBreedGeneticProfile.marking_bia_specific_probabilities)
        return 'none';
      if (typeof items === 'object' && items !== null)
        return Object.keys(items)[0];
      return null;
    });
    const genotype = { E_Extension: 'E/e', A_Agouti: 'A/a', G_Gray: 'G/g' };
    const { final_display_color, determined_shade } = await determinePhenotype(
      genotype,
      mockBreedGeneticProfile,
      8
    );
    expect(final_display_color).toBe('Steel Light Dapple Gray');
    expect(determined_shade).toBe('standard');
  });

  test('should determine Leopard Appaloosa', async () => {
    const genotype = {
      E_Extension: 'e/e',
      A_Agouti: 'a/a',
      LP_LeopardComplex: 'LP/lp',
      PATN1_Pattern1: 'PATN1/n',
    };
    const { final_display_color, phenotypic_markings } =
      await determinePhenotype(genotype, mockBreedGeneticProfile, 5);
    expect(final_display_color).toBe('Chestnut Leopard Appaloosa');
    expect(phenotypic_markings.mottling).toBe(true);
    expect(phenotypic_markings.striping).toBe(true);
  });

  test('should determine Bay Tobiano', async () => {
    const genotype = {
      E_Extension: 'E/e',
      A_Agouti: 'A/A',
      TO_Tobiano: 'TO/to',
    };
    const { final_display_color } = await determinePhenotype(
      genotype,
      mockBreedGeneticProfile,
      3
    );
    expect(final_display_color).toBe('Bay Tobiano');
  });

  test('should handle Mushroom on Chestnut', async () => {
    mockBreedGeneticProfile.shade_bias['Mushroom Chestnut'] = { standard: 1 };
    const genotype = { E_Extension: 'e/e', MFSD12_Mushroom: 'Mu/Mu' };
    const { final_display_color } = await determinePhenotype(
      genotype,
      mockBreedGeneticProfile,
      3
    );
    expect(final_display_color).toBe('Mushroom Chestnut');
  });

  describe('Champagne Dilution Interaction Tests', () => {
    test('should handle Champagne on Black (Classic Champagne)', async () => {
      mockBreedGeneticProfile.shade_bias['Classic Champagne'] = { standard: 1 };
      selectWeightedRandom.mockImplementation((items) => {
        if (items === mockBreedGeneticProfile.shade_bias['Classic Champagne'])
          return 'standard';
        if (items === mockBreedGeneticProfile.marking_bias.face) return 'none';
        if (
          items ===
          mockBreedGeneticProfile.marking_bias.leg_specific_probabilities
        )
          return 'none';
        return Object.keys(items)[0];
      });
      const genotype = {
        E_Extension: 'E/E',
        A_Agouti: 'a/a',
        CH_Champagne: 'Ch/n',
      };
      const { final_display_color, determined_shade } =
        await determinePhenotype(genotype, mockBreedGeneticProfile, 3);
      expect(final_display_color).toBe('Classic Champagne');
      expect(determined_shade).toBe('standard');
    });

    test('should handle Champagne on Chestnut (Gold Champagne)', async () => {
      mockBreedGeneticProfile.shade_bias['Gold Champagne'] = { standard: 1 };
      selectWeightedRandom.mockImplementation((items) => {
        if (items === mockBreedGeneticProfile.shade_bias['Gold Champagne'])
          return 'standard';
        if (items === mockBreedGeneticProfile.marking_bias.face) return 'none';
        if (
          items ===
          mockBreedGeneticProfile.marking_bias.leg_specific_probabilities
        )
          return 'none';
        return Object.keys(items)[0];
      });
      const genotype = {
        E_Extension: 'e/e',
        A_Agouti: 'a/a',
        CH_Champagne: 'Ch/n',
      };
      const { final_display_color, determined_shade } =
        await determinePhenotype(genotype, mockBreedGeneticProfile, 3);
      expect(final_display_color).toBe('Gold Champagne');
      expect(determined_shade).toBe('standard');
    });

    test('should handle Champagne on Bay (Amber Champagne)', async () => {
      mockBreedGeneticProfile.shade_bias['Amber Champagne'] = { standard: 1 };
      selectWeightedRandom.mockImplementation((items) => {
        if (items === mockBreedGeneticProfile.shade_bias['Amber Champagne'])
          return 'standard';
        if (items === mockBreedGeneticProfile.marking_bias.face) return 'none';
        if (
          items ===
          mockBreedGeneticProfile.marking_bias.leg_specific_probabilities
        )
          return 'none';
        return Object.keys(items)[0];
      });
      const genotype = {
        E_Extension: 'E/e',
        A_Agouti: 'A/a',
        CH_Champagne: 'Ch/n',
      };
      const { final_display_color, determined_shade } =
        await determinePhenotype(genotype, mockBreedGeneticProfile, 3);
      expect(final_display_color).toBe('Amber Champagne');
      expect(determined_shade).toBe('standard');
    });

    // Champagne + Cream
    test('should handle Gold Cream (Chestnut + Cr/n Ch/n)', async () => {
      mockBreedGeneticProfile.shade_bias['Gold Cream Champagne'] = {
        standard: 1,
      };
      selectWeightedRandom.mockImplementation((items) => {
        if (
          items === mockBreedGeneticProfile.shade_bias['Gold Cream Champagne']
        )
          return 'standard';
        if (items === mockBreedGeneticProfile.marking_bias.face) return 'none';
        if (
          items ===
          mockBreedGeneticProfile.marking_bias.leg_specific_probabilities
        )
          return 'none';
        return Object.keys(items)[0];
      });
      const genotype = {
        E_Extension: 'e/e',
        A_Agouti: 'a/a',
        Cr_Cream: 'Cr/n',
        CH_Champagne: 'Ch/n',
      };
      const { final_display_color, determined_shade } =
        await determinePhenotype(genotype, mockBreedGeneticProfile, 3);
      expect(final_display_color).toBe('Gold Cream Champagne');
      expect(determined_shade).toBe('standard');
    });

    test('should handle Amber Cream (Bay + Cr/n Ch/n)', async () => {
      mockBreedGeneticProfile.shade_bias['Amber Cream Champagne'] = {
        standard: 1,
      };
      selectWeightedRandom.mockImplementation((items) => {
        if (
          items === mockBreedGeneticProfile.shade_bias['Amber Cream Champagne']
        )
          return 'standard';
        if (items === mockBreedGeneticProfile.marking_bias.face) return 'none';
        if (
          items ===
          mockBreedGeneticProfile.marking_bias.leg_specific_probabilities
        )
          return 'none';
        return Object.keys(items)[0];
      });
      const genotype = {
        E_Extension: 'E/e',
        A_Agouti: 'A/A',
        Cr_Cream: 'Cr/n',
        CH_Champagne: 'Ch/n',
      };
      const { final_display_color, determined_shade } =
        await determinePhenotype(genotype, mockBreedGeneticProfile, 3);
      expect(final_display_color).toBe('Amber Cream Champagne');
      expect(determined_shade).toBe('standard');
    });

    test('should handle Sable Cream (Black + Cr/n Ch/n)', async () => {
      mockBreedGeneticProfile.shade_bias['Classic Cream Champagne'] = {
        standard: 1,
      };
      selectWeightedRandom.mockImplementation((items) => {
        if (
          items ===
          mockBreedGeneticProfile.shade_bias['Classic Cream Champagne']
        )
          return 'standard';
        if (items === mockBreedGeneticProfile.marking_bias.face) return 'none';
        if (
          items ===
          mockBreedGeneticProfile.marking_bias.leg_specific_probabilities
        )
          return 'none';
        return Object.keys(items)[0];
      });
      const genotype = {
        E_Extension: 'E/E',
        A_Agouti: 'a/a',
        Cr_Cream: 'Cr/n',
        CH_Champagne: 'Ch/n',
      };
      const { final_display_color, determined_shade } =
        await determinePhenotype(genotype, mockBreedGeneticProfile, 3);
      expect(final_display_color).toBe('Classic Cream Champagne');
      expect(determined_shade).toBe('standard');
    });

    // Champagne + Dun
    test('should handle Gold Dun (Chestnut + D/n Ch/n)', async () => {
      mockBreedGeneticProfile.shade_bias['Gold Dun Champagne'] = {
        standard: 1,
      };
      selectWeightedRandom.mockImplementation((items) => {
        if (items === mockBreedGeneticProfile.shade_bias['Gold Dun Champagne'])
          return 'standard';
        if (items === mockBreedGeneticProfile.marking_bias.face) return 'none';
        if (
          items ===
          mockBreedGeneticProfile.marking_bias.leg_specific_probabilities
        )
          return 'none';
        return Object.keys(items)[0];
      });
      const genotype = {
        E_Extension: 'e/e',
        A_Agouti: 'a/a',
        D_Dun: 'D/n',
        CH_Champagne: 'Ch/n',
      };
      const { final_display_color, determined_shade } =
        await determinePhenotype(genotype, mockBreedGeneticProfile, 3);
      expect(final_display_color).toBe('Gold Dun Champagne');
      expect(determined_shade).toBe('standard');
    });

    test('should handle Amber Dun (Bay + D/n Ch/n)', async () => {
      mockBreedGeneticProfile.shade_bias['Amber Dun Champagne'] = {
        standard: 1,
      };
      selectWeightedRandom.mockImplementation((items) => {
        if (items === mockBreedGeneticProfile.shade_bias['Amber Dun Champagne'])
          return 'standard';
        if (items === mockBreedGeneticProfile.marking_bias.face) return 'none';
        if (
          items ===
          mockBreedGeneticProfile.marking_bias.leg_specific_probabilities
        )
          return 'none';
        return Object.keys(items)[0];
      });
      const genotype = {
        E_Extension: 'E/e',
        A_Agouti: 'A/A',
        D_Dun: 'D/n',
        CH_Champagne: 'Ch/n',
      };
      const { final_display_color, determined_shade } =
        await determinePhenotype(genotype, mockBreedGeneticProfile, 3);
      expect(final_display_color).toBe('Amber Dun Champagne');
      expect(determined_shade).toBe('standard');
    });

    test('should handle Classic Dun (Black + D/n Ch/n)', async () => {
      mockBreedGeneticProfile.shade_bias['Classic Dun Champagne'] = {
        standard: 1,
      };
      selectWeightedRandom.mockImplementation((items) => {
        if (
          items === mockBreedGeneticProfile.shade_bias['Classic Dun Champagne']
        )
          return 'standard';
        if (items === mockBreedGeneticProfile.marking_bias.face) return 'none';
        if (
          items ===
          mockBreedGeneticProfile.marking_bias.leg_specific_probabilities
        )
          return 'none';
        return Object.keys(items)[0];
      });
      const genotype = {
        E_Extension: 'E/E',
        A_Agouti: 'a/a',
        D_Dun: 'D/n',
        CH_Champagne: 'Ch/n',
      };
      const { final_display_color, determined_shade } =
        await determinePhenotype(genotype, mockBreedGeneticProfile, 3);
      expect(final_display_color).toBe('Classic Dun Champagne');
      expect(determined_shade).toBe('standard');
    });

    // Champagne + Cream + Dun
    test('should handle Gold Cream Dun (Chestnut + Cr/n D/n Ch/n)', async () => {
      mockBreedGeneticProfile.shade_bias['Gold Cream Dun Champagne'] = {
        standard: 1,
      };
      selectWeightedRandom.mockImplementation((items) => {
        if (
          items ===
          mockBreedGeneticProfile.shade_bias['Gold Cream Dun Champagne']
        )
          return 'standard';
        if (items === mockBreedGeneticProfile.marking_bias.face) return 'none';
        if (
          items ===
          mockBreedGeneticProfile.marking_bias.leg_specific_probabilities
        )
          return 'none';
        return Object.keys(items)[0];
      });
      const genotype = {
        E_Extension: 'e/e',
        A_Agouti: 'a/a',
        Cr_Cream: 'Cr/n',
        D_Dun: 'D/n',
        CH_Champagne: 'Ch/n',
      };
      const { final_display_color, determined_shade } =
        await determinePhenotype(genotype, mockBreedGeneticProfile, 3);
      expect(final_display_color).toBe('Gold Cream Dun Champagne');
      expect(determined_shade).toBe('standard');
    });

    test('should handle Amber Cream Dun (Bay + Cr/n D/n Ch/n)', async () => {
      mockBreedGeneticProfile.shade_bias['Amber Cream Dun Champagne'] = {
        standard: 1,
      };
      selectWeightedRandom.mockImplementation((items) => {
        if (
          items ===
          mockBreedGeneticProfile.shade_bias['Amber Cream Dun Champagne']
        )
          return 'standard';
        if (items === mockBreedGeneticProfile.marking_bias.face) return 'none';
        if (
          items ===
          mockBreedGeneticProfile.marking_bias.leg_specific_probabilities
        )
          return 'none';
        return Object.keys(items)[0];
      });
      const genotype = {
        E_Extension: 'E/e',
        A_Agouti: 'A/A',
        Cr_Cream: 'Cr/n',
        D_Dun: 'D/n',
        CH_Champagne: 'Ch/n',
      };
      const { final_display_color, determined_shade } =
        await determinePhenotype(genotype, mockBreedGeneticProfile, 3);
      expect(final_display_color).toBe('Amber Cream Dun Champagne');
      expect(determined_shade).toBe('standard');
    });

    test('should handle Sable Cream Dun (Black + Cr/n D/n Ch/n)', async () => {
      mockBreedGeneticProfile.shade_bias['Classic Cream Dun Champagne'] = {
        standard: 1,
      };
      selectWeightedRandom.mockImplementation((items) => {
        if (
          items ===
          mockBreedGeneticProfile.shade_bias['Classic Cream Dun Champagne']
        )
          return 'standard';
        if (items === mockBreedGeneticProfile.marking_bias.face) return 'none';
        if (
          items ===
          mockBreedGeneticProfile.marking_bias.leg_specific_probabilities
        )
          return 'none';
        return Object.keys(items)[0];
      });
      const genotype = {
        E_Extension: 'E/E',
        A_Agouti: 'a/a',
        Cr_Cream: 'Cr/n',
        D_Dun: 'D/n',
        CH_Champagne: 'Ch/n',
      };
      const { final_display_color, determined_shade } =
        await determinePhenotype(genotype, mockBreedGeneticProfile, 3);
      expect(final_display_color).toBe('Classic Cream Dun Champagne');
      expect(determined_shade).toBe('standard');
    });
  });

  test('should handle Silver on Bay (Silver Bay)', async () => {
    mockBreedGeneticProfile.shade_bias['Silver Bay'] = { standard: 1 };
    const genotype = { E_Extension: 'E/e', A_Agouti: 'A/A', Z_Silver: 'Z/n' };
    const { final_display_color } = await determinePhenotype(
      genotype,
      mockBreedGeneticProfile,
      3
    );
    expect(final_display_color).toBe('Silver Bay');
  });

  test('should handle Pearl on Chestnut (Apricot)', async () => {
    mockBreedGeneticProfile.shade_bias['Apricot'] = { standard: 1 };
    const genotype = { E_Extension: 'e/e', PRL_Pearl: 'prl/prl' };
    const { final_display_color } = await determinePhenotype(
      genotype,
      mockBreedGeneticProfile,
      3
    );
    expect(final_display_color).toBe('Apricot');
  });

  test('should correctly identify Dominant White (W13 all white)', async () => {
    mockBreedGeneticProfile.shade_bias['Dominant White'] = { standard: 1 };
    const genotype = {
      E_Extension: 'e/e',
      A_Agouti: 'a/a',
      W_DominantWhite: 'W13/w',
    };
    const { final_display_color, determined_shade } = await determinePhenotype(
      genotype,
      mockBreedGeneticProfile,
      3
    );
    expect(final_display_color).toBe('White');
    expect(determined_shade).toBe('standard');
  });

  // --- Double Cream Dilutions ---
  test('should determine Cremello (Chestnut + Double Cream)', async () => {
    selectWeightedRandom.mockImplementation((items) => {
      if (
        typeof items === 'object' &&
        items !== null &&
        items.standard !== undefined
      ) {
        if (
          mockBreedGeneticProfile.shade_bias.Cremello &&
          items.standard ===
            mockBreedGeneticProfile.shade_bias.Cremello.standard
        )
          return 'standard';
      }
      if (items === mockBreedGeneticProfile.marking_bias.face) return 'none';
      if (
        items ===
        mockBreedGeneticProfile.marking_bias.leg_specific_probabilities
      )
        return 'none';
      if (typeof items === 'object' && items !== null)
        return Object.keys(items)[0];
      return null;
    });
    mockBreedGeneticProfile.shade_bias['Cremello'] = { standard: 1 };
    const genotype = { E_Extension: 'e/e', A_Agouti: 'a/a', Cr_Cream: 'Cr/Cr' };
    const { final_display_color, determined_shade } = await determinePhenotype(
      genotype,
      mockBreedGeneticProfile,
      3
    );
    expect(final_display_color).toBe('Cremello');
    expect(determined_shade).toBe('standard');
  });

  test('should determine Perlino (Bay + Double Cream)', async () => {
    selectWeightedRandom.mockImplementation((items) => {
      if (
        typeof items === 'object' &&
        items !== null &&
        items.standard !== undefined
      ) {
        if (
          mockBreedGeneticProfile.shade_bias.Perlino &&
          items.standard === mockBreedGeneticProfile.shade_bias.Perlino.standard
        )
          return 'standard';
      }
      if (items === mockBreedGeneticProfile.marking_bias.face) return 'none';
      if (
        items ===
        mockBreedGeneticProfile.marking_bias.leg_specific_probabilities
      )
        return 'none';
      if (typeof items === 'object' && items !== null)
        return Object.keys(items)[0];
      return null;
    });
    mockBreedGeneticProfile.shade_bias['Perlino'] = { standard: 1 };
    const genotype = { E_Extension: 'E/e', A_Agouti: 'A/A', Cr_Cream: 'Cr/Cr' };
    const { final_display_color, determined_shade } = await determinePhenotype(
      genotype,
      mockBreedGeneticProfile,
      3
    );
    expect(final_display_color).toBe('Perlino');
    expect(determined_shade).toBe('standard');
  });

  test('should determine Smoky Cream (Black + Double Cream)', async () => {
    selectWeightedRandom.mockImplementation((items) => {
      if (
        typeof items === 'object' &&
        items !== null &&
        items.standard !== undefined
      ) {
        if (
          mockBreedGeneticProfile.shade_bias['Smoky Cream'] &&
          items.standard ===
            mockBreedGeneticProfile.shade_bias['Smoky Cream'].standard
        )
          return 'standard';
      }
      if (items === mockBreedGeneticProfile.marking_bias.face) return 'none';
      if (
        items ===
        mockBreedGeneticProfile.marking_bias.leg_specific_probabilities
      )
        return 'none';
      if (typeof items === 'object' && items !== null)
        return Object.keys(items)[0];
      return null;
    });
    mockBreedGeneticProfile.shade_bias['Smoky Cream'] = { standard: 1 };
    const genotype = { E_Extension: 'E/E', A_Agouti: 'a/a', Cr_Cream: 'Cr/Cr' };
    const { final_display_color, determined_shade } = await determinePhenotype(
      genotype,
      mockBreedGeneticProfile,
      3
    );
    expect(final_display_color).toBe('Smoky Cream');
    expect(determined_shade).toBe('standard');
  });

  // --- Dun + Cream Interactions ---
  test('should determine Dunalino (Chestnut + Cream + Dun)', async () => {
    selectWeightedRandom.mockImplementation((items) => {
      if (items === mockBreedGeneticProfile.shade_bias.Dunalino)
        return 'standard';
      if (items === mockBreedGeneticProfile.marking_bias.face) return 'none';
      if (
        items ===
        mockBreedGeneticProfile.marking_bias.leg_specific_probabilities
      )
        return 'none';
      if (typeof items === 'object' && items !== null)
        return Object.keys(items)[0];
      return null;
    });
    const genotype = {
      E_Extension: 'e/e',
      A_Agouti: 'a/a',
      Cr_Cream: 'Cr/n',
      D_Dun: 'D/n',
    };
    const { final_display_color, determined_shade } = await determinePhenotype(
      genotype,
      mockBreedGeneticProfile,
      3
    );
    expect(final_display_color).toBe('Palomino Dun');
    expect(determined_shade).toBe('standard');
  });

  test('should determine Dunskin (Bay + Cream + Dun)', async () => {
    selectWeightedRandom.mockImplementation((items) => {
      if (
        typeof items === 'object' &&
        items !== null &&
        items.standard !== undefined
      ) {
        if (
          mockBreedGeneticProfile.shade_bias['Buckskin Dun'] &&
          items.standard ===
            mockBreedGeneticProfile.shade_bias['Buckskin Dun'].standard
        )
          return 'standard';
      }
      if (items === mockBreedGeneticProfile.marking_bias.face) return 'none';
      if (
        items ===
        mockBreedGeneticProfile.marking_bias.leg_specific_probabilities
      )
        return 'none';
      if (typeof items === 'object' && items !== null)
        return Object.keys(items)[0];
      return null;
    });
    const genotype = {
      E_Extension: 'E/e',
      A_Agouti: 'A/A',
      Cr_Cream: 'Cr/n',
      D_Dun: 'D/n',
    };
    const { final_display_color, determined_shade } = await determinePhenotype(
      genotype,
      mockBreedGeneticProfile,
      3
    );
    expect(final_display_color).toBe('Buckskin Dun');
    expect(determined_shade).toBe('standard');
  });

  test('should determine Smoky Grulla (Black + Cream + Dun)', async () => {
    selectWeightedRandom.mockImplementation((items) => {
      if (items === mockBreedGeneticProfile.shade_bias['Smoky Grulla'])
        return 'standard';
      if (items === mockBreedGeneticProfile.marking_bias.face) return 'none';
      if (
        items ===
        mockBreedGeneticProfile.marking_bias.leg_specific_probabilities
      )
        return 'none';
      if (typeof items === 'object' && items !== null)
        return Object.keys(items)[0];
      return null;
    });
    const genotype = {
      E_Extension: 'E/E',
      A_Agouti: 'a/a',
      Cr_Cream: 'Cr/n',
      D_Dun: 'D/n',
    };
    const { final_display_color, determined_shade } = await determinePhenotype(
      genotype,
      mockBreedGeneticProfile,
      3
    );
    expect(final_display_color).toBe('Grulla');
    expect(determined_shade).toBe('standard');
  });

  test('should determine Palomino Pearl with Copper shade for Chestnut + Cream + Pearl', async () => {
    selectWeightedRandom.mockImplementation((items) => {
      if (items === mockBreedGeneticProfile.shade_bias['Palomino Pearl'])
        return 'copper';
      if (items === mockBreedGeneticProfile.marking_bias.face) return 'none';
      if (
        items ===
        mockBreedGeneticProfile.marking_bias.leg_specific_probabilities
      )
        return 'none';
      return 'default';
    });
    const genotype = {
      E_Extension: 'e/e',
      Cr_Cream: 'n/Cr',
      Prl_Pearl: 'prl/n',
    };
    const mockBreedGeneticProfile = {
      shade_bias: { 'Palomino Pearl': { copper: 0.5, standard: 0.5 } },
      marking_bias: {
        face: { none: 1 },
        leg_specific_probabilities: { none: 1 },
      },
    };
    const { final_display_color, phenotypic_markings } =
      await determinePhenotype(genotype, mockBreedGeneticProfile, 3);
    expect(final_display_color).toBe('Copper Palomino Pearl');
    expect(phenotypic_markings.face).toBe('none');
  });

  // Add more tests here for:
  // - Double dilutions (Cremello, Perlino, Smoky Cream)
  // - Interactions between different dilutions (e.g. Dun + Cream = Dunalino/Dunskin)
  // - Champagne interactions with Cream, Dun
  // - Silver on Black
  // - Pearl interactions with Cream
  // - All white patterns: Frame, Sabino, Splash variations, other Dominant White alleles (W20)
  // - Appaloosa: LP/LP (Fewspot/Snowcap), LP/lp without PATN1 (Snowflake/Frost based on age)
  // - Gray over various patterns (Appaloosa, Roan, Tobiano)
  // - Complex combinations (e.g. Sooty Buckskin Dun Roan with Tobiano)
  // - Boolean modifiers like Pangare, Rabicano in various contexts
  // - Edge cases: undefined genes, missing profiles etc. (though the function might assume valid inputs mostly)
});
