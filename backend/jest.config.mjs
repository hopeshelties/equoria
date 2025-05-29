export default {
  testEnvironment: 'node',
  transform: {},

  // Ensures Jest treats both JS and MJS files correctly
  moduleFileExtensions: ['js', 'mjs'],

  // Setup file path must match your actual filename
  setupFilesAfterEnv: ['<rootDir>/jest.setup.mjs'],

  // Recommended test file globs
  testMatch: [
    '**/__tests__/**/*.js',
    '**/?(*.)+(spec|test).js',
    '**/tests/**/*.test.js',
    '**/models/**/*.test.js'
  ],

  verbose: true,
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
  testTimeout: 30000,

  // Makes sure Prisma-generated clients don't break things
  transformIgnorePatterns: [
    'node_modules/(?!(.*\\.mjs$|@prisma/client))'
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
  ]
};
