import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { library } from '../src/resume/data/index';
import { defaultSelection, generateResume, type ResumeVariant } from '../src/resume/generate';
import { classicSelection } from '../src/resume/selections';
import { assertValid, formatIssues } from '../src/resume/validate';
import type { Selection } from '../src/resume/types';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const variants: { variant: ResumeVariant; shell: string; out: string; selection: Selection }[] = [
  { variant: 'modern', shell: 'src/resume/shell.tex', out: 'out/resume.tex', selection: defaultSelection(library) },
  { variant: 'classic', shell: 'src/resume/shell-classic.tex', out: 'out/resume-classic.tex', selection: classicSelection(library) },
];

mkdirSync(resolve(root, 'out'), { recursive: true });

for (const v of variants) {
  const shell = readFileSync(resolve(root, v.shell), 'utf8');

  // Validate before generating: fail loud on integrity errors (rather than
  // silently emitting a broken or incomplete .tex), and surface soft warnings.
  let warnings;
  try {
    warnings = assertValid(library, v.selection);
  } catch (err) {
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
  if (warnings.length > 0) {
    console.warn(
      `Résumé validation (${v.variant}) passed with ${warnings.length} warning(s):\n${formatIssues(warnings)}`,
    );
  }

  writeFileSync(resolve(root, v.out), generateResume(library, v.selection, shell, v.variant));
  console.log(`Wrote ${v.out}`);
}
