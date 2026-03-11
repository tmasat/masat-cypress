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
