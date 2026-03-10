export interface DependencyGraph {
  dependencies: Map<string, Set<string>>;
  dependents: Map<string, Set<string>>;
}

export interface SerializableGraph {
  dependencies: Record<string, string[]>;
  dependents: Record<string, string[]>;
}

export interface GraphBuildOptions {
  cwd?: string;
  tsConfigPath?: string;
  specGlobs?: string[];
}
