module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/test'],
  moduleNameMapper: {
    '^@kernel/(.*)$': '<rootDir>/src/shared-kernel/$1',
    '^@contexts/(.*)$': '<rootDir>/src/contexts/$1',
    '^@infra/(.*)$': '<rootDir>/src/infrastructure/$1',
  },
  testMatch: ['<rootDir>/test/**/*.spec.ts'],
  setupFiles: ['<rootDir>/test/setup-env.ts'],
};
