const assert = require('assert');

describe('Genetics Engine', () => {
    it('should return expected traits for given parents', () => {
        const parent1 = { traitA: 'dominant', traitB: 'recessive' };
        const parent2 = { traitA: 'recessive', traitB: 'dominant' };
        const expected = { traitA: 'dominant', traitB: 'dominant' };
        const result = geneticsEngine(parent1, parent2);
        assert.deepStrictEqual(result, expected);
    });

    it('should handle edge cases with no traits', () => {
        const parent1 = {};
        const parent2 = {};
        const expected = {};
        const result = geneticsEngine(parent1, parent2);
        assert.deepStrictEqual(result, expected);
    });

    it('should return traits when one parent has no traits', () => {
        const parent1 = { traitA: 'dominant' };
        const parent2 = {};
        const expected = { traitA: 'dominant' };
        const result = geneticsEngine(parent1, parent2);
        assert.deepStrictEqual(result, expected);
    });

    it('should return traits when both parents have the same traits', () => {
        const parent1 = { traitA: 'recessive' };
        const parent2 = { traitA: 'recessive' };
        const expected = { traitA: 'recessive' };
        const result = geneticsEngine(parent1, parent2);
        assert.deepStrictEqual(result, expected);
    });
});