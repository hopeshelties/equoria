// backend/jest.config.mjs
export default {
    testEnvironment: 'node',
    transform: {}, // No transformation needed for ESM with --experimental-vm-modules
    transformIgnorePatterns: [
      '/node_modules/(?!@prisma/client)', // Allow @prisma/client to be processed as ESM
    ],
    moduleNameMapper: {
      '^(\\.{1,2}/.*)\\.js$': '$1', // Keep your existing mapper for .js imports
      '\\.(css|less|scss|sass)$': 'identity-obj-proxy', // Mock non-JS assets (optional)
    },
    globals: {
      'jest': true
    },
    setupFilesAfterEnv: [], // Can add setup files if needed
    verbose: true,
    // Explicitly define test patterns to exclude node_modules
    testMatch: [
      '**/tests/**/*.test.js',
      '**/models/**/*.test.js',
      '**/seed/**/*.test.js'
    ],
    // Explicitly ignore node_modules
    testPathIgnorePatterns: [
      '/node_modules/',
      '/build/',
      '/dist/'
    ]
  };