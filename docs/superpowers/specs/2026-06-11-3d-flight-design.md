# /3d — "The Flight" (cinematic scene, design)

Date: 2026-06-11 · Status: approved (brainstormed interactively; direction 1+4
"lit landscape + camera language", structure "one continuous flight")

## Intent

Replace the /3d placeholder scene (wireframe icosahedron shells) with the
site's first real scene: a cinematic, scroll-driven tracking shot across a
solid, lit loss landscape. The paper site keeps its restrained wireframe; /3d
gets the full film treatment. If the look earns it, a paper-graded variant may
later replace the landing-page background (explicitly out of scope here).

## The world

- One large static terrain (~140×300 segment grid) built from fbm value noise
  — same "loss landscape" family as the landing page, but rendered solid.
- A valley is carved along the flight path so the route reads as flying low
  through the terrain, ridges towering at the sides.
- Custom ShaderMaterial: flat-shaded via fragment derivatives (angular facets,
  matching the site's geometry language), one low amber directional sun ahead
  near the horizon, cool ambient fill, height-boosted exponential fog that
  pools in basins and eats the distance.
- Sky dome: dark gradient + amber sun disk with a haze band.
- The deepest basins along the corridor hold faint amber glow pools
  (additive radial patches) — the minima keep their meaning from the paper
  site, as the only luminous element besides the sun.

## The camera

- Scroll → progress p with the same exponential inertia as the landing page.
- p maps to travel along the valley path (a smooth lateral meander); camera
  height tracks the local floor + clearance.
- Look-at target ~22 units ahead with per-station bias keyframes (dip into a
  basin at Work, lift to the ridge at Play, rise toward the sun at Contact).
- Perlin-ish handheld sway + slight mouse parallax so the frame never freezes.

## The stations

- Hero, 01 Work, 02 Play, 03 Contact — the existing DOM sections provide
  scroll length; crossing a station boundary (p ≈ .32/.64/.96) triggers the
  film moment: letterbox bars ease in, a mono title card ("01 — WORK") fades,
  bars retract after ~1.5 s. Crossing-based, so bars never stick.
- Section content reveals via IntersectionObserver (fade + rise).

## The film stack

pmndrs `postprocessing`: one EffectPass with depth-of-field (desktop only;
focus racks nearer inside station zones), bloom (threshold tuned so only the
sun + glow pools catch), animated film grain, vignette. MSAA via composer
multisampling on desktop.

## Performance & fallbacks

- DPR cap 2 (1.5 mobile); DoF and multisampling dropped on mobile.
- prefers-reduced-motion: one static graded frame; section content shown.
- No-WebGL fallback (body.no-gl) and the mode shutter are untouched.
- `studio-scene.ts` is deleted; `flight-scene.ts` replaces it wholesale.

## Out of scope

Audio, the landing-page port, real section content (placeholder copy stays;
hero sub updated to describe the flight).
