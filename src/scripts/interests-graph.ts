// Interests figures — one travelling dot.
//
// A single amber dot is the through-line of the section: it traces each of the
// three hairline figures in turn, then glides across the frame to the next
// figure's start while the two figures cross-fade — "one into the other."
//
//   01 Agentic Applications -> THE LOOP   (reason · act · observe — the dot orbits)
//   02 Full Stack           -> THE TRACE  (client → server → data and back)
//   03 Machine Learning      -> THE CURVE  (training loss decaying to its minimum)
//
// The lit figure is mirrored onto the bullet list (.live). The dot sits above
// the linework and stays fully visible through every fade, so the whole thing
// reads as one continuous journey rather than three separate loops. Pauses when
// the section is off-screen or the tab is hidden; honours prefers-reduced-motion
// by holding figure 01, static, with the dot at rest.

type Pt = { x: number; y: number };

// Gentle ease-in-out on both kinds of leg: each starts and ends near zero speed,
// so the dot "arrives, breathes, departs" at every seam between figures.
const easePath = (t: number): number => -(Math.cos(Math.PI * t) - 1) / 2; // sine
const easeGlide = (t: number): number => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2); // cubic

export function initInterestsGraph(root: HTMLElement): void {
  const figs = [...root.querySelectorAll<SVGElement>('.ifig')];
  const items = [...document.querySelectorAll<HTMLElement>('.int-item')];
  const dot = root.querySelector<SVGCircleElement>('.idot-c');
  if (!figs.length || !dot) return;

  let cur = -1;
  const setActive = (i: number): void => {
    if (i === cur) return;
    cur = i;
    figs.forEach((f, k) => f.classList.toggle('active', k === i));
    items.forEach((el, k) => el.classList.toggle('live', k === i));
  };

  // The three driving paths, in journey order (orbit, trace, descent).
  const paths = [0, 1, 2].map((k) => root.querySelector<SVGGeometryElement>(`[data-dot="${k}"]`));
  const at = (p: SVGGeometryElement, t: number): Pt => {
    const pt = p.getPointAtLength(t * p.getTotalLength());
    return { x: pt.x, y: pt.y };
  };
  const place = (x: number, y: number): void => {
    dot.setAttribute('cx', x.toFixed(2));
    dot.setAttribute('cy', y.toFixed(2));
  };

  // Park the dot at the orbit's start and light figure 01 before anything moves.
  const p0 = paths[0];
  if (p0) { const s = at(p0, 0); place(s.x, s.y); }
  setActive(0);

  // Pause when the section scrolls away or the tab hides.
  let inView = true;
  const idle = (): boolean => !inView || document.hidden;
  const syncPaused = (): void => { root.classList.toggle('paused', idle()); };
  new IntersectionObserver(
    (es) => { inView = es[0]?.isIntersecting ?? true; syncPaused(); },
    { threshold: 0.05 },
  ).observe(root);
  document.addEventListener('visibilitychange', syncPaused);

  // Reduced motion (or a missing path): hold figure 01, dot at rest, no journey.
  const ok = paths.every((p): p is SVGGeometryElement => !!p);
  if (!ok || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const P = paths as SVGGeometryElement[];
  root.classList.add('dot-on'); // fade the dot in

  // The journey: trace each path, then glide to the next path's start. A glide
  // lights its TARGET figure, so that figure cross-fades in as the dot arrives.
  type Leg =
    | { kind: 'path'; fig: number; dur: number }
    | { kind: 'glide'; fig: number; from: Pt; to: Pt; dur: number };
  const HOLD = [6200, 6000, 5400]; // ms tracing each figure
  const GLIDE = 1050; // ms gliding between figures
  const legs: Leg[] = [
    { kind: 'path', fig: 0, dur: HOLD[0] },
    { kind: 'glide', fig: 1, from: at(P[0], 1), to: at(P[1], 0), dur: GLIDE },
    { kind: 'path', fig: 1, dur: HOLD[1] },
    { kind: 'glide', fig: 2, from: at(P[1], 1), to: at(P[2], 0), dur: GLIDE },
    { kind: 'path', fig: 2, dur: HOLD[2] },
    { kind: 'glide', fig: 0, from: at(P[2], 1), to: at(P[0], 0), dur: GLIDE + 250 },
  ];

  let li = 0;
  let elapsed = 0;
  let last = -1;

  const tick = (now: number): void => {
    if (last < 0) last = now;
    const dt = now - last;
    last = now;
    if (!idle()) {
      elapsed += dt;
      let leg = legs[li];
      while (elapsed >= leg.dur) {
        elapsed -= leg.dur;
        li = (li + 1) % legs.length;
        leg = legs[li];
        setActive(leg.fig);
      }
      const t = leg.dur > 0 ? elapsed / leg.dur : 1;
      if (leg.kind === 'path') {
        const pt = at(P[leg.fig], easePath(t));
        place(pt.x, pt.y);
      } else {
        const q = easeGlide(t);
        place(leg.from.x + (leg.to.x - leg.from.x) * q, leg.from.y + (leg.to.y - leg.from.y) * q);
      }
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}
