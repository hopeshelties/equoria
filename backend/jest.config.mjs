// backend/jest.config.mjs
export default {
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.js'], // Explicitly treat .js as ESM
  transform: {}, // Disable transforms for ESM
  transformIgnorePatterns: [
    'node_modules/(?!(.*\\.mjs$|@prisma/client))' // Allow Prisma client to be processed
  ],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1' // Handle ESM imports without .js extension
  },
  testMatch: [
    '**/__tests__/**/*.js',
    '**/?(*.)+(spec|test).js',
    '**/tests/**/*.test.js',
    '**/models/**/*.test.js'
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/build/',
    '/dist/'
  ],
  collectCoverageFrom: [
    '**/*.js',
    '!**/node_modules/**',
    '!**/coverage/**',
    '!jest.config.mjs',
    '!**/*.test.js',
    '!**/*.spec.js'
  ],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'], // Load setup file
  verbose: true,
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
  testTimeout: 30000
};
