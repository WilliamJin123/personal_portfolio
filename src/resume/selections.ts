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
//
// ---------------------------------------------------------------------------
// 2026-07-29: Tract ON, SolShare OFF. William reports that Tract is the thing
// interviewers actually ask him about, which beats any argument from page
// composition — but it was only ever on the modern one-pager, so the page he
// applies with did not carry it.
//
// It had to be a swap, not an addition. Measured, not guessed: three jobs plus
// FOUR projects pushes the entire Skills block onto a second page, even with
// Stitch trimmed to three bullets. Both three-project swaps fit with room to
// spare (Tract-for-SolShare ends at y=781.5 of 792; Tract-for-Stitch at 780.4;
// today's page ends at 781.5). So the only question was which project pays.
//
// SolShare pays, not Stitch, for three reasons:
//   1. Redundancy. SolShare and the Solana Swift SDK are the same team, the
//      same chain, adjacent months and both Swift. Keeping both spends two of
//      three project slots on one story; dropping either costs the least
//      information on the page. Dropping Stitch instead would leave Tract plus
//      two crypto projects, which reads narrow for a general SWE application.
//   2. Skills evidence. Stitch is the ONLY bullet evidence on the page for
//      React, Next.js and Supabase, all three of which sit on the Full Stack
//      skills row. SolShare's stack is Firebase, which is carousel-only and not
//      on the row at all (see skills.ts). So this swap strands nothing.
//   3. Breadth. The section now runs one solo systems build (Tract), one
//      full-stack web build (Stitch) and one mobile/SDK build with a grant
//      (Solana) — three different kinds of engineering, and the three most
//      recent projects in the library.
//
// What it costs: the Hack the North 1st Place line, which is the better-known
// award of the two. That is a real loss and the reason this is a default rather
// than a rule. TO FLIP IT for iOS, crypto, fintech or consumer-payments roles
// — where SolShare's two track wins outrank Stitch's — change 'solshare' to
// 'stitch' on the filter below. Nothing else needs to move.
export function classicSelection(lib: ResumeLibrary): Selection {
  const entries = lib.entries.filter((e) => e.include !== false && e.id !== 'solshare');
  const sel: Selection = {
    entryIds: entries.map((e) => e.id),
    bulletIds: Object.fromEntries(
      entries.map((e) => [e.id, e.bullets.filter((b) => b.default !== false).map((b) => b.id)]),
    ),
  };
  return sel;
}
