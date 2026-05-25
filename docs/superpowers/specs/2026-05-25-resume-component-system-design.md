# Resume Component System — Design

**Date:** 2026-05-25
**Status:** Spine approved. Phase 1 specified in full; Phases 2–3 outlined (each gets its own design pass).
**Author:** William Jin (with Claude)

## Problem

William tailors his résumé per job application — cycling projects and work-experience entries in and out to show only what's relevant. Today that means hand-editing a LaTeX file every time. He wants to mix-and-match pre-written components to assemble a tailored résumé quickly, and — because his portfolio renders the same content — reuse those components as a live, animated on-site viewer.

## Vision

**One content library, rendered three ways:**

1. **Portfolio detail** — the master-detail projects/work section (`mocks/` List-5).
2. **Public résumé viewer** — a live, animated render of the résumé on the site.
3. **Private tailoring tool** — select / reorder components → export `.tex`.

Two surfaces are public (portfolio detail, viewer); one is private (tool). All three read the same source of truth, so the work compounds instead of forking.

### Keystone decision

**Store structured data, not LaTeX. Generate `.tex` from the data.** A bullet is `{ text, tags }` where `text` carries inline marks; emphasis is a *property*, not a `\textbf{}` string. From one source we emit (a) `.tex` for compilation and (b) animated HTML for the viewer. This is what lets the viewer animate the bold spans without parsing LaTeX, and what keeps the data reusable across all three surfaces.

## Architecture

### Layers

- **Library** — structured content (entries, bullets, skills, profile). Extends the existing `projects` content collection.
- **Tokenizer** — parses a bullet's constrained-markdown `text` into a token stream; one source feeds both renderers.
- **LaTeX generator** — walks library + selection → emits macro calls → injects into a preamble *shell*.
- **Viewer** (Phase 2) — renders library + selection → animated HTML.
- **Tailoring tool** (Phase 3) — edits a selection; drives the generator + viewer.

### The LaTeX shell-vs-body split

William's résumé is a volatile **preamble shell** (`\documentclass`, the `\resume*` macro definitions, all the `\vspace` tuning) plus a **body** (macro calls). The macros are the component interface:

- `\resumeSubheading{title}{location}{role}{dates}` — work / education entry
- `\resumeProject{name}{subtitle}{date}` — project entry
- `\item …` — bullet
- `\skilltag{…}` — skill chip

The generator emits **only the body** and leaves the shell untouched. William can redesign the shell freely ("will be changed significantly later"); as long as the macro names hold, generation is unaffected. Renaming a macro is a one-line mapping in the generator.

## Content model (Phase 1)

Extend the `projects` schema in `src/content.config.ts` with a `resume` block, and add two small data files (`skills`, `profile`). One entry file then serves **both** the portfolio (existing fields + MDX body) and the résumé (the `resume` block) — the single source of truth, concretely.

```ts
// src/content.config.ts — added to the projects schema
const resumeBullet = z.object({
  id: z.string(),
  text: z.string(),                          // constrained markdown (see below)
  tags: z.array(z.string()).default([]),     // hand-entered relevance metadata
  default: z.boolean().default(true),        // included in a fresh tailoring
});

resume: z.object({
  section: z.enum(['experience', 'projects', 'education']),
  dateLabel: z.string(),                      // résumé date string, e.g. "July 2025 - Sept 2025"
  location: z.string().optional(),            // experience / education
  subtitle: z.string().optional(),            // projects: the award / grant line
  link: z.object({ label: z.string(), href: z.string() }).optional(),
  bullets: z.array(resumeBullet).default([]),
  include: z.boolean().default(true),         // is this entry in the résumé pool at all
}).optional(),
```

```yaml
# example: a project entry's frontmatter (real data)
type: project
title: SolShare
year: "2025"
# …existing portfolio fields (summary, stack, links, note, hero)…
resume:
  section: projects
  dateLabel: "Sept 2025"
  subtitle: "1st for Cohere API best use; Solana best consumer payment experience — Hack the North"
  link: { label: "repo", href: "https://github.com/orgs/HTN-2025/repositories" }
  bullets:
    - id: ios
      text: "Developed a bill-splitting **iOS** application that automates receipt parsing and payment processing"
      tags: [ios, swift, mobile]
    - id: cohere
      text: "Extracted receipt data using Cohere's vision and reasoning models through a **self-critic** workflow"
      tags: [ai, llm, vision]
    - id: backend
      text: "Built the backend using **Firebase Cloud Functions** and **Firestore**, frontend in **SwiftUI**"
      tags: [firebase, backend, swiftui]
```

Two small data files, separate from entries:

- `profile` — `{ name, phone, email, links: [{ label, href, icon }] }` (the header; static across résumés).
- `skills` — `[{ category, items: [string] }]` (categories → tags, matching the `\skilltag` rows).

### Bullet text = constrained markdown

A bullet's `text` uses a tiny, fixed subset of markdown:

- `**bold**` → emphasis (viewer animates it; LaTeX `\textbf{…}`)
- `[label](href)` → link (viewer `<a>`; LaTeX `\href{href}{label}`)
- everything else → literal text (LaTeX-escaped)

One **tokenizer** turns `text` into a token list (`[{ type: 'text' | 'bold' | 'link', … }]`). Both renderers consume tokens — neither re-parses. Rationale: markdown is ergonomic to author, and a single parse step is the concrete form of "store data, not LaTeX."

His real bolds (`7,000+`, `10x`, `72%`, `AZ-900`, `Swift SDK`, `Firebase`, `Unsloth`) are metrics and tech keywords — exactly the spans the viewer should animate to signal "the keywords that matter," and exactly what tag-driven tailoring would key on later.

## LaTeX generator (Phase 1)

**Input:** library + a **selection** — `{ entryIds in order, perEntry: { entryId: bulletIds in order } }`. In Phase 1 (no tool yet) the selection defaults to "every entry/bullet with `default: true`," producing the base résumé.

**Output:** a complete `.tex` string = shell preamble + generated body + `\end{document}`.

**Process:**

1. Header from `profile`.
2. Skills from `skills` (categories → `\skilltag`).
3. For each section in order (experience → projects → education): `\section{…}` + list start + per entry the right macro (`\resumeSubheading` / `\resumeProject`) + `\resumeItemListStart` + per bullet `\item <tokens→latex>` + list ends.

### LaTeX escaping

Text tokens must escape LaTeX specials: `% & _ # $ { } ~ ^ \`. (His real content contains `72%` and `WE Accelerate Azure & AI Stream`.) Escaping applies to `text`-type tokens only; the `**` / `[]()` markup is structural and consumed by the tokenizer before escaping.

### Acceptance test

Re-encode William's **current** résumé as library data, generate `.tex`, compile, and confirm it reproduces his current hand-written PDF (visual diff). This proves fidelity of the data→LaTeX path before anything else is built on top of it.

## Phases

### Phase 1 — Library + generator (this spec)

Content model, tokenizer, generator. No UI. Deliverable: `data → .tex` that reproduces his current résumé. A small build script or dev-only route emits the file; he compiles as he does today (no in-browser TeX).

### Phase 2 — Public viewer (needs its own design pass)

Render library + selection to animated HTML on the portfolio. Reuses the site's existing scroll-draw / pop animation vocabulary; bold tokens animate to signal the keywords that matter. Ties into the List-5 master-detail. **Visual design pass (with the visual companion) required before implementation.**

### Phase 3 — Private tailoring tool (needs its own design pass)

A private route. Toggle / reorder Experience + Projects entries and their bullets (manual selection; `tags` are hand-entered metadata, no auto-engine yet), live preview through the viewer, export `.tex`. Optional later: named presets per job. **UI design pass required before implementation.**

## Scope / non-goals (v1)

- Manual selection only; no tag-driven auto-selection.
- Exports `.tex`; no in-browser LaTeX compilation.
- Header, Education, and Skills are a stable shell — editable, but not the per-job mix-and-match surface. The tailoring surface is **Experience + Projects** (his words: "cycle out projects / work experience").
- Viewer and tool *visual* design are deferred to their phase design passes.

## Error handling

- LaTeX escaping (above).
- Optional fields (location / link / subtitle) absent → macro arg empty, not broken.
- Empty section → omitted, not an empty `\section`.
- Malformed bullet markup → tokenizer falls back to literal text (never emits a raw `**`).

## Testing

- **Tokenizer:** unit tests for bold, link, escaping, and malformed-markup fallback.
- **Generator:** snapshot test (fixture data → expected `.tex`).
- **Fidelity:** the acceptance test above.

## Open questions (Phase 1)

- Where the generator runs: a build-time script vs. a dev-only route. (Lean: a small script/route that writes `<name>.tex`.)
- Where the preamble shell lives: a `resume-shell.tex` checked into the repo as the single source for the volatile part.
