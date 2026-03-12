import { spawnSync } from 'child_process';
import { GitError } from '../errors';

export interface GitOptions {
  base: string;
}

export function getChangedFiles(options: GitOptions): string[] {
  const { base } = options;

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
