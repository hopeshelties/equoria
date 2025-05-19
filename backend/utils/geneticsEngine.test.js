const { determinePhenotype, selectWeightedRandom } = require('./geneticsEngine');

describe('determinePhenotype - Champagne Dilution Tests', () => {
  const mockBreedProfile = {
    shade_bias: {
      'Gold Champagne': { standard: 1 },
      'Amber Champagne': { standard: 1 },
      'Classic Champagne': { standard: 1 },
      'Gold Cream Champagne': { standard: 1 },
      'Amber Cream Champagne': { standard: 1 },
      'Classic Cream Champagne': { standard: 1 },
      'Gold Dun Champagne': { standard: 1 },
      'Amber Dun Champagne': { standard: 1 },
      'Classic Dun Champagne': { standard: 1 },
      'Gold Cream Dun Champagne': { standard: 1 },
      'Amber Cream Dun Champagne': { standard: 1 },
      'Classic Cream Dun Champagne': { standard: 1 },
    },
  };

  // 1. Basic Champagne Tests
  test('returns Gold Champagne for Chestnut with Champagne', async () => {
    const genotype = { E_Extension: 'e/e', CH_Champagne: 'Ch/n' };
    const result = await determinePhenotype(genotype, mockBreedProfile, 5);
    expect(result.final_display_color).toBe('Gold Champagne');
  });

  test('returns Amber Champagne for Bay with Champagne', async () => {
    const genotype = {
      E_Extension: 'E/e',
      A_Agouti: 'A/a',
      CH_Champagne: 'Ch/Ch',
    };
    const result = await determinePhenotype(genotype, mockBreedProfile, 5);
    expect(result.final_display_color).toBe('Amber Champagne');
  });

  test('returns Classic Champagne for Black with Champagne', async () => {
    const genotype = {
      E_Extension: 'E/E',
      A_Agouti: 'a/a',
      CH_Champagne: 'Ch/n',
    };
    const result = await determinePhenotype(genotype, mockBreedProfile, 5);
    expect(result.final_display_color).toBe('Classic Champagne');
  });

  // 2. Champagne + Cream Tests
  test('returns Gold Cream Champagne for Palomino with Champagne', async () => {
    const genotype = {
      E_Extension: 'e/e',
      Cr_Cream: 'Cr/n',
      CH_Champagne: 'Ch/n',
    };
    const result = await determinePhenotype(genotype, mockBreedProfile, 5);
    expect(result.final_display_color).toBe('Gold Cream Champagne');
  });

  test('returns Ivory Champagne (Cremello) for Cremello with Champagne', async () => {
    const genotype = {
      E_Extension: 'e/e',
      Cr_Cream: 'Cr/Cr',
      CH_Champagne: 'Ch/n',
    };
    const result = await determinePhenotype(genotype, mockBreedProfile, 5);
    expect(result.final_display_color).toBe('Ivory Champagne (Cremello)');
  });

  test('returns Amber Cream Champagne for Buckskin with Champagne', async () => {
    const genotype = {
      E_Extension: 'E/e',
      A_Agouti: 'A/a',
      Cr_Cream: 'Cr/n',
      CH_Champagne: 'Ch/n',
    };
    const result = await determinePhenotype(genotype, mockBreedProfile, 5);
    expect(result.final_display_color).toBe('Amber Cream Champagne');
  });

  test('returns Ivory Champagne (Perlino) for Perlino with Champagne', async () => {
    const genotype = {
      E_Extension: 'E/e',
      A_Agouti: 'A/a',
      Cr_Cream: 'Cr/Cr',
      CH_Champagne: 'Ch/n',
    };
    const result = await determinePhenotype(genotype, mockBreedProfile, 5);
    expect(result.final_display_color).toBe('Ivory Champagne (Perlino)');
  });

  test('returns Classic Cream Champagne for Smoky Black with Champagne', async () => {
    const genotype = {
      E_Extension: 'E/E',
      A_Agouti: 'a/a',
      Cr_Cream: 'Cr/n',
      CH_Champagne: 'Ch/n',
    };
    const result = await determinePhenotype(genotype, mockBreedProfile, 5);
    expect(result.final_display_color).toBe('Classic Cream Champagne');
  });

  test('returns Ivory Champagne (Smoky Cream) for Smoky Cream with Champagne', async () => {
    const genotype = {
      E_Extension: 'E/E',
      A_Agouti: 'a/a',
      Cr_Cream: 'Cr/Cr',
      CH_Champagne: 'Ch/n',
    };
    const result = await determinePhenotype(genotype, mockBreedProfile, 5);
    expect(result.final_display_color).toBe('Ivory Champagne (Smoky Cream)');
  });

  // 3. Champagne + Dun Tests
  test('returns Gold Dun Champagne for Red Dun with Champagne', async () => {
    const genotype = {
      E_Extension: 'e/e',
      D_Dun: 'D/nd1',
      CH_Champagne: 'Ch/n',
    };
    const result = await determinePhenotype(genotype, mockBreedProfile, 5);
    expect(result.final_display_color).toBe('Gold Dun Champagne');
  });

  test('returns Amber Dun Champagne for Bay Dun with Champagne', async () => {
    const genotype = {
      E_Extension: 'E/e',
      A_Agouti: 'A/a',
      D_Dun: 'D/nd1',
      CH_Champagne: 'Ch/n',
    };
    const result = await determinePhenotype(genotype, mockBreedProfile, 5);
    expect(result.final_display_color).toBe('Amber Dun Champagne');
  });

  test('returns Classic Dun Champagne for Grulla with Champagne', async () => {
    const genotype = {
      E_Extension: 'E/E',
      A_Agouti: 'a/a',
      D_Dun: 'D/nd1',
      CH_Champagne: 'Ch/n',
    };
    const result = await determinePhenotype(genotype, mockBreedProfile, 5);
    expect(result.final_display_color).toBe('Classic Dun Champagne');
  });

  // 4. Champagne + Cream + Dun Tests
  test('returns Gold Cream Dun Champagne for Palomino Dun with Champagne', async () => {
    const genotype = {
      E_Extension: 'e/e',
      Cr_Cream: 'Cr/n',
      D_Dun: 'D/nd1',
      CH_Champagne: 'Ch/n',
    };
    const result = await determinePhenotype(genotype, mockBreedProfile, 5);
    expect(result.final_display_color).toBe('Gold Cream Dun Champagne');
  });

  test('returns Amber Cream Dun Champagne for Buckskin Dun with Champagne', async () => {
    const genotype = {
      E_Extension: 'E/e',
      A_Agouti: 'A/a',
      Cr_Cream: 'Cr/n',
      D_Dun: 'D/nd1',
      CH_Champagne: 'Ch/n',
    };
    const result = await determinePhenotype(genotype, mockBreedProfile, 5);
    expect(result.final_display_color).toBe('Amber Cream Dun Champagne');
  });

  test('returns Classic Cream Dun Champagne for Smoky Black Dun with Champagne', async () => {
    const genotype = {
      E_Extension: 'E/E',
      A_Agouti: 'a/a',
      Cr_Cream: 'Cr/n',
      D_Dun: 'D/nd1',
      CH_Champagne: 'Ch/n',
    };
    const result = await determinePhenotype(genotype, mockBreedProfile, 5);
    expect(result.final_display_color).toBe('Classic Cream Dun Champagne');
  });

  test('returns Ivory Dun Champagne (Cremello) for Cremello Dun with Champagne', async () => {
    const genotype = {
      E_Extension: 'e/e',
      Cr_Cream: 'Cr/Cr',
      D_Dun: 'D/nd1',
      CH_Champagne: 'Ch/n',
    };
    const result = await determinePhenotype(genotype, mockBreedProfile, 5);
    expect(result.final_display_color).toBe('Ivory Dun Champagne (Cremello)');
  });

  test('returns Ivory Dun Champagne (Perlino) for Perlino Dun with Champagne', async () => {
    const genotype = {
      E_Extension: 'E/e',
      A_Agouti: 'A/a',
      Cr_Cream: 'Cr/Cr',
      D_Dun: 'D/nd1',
      CH_Champagne: 'Ch/n',
    };
    const result = await determinePhenotype(genotype, mockBreedProfile, 5);
    expect(result.final_display_color).toBe('Ivory Dun Champagne (Perlino)');
  });

  test('returns Ivory Dun Champagne (Smoky Cream) for Smoky Cream Dun with Champagne', async () => {
    const genotype = {
      E_Extension: 'E/E',
      A_Agouti: 'a/a',
      Cr_Cream: 'Cr/Cr',
      D_Dun: 'D/nd1',
      CH_Champagne: 'Ch/n',
    };
    const result = await determinePhenotype(genotype, mockBreedProfile, 5);
    expect(result.final_display_color).toBe(
      'Ivory Dun Champagne (Smoky Cream)'
    );
  });
  test('should determine Palomino Pearl with Copper shade for Chestnut + Cream + Pearl', async () => {
    selectWeightedRandom.mockImplementation((items) => {
      // Ensure the mockBreedGeneticProfile in the test scope is used for comparison
      const currentTestMockProfile = {
        shade_bias: { 'Palomino Pearl': { copper: 0.5, standard: 0.5 } },
        marking_bias: {
          face: { none: 1 },
          leg_specific_probabilities: { none: 1 },
        },
      };
      if (items === currentTestMockProfile.shade_bias['Palomino Pearl'])
        return 'copper';
      if (items === currentTestMockProfile.marking_bias.face) return 'none';
      if (
        items === currentTestMockProfile.marking_bias.leg_specific_probabilities
      )
        return 'none';
      return 'default';
    });
    const genotype = {
      E_Extension: 'e/e',
      Cr_Cream: 'n/Cr',
      Prl_Pearl: 'prl/n',
    };
    // Use a local mockBreedGeneticProfile for this specific test
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
});
