// Interests figures — one travelling dot, with a shared home.
//
// A single amber dot is the through-line of the section. Rather than flying
// across open canvas between figures, it always returns to one shared handoff
// point H and rests there while the figures cross-fade — so every transition
// starts and ends in the same place (a dissolve, not a flight). From H it
// blooms onto each figure, traces it, and comes home:
//
//   01 Agentic Applications -> THE LOOP   (reason · act · observe — a full orbit)
//   02 Full Stack           -> THE TRACE  (client → server → data and back)
//   03 Machine Learning      -> THE CURVE  (down to the loss minimum and back)
//
// The open figures (trace, curve) are traced there-and-back via a smooth sin
// sweep, so neither ever hands off from a far corner — the curve dives to its
// minimum and returns instead of stranding the dot bottom-right. The lit figure
// mirrors onto the bullet list (.live). Pauses off-screen / on a hidden tab;
// honours prefers-reduced-motion by holding figure 01, static, dot at rest.

type Pt = { x: number; y: number };

const easePath = (t: number): number => -(Math.cos(Math.PI * t) - 1) / 2; // sine in-out
const easeGlide = (t: number): number => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2); // cubic
const lerp = (a: Pt, b: Pt, u: number): Pt => ({ x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u });

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

  const paths = [0, 1, 2].map((k) => root.querySelector<SVGGeometryElement>(`[data-dot="${k}"]`));
  const place = (p: Pt): void => {
    dot.setAttribute('cx', p.x.toFixed(2));
    dot.setAttribute('cy', p.y.toFixed(2));
  };

  // The shared home: the dot rests here during every cross-fade, so each
  // transition begins and ends in the same spot. Sits in the clear top-left band.
  const H: Pt = { x: 180, y: 118 };
  place(H);
  setActive(0);

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

  const ptAt = (p: SVGGeometryElement, param: number): Pt => {
    const w = ((param % 1) + 1) % 1; // wrap into [0,1)
    const q = p.getPointAtLength(w * p.getTotalLength());
    return { x: q.x, y: q.y };
  };
  // Where on the orbit ring to join/leave — the point nearest H, so the lead on
  // and off the ring is as short as the other figures' leads.
  let t0 = 0;
  let best = Infinity;
  for (let k = 0; k < 240; k++) {
    const q = ptAt(P[0], k / 240);
    const d = (q.x - H.x) ** 2 + (q.y - H.y) ** 2;
    if (d < best) { best = d; t0 = k / 240; }
  }
  // Per-figure samplers over s in [0,1], each starting AND ending at its home
  // point: the orbit makes a full eased loop from its join point; the open
  // figures run out to their far end and back (sin → a smooth there-and-back).
  const orbit = (s: number): Pt => ptAt(P[0], t0 + easePath(s));
  const thereBack = (p: SVGGeometryElement) => (s: number): Pt => ptAt(p, Math.sin(Math.PI * s));
  const sample = [orbit, thereBack(P[1]), thereBack(P[2])];
  const home = sample.map((fn) => fn(0)); // == fn(1) for each

  type Leg = { fig: number; dur: number; pos: (s: number) => Pt };
  const DWELL = 900; // ms at rest while the figures cross-fade
  const LEAD = 680; // ms gliding onto / off each figure
  const HOLD = [5200, 5400, 5400]; // ms tracing each figure
  const legs: Leg[] = [];
  for (let i = 0; i < 3; i++) {
    legs.push({ fig: i, dur: DWELL, pos: () => H }); // rest at home — the cross-fade lands here
    legs.push({ fig: i, dur: LEAD, pos: (s) => lerp(H, home[i], easeGlide(s)) }); // bloom onto the figure
    legs.push({ fig: i, dur: HOLD[i], pos: sample[i] }); // trace it (loop / there-and-back)
    legs.push({ fig: i, dur: LEAD, pos: (s) => lerp(home[i], H, easeGlide(s)) }); // come home
  }

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
        setActive(leg.fig); // dwell legs land the cross-fade; others are no-ops
      }
      place(leg.pos(leg.dur > 0 ? elapsed / leg.dur : 1));
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}
