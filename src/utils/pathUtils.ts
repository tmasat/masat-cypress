import path from 'path';

export function toAbsolute(filePath: string, cwd: string): string {
  return path.isAbsolute(filePath) ? filePath : path.resolve(cwd, filePath);
}

export function toRelative(absolutePath: string, cwd: string): string {
  return path.relative(cwd, absolutePath);
}

export function isCypressSpec(filePath: string): boolean {
  return /\.(cy|spec)\.(ts|js)$/.test(filePath);
}

export function makeSpecMatcher(extraSuffixes?: string[]): (filePath: string) => boolean {
  if (!extraSuffixes || extraSuffixes.length === 0) {
    return isCypressSpec;
  }
  const escaped = extraSuffixes.map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const extraRegex = new RegExp(`(${escaped.join('|')})$`);
  return (filePath: string) => isCypressSpec(filePath) || extraRegex.test(filePath);
}
