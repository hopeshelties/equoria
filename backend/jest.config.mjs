// backend/jest.config.mjs
export default {
  testEnvironment: 'node',
  preset: null,
  transform: {},
  transformIgnorePatterns: [
    'node_modules/(?!(.*\\.mjs$|@prisma/client))'
  ],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1'
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
  verbose: true,
  forceExit: true,
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
  maxWorkers: 1
};
