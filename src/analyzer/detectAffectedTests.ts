import type { DependencyGraph } from '../types/graphTypes';
import { isCypressSpec, toAbsolute } from '../utils/pathUtils';

export interface DetectOptions {
  cwd: string;
}

export interface DetectResult {
  affectedSpecs: string[];
  unknownFiles: string[];
}

export function detectAffectedTests(
  changedFiles: string[],
  graph: DependencyGraph,
  options: DetectOptions
): DetectResult {
  const { cwd } = options;

  const visited = new Set<string>();
  const queue: string[] = [];
  const unknownFiles: string[] = [];

  for (const relPath of changedFiles) {
    const absPath = toAbsolute(relPath, cwd);

    if (!graph.dependents.has(absPath)) {
      unknownFiles.push(relPath);
      continue;
    }

    if (!visited.has(absPath)) {
      visited.add(absPath);
      queue.push(absPath);
    }
  }

  let head = 0;
  while (head < queue.length) {
    const current = queue[head++];
    for (const dependent of graph.dependents.get(current) ?? []) {
      if (!visited.has(dependent)) {
        visited.add(dependent);
        queue.push(dependent);
      }
    }
  }

  return {
    affectedSpecs: [...visited].filter(isCypressSpec),
    unknownFiles,
  };
}
