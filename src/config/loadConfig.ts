import fs from 'fs';
import path from 'path';
import { ConfigError } from '../errors';

export interface MasatConfig {
  base?: string;
  tsconfig?: string;
  specGlobs?: string;
  specPattern?: string;
  runAllOnNoMatch?: boolean;
  verbose?: boolean;
  noCache?: boolean;
  dryRun?: boolean;
}

const KNOWN_KEYS: ReadonlySet<string> = new Set([
  'base',
  'tsconfig',
  'specGlobs',
  'specPattern',
  'runAllOnNoMatch',
  'verbose',
  'noCache',
  'dryRun',
]);

function parseConfig(raw: unknown, source: string, warn: (msg: string) => void): MasatConfig {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw new ConfigError(`Config in "${source}" must be a JSON object.`);
  }

  const config: MasatConfig = {};

  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!KNOWN_KEYS.has(key)) {
      warn(`Unknown config key "${key}" in "${source}" – ignoring.`);
      continue;
    }
    (config as Record<string, unknown>)[key] = value;
  }

  return config;
}

export function loadConfig(cwd: string, warn: (msg: string) => void = () => {}): MasatConfig {
  const configFilePath = path.join(cwd, 'masat-cypress.config.json');

  if (fs.existsSync(configFilePath)) {
    try {
      const raw = JSON.parse(fs.readFileSync(configFilePath, 'utf-8')) as unknown;
      return parseConfig(raw, 'masat-cypress.config.json', warn);
    } catch (error) {
      if (error instanceof ConfigError) throw error;
      const msg = error instanceof Error ? error.message : String(error);
      throw new ConfigError(`Failed to parse masat-cypress.config.json: ${msg}`);
    }
  }

  const pkgPath = path.join(cwd, 'package.json');
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8')) as Record<string, unknown>;
      if ('masat-cypress' in pkg) {
        return parseConfig(pkg['masat-cypress'], 'package.json#masat-cypress', warn);
      }
    } catch (error) {
      if (error instanceof ConfigError) throw error;
      const msg = error instanceof Error ? error.message : String(error);
      throw new ConfigError(`Failed to parse package.json: ${msg}`);
    }
  }

  return {};
}
