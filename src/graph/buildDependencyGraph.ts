import fs from 'fs';
import path from 'path';
import { Project, ScriptTarget, ModuleKind } from 'ts-morph';
import type { DependencyGraph, GraphBuildOptions } from '../types/graphTypes';
import { logger } from '../utils/logger';

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

export function buildDependencyGraph(options: GraphBuildOptions = {}): DependencyGraph {
  const cwd = options.cwd ?? process.cwd();
  const tsConfigRelative = options.tsConfigPath ?? 'tsconfig.json';
  const tsConfigAbsolute = path.resolve(cwd, tsConfigRelative);

  const specGlobs = options.specGlobs ?? [
    'cypress/e2e/**/*.cy.ts',
    'cypress/e2e/**/*.cy.js',
  ];

  let project: Project;

  if (fs.existsSync(tsConfigAbsolute)) {
    project = new Project({
      tsConfigFilePath: tsConfigAbsolute,
      compilerOptions: {
        allowJs: true,
      },
    });
  } else {
    logger.warn(
      `tsconfig.json not found at "${tsConfigAbsolute}". ` +
        'Falling back to scanning src/**/*.{ts,tsx} manually.'
    );
    project = new Project({
      compilerOptions: {
        target: ScriptTarget.ES2020,
        module: ModuleKind.CommonJS,
        allowJs: true,
        strict: false,
      },
    });
    project.addSourceFilesAtPaths([path.join(cwd, 'src/**/*.{ts,tsx,js,jsx}')]);
  }

  const absoluteSpecGlobs = specGlobs.map((g) => path.join(cwd, g));
  project.addSourceFilesAtPaths(absoluteSpecGlobs);

  const graph: DependencyGraph = {
    dependencies: new Map(),
    dependents: new Map(),
  };

  const sourceFiles = project.getSourceFiles();

  for (const sourceFile of sourceFiles) {
    const importerPath = sourceFile.getFilePath();
    ensureNode(graph, importerPath);

    for (const importDecl of sourceFile.getImportDeclarations()) {
      const importedFile = importDecl.getModuleSpecifierSourceFile();
      if (importedFile) {
        addEdge(graph, importerPath, importedFile.getFilePath());
      }
    }

    for (const exportDecl of sourceFile.getExportDeclarations()) {
      const exportedFile = exportDecl.getModuleSpecifierSourceFile();
      if (exportedFile) {
        addEdge(graph, importerPath, exportedFile.getFilePath());
      }
    }
  }

  return graph;
}
