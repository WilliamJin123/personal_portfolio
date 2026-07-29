import type { ResumeLibrary, Selection } from './types';

// The classic (W25-layout) variant carries its own content calls, applied as
// selection overrides so entries.ts — and with it the modern one-pager and
// the site viewer — stays untouched.
//
// Rewritten 2026-07-26 after external review. The page previously ran WE
// Accelerate as a fourth Experience entry, and paid for it by cutting Tract and
// by squeezing SolShare down to a single bullet and Jindon to two. The reviewer
// hit every symptom of that trade at once: SolShare "needs more description
// than 1 point", "a project without any technical implementation description
// will look shallow", and on WE Accelerate itself, "move into projects (if even
// worth it)".
//
// So the trade is reversed. WE Accelerate comes OFF: it is a professional
// development program, not validated employment, and it was occupying an
// Experience slot — the section a recruiter weighs most — with the least
// defensible entry on the page. Its one durable output, the AZ-900/AI-900
// certs, moved to a Certifications line under Education (see entries.ts), so
// nothing is actually lost.
//
// The four lines that frees go to depth, not to another entry: Jindon, SolShare
// and both remaining projects go to three bullets each. Tract still sits out —
// the reviewer's whole thesis is that a shallow project is worse than no
// project, so a fourth project at two bullets would undo the point of removing
// WE Accelerate. It stays on the modern one-pager.
export function classicSelection(lib: ResumeLibrary): Selection {
  const entries = lib.entries.filter((e) => e.include !== false && e.id !== 'tract');
  const sel: Selection = {
    entryIds: entries.map((e) => e.id),
    bulletIds: Object.fromEntries(
      entries.map((e) => [e.id, e.bullets.filter((b) => b.default !== false).map((b) => b.id)]),
    ),
  };
  return sel;
}
