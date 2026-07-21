import { readFileSync, mkdirSync, writeFileSync, copyFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { library } from '../src/resume/data/index';
import { defaultSelection, generateResume, type ResumeVariant } from '../src/resume/generate';
import { classicSelection } from '../src/resume/selections';
import { assertValid, formatIssues } from '../src/resume/validate';
import type { ResumeLibrary, Selection } from '../src/resume/types';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// Web library (William, 2026-07-20): the site's CV link serves a résumé built
// from the same content but WITHOUT the phone number — the repo and the live
// site are public, and the phone stays out of both. Everything else (email,
// links, entries, skills) is identical to the applied-with PDFs.
const { phone: _phone, ...webProfile } = library.profile;
const webLibrary: ResumeLibrary = { ...library, profile: webProfile };

const variants: { variant: ResumeVariant; lib: ResumeLibrary; shell: string; out: string; selection: Selection }[] = [
  { variant: 'modern', lib: library, shell: 'src/resume/shell.tex', out: 'out/resume.tex', selection: defaultSelection(library) },
  { variant: 'classic', lib: library, shell: 'src/resume/shell-classic.tex', out: 'out/resume-classic.tex', selection: classicSelection(library) },
  // Same modern layout, phone-free header; compiled + published below.
  { variant: 'modern', lib: webLibrary, shell: 'src/resume/shell.tex', out: 'out/resume-web.tex', selection: defaultSelection(webLibrary) },
];

mkdirSync(resolve(root, 'out'), { recursive: true });

for (const v of variants) {
  const shell = readFileSync(resolve(root, v.shell), 'utf8');

  // Validate before generating: fail loud on integrity errors (rather than
  // silently emitting a broken or incomplete .tex), and surface soft warnings.
  let warnings;
  try {
    warnings = assertValid(v.lib, v.selection);
  } catch (err) {
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
  if (warnings.length > 0) {
    console.warn(
      `Résumé validation (${v.variant}, ${v.out}) passed with ${warnings.length} warning(s):\n${formatIssues(warnings)}`,
    );
  }

  writeFileSync(resolve(root, v.out), generateResume(v.lib, v.selection, shell, v.variant));
  console.log(`Wrote ${v.out}`);
}

// Publish the web variant: compile it and drop the PDF into public/, where
// Astro serves it at /resume.pdf (both CV links on the landing page point
// there). This runs on every `npm run resume`, so the hosted CV can never go
// stale relative to the library. Needs tectonic locally (Homebrew); the
// Cloudflare Pages deploy only runs `astro build` and never enters here —
// public/resume.pdf is a committed artifact, built on this machine.
try {
  execFileSync('tectonic', [resolve(root, 'out/resume-web.tex'), '--outdir', resolve(root, 'out')], {
    stdio: 'inherit',
  });
} catch {
  console.error(
    'tectonic failed or is not installed — public/resume.pdf was NOT refreshed (out/*.tex were still written).',
  );
  process.exit(1);
}
copyFileSync(resolve(root, 'out/resume-web.pdf'), resolve(root, 'public/resume.pdf'));
console.log('Published public/resume.pdf (web variant — no phone in the header)');
