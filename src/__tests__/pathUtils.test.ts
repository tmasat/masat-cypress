import path from 'path';
import { toAbsolute, toRelative, isCypressSpec } from '../utils/pathUtils';

const CWD = '/project/root';

describe('toAbsolute', () => {
  it('returns the path unchanged when already absolute', () => {
    expect(toAbsolute('/abs/path/file.ts', CWD)).toBe('/abs/path/file.ts');
  });

  it('resolves a relative path against cwd', () => {
    expect(toAbsolute('src/foo.ts', CWD)).toBe('/project/root/src/foo.ts');
  });

  it('resolves nested relative path', () => {
    expect(toAbsolute('a/b/c.ts', CWD)).toBe('/project/root/a/b/c.ts');
  });

  it('handles leading ./', () => {
    expect(toAbsolute('./src/foo.ts', CWD)).toBe('/project/root/src/foo.ts');
  });
});

describe('toRelative', () => {
  it('converts absolute path to relative from cwd', () => {
    expect(toRelative('/project/root/src/foo.ts', CWD)).toBe(
      path.join('src', 'foo.ts')
    );
  });

  it('handles path outside cwd with ..', () => {
    expect(toRelative('/project/other/bar.ts', CWD)).toBe(
      path.join('..', 'other', 'bar.ts')
    );
  });

  it('returns empty string for the cwd itself', () => {
    expect(toRelative(CWD, CWD)).toBe('');
  });
});

describe('isCypressSpec', () => {
  it('matches .cy.ts files', () => {
    expect(isCypressSpec('cypress/e2e/login.cy.ts')).toBe(true);
  });

  it('matches .cy.js files', () => {
    expect(isCypressSpec('cypress/e2e/login.cy.js')).toBe(true);
  });

  it('matches .spec.ts files', () => {
    expect(isCypressSpec('src/foo.spec.ts')).toBe(true);
  });

  it('matches .spec.js files', () => {
    expect(isCypressSpec('src/foo.spec.js')).toBe(true);
  });

  it('does not match regular .ts files', () => {
    expect(isCypressSpec('src/utils/helper.ts')).toBe(false);
  });

  it('does not match .cy.tsx files', () => {
    expect(isCypressSpec('src/foo.cy.tsx')).toBe(false);
  });

  it('does not match files with spec in directory name', () => {
    expect(isCypressSpec('spec/helper.ts')).toBe(false);
  });

  it('works with absolute paths', () => {
    expect(isCypressSpec('/project/cypress/e2e/login.cy.ts')).toBe(true);
  });
});
