module.exports = {
    testEnvironment: 'node',
    // Allow both .ts and .js tests for migration period
    testMatch: ['**/?(*.)+(test).[jt]s?(x)'],
    transform: {
        '^.+\\.(ts|tsx)$': ['ts-jest', {tsconfig: 'tsconfig.json'}],
    },
    moduleFileExtensions: ['ts', 'js', 'json'],
    setupFiles: ['<rootDir>/jest.setup.cjs'],
    setupFilesAfterEnv: ['<rootDir>/jest.after-env.cjs'],
    globalTeardown: '<rootDir>/jest.global-teardown.cjs',
    collectCoverage: true,
    collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/**/index.ts', '!**/node_modules/**', '!dist/**'],
    coverageReporters: ['text', 'text-summary', 'lcov'],
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
