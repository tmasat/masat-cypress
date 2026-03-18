import { detectAffectedTests } from '../analyzer/detectAffectedTests';
import type { DependencyGraph } from '../types/graphTypes';

const CWD = '/project';

function makeGraph(): DependencyGraph {
  return {
    dependencies: new Map(),
    dependents: new Map(),
  };
}

function addEdge(graph: DependencyGraph, importer: string, importee: string): void {
  if (!graph.dependencies.has(importer)) graph.dependencies.set(importer, new Set());
  if (!graph.dependencies.has(importee)) graph.dependencies.set(importee, new Set());
  if (!graph.dependents.has(importer)) graph.dependents.set(importer, new Set());
  if (!graph.dependents.has(importee)) graph.dependents.set(importee, new Set());

  graph.dependencies.get(importer)!.add(importee);
  graph.dependents.get(importee)!.add(importer);
}

function addNode(graph: DependencyGraph, file: string): void {
  if (!graph.dependencies.has(file)) graph.dependencies.set(file, new Set());
  if (!graph.dependents.has(file)) graph.dependents.set(file, new Set());
}

describe('detectAffectedTests', () => {
  describe('empty graph', () => {
    it('returns empty results for empty graph and no changed files', () => {
      const graph = makeGraph();
      const result = detectAffectedTests([], graph, { cwd: CWD });
      expect(result.affectedSpecs).toEqual([]);
      expect(result.unknownFiles).toEqual([]);
    });

    it('puts all changed files into unknownFiles when graph is empty', () => {
      const graph = makeGraph();
      const result = detectAffectedTests(['src/foo.ts'], graph, { cwd: CWD });
      expect(result.affectedSpecs).toEqual([]);
      expect(result.unknownFiles).toEqual(['src/foo.ts']);
    });
  });

  describe('direct dependency (shallow)', () => {
    it('detects spec directly dependent on changed file', () => {
      const graph = makeGraph();
      const spec = '/project/cypress/e2e/login.cy.ts';
      const helper = '/project/src/utils/auth.ts';

      addEdge(graph, spec, helper);

      const result = detectAffectedTests(['src/utils/auth.ts'], graph, { cwd: CWD });
      expect(result.affectedSpecs).toContain(spec);
      expect(result.unknownFiles).toEqual([]);
    });

    it('does not include unrelated specs', () => {
      const graph = makeGraph();
      const spec1 = '/project/cypress/e2e/login.cy.ts';
      const spec2 = '/project/cypress/e2e/dashboard.cy.ts';
      const helper = '/project/src/utils/auth.ts';
      const otherHelper = '/project/src/utils/format.ts';

      addEdge(graph, spec1, helper);
      addEdge(graph, spec2, otherHelper);

      const result = detectAffectedTests(['src/utils/auth.ts'], graph, { cwd: CWD });
      expect(result.affectedSpecs).toContain(spec1);
      expect(result.affectedSpecs).not.toContain(spec2);
    });
  });

  describe('transitive dependency', () => {
    it('detects spec via A → B → spec chain', () => {
      const graph = makeGraph();
      const spec = '/project/cypress/e2e/login.cy.ts';
      const moduleB = '/project/src/api/client.ts';
      const moduleA = '/project/src/utils/http.ts';

      addEdge(graph, spec, moduleB);
      addEdge(graph, moduleB, moduleA);

      const result = detectAffectedTests(['src/utils/http.ts'], graph, { cwd: CWD });
      expect(result.affectedSpecs).toContain(spec);
    });

    it('detects spec via deep chain A → B → C → spec', () => {
      const graph = makeGraph();
      const spec = '/project/cypress/e2e/checkout.cy.ts';
      const c = '/project/src/c.ts';
      const b = '/project/src/b.ts';
      const a = '/project/src/a.ts';

      addEdge(graph, spec, c);
      addEdge(graph, c, b);
      addEdge(graph, b, a);

      const result = detectAffectedTests(['src/a.ts'], graph, { cwd: CWD });
      expect(result.affectedSpecs).toContain(spec);
    });
  });

  describe('unknownFiles', () => {
    it('populates unknownFiles for files not in the graph', () => {
      const graph = makeGraph();
      addNode(graph, '/project/src/known.ts');

      const result = detectAffectedTests(
        ['src/known.ts', 'src/unknown.ts'],
        graph,
        { cwd: CWD }
      );
      expect(result.unknownFiles).toContain('src/unknown.ts');
      expect(result.unknownFiles).not.toContain('src/known.ts');
    });
  });

  describe('multiple changed files', () => {
    it('collects specs from all changed files', () => {
      const graph = makeGraph();
      const spec1 = '/project/cypress/e2e/a.cy.ts';
      const spec2 = '/project/cypress/e2e/b.cy.ts';
      const file1 = '/project/src/util1.ts';
      const file2 = '/project/src/util2.ts';

      addEdge(graph, spec1, file1);
      addEdge(graph, spec2, file2);

      const result = detectAffectedTests(
        ['src/util1.ts', 'src/util2.ts'],
        graph,
        { cwd: CWD }
      );
      expect(result.affectedSpecs).toContain(spec1);
      expect(result.affectedSpecs).toContain(spec2);
    });

    it('deduplicates specs affected by multiple changed files', () => {
      const graph = makeGraph();
      const spec = '/project/cypress/e2e/shared.cy.ts';
      const file1 = '/project/src/a.ts';
      const file2 = '/project/src/b.ts';

      addEdge(graph, spec, file1);
      addEdge(graph, spec, file2);

      const result = detectAffectedTests(
        ['src/a.ts', 'src/b.ts'],
        graph,
        { cwd: CWD }
      );
      const count = result.affectedSpecs.filter((s) => s === spec).length;
      expect(count).toBe(1);
    });
  });

  describe('non-spec nodes in traversal', () => {
    it('does not include non-spec files in affectedSpecs', () => {
      const graph = makeGraph();
      const nonSpec = '/project/src/components/Button.ts';
      const file = '/project/src/utils/dom.ts';

      addEdge(graph, nonSpec, file);

      const result = detectAffectedTests(['src/utils/dom.ts'], graph, { cwd: CWD });
      expect(result.affectedSpecs).toEqual([]);
    });
  });
});
