import { spawnSync } from 'child_process';
import { GitError, ConfigError } from '../errors';

export interface GitOptions {
  base: string;
}

function validateBaseRef(base: string): void {
  const result = spawnSync('git', ['rev-parse', '--verify', base], {
    encoding: 'utf-8',
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  if (result.error || result.status !== 0) {
    const candidates = ['origin/main', 'origin/master', 'origin/trunk', 'main', 'master', 'trunk'].filter(
      (b) => b !== base
    );
    throw new ConfigError(
      `Base ref '${base}' not found. Try: ${candidates.slice(0, 3).join(', ')}. Use --base to override.`
    );
  }
}

export function getChangedFiles(options: GitOptions): string[] {
  const { base } = options;

  validateBaseRef(base);

  try {
    const result = spawnSync('git', ['diff', '--name-only', base], {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    if (result.error) {
      throw result.error;
    }

    if (result.status !== 0) {
      throw new Error(result.stderr || `git exited with code ${result.status}`);
    }

    return (result.stdout ?? '')
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
  } catch (error) {
    if (error instanceof GitError) throw error;
    const message = error instanceof Error ? error.message : String(error);
    throw new GitError(
      `Failed to get changed files (base: "${base}").\n` +
        `Make sure "${base}" exists and you are inside a git repository.\n` +
        `Details: ${message}`
    );
  }
}
