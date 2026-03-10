import { spawn } from 'child_process';

export interface CypressRunOptions {
  specs: string[];
  headed?: boolean;
  browser?: string;
  extraArgs?: string[];
}

export function runCypress(options: CypressRunOptions): Promise<number> {
  const { specs, headed = false, browser, extraArgs = [] } = options;

  const args: string[] = ['cypress', 'run'];

  if (specs.length > 0) {
    args.push('--spec', specs.join(','));
  }

  if (headed) {
    args.push('--headed');
  }

  if (browser) {
    args.push('--browser', browser);
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
