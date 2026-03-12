import { Command } from 'commander';
import { getChangedFiles } from '../git/getChangedFiles';
import { buildDependencyGraph } from '../graph/buildDependencyGraph';
import { detectAffectedTests } from '../analyzer/detectAffectedTests';
import { runCypress } from '../runner/runCypress';
import { logger } from '../utils/logger';
import { toRelative } from '../utils/pathUtils';
import { SPEC_GLOBS_DEFAULT, DEFAULT_BASE_REF } from '../constants';
import { GitError, GraphError, ConfigError } from '../errors';

async function runSmartMode(
  mode: 'run' | 'open',
  options: {
    base: string;
    tsconfig: string;
    specGlobs: string;
    runAllOnNoMatch: boolean;
  },
  extraArgs: string[]
): Promise<number> {
  const cwd = process.cwd();
  const specGlobs = options.specGlobs.split(',').map((g) => g.trim()).filter(Boolean);

  logger.header(`masat:cypress ${mode} --smart`, {
    'Base ref': options.base,
    'tsconfig': options.tsconfig,
  });

  logger.step(1, 4, 'Detecting changed files…');
  const changedFiles = getChangedFiles({ base: options.base });

  if (changedFiles.length === 0) {
    logger.info('No changed files detected – nothing to test.');
    return 0;
  }

  logger.info(`Found ${changedFiles.length} changed file(s):`);
  changedFiles.forEach((f) => logger.bullet(f));

  logger.step(2, 4, 'Building dependency graph…');
  logger.info('Parsing project with ts-morph…');

  const graph = buildDependencyGraph({ cwd, tsConfigPath: options.tsconfig, specGlobs });

  logger.info(`Graph built. ${graph.dependencies.size} file node(s) indexed.`);

  logger.step(3, 4, 'Detecting affected tests…');

  const { affectedSpecs, unknownFiles } = detectAffectedTests(changedFiles, graph, { cwd });

  if (unknownFiles.length > 0) {
    logger.warn(`${unknownFiles.length} file(s) not in dependency graph (skipped):`);
    unknownFiles.forEach((f) => logger.bullet(f));
  }

  if (affectedSpecs.length === 0) {
    logger.info('No affected specs found.');

    if (options.runAllOnNoMatch) {
      logger.info('--run-all-on-no-match is set – running the full suite.');
      return runCypress({ mode, extraArgs });
    }

    logger.info('Tip: use --run-all-on-no-match to fall back to the full suite.');
    return 0;
  }

  const relativeSpecs = affectedSpecs.map((s) => toRelative(s, cwd));

  logger.info(`Affected specs (${relativeSpecs.length}):`);
  relativeSpecs.forEach((s) => logger.bullet(s));

  logger.step(4, 4, `Running cypress ${mode}…`);

  const exitCode = await runCypress({ mode, specs: relativeSpecs, extraArgs });

  logger.footer(
    exitCode === 0,
    exitCode === 0 ? 'All affected tests passed.' : `Cypress exited with code ${exitCode}.`
  );

  return exitCode;
}

function createCypressCommand(mode: 'run' | 'open'): Command {
  const descriptions = {
    run: 'Run Cypress tests (pass --smart to run only affected specs)',
    open: 'Open Cypress test runner (pass --smart to open only affected specs)',
  };

  const noMatchLabel = mode === 'run' ? 'full suite' : 'all specs';

  return new Command(mode)
    .description(descriptions[mode])
    .allowUnknownOption(true)
    .option('--smart', 'Only process specs affected by git changes')
    .option('--base <ref>', 'Git base ref for diff (smart mode)', DEFAULT_BASE_REF)
    .option('--tsconfig <path>', 'Path to tsconfig.json (smart mode)', 'tsconfig.json')
    .option('--spec-globs <globs>', 'Spec discovery globs (smart mode)', SPEC_GLOBS_DEFAULT)
    .option('--run-all-on-no-match', `Fall back to ${noMatchLabel} if no specs match (smart mode)`, false)
    .action(async (options, command) => {
      try {
        const extraArgs: string[] = command.args;
        const code = options.smart
          ? await runSmartMode(mode, {
              base: options.base,
              tsconfig: options.tsconfig,
              specGlobs: options.specGlobs,
              runAllOnNoMatch: options.runAllOnNoMatch,
            }, extraArgs)
          : await runCypress({ mode, extraArgs });
        process.exit(code);
      } catch (error) {
        if (error instanceof GitError) {
          logger.error(error.message);
          process.exit(3);
        } else if (error instanceof GraphError || error instanceof ConfigError) {
          logger.error(error.message);
          process.exit(2);
        } else {
          logger.error(error instanceof Error ? error.message : String(error));
          process.exit(1);
        }
      }
    });
}

export function createCLI(): Command {
  const program = new Command();

  program
    .name('masat:cypress')
    .description('Cypress CLI wrapper – add --smart to run only affected specs')
    .version('1.0.0');

  program.addCommand(createCypressCommand('run'));
  program.addCommand(createCypressCommand('open'));

  return program;
}
