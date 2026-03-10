import { spawn } from 'child_process';

export interface CypressOptions {
  mode: 'run' | 'open';
  specs?: string[];
  extraArgs?: string[];
}

export function runCypress(options: CypressOptions): Promise<number> {
  const { mode, specs = [], extraArgs = [] } = options;

  const args: string[] = ['cypress', mode];

  if (specs.length > 0) {
    args.push('--spec', specs.join(','));
  }

  args.push(...extraArgs);

  console.log(`\n  $ npx ${args.join(' ')}\n`);

  return new Promise((resolve, reject) => {
    const child = spawn('npx', args, {
      stdio: 'inherit',
      shell: true,
    });

    child.on('close', (code) => {
      resolve(code ?? 0);
    });

    child.on('error', (err) => {
      reject(new Error(`Failed to spawn Cypress: ${err.message}`));
    });
  });
}
