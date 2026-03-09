import { globSync } from 'glob';
import path from 'path';

export interface AnalyzerOptions {
  specPattern: string;
  cwd?: string;
}

export interface AffectedTestsResult {
  specs: string[];
  keywords: string[];
}

const NOISE_SUFFIXES =
  /\.(service|component|controller|model|hook|util|helper|store|slice|reducer|action|selector|guard|interceptor|pipe|module|directive|resolver|middleware|schema|types?|interface|dto|entity|repository|factory|provider|adapter|gateway|decorator|validator|handler|listener|observer|strategy|command|query|event|context|wrapper|container|presenter|view|viewmodel)$/i;

function tokenise(name: string): string[] {
  return name
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .split(/[\s\-_.]+/)
    .map((w) => w.toLowerCase())
    .filter((w) => w.length > 1);
}

function extractKeywordsFromFile(filePath: string): string[] {
  const ext = path.extname(filePath);
  const basename = path.basename(filePath, ext);
  const cleanName = basename.replace(NOISE_SUFFIXES, '');

  const dirTokens = path
    .dirname(filePath)
    .split(path.sep)
    .flatMap((segment) => tokenise(segment))
    .filter((t) => !['src', 'app', 'lib', 'components', 'pages', 'features', 'modules'].includes(t));

  const nameTokens = tokenise(cleanName);

  return [...new Set([...nameTokens, ...dirTokens])];
}

function extractKeywordsFromSpec(specPath: string): string[] {
  const basename = path.basename(specPath);
  const cleanName = basename.replace(/\.(cy|spec)\.(ts|tsx|js|jsx)$/, '');
  return tokenise(cleanName);
}

export function detectAffectedTests(
  changedFiles: string[],
  options: AnalyzerOptions
): AffectedTestsResult {
  const { specPattern, cwd = process.cwd() } = options;

  const allKeywords = changedFiles.flatMap(extractKeywordsFromFile);
  const uniqueKeywords = [...new Set(allKeywords)];

  const specFiles = globSync(specPattern, { cwd, absolute: false });

  const matchedSpecs = specFiles.filter((specFile) => {
    const specTokens = extractKeywordsFromSpec(specFile);
    const specPathLower = specFile.toLowerCase();

    return (
      specTokens.some((st) => uniqueKeywords.includes(st)) ||
      uniqueKeywords.some((kw) => specPathLower.includes(kw))
    );
  });

  return {
    specs: matchedSpecs,
    keywords: uniqueKeywords,
  };
}
