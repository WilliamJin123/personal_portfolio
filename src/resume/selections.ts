import type { ResumeLibrary, Selection } from './types';

// The classic (W25-layout) variant carries its own content calls, applied as
// selection overrides so entries.ts — and with it the modern one-pager and
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
export function classicSelection(lib: ResumeLibrary): Selection {
  const entries = lib.entries.filter(
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
