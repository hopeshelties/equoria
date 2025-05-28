export default {
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.js'],
  transform: {}, // Disable transforms for ESM
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1', // Handle ESM imports
  },
  testMatch: ['**/__tests__/**/*.js', '**/?(*.)+(spec|test).js'],
  verbose: true,
  setupFilesAfterEnv: ['./jest.setup.js'], // Explicitly include setup file
};