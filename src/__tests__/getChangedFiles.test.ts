import { getChangedFiles } from '../git/getChangedFiles';
import { spawnSync } from 'child_process';
import { ConfigError } from '../errors';

jest.mock('child_process');

const mockSpawnSync = spawnSync as jest.MockedFunction<typeof spawnSync>;

function makeSpawnResult(overrides: Partial<ReturnType<typeof spawnSync>> = {}): ReturnType<typeof spawnSync> {
  return {
    pid: 1,
    output: [],
    stdout: '',
    stderr: '',
    status: 0,
    signal: null,
    error: undefined,
    ...overrides,
  };
}

describe('getChangedFiles', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('base ref validation', () => {
    it('throws ConfigError when base ref does not exist', () => {
      mockSpawnSync.mockReturnValueOnce(makeSpawnResult({ status: 128, stderr: 'fatal: not a valid ref' }));

      expect(() => getChangedFiles({ base: 'origin/nonexistent' })).toThrow(ConfigError);
    });

    it('error message suggests alternative branches', () => {
      mockSpawnSync.mockReturnValueOnce(makeSpawnResult({ status: 128 }));

      expect(() => getChangedFiles({ base: 'origin/main' })).toThrow(
        /origin\/master|origin\/trunk/
      );
    });
  });

  describe('successful diff', () => {
    it('returns empty array when no files changed', () => {
      mockSpawnSync
        .mockReturnValueOnce(makeSpawnResult()) // rev-parse
        .mockReturnValueOnce(makeSpawnResult({ stdout: '' })); // diff

      expect(getChangedFiles({ base: 'origin/main' })).toEqual([]);
    });

    it('returns list of changed files', () => {
      mockSpawnSync
        .mockReturnValueOnce(makeSpawnResult()) // rev-parse
        .mockReturnValueOnce(
          makeSpawnResult({ stdout: 'src/foo.ts\nsrc/bar.ts\n' })
        ); // diff

      expect(getChangedFiles({ base: 'origin/main' })).toEqual([
        'src/foo.ts',
        'src/bar.ts',
      ]);
    });

    it('filters out empty lines from diff output', () => {
      mockSpawnSync
        .mockReturnValueOnce(makeSpawnResult()) // rev-parse
        .mockReturnValueOnce(
          makeSpawnResult({ stdout: 'src/foo.ts\n\nsrc/bar.ts\n\n' })
        ); // diff

      const result = getChangedFiles({ base: 'origin/main' });
      expect(result).toEqual(['src/foo.ts', 'src/bar.ts']);
    });

    it('trims whitespace from file paths', () => {
      mockSpawnSync
        .mockReturnValueOnce(makeSpawnResult()) // rev-parse
        .mockReturnValueOnce(
          makeSpawnResult({ stdout: '  src/foo.ts  \n  src/bar.ts  \n' })
        ); // diff

      const result = getChangedFiles({ base: 'origin/main' });
      expect(result).toEqual(['src/foo.ts', 'src/bar.ts']);
    });
  });

  describe('git diff failure', () => {
    it('throws GitError when git diff fails', () => {
      mockSpawnSync
        .mockReturnValueOnce(makeSpawnResult()) // rev-parse succeeds
        .mockReturnValueOnce(makeSpawnResult({ status: 1, stderr: 'git error' })); // diff fails

      const { GitError } = jest.requireActual('../errors') as typeof import('../errors');
      expect(() => getChangedFiles({ base: 'origin/main' })).toThrow(GitError);
    });
  });
});
