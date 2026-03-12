const DIVIDER = '─'.repeat(52);

export interface Logger {
  header: (title: string, meta?: Record<string, string>) => void;
  step: (n: number, total: number, msg: string) => void;
  info: (msg: string) => void;
  bullet: (item: string) => void;
  warn: (msg: string) => void;
  debug: (msg: string) => void;
  footer: (success: boolean, msg: string) => void;
  error: (msg: string) => void;
}

export function createLogger(verbose: boolean): Logger {
  return {
    header: (title: string, meta: Record<string, string> = {}): void => {
      console.log(`\n${DIVIDER}`);
      console.log(`  ${title}`);
      console.log(DIVIDER);
      for (const [key, value] of Object.entries(meta)) {
        console.log(`  ${key.padEnd(14)}: ${value}`);
      }
      if (Object.keys(meta).length > 0) {
        console.log(DIVIDER);
      }
    },

    step: (n: number, total: number, msg: string): void => {
      console.log(`\n[${n}/${total}] ${msg}`);
    },

    info: (msg: string): void => {
      console.log(`      ${msg}`);
    },

    bullet: (item: string): void => {
      console.log(`        • ${item}`);
    },

    warn: (msg: string): void => {
      console.warn(`      ⚠  ${msg}`);
    },

    debug: (msg: string): void => {
      if (verbose) {
        console.log(`      [debug] ${msg}`);
      }
    },

    footer: (success: boolean, msg: string): void => {
      console.log(`\n${DIVIDER}`);
      console.log(`  ${success ? '✓' : '✗'}  ${msg}`);
      console.log(`${DIVIDER}\n`);
    },

    error: (msg: string): void => {
      console.error(`\nError: ${msg}`);
    },
  };
}

export const logger = createLogger(false);
