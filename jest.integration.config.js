module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/test/integration'],
  testMatch: ['<rootDir>/test/integration/**/*.spec.ts'],
  moduleNameMapper: {
    '^@kernel/(.*)$': '<rootDir>/src/shared-kernel/$1',
    '^@contexts/(.*)$': '<rootDir>/src/contexts/$1',
    '^@infra/(.*)$': '<rootDir>/src/infrastructure/$1',
    '^@bootstrap/(.*)$': '<rootDir>/src/bootstrap/$1',
  },
  setupFiles: ['<rootDir>/test/setup-env.ts'],
  globalSetup: '<rootDir>/test/integration/setup/global-setup.ts',
  globalTeardown: '<rootDir>/test/integration/setup/global-teardown.ts',
};
