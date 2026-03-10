# smart-cypress

> Run only the Cypress specs that are **provably** affected by your git changes — using a real dependency graph, not filename guessing.

---

## Why dependency-graph based analysis?

The naive approach of matching changed file names against spec file names fails constantly:

| Changed file | Naive match | Graph-based match |
|---|---|---|
| `src/services/authService.ts` | Looks for `auth` in spec names | Traverses: `authService → LoginForm → login.cy.ts` ✓ |
| `src/utils/httpClient.ts` | Looks for `http` or `client` | Finds every spec that uses any service that uses the client ✓ |
| `src/shared/Button.tsx` | May match dozens of unrelated specs | Matches only specs that import components using Button ✓ |

smart-cypress uses **ts-morph** (the TypeScript compiler API) to build an accurate import graph and then walks it with BFS to find every spec that is transitively affected.

---

## How it works

```
smart-cypress run
```

The CLI runs four steps:

```
[1/4] Detecting changed files
      git diff --name-only origin/main
          ↓
      src/services/authService.ts

[2/4] Building dependency graph
      ts-morph parses all TypeScript/JavaScript source files
      and builds a bidirectional import map.

      Forward graph (dependencies):
        login.cy.ts  →  LoginForm.tsx  →  authService.ts

      Reverse graph (dependents) – what the BFS traverses:
        authService.ts  →  LoginForm.tsx  →  login.cy.ts

[3/4] Detecting affected tests
      BFS from authService.ts through the reverse graph:
        authService.ts → LoginForm.tsx → login.cy.ts  ← spec found!

[4/4] Running Cypress
      npx cypress run --spec cypress/e2e/login.cy.ts
```

---

## Installation

### Inside a project (recommended)

```bash
npm install --save-dev smart-cypress
```

Add a script:

```json
"scripts": {
  "test:affected": "smart-cypress run"
}
```

### Global

```bash
npm install -g smart-cypress
```

---

## Build from source

```bash
git clone https://github.com/your-org/smart-cypress.git
cd smart-cypress

npm install        # install dependencies (includes ts-morph)
npm run build      # compiles TypeScript → dist/
npm link           # makes 'smart-cypress' available system-wide
```

### Development mode (no build needed)

```bash
npm run dev -- run
# Uses tsx to execute TypeScript sources directly
```

---

## Usage

```
smart-cypress run [options]
```

| Option | Default | Description |
|---|---|---|
| `-b, --base <ref>` | `origin/main` | Git ref to diff against (branch name or commit SHA) |
| `--tsconfig <path>` | `tsconfig.json` | Path to tsconfig.json, relative to project root |
| `--spec-globs <globs>` | `cypress/e2e/**/*.cy.ts,cypress/e2e/**/*.cy.js` | Comma-separated globs for spec discovery |
| `--headed` | `false` | Run Cypress with a visible browser window |
| `--browser <name>` | _(Cypress default)_ | `chrome`, `firefox`, `edge`, etc. |
| `--run-all-on-no-match` | `false` | Fall back to the full suite when no specs are affected |

### Examples

```bash
# Standard usage
smart-cypress run

# Diff against a feature branch instead of main
smart-cypress run --base origin/develop

# Custom tsconfig location (e.g. monorepo package)
smart-cypress run --tsconfig packages/app/tsconfig.json

# Custom spec location
smart-cypress run --spec-globs "tests/e2e/**/*.cy.ts"

# Run headed in Chrome and fall back if nothing matches
smart-cypress run --headed --browser chrome --run-all-on-no-match
```

---

## Example CLI output

```
────────────────────────────────────────────────────
  smart-cypress  –  dependency-graph test runner
────────────────────────────────────────────────────
  Base ref      : origin/main
  tsconfig      : tsconfig.json
  Spec globs    : cypress/e2e/**/*.cy.ts, cypress/e2e/**/*.cy.js
────────────────────────────────────────────────────

[1/4] Detecting changed files…
      Found 1 changed file(s):
        • src/services/authService.ts

[2/4] Building dependency graph…
      Parsing project with ts-morph (this may take a moment on large repos)…
      Graph built. 142 file node(s) indexed.

[3/4] Detecting affected tests…
      Affected specs (1):
        • cypress/e2e/login.cy.ts

[4/4] Running Cypress…

  $ npx cypress run --spec cypress/e2e/login.cy.ts

  ... Cypress output ...

────────────────────────────────────────────────────
  ✓  All affected tests passed.
────────────────────────────────────────────────────
```

---

## Project structure

```
smart-cypress/
├── bin/
│   └── smart-cypress.ts          # CLI entry point (shebang)
│
├── src/
│   ├── types/
│   │   └── graphTypes.ts         # DependencyGraph + option interfaces
│   │
│   ├── git/
│   │   └── getChangedFiles.ts    # git diff wrapper
│   │
│   ├── graph/
│   │   └── buildDependencyGraph.ts  # ts-morph static analysis + graph build
│   │
│   ├── analyzer/
│   │   └── detectAffectedTests.ts   # BFS traversal over reverse graph
│   │
│   ├── runner/
│   │   └── runCypress.ts         # Cypress process spawner
│   │
│   ├── cli/
│   │   └── run.ts                # Commander command + orchestration
│   │
│   └── utils/
│       ├── logger.ts             # Consistent terminal output
│       └── pathUtils.ts          # Absolute ↔ relative path helpers
│
├── package.json
├── tsconfig.json
└── README.md
```

### Module responsibilities

| Module | Responsibility |
|---|---|
| `getChangedFiles` | Shells out to git; returns relative file paths |
| `buildDependencyGraph` | Creates a ts-morph `Project`, walks all imports and re-exports, returns a bidirectional `Map`-based graph with absolute paths |
| `detectAffectedTests` | BFS over the reverse graph; converts git-relative paths to absolute for lookup, returns absolute spec paths |
| `runCypress` | Spawns `npx cypress run` with `stdio: inherit` so output streams live to the terminal |
| `cli/run.ts` | Orchestrates all four steps; handles flags, error reporting, and `--run-all-on-no-match` fallback |

---

## Key design decisions

### Reverse graph for BFS

ts-morph tells us "A imports B" (forward edge). We store the **reverse** too: "B is imported by A". Starting BFS from a changed file and following reverse edges naturally surfaces every file that **depends on** the changed file, all the way up to specs.

### Absolute paths in the graph

ts-morph returns absolute paths; git returns relative paths. All graph keys are absolute, and changed files are resolved to absolute before lookup. Display output converts back to relative.

### Re-exports are tracked

```ts
// barrel.ts
export { authService } from './authService';
```

If `authService.ts` changes, `barrel.ts` depends on it, and any spec that imports `barrel.ts` is correctly flagged. This is handled by also iterating `getExportDeclarations()` in addition to `getImportDeclarations()`.

### Non-TypeScript files are handled gracefully

Changed `.css`, `.png`, `.json`, or shell files are not in the ts-morph graph. They are reported as warnings and skipped — they do not cause crashes.

---

## Future roadmap

| Feature | Description |
|---|---|
| **Graph caching** | Serialise the dependency graph to disk and invalidate only the files that changed. Reduces graph-build time from seconds to milliseconds on repeat runs. |
| **Coverage-based TIA** | Instrument the source with Istanbul/nyc during a full run, record which files each spec exercises, and use that data instead of static imports. Catches dynamic `require()` and runtime polymorphism. |
| **Dynamic import support** | Extend the graph builder to also follow `import('./foo')` calls via ts-morph AST traversal (`SyntaxKind.ImportExpression`). |
| **GitHub Actions integration** | First-class CI mode: post affected spec count as a PR comment, set a status check, and fall back to the full suite on merge-to-main. |
| **Parallel execution** | Split affected specs across multiple Cypress workers using `--spec` sharding. |
| **Monorepo support** | Walk multiple `tsconfig.json` files across packages and merge the resulting graphs. |

---

## License

MIT
