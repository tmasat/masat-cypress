import { Command } from 'commander';
import { getChangedFiles } from '../git/getChangedFiles';
import { buildDependencyGraph } from '../graph/buildDependencyGraph';
import { detectAffectedTests } from '../analyzer/detectAffectedTests';
import { runCypress } from '../runner/runCypress';
import { logger } from '../utils/logger';
import { toRelative } from '../utils/pathUtils';

export function createCLI(): Command {
  const program = new Command();

  program
    .name('smart-cypress')
    .description('Run only the Cypress specs affected by your git changes')
    .version('1.0.0');

  program
    .command('run')
    .description('Detect changed files, build a dependency graph, and run only the affected specs')
    .option('-b, --base <ref>', 'Git ref (branch or SHA) to compare against', 'origin/main')
    .option('--tsconfig <path>', 'Path to tsconfig.json, relative to project root', 'tsconfig.json')
    .option('--spec-globs <globs>', 'Comma-separated glob patterns for Cypress spec files', 'cypress/e2e/**/*.cy.ts,cypress/e2e/**/*.cy.js')
    .option('--headed', 'Run Cypress in headed (visible browser) mode', false)
    .option('--browser <name>', 'Browser to use (chrome, firefox, edge, …)')
    .option('--run-all-on-no-match', 'Fall back to the full test suite when no specs are affected', false)
    .action(async (options) => {
      const cwd = process.cwd();
      const specGlobs = (options.specGlobs as string)
        .split(',')
        .map((g: string) => g.trim())
        .filter(Boolean);

      try {
        logger.header('smart-cypress  –  dependency-graph test runner', {
          'Base ref': options.base,
          'tsconfig': options.tsconfig,
          'Spec globs': specGlobs.join(', '),
        });

        logger.step(1, 4, 'Detecting changed files…');
        const changedFiles = getChangedFiles({ base: options.base });

        if (changedFiles.length === 0) {
          logger.info('No changed files detected – nothing to test.');
          process.exit(0);
        }

        logger.info(`Found ${changedFiles.length} changed file(s):`);
        changedFiles.forEach((f) => logger.bullet(f));

        logger.step(2, 4, 'Building dependency graph…');
        logger.info('Parsing project with ts-morph…');

        const graph = buildDependencyGraph({
          cwd,
          tsConfigPath: options.tsconfig,
          specGlobs,
        });

        logger.info(`Graph built. ${graph.dependencies.size} file node(s) indexed.`);

        logger.step(3, 4, 'Detecting affected tests…');

        const { affectedSpecs, unknownFiles } = detectAffectedTests(changedFiles, graph, { cwd });

        if (unknownFiles.length > 0) {
          logger.warn(
            `${unknownFiles.length} changed file(s) not found in the dependency graph (skipped):`
          );
          unknownFiles.forEach((f) => logger.bullet(f));
        }

        if (affectedSpecs.length === 0) {
          logger.info('No affected specs found.');

          if (options.runAllOnNoMatch) {
            logger.info('--run-all-on-no-match is set – running the full suite.');
            const code = await runCypress({ specs: [], headed: options.headed, browser: options.browser });
            process.exit(code);
          }

          logger.info('Tip: use --run-all-on-no-match to fall back to the full suite.');
          process.exit(0);
        }

        const relativeSpecs = affectedSpecs.map((s) => toRelative(s, cwd));

        logger.info(`Affected specs (${relativeSpecs.length}):`);
        relativeSpecs.forEach((s) => logger.bullet(s));

        logger.step(4, 4, 'Running Cypress…');

        const exitCode = await runCypress({
          specs: relativeSpecs,
          headed: options.headed,
          browser: options.browser,
        });

        logger.footer(
          exitCode === 0,
          exitCode === 0 ? 'All affected tests passed.' : `Cypress exited with code ${exitCode}.`
        );

        process.exit(exitCode);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logger.error(message);
        process.exit(1);
      }
    });

  return program;
}
