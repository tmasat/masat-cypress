import { Command } from 'commander';
import { getChangedFiles } from '../git/getChangedFiles';
import { detectAffectedTests } from '../analyzer/detectAffectedTests';
import { runCypress } from '../runner/runCypress';

const DIVIDER = '─'.repeat(50);

export function createCLI(): Command {
  const program = new Command();

  program
    .name('smart-cypress')
    .description('Run only the Cypress specs affected by your git changes')
    .version('1.0.0');

  program
    .command('run')
    .description('Detect changed files and run only the affected Cypress specs')
    .option('-b, --base <ref>', 'Git ref (branch or SHA) to compare against', 'origin/main')
    .option('-p, --spec-pattern <pattern>', 'Glob pattern for discovering spec files', 'cypress/e2e/**/*.cy.{ts,js}')
    .option('--headed', 'Run Cypress in headed (visible browser) mode', false)
    .option('--browser <name>', 'Browser to use (chrome, firefox, edge, …)')
    .option('--run-all-on-no-match', 'Fall back to running all specs when no match is found', false)
    .action(async (options) => {
      try {
        console.log(`\n${DIVIDER}`);
        console.log('  smart-cypress – affected-test runner');
        console.log(DIVIDER);
        console.log(`  Base ref    : ${options.base}`);
        console.log(`  Spec pattern: ${options.specPattern}`);
        console.log(DIVIDER);

        console.log('\n[1/3] Detecting changed files…');
        const changedFiles = getChangedFiles({ base: options.base });

        if (changedFiles.length === 0) {
          console.log('      No changed files detected – nothing to test.');
          process.exit(0);
        }

        console.log(`      Found ${changedFiles.length} changed file(s):`);
        changedFiles.forEach((f) => console.log(`        • ${f}`));

        console.log('\n[2/3] Analysing affected specs…');
        const { specs, keywords } = detectAffectedTests(changedFiles, {
          specPattern: options.specPattern,
        });

        console.log(`      Keywords extracted : ${keywords.join(', ') || '(none)'}`);

        if (specs.length === 0) {
          console.log('\n      No matching specs found.');

          if (options.runAllOnNoMatch) {
            console.log('      --run-all-on-no-match is set – running the full suite.\n');
            const code = await runCypress({ specs: [], headed: options.headed, browser: options.browser });
            process.exit(code);
          }

          console.log('      Tip: use --run-all-on-no-match to fall back to the full suite.');
          process.exit(0);
        }

        console.log(`      Matched ${specs.length} spec(s):`);
        specs.forEach((s) => console.log(`        • ${s}`));

        console.log('\n[3/3] Starting Cypress…');
        const exitCode = await runCypress({ specs, headed: options.headed, browser: options.browser });

        console.log(`\n${DIVIDER}`);
        console.log(exitCode === 0 ? '  All affected tests passed.' : `  Cypress exited with code ${exitCode}.`);
        console.log(DIVIDER + '\n');

        process.exit(exitCode);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`\nError: ${message}`);
        process.exit(1);
      }
    });

  return program;
}
