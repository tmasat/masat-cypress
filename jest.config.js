/** @type {import('jest').Config} */
const config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/src/__tests__/**/*.test.ts'],
  modulePathIgnorePatterns: ['<rootDir>/dist/'],
};

module.exports = config;
