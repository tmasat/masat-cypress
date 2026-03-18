import { spawn } from 'child_process';
import { logger } from '../utils/logger';

export interface CypressOptions {
  mode: 'run' | 'open';
  specs?: string[];
  extraArgs?: string[];
}

export function runCypress(options: CypressOptions): Promise<number> {
  const { mode, specs = [], extraArgs = [] } = options;

  const args: string[] = ['cypress', mode];

  for (const spec of specs) {
    args.push('--spec', spec);
  }

  args.push(...extraArgs);

  logger.info(`$ npx ${args.join(' ')}`);

  return new Promise((resolve, reject) => {
    const child = spawn('npx', args, {
      stdio: 'inherit',
    });

    child.on('close', (code, signal) => {
      if (code === null && signal !== null) {
        resolve(130);
      } else {
        resolve(code ?? 0);
      }
    });

    child.on('error', (err) => {
      reject(new Error(`Failed to spawn Cypress: ${err.message}`));
    });
  });
}
