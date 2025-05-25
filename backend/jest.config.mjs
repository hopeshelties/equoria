// backend/jest.config.mjs
export default {
  testEnvironment: 'node',
  preset: null,
  transform: {},
  transformIgnorePatterns: [
    'node_modules/(?!(.*\\.mjs$|@prisma/client))'
  ],

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
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  verbose: true,
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
  maxWorkers: 1,
  forceExit: true,  // Temporarily re-enabled due to module resolution issues
  testTimeout: 30000
};
