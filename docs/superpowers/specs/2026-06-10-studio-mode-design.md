# Studio mode — toggleable WebGL second site (shell)

Date: 2026-06-10. Approved by William in-session.

## Goal

The portfolio becomes two websites in one: the existing light "paper" site
(recruiter-fast, restrained) and a dark, WebGL/Three.js "studio" experience
(scroll-driven scenes, full-bleed canvas — the designer playground). This spec
covers the **shell only**: the mode exists, toggles both ways, and has a
working scroll→scene rig that future design passes build on. The real visual
design of the studio world is explicitly out of scope here.

## Decisions

- **Separate route** (`/studio`), not an in-page swap. Each mode pays only for
  its own JS; the paper site stays untouched and remains the default landing.
  Deep-linkable. A choreographed transition between modes can come later
  (overlay wipe / view transitions) — phase 2.
- **No persistence.** Visitors always land on the paper site; `/studio` is an
  invitation, not a trap.
- **Toggle naming:** `Studio` link in the paper nav; `Exit` control in studio.
  - *Amended post-ship:* William wanted a name that's obviously clickable —
    route renamed to **`/3d`**, button relabeled **"Enter 3D"** with a periodic
    beacon (amber node pulse + border self-trace every ~7s, previewing the
    hover state). `/studio` 308-redirects via astro.config.

## Components

- `src/pages/studio.astro` — self-contained page, same pattern as
  `index.astro` (own theme/fonts/scripts, inherits nothing). Near-black
  ground (`#0b0c0e`), light ink, same amber accent and Geist/Geist Mono as
  the paper site (the connective thread). Fixed full-viewport canvas behind
  3–4 full-viewport placeholder sections (entry / work / play / contact
  stubs) so the scroll rig has real distance to read from day one.
- `src/scripts/studio-scene.ts` — `initStudioScene(canvas)`, bundled module
  (Vite tree-shakes three.js; same conventions as `bg-terrain.ts`:
  pixel-ratio cap 2, resize handler, visibilitychange pause,
  reduced-motion = single static pose). Placeholder scene in the established
  hairline-linework aesthetic, driven by normalized scroll progress and
  pointer parallax.
- `src/pages/index.astro` — adds `studio: '/studio'` to the `links` object
  and a `Studio` nav link styled like the existing `.nl` links.

## Error handling

- WebGL unavailable / renderer construction throws → catch, leave the static
  dark page with copy + Exit link (never a broken canvas).
- `prefers-reduced-motion` → scene renders one static frame.

## Testing

Existing vitest suite must stay green; `astro build` must emit both pages.
Visual verification by loading both routes.
