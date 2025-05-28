// backend/jest.config.mjs
export default {
  testEnvironment: 'node',
  extensionsToTreatAsEsm: [], // Ensure .js is not explicitly listed
  transform: {}, // Disable transforms for ESM
  transformIgnorePatterns: [
    'node_modules/(?!(.*\\.mjs$|@prisma/client))' // Allow Prisma client to be processed
  ],
  moduleNameMapper: {
    '^../utils/appError.js$': '<rootDir>/errors/AppError.js', // Specific map for AppError
    '^../utils/(.*)$': '<rootDir>/utils/$1', // Keep for other utils if any
    '^db/(.*)$': '<rootDir>/db/$1',
    '^../../db/(.*)$': '<rootDir>/db/$1', // Added for deeper paths like in integration tests
    // Add a more general alias for controllers, models, utils, errors, etc.
    '^#controllers/(.*)$': '<rootDir>/controllers/$1',
    '^#models/(.*)$': '<rootDir>/models/$1',
    '^#utils/(.*)$': '<rootDir>/utils/$1',
    '^#errors/(.*)$': '<rootDir>/errors/$1',
    '^#config/(.*)$': '<rootDir>/config/$1',
    '^#db/(.*)$': '<rootDir>/db/$1'
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
