// DO NOT MODIFY: Configuration locked for consistency
// Jest configuration for a Node.js project using ES modules
export default {
  testEnvironment: 'node',

  // Enable Jest globals (describe, it, expect, jest, etc.)
  injectGlobals: true,

  // Ensures Jest treats both JS and MJS files correctly
  moduleFileExtensions: ['js', 'mjs'],

  // Configure transform for ES modules
  transform: {
    '^.+\\.m?js$': ['babel-jest', { configFile: './babel.config.json' }],
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
};
