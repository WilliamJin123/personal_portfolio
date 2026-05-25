# Résumé Component System — Phase 2A: Animated Per-Entry Viewer

**Date:** 2026-05-25
**Status:** Design — pending review
**Depends on:** Phase 1 (`src/resume/` library + LaTeX generator, shipped `7c640b9`)

## Goal

Replace the placeholder data in the landing's "selected work" master-detail browser with the **real résumé library**, and render each selected entry's bullets as **animated HTML** — the same content `npm run resume` emits to LaTeX, now shown live. One library, two renderers (LaTeX + HTML), exactly as scoped in the Phase 1 design.

This is **Phase 2A** of the viewer. Phase 2B (a full-document "read the whole résumé" assembly behind a third view toggle) and Phase 3 (private tailoring tool) are **out of scope** here and get their own spec/plan.

## Decisions locked (this session)

1. **Layout stays master-detail — no timeline.** The data has no time-spread to justify an axis: all three jobs fall in one overlapping summer-2025 block, all three projects cluster Sept–Nov 2025. Master-detail also lets entries order by relevance (the point of tailoring) and gives the animated bullets a focused home.
2. **Build order: A first, then B.** Per-entry animation in the detail panel now; full-doc assembly later.
3. **Animation = Treatment 01 "Editorial ink-in"** (chosen from a 3-way prototype): bullets rise in line-by-line; **bold** spans flash `mute → amber → ink`; links draw their amber underline left-to-right.
4. **Privacy: commit `entries.ts` (+ `skills.ts`), keep `profile.ts` private.** Project/work descriptions are public site content anyway; the phone (in `profile.ts`) is never needed by the public site.

## Architecture

**One library, two renderers.** Phase 1 built `tokenize()` + `tokensToLatex()`. Phase 2A adds `tokensToHtml()` — a direct mirror of `latex.ts`. Both consume the same `Token[]`; neither knows about the other.

**Build-time data, not runtime fetch.** The landing is a single self-contained Astro page whose client logic lives in a verbatim `<script is:inline>` block (not bundled, cannot import modules). So entries are read at **build time** in the Astro frontmatter, rendered to bullet HTML, and serialized into a `<script type="application/json">` tag the inline script parses on load. The gitignored source never ships; only rendered output does.

**Portfolio media is a separate layer.** The résumé library stays text-only by design (it feeds `.tex` and has no image concept). Gallery images and tech-stack icons are portfolio *presentation*, so they live in a new committed map keyed by entry `id`, layered on top of the library at build time. The library never grows an `image` field.

## Data & privacy boundary

`data/index.ts` assembles `library = { profile, skills, entries }` — it imports `profile` (phone). The public build must therefore **never import `index.ts`**.

- **Landing** imports `entries` directly from `src/resume/data/entries.ts` (which imports only `../types` — clean, no profile).
- **`.tex` generator** (`scripts/build-resume.ts`) keeps importing the full `library` via `index.ts` — William-only, unchanged.

`.gitignore` change (line 248): replace `/src/resume/data/` with:
```
/src/resume/data/profile.ts
/src/resume/data/index.ts
```
This commits `entries.ts` + `skills.ts`, keeps `profile.ts` (phone) and `index.ts` (the only file that pulls profile) private.

> **Known limitation:** a fresh clone can't `npm run resume` or fully `astro check` `build-resume.ts` (missing `profile.ts`/`index.ts`) — identical to today, since all of `data/` was already ignored. The public `astro build` is unaffected (it imports only `entries.ts`). Full clone-buildability (a committed `profile.example.ts`) is optional hardening, out of scope.

## Files

**Create:**
- `src/resume/html.ts` — `escapeHtml(s)` + `tokensToHtml(tokens)`.
- `src/resume/html.test.ts` — mirror of `latex.test.ts`.
- `src/data/portfolio-media.ts` — `portfolioMedia: Record<string, { stack?: string[]; images?: string[]; footnotes?: string[] }>`, keyed by entry id (`'solshare'`, `'ualberta'`, …). Seeded with stack slugs; images empty for now (none exist in `public/` yet).

**Modify:**
- `.gitignore` — privacy boundary above.
- `src/pages/index.astro` — frontmatter (imports + view model + JSON script), markup (detail bullets list + JSON tag), inline script (parse real data, render bullets, treatment-01 trigger), style (treatment-01 keyframes/classes).

## `tokensToHtml` contract (mirrors `tokensToLatex`)

```ts
export function escapeHtml(s: string): string; // & < > " escaped
export function tokensToHtml(tokens: Token[]): string;
```
- `text`  → `escapeHtml(value)`
- `bold`  → `<span class="rbold">${escapeHtml(value)}</span>`
- `link`  → `<a class="rlink" href="${href}" target="_blank" rel="noreferrer">${escapeHtml(label)}</a>`
  (href left raw in v1, matching `latex.ts`'s raw-URL choice.)

## Build-time view model (Astro frontmatter)

For each entry where `section === 'projects'` or `'experience'` (education excluded — it belongs to Phase 2B's full doc), build:
```ts
{ id, title, role?, dateLabel, location?, subtitle?, link?,
  bulletsHtml: entry.bullets.map(b => tokensToHtml(tokenize(b.text))),
  stack: media?.stack ?? [], images: media?.images ?? [], footnotes: media?.footnotes ?? [] }
```
Group into `{ projects: [...], work: [...] }`, serialize with `JSON.stringify(vm).replace(/</g, '\\u003c')` (prevents `</script>` breakout), emit as `<script type="application/json" id="work-data">`.

## Detail panel (replaces placeholder name/desc/stack)

Selected entry renders as a résumé block:
- `wd-idx` — `01`-style index (kept).
- `wd-name` — `title`.
- `wd-meta` (was `wd-sub`) — `role · dateLabel · location`, joined on present fields (mono).
- `wd-subtitle` — `subtitle` (award/grant line), shown only if present.
- `wd-bullets` — `<ul class="rbul"><li class="rbullet" style="--bi:N">{bulletsHtml[N]}</li>…</ul>`.
- `wd-stack` — icon chips from `stack` (reuses existing `ICONS`/`iconURL`/`chips`), kept as portfolio enrichment below bullets.

Gallery is unchanged; with `images: []` it shows the current `image — tbd` placeholder. Cards view unchanged (title + subtitle/meta).

## Animation — Treatment 01 "Editorial ink-in"

Header (idx/name/meta/subtitle) is static in v1. Only bullets animate. Trigger: `renderDetail()` sets `innerHTML`, removes `.play` from `#wdetail`, forces reflow, re-adds `.play` → CSS animations run. Fires on every selection and on `switchSet`; also once when the section first scrolls into view.

```css
@keyframes rRise { from{opacity:0;transform:translateY(11px)} to{opacity:1;transform:none} }
@keyframes rInk  { 0%{color:var(--mute)} 45%{color:var(--amber)} 100%{color:var(--ink)} }
@keyframes rUl   { from{background-size:0 1.6px} to{background-size:100% 1.6px} }

.rbold{font-weight:680;color:var(--ink)}
.rlink{color:var(--ink);text-decoration:none;
  background:linear-gradient(var(--amber),var(--amber)) left bottom/100% 1.6px no-repeat;padding-bottom:1px}

.wdetail.play .rbullet{animation:rRise .6s cubic-bezier(.2,.7,.2,1) backwards;animation-delay:calc(var(--bi)*.11s)}
.wdetail.play .rbold  {animation:rInk  .75s ease backwards;animation-delay:calc(var(--bi)*.11s + .12s)}
.wdetail.play .rlink  {animation:rUl   .55s cubic-bezier(.2,.7,.2,1) backwards;animation-delay:calc(var(--bi)*.11s + .2s)}
```
`backwards` fill keeps staggered elements hidden until their delay. Replaces the existing `.swap` opacity crossfade in `renderDetail`.

## Error handling

- `escapeHtml` on all user-text token output prevents injection from bullet content.
- `</script>` breakout prevented by escaping `<` in the serialized JSON.
- `portfolioMedia[id]` missing → defaults `{ stack: [], images: [] }`.
- Optional fields (`role`, `location`, `subtitle`, `link`) render conditionally — projects have no `role`, experience has no `subtitle`/`link`.

## Testing

- **`html.test.ts`** (vitest, mirrors `latex.test.ts`): plain text, bold span, text-around-bold, link anchor, HTML-escaping of `< > &` in text/bold/label, unclosed markup stays literal.
- **Regression:** existing 17 tests + new ones pass via `npx vitest run`.
- **Types:** `astro check` clean.
- **Visual:** dev server + the established screenshot loop to verify the ink-in motion, then live review with William.

## Editability (requirement, realized in a later phase)

The whole résumé must stay **very human-editable** — both ways:
1. **Directly in the files** (VS Code) — already true today: entries are plain typed TS objects with autocomplete and type-checking. Phase 2A must keep this property; nothing here should make the source harder to hand-edit.
2. **Through a private interface for William** — a future editing UI (the reframed Phase 3, below).

This sequences **after** Phase 2A integration, per William's direction. One forward implication to settle when we get there: a write-back UI round-trips data far more easily from a declarative format (JSON / YAML / Markdown) than from TS object modules. Phase 2A's tokenizer → view-model pipeline is format-agnostic, so migrating the *source* format later is a localized change (swap the import/loader), not a rework. Flagged, not decided.

## Roadmap (post-2A)

- **Phase 2B** — full-document assembly (header + all experience/projects + education + skills) behind a third view toggle, reusing `tokensToHtml`. Commits `skills.ts` when built.
- **Phase 3 — Editing & tailoring interface** (private): create/edit/reorder/toggle entries and bullets, mix-and-match selection, export `.tex`. Subsumes the original "tailoring tool" plus the new editability requirement. Will likely migrate the data source to a write-friendly format.
- Real gallery images (none exist yet); `images: []` keeps the current placeholder until they're added to `public/` and mapped in `portfolio-media.ts`.
