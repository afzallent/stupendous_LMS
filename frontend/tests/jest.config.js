module.exports = {
  preset: 'jest-puppeteer',
  testEnvironment: 'jest-environment-puppeteer',
  setupFilesAfterEnv: ['<rootDir>/setup.js'],
  testMatch: ['<rootDir>/**/*.test.js'],
  rootDir: '.',
  testTimeout: 30000,
  collectCoverage: true,
  collectCoverageFrom: [
    '../src/**/*.{ts,tsx}',
    '!../src/**/*.d.ts',
    '!../src/types/**/*',
  ],
  coverageDirectory: './coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  verbose: true,
  bail: false,
  maxWorkers: 1, // Run tests sequentially to avoid conflicts
  globals: {
    BASE_URL: process.env.BASE_URL || 'http://localhost:3000',
    TEST_TIMEOUT: 30000,
    PAGE_LOAD_TIMEOUT: 10000,
    SLOW_NETWORK_TIMEOUT: 15000
  }
};