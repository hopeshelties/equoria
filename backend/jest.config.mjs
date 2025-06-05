// Jest configuration for a Node.mjs project using native ES modules
export default {
  testEnvironment: 'node',

  // Enable Jest globals (describe, it, expect, jest, etc.)
  injectGlobals: true,

  // Ensures Jest treats both JS and MJS files correctly
  moduleFileExtensions: ['js', 'mjs'],

  // Use native ES modules - no transform needed
  preset: null,
  transform: {},

  // Don't transform node_modules
  transformIgnorePatterns: ['node_modules/'],

  // Add globals for ES modules
  globals: {
    'ts-jest': {
      useESM: true,
    },
  },

  // Setup file path must match your actual filename
  setupFilesAfterEnv: ['<rootDir>/jest.setup.mjs'],

  // Updated test file globs to include .mjs files
  testMatch: [
    '**/__tests__/**/*.mjs',
    '**/?(*.)+(spec|test).mjs',
    '**/tests/**/*.test.mjs',
    '**/models/**/*.test.mjs',
  ],

  // Enable experimental features
  testEnvironmentOptions: {
    experimentalVmModules: true,
  },

  // Module name mapping for imports
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
};
