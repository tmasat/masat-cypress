export const DEFAULT_SPEC_GLOBS: string[] = [
  'cypress/e2e/**/*.cy.ts',
  'cypress/e2e/**/*.cy.js',
];

export const DEFAULT_BASE_REF = 'origin/main';

export const SPEC_GLOBS_DEFAULT = DEFAULT_SPEC_GLOBS.join(',');

export const CACHE_DIR = '.masat-cypress/cache';
export const CACHE_FILE_NAME = 'graph.json';
export const CACHE_VERSION = 1;
