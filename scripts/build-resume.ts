import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { library } from '../src/resume/data/index';
import { defaultSelection, generateResume } from '../src/resume/generate';
import { assertValid, formatIssues } from '../src/resume/validate';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const shell = readFileSync(resolve(root, 'src/resume/shell.tex'), 'utf8');
const selection = defaultSelection(library);

// Validate before generating: fail loud on integrity errors (rather than
// silently emitting a broken or incomplete .tex), and surface soft warnings.
let warnings;
try {
  warnings = assertValid(library, selection);
} catch (err) {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
}
if (warnings.length > 0) {
  console.warn(`Résumé validation passed with ${warnings.length} warning(s):\n${formatIssues(warnings)}`);
}

const tex = generateResume(library, selection, shell);

mkdirSync(resolve(root, 'out'), { recursive: true });
writeFileSync(resolve(root, 'out/resume.tex'), tex);
console.log('Wrote out/resume.tex');
