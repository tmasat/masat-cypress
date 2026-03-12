export class GitError extends Error {
  readonly code = 'GIT_ERROR' as const;

  constructor(message: string) {
    super(message);
    this.name = 'GitError';
  }
}

export class GraphError extends Error {
  readonly code = 'GRAPH_ERROR' as const;

  constructor(message: string) {
    super(message);
    this.name = 'GraphError';
  }
}

export class ConfigError extends Error {
  readonly code = 'CONFIG_ERROR' as const;

  constructor(message: string) {
    super(message);
    this.name = 'ConfigError';
  }
}
