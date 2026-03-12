import path from 'path';
import { Project, ScriptTarget, ModuleKind } from 'ts-morph';
import type { DependencyGraph, GraphBuildOptions } from '../types/graphTypes';
import { createLogger } from '../utils/logger';
import { DEFAULT_SPEC_GLOBS } from '../constants';
import { GraphError } from '../errors';

function ensureNode(graph: DependencyGraph, filePath: string): void {
  if (!graph.dependencies.has(filePath)) {
    graph.dependencies.set(filePath, new Set());
  }
  if (!graph.dependents.has(filePath)) {
    graph.dependents.set(filePath, new Set());
  }
}

function addEdge(graph: DependencyGraph, importer: string, importee: string): void {
  ensureNode(graph, importer);
  ensureNode(graph, importee);
  graph.dependencies.get(importer)!.add(importee);
  graph.dependents.get(importee)!.add(importer);
}

function createProject(
  cwd: string,
  tsConfigAbsolute: string,
  warn: (msg: string) => void
): Project {
  try {
    return new Project({
      tsConfigFilePath: tsConfigAbsolute,
      compilerOptions: { allowJs: true },
    });
  } catch {
    warn(
      `tsconfig.json not found at "${tsConfigAbsolute}". ` +
        'Falling back to scanning src/**/*.{ts,tsx} manually.'
    );
    const project = new Project({
      compilerOptions: {
        target: ScriptTarget.ES2020,
        module: ModuleKind.CommonJS,
        allowJs: true,
        strict: false,
      },
    });
    project.addSourceFilesAtPaths([path.join(cwd, 'src/**/*.{ts,tsx,js,jsx}')]);
    return project;
  }
}

export function buildDependencyGraph(options: GraphBuildOptions = {}): DependencyGraph {
  const cwd = options.cwd ?? process.cwd();
  const tsConfigAbsolute = path.resolve(cwd, options.tsConfigPath ?? 'tsconfig.json');
  const specGlobs = options.specGlobs ?? DEFAULT_SPEC_GLOBS;
  const logger = options.logger ?? createLogger(false);

  try {
    const project = createProject(cwd, tsConfigAbsolute, logger.warn);
    project.addSourceFilesAtPaths(specGlobs.map((g) => path.join(cwd, g)));

    const graph: DependencyGraph = {
      dependencies: new Map(),
      dependents: new Map(),
    };

    for (const sourceFile of project.getSourceFiles()) {
      const importerPath = sourceFile.getFilePath();
      ensureNode(graph, importerPath);

      for (const decl of [
        ...sourceFile.getImportDeclarations(),
        ...sourceFile.getExportDeclarations(),
      ]) {
        const resolved = decl.getModuleSpecifierSourceFile();
        if (resolved) {
          addEdge(graph, importerPath, resolved.getFilePath());
        }
      }
    }

    logger.debug(`Parsed ${project.getSourceFiles().length} source file(s) into dependency graph.`);

    return graph;
  } catch (error) {
    if (error instanceof GraphError) throw error;
    const message = error instanceof Error ? error.message : String(error);
    throw new GraphError(`Failed to build dependency graph.\nDetails: ${message}`);
  }
}
