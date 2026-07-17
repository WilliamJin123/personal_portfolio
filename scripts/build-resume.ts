import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { library } from '../src/resume/data/index';
import { defaultSelection, generateResume, type ResumeVariant } from '../src/resume/generate';
import { assertValid, formatIssues } from '../src/resume/validate';
import type { Selection } from '../src/resume/types';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// The classic (W25-layout) variant carries its own content calls, applied here
// as selection overrides so entries.ts — and with it the modern one-pager and
// the site viewer — stays untouched:
//  - WE Accelerate comes back (the W25 résumé carried it; it holds the AZ-900/
//    AI-900 certs even though it's a PD program, not validated employment).
//  - SolShare is abbreviated to its award line + the one-liner on what it is;
//    the wins do the talking and the reclaimed lines pay for WE Accelerate.
//  - Tract sits out: with WE Accelerate in, the airier W25 layout can't hold
//    four projects, and Tract is the only one without an award/grant — every
//    project the classic page keeps gets the design's signature achievement
//    line. The modern one-pager still carries it.
//  - Jindon reads above WE Accelerate (render order follows entryIds — the swap
//    lives here, classic-only), and both are trimmed to their two strongest
//    bullets: Jindon keeps what he built + the 10x metric, WE Accelerate keeps
//    what the program was + the AZ-900/AI-900 certs.
function classicSelection(): Selection {
  const entries = library.entries.filter(
    (e) => (e.include !== false || e.id === 'weaccel') && e.id !== 'tract',
  );
  const entryIds = entries.map((e) => e.id);
  const jindon = entryIds.indexOf('jindon');
  const weaccel = entryIds.indexOf('weaccel');
  if (weaccel >= 0 && jindon > weaccel) {
    entryIds.splice(jindon, 1);
    entryIds.splice(weaccel, 0, 'jindon');
  }
  const sel: Selection = {
    entryIds,
    bulletIds: Object.fromEntries(
      entries.map((e) => [e.id, e.bullets.filter((b) => b.default !== false).map((b) => b.id)]),
    ),
  };
  sel.bulletIds['solshare'] = ['ios'];
  sel.bulletIds['jindon'] = ['intake', 'sql'];
  sel.bulletIds['weaccel'] = ['chatbot', 'certs'];
  return sel;
}

const variants: { variant: ResumeVariant; shell: string; out: string; selection: Selection }[] = [
  { variant: 'modern', shell: 'src/resume/shell.tex', out: 'out/resume.tex', selection: defaultSelection(library) },
  { variant: 'classic', shell: 'src/resume/shell-classic.tex', out: 'out/resume-classic.tex', selection: classicSelection() },
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
