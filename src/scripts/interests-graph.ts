// Interests figures — cross-fade controller.
//
// The three figures are hairline SVG diagrams authored inline in index.astro,
// one per "I'm interested in" bullet. Each is a refined static line drawing with
// a single slow amber accent in motion (the orbit / the trace / the descent) —
// all of that motion lives in CSS. This module does only the orchestration:
//
//   01 Agentic Applications -> THE LOOP   (reason · act · observe, a token orbits)
//   02 Full Stack           -> THE TRACE  (client→server→data and back)
//   03 Machine Learning     -> THE CURVE  (training loss decaying to its minimum)
//
// It shows one figure at a time, advancing on a slow dwell, lets a hovered
// bullet snap its figure forward, mirrors the live figure onto the bullet list
// (.live), and pauses the CSS animations when the section is off-screen or the
// tab is hidden. Honors prefers-reduced-motion by holding figure 01, static.

const DWELL = 6000; // ms each figure holds before auto-advancing

export function initInterestsGraph(root: HTMLElement): void {
  const figs = [...root.querySelectorAll<SVGElement>('.ifig')];
  const items = [...document.querySelectorAll<HTMLElement>('.int-item')];
  const n = figs.length;
  if (!n) return;

  let cur = -1;
  let hover = -1;

  const show = (i: number): void => {
    if (i === cur) return;
    cur = i;
    figs.forEach((f, k) => f.classList.toggle('active', k === i));
    items.forEach((el, k) => el.classList.toggle('live', k === i));
  };
  show(0);

  // Pause the (CSS) animations when the section scrolls away or the tab hides.
  let inView = true;
  const sync = (): void => { root.classList.toggle('paused', !inView || document.hidden); };
  new IntersectionObserver(
    (es) => { inView = es[0]?.isIntersecting ?? true; sync(); },
    { threshold: 0.05 },
  ).observe(root);
  document.addEventListener('visibilitychange', sync);

  // Hovering a bullet snaps its figure forward and holds while hovered.
  items.forEach((el, i) => {
    el.addEventListener('pointerenter', () => { hover = i; show(i); });
    el.addEventListener('pointerleave', () => { hover = -1; });
  });

  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return; // hold 01

  window.setInterval(() => {
    if (!inView || document.hidden || hover >= 0) return;
    show((cur + 1) % n);
  }, DWELL);
}
