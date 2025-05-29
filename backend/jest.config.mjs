// backend/jest.config.mjs
export default {
  testEnvironment: 'node',
  extensionsToTreatAsEsm: [], // Ensure .js is not explicitly listed
  transform: {}, // Disable transforms for ESM
  transformIgnorePatterns: [
    'node_modules/(?!(.*\\.mjs$|@prisma/client))' // Allow Prisma client to be processed
  ],
  moduleNameMapper: {
    // Ensure logger.js is resolved correctly from jest.setup.js and other locations
    '^../../utils/logger.js$': '<rootDir>/utils/logger.js',
    '^../utils/logger.js$': '<rootDir>/utils/logger.js',
    '^utils/logger.js$': '<rootDir>/utils/logger.js',

    '^../utils/appError.js$': '<rootDir>/errors/AppError.js', // Specific map for AppError
    '^../../utils/appError.js$': '<rootDir>/errors/AppError.js', // Specific map for AppError from deeper paths
    '^../errors/AppError.js$': '<rootDir>/errors/AppError.js', // If referenced from one level up
    '^../../errors/AppError.js$': '<rootDir>/errors/AppError.js', // If referenced from two levels up

    '^../utils/(.*)$': '<rootDir>/utils/$1',
    '^db/(.*)$': '<rootDir>/db/$1',
    '^../../db/(.*)$': '<rootDir>/db/$1',
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
  setupFilesAfterEnv: ['<rootDir>/jest.setup.mjs'], // Load setup file
  verbose: true,
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
  testTimeout: 30000
};
