describe('updateDisciplineScore', () => {
  it('should update discipline score for existing horse', async () => {
    const horse = await createHorse({
      name: 'Test Horse',
      age: 4,
      breedId: 1
    });

    const updatedHorse = await updateDisciplineScore(horse.id, 'Dressage', 5);

    expect(updatedHorse).toBeDefined();
    expect(updatedHorse.disciplineScores).toEqual({ 'Dressage': 5 });
    expect(updatedHorse.breed).toBeDefined();
    expect(updatedHorse.owner).toBeDefined();
    expect(updatedHorse.stable).toBeDefined();
    expect(updatedHorse.player).toBeDefined();
  });

  it('should add to existing discipline score', async () => {
    const horse = await createHorse({
      name: 'Test Horse',
      age: 4,
      breedId: 1
    });

    // First training session
    await updateDisciplineScore(horse.id, 'Dressage', 5);
    
    // Second training session
    const updatedHorse = await updateDisciplineScore(horse.id, 'Dressage', 5);

    expect(updatedHorse.disciplineScores).toEqual({ 'Dressage': 10 });
  });

  it('should handle multiple disciplines independently', async () => {
    const horse = await createHorse({
      name: 'Test Horse',
      age: 4,
      breedId: 1
    });

    await updateDisciplineScore(horse.id, 'Dressage', 5);
    const updatedHorse = await updateDisciplineScore(horse.id, 'Show Jumping', 3);

    expect(updatedHorse.disciplineScores).toEqual({ 
      'Dressage': 5,
      'Show Jumping': 3
    });
  });

  it('should throw error for invalid horse ID', async () => {
    await expect(updateDisciplineScore(-1, 'Dressage', 5))
      .rejects.toThrow('Invalid horse ID provided');
    
    await expect(updateDisciplineScore('invalid', 'Dressage', 5))
      .rejects.toThrow('Invalid horse ID provided');
  });

  it('should throw error for non-existent horse', async () => {
    await expect(updateDisciplineScore(99999, 'Dressage', 5))
      .rejects.toThrow('Horse with ID 99999 not found');
  });

  it('should throw error for invalid discipline', async () => {
    const horse = await createHorse({
      name: 'Test Horse',
      age: 4,
      breedId: 1
    });

    await expect(updateDisciplineScore(horse.id, '', 5))
      .rejects.toThrow('Discipline must be a non-empty string');
    
    await expect(updateDisciplineScore(horse.id, null, 5))
      .rejects.toThrow('Discipline must be a non-empty string');
  });

  it('should throw error for invalid points', async () => {
    const horse = await createHorse({
      name: 'Test Horse',
      age: 4,
      breedId: 1
    });

    await expect(updateDisciplineScore(horse.id, 'Dressage', 0))
      .rejects.toThrow('Points to add must be a positive number');
    
    await expect(updateDisciplineScore(horse.id, 'Dressage', -5))
      .rejects.toThrow('Points to add must be a positive number');
    
    await expect(updateDisciplineScore(horse.id, 'Dressage', 'invalid'))
      .rejects.toThrow('Points to add must be a positive number');
  });
});

describe('getDisciplineScores', () => {
  it('should return empty object for horse with no scores', async () => {
    const horse = await createHorse({
      name: 'Test Horse',
      age: 4,
      breedId: 1
    });

    const scores = await getDisciplineScores(horse.id);
    expect(scores).toEqual({});
  });

  it('should return discipline scores for horse with scores', async () => {
    const horse = await createHorse({
      name: 'Test Horse',
      age: 4,
      breedId: 1
    });

    await updateDisciplineScore(horse.id, 'Dressage', 5);
    await updateDisciplineScore(horse.id, 'Show Jumping', 3);

    const scores = await getDisciplineScores(horse.id);
    expect(scores).toEqual({
      'Dressage': 5,
      'Show Jumping': 3
    });
  });

  it('should throw error for invalid horse ID', async () => {
    await expect(getDisciplineScores(-1))
      .rejects.toThrow('Invalid horse ID provided');
    
    await expect(getDisciplineScores('invalid'))
      .rejects.toThrow('Invalid horse ID provided');
  });

  it('should throw error for non-existent horse', async () => {
    await expect(getDisciplineScores(99999))
      .rejects.toThrow('Horse with ID 99999 not found');
  });
}); 