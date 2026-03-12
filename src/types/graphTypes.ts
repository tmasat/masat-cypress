export interface DependencyGraph {
  dependencies: Map<string, Set<string>>;
  dependents: Map<string, Set<string>>;
}

export interface GraphBuildOptions {
  cwd?: string;
  tsConfigPath?: string;
  specGlobs?: string[];
  logger?: import('../utils/logger').Logger;
}
