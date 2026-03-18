import fs from 'fs';
import path from 'path';
import os from 'os';
import { loadConfig } from '../config/loadConfig';
import { ConfigError } from '../errors';

function makeTmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'masat-test-'));
}

function cleanup(dir: string): void {
  fs.rmSync(dir, { recursive: true, force: true });
}

describe('loadConfig', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = makeTmpDir();
  });

  afterEach(() => {
    cleanup(tmpDir);
  });

  describe('no config file', () => {
    it('returns empty object when neither config file nor package.json exists', () => {
      expect(loadConfig(tmpDir)).toEqual({});
    });

    it('returns empty object when package.json has no masat-cypress key', () => {
      fs.writeFileSync(
        path.join(tmpDir, 'package.json'),
        JSON.stringify({ name: 'my-app', version: '1.0.0' })
      );
      expect(loadConfig(tmpDir)).toEqual({});
    });
  });

  describe('masat-cypress.config.json', () => {
    it('reads base from config file', () => {
      fs.writeFileSync(
        path.join(tmpDir, 'masat-cypress.config.json'),
        JSON.stringify({ base: 'origin/develop' })
      );
      expect(loadConfig(tmpDir)).toEqual({ base: 'origin/develop' });
    });

    it('reads all known keys', () => {
      const config = {
        base: 'origin/dev',
        tsconfig: 'tsconfig.app.json',
        specGlobs: 'e2e/**/*.cy.ts',
        runAllOnNoMatch: true,
        verbose: true,
        noCache: true,
        dryRun: true,
      };
      fs.writeFileSync(
        path.join(tmpDir, 'masat-cypress.config.json'),
        JSON.stringify(config)
      );
      expect(loadConfig(tmpDir)).toEqual(config);
    });

    it('warns and ignores unknown keys', () => {
      fs.writeFileSync(
        path.join(tmpDir, 'masat-cypress.config.json'),
        JSON.stringify({ base: 'origin/main', unknownKey: 'value' })
      );
      const warnings: string[] = [];
      const result = loadConfig(tmpDir, (msg) => warnings.push(msg));
      expect(result).toEqual({ base: 'origin/main' });
      expect(warnings.some((w) => w.includes('unknownKey'))).toBe(true);
    });

    it('throws ConfigError on malformed JSON', () => {
      fs.writeFileSync(
        path.join(tmpDir, 'masat-cypress.config.json'),
        'not valid json'
      );
      expect(() => loadConfig(tmpDir)).toThrow(ConfigError);
    });

    it('throws ConfigError if config is not an object', () => {
      fs.writeFileSync(
        path.join(tmpDir, 'masat-cypress.config.json'),
        JSON.stringify([1, 2, 3])
      );
      expect(() => loadConfig(tmpDir)).toThrow(ConfigError);
    });
  });

  describe('package.json#masat-cypress', () => {
    it('reads config from package.json masat-cypress key', () => {
      fs.writeFileSync(
        path.join(tmpDir, 'package.json'),
        JSON.stringify({
          name: 'my-app',
          'masat-cypress': { base: 'origin/staging' },
        })
      );
      expect(loadConfig(tmpDir)).toEqual({ base: 'origin/staging' });
    });

    it('prefers masat-cypress.config.json over package.json', () => {
      fs.writeFileSync(
        path.join(tmpDir, 'masat-cypress.config.json'),
        JSON.stringify({ base: 'origin/from-config-file' })
      );
      fs.writeFileSync(
        path.join(tmpDir, 'package.json'),
        JSON.stringify({ 'masat-cypress': { base: 'origin/from-package-json' } })
      );
      const result = loadConfig(tmpDir);
      expect(result.base).toBe('origin/from-config-file');
    });
  });
});
