import fs from 'fs';
import path from 'path';
import type { DependencyGraph } from '../types/graphTypes';
import { CACHE_DIR, CACHE_FILE_NAME, CACHE_VERSION } from '../constants';

interface CacheFile {
  version: number;
  tsConfigPath: string;
  specGlobs: string[];
  mtimes: Record<string, number>;
  dependencies: Record<string, string[]>;
  dependents: Record<string, string[]>;
}

function serializeGraph(graph: DependencyGraph): Pick<CacheFile, 'dependencies' | 'dependents'> {
  const dependencies: Record<string, string[]> = {};
  const dependents: Record<string, string[]> = {};

  for (const [k, v] of graph.dependencies) {
    dependencies[k] = [...v];
  }
  for (const [k, v] of graph.dependents) {
    dependents[k] = [...v];
  }

  return { dependencies, dependents };
}

function deserializeGraph(data: Pick<CacheFile, 'dependencies' | 'dependents'>): DependencyGraph {
  const dependencies = new Map<string, Set<string>>();
  const dependents = new Map<string, Set<string>>();

  for (const [k, v] of Object.entries(data.dependencies)) {
    dependencies.set(k, new Set(v));
  }
  for (const [k, v] of Object.entries(data.dependents)) {
    dependents.set(k, new Set(v));
  }

  return { dependencies, dependents };
}

function getMtimes(files: string[]): Record<string, number> {
  const mtimes: Record<string, number> = {};
  for (const f of files) {
    try {
      mtimes[f] = fs.statSync(f).mtimeMs;
    } catch {
      mtimes[f] = -1;
    }
  }
  return mtimes;
}

function cacheFilePath(cwd: string): string {
  return path.join(cwd, CACHE_DIR, CACHE_FILE_NAME);
}

export function loadCache(
  cwd: string,
  tsConfigPath: string,
  specGlobs: string[]
): DependencyGraph | null {
  try {
    const raw = fs.readFileSync(cacheFilePath(cwd), 'utf8');
    const data: CacheFile = JSON.parse(raw);

    if (
      data.version !== CACHE_VERSION ||
      data.tsConfigPath !== tsConfigPath ||
      JSON.stringify(data.specGlobs) !== JSON.stringify(specGlobs)
    ) {
      return null;
    }

    const currentMtimes = getMtimes(Object.keys(data.mtimes));
    for (const [file, mtime] of Object.entries(data.mtimes)) {
      if (currentMtimes[file] !== mtime) return null;
    }

    return deserializeGraph(data);
  } catch {
    return null;
  }
}

export function saveCache(
  cwd: string,
  tsConfigPath: string,
  specGlobs: string[],
  graph: DependencyGraph
): void {
  const cacheDir = path.join(cwd, CACHE_DIR);
  const files = [...graph.dependencies.keys()];
  const mtimes = getMtimes(files);

  const data: CacheFile = {
    version: CACHE_VERSION,
    tsConfigPath,
    specGlobs,
    mtimes,
    ...serializeGraph(graph),
  };

  fs.mkdirSync(cacheDir, { recursive: true });
  fs.writeFileSync(path.join(cacheDir, CACHE_FILE_NAME), JSON.stringify(data), 'utf8');
}
