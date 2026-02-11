// jest.config.js - Jest Configuration

module.exports = {
    testEnvironment: 'node',
    testMatch: ['**/tests/**/*.test.js'],
    coverageDirectory: 'coverage',
    collectCoverageFrom: [
        'repositories/**/*.js',
        'services/**/*.js',
        'controllers/**/*.js',
        'db/**/*.js',
        '!**/node_modules/**',
    ],
    setupFilesAfterEnv: ['./tests/setup.js'],
    testTimeout: 30000,
    verbose: true,
    forceExit: true,
    clearMocks: true,
    resetMocks: true,
    restoreMocks: true,
};
