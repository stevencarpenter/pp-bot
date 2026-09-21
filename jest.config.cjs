module.exports = {
  testEnvironment: 'node',
  testMatch: ['<rootDir>/build/test/**/*.test.js'],
  transform: {
    // Preserve jest.mock hoisting after TypeScript compilation.
    '^.+\\.js$': 'babel-jest',
  },
  moduleFileExtensions: ['js', 'json'],
  setupFiles: ['<rootDir>/jest.setup.cjs'],
  setupFilesAfterEnv: ['<rootDir>/jest.after-env.cjs'],
  collectCoverage: true,
  collectCoverageFrom: ['build/test/**/*.js', '!build/test/index.js', '!build/test/__tests__/**'],
  coverageReporters: ['text', 'text-summary', 'lcov', 'json'],
  coverageDirectory: 'coverage',
  coverageThreshold: {
    global: {
      statements: 70,
      branches: 55,
      functions: 80,
      lines: 70,
    },
  },
};
