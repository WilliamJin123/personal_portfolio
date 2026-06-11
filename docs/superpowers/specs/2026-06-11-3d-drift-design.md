# /3d — Flight 002: The Drift

Supersedes the terrain scene of `2026-06-11-3d-flight-design.md`. Same scroll
scaffolding (stations, letterbox, film stack, inertia constants), entirely new
world: one continuous drift through open space that slowly rotates past the
camera.

## The shot

The camera glides forward along a lazy S-curve (lateral + vertical sine
meander) while accumulating ~30° of eased barrel roll across the journey. The
celestial sphere counter-precesses slowly around a tilted axis, so the cosmos
appears to wheel past as you travel. Handheld sway and mouse parallax carry
over from Flight 001.

## World, back to front

- **Sky dome** (camera-locked, precessing): existing fbm nebula shader,
  deepened — the warm amber dust band plus a fainter cool blue-grey
  counter-band. Sun disk dimmed and moved off-axis left so the planet gets a
  proper crescent.
- **Far star shell**: the existing 1400-star twinkle cloud, dome-locked.
- **Mid star field** (~500 stars, world space): scattered through the corridor
  volume with a core exclusion zone; perspective gives free parallax.
- **Near motes** (~260, world space): a faint tube of small dust points around
  the path that visibly streams past — the traversal cue.
- **Nebula banks** (~13 desktop / 7 mobile): large billboarded planes with an
  fbm-alpha shader, additive warm dust (a few cool ones), scattered along the
  corridor. They fade out within ~10 world units of the camera, so flying
  through one dissolves instead of clipping.
- **Hero flyby — the ringed planet**: promoted from sky prop to world object
  near p≈0.60, offset ~35 units off-path. Visible small from the start, grows
  through the middle third; at closest approach the hairline LineLoop rings
  sweep across the frame. The look-at blends toward the planet through the
  flyby window; DoF racks focus onto it.
- **Contact beacon**: a single pulsing amber point past the end of the route,
  fading in from p≈0.7 — the signal station 03 is flying toward.

## Stations

Unchanged: crossings at p 0.32 / 0.64 / 0.96 trigger the letterbox + card
(01 WORK / 02 PLAY / 03 CONTACT); constellation signs brighten on approach.
Station 02 fires as the rings cross the frame — the cinematic peak. In the
flyby window the DoF focus target is the planet's actual distance; elsewhere
stations rack focus near as before.

## What carried over / what died

Kept: postprocessing stack (DoF desktop-only, bloom, grain, vignette),
letterbox system, scroll inertia, mobile/reduced-motion fallbacks, celestial
kit (star shader, nebula fbm, planet + ring linework, constellations).
Deleted: terrain mesh, heightAt/fbm CPU bake, valley path, fog, minima pools.

## Perf

The 140×300 terrain mesh is gone; the new cost is ~13 additive transparent
billboards (no depth writes) and ~800 extra points. Mobile: fewer banks,
no DoF, multisampling 0, DPR cap 1.5 — same policy as Flight 001.

## Out of scope

Station content (real work/play/contact sections), porting any of this to the
paper site, audio.
