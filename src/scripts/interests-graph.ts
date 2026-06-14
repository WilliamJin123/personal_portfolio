// Interests — one morphing line.
//
// The three diagrams are NOT separate figures that cross-fade; they are a single
// line that continuously MORPHS from one shape into the next and back, forever:
//
//   01 Agentic     THE LOOP   — a circle (reason · act · observe)
//   02 Full Stack  THE TRACE  — a stack-trace staircase (client → data → UI)
//   03 Machine L.  THE CURVE  — a loss curve descending to its minimum
//
// Each shape is sampled to the same number of points as a CLOSED loop, so the
// spine path can be rebuilt every frame as a point-for-point blend between two
// shapes — the circle literally reshapes into the staircase reshapes into the
// curve. One amber dot rides this single, ever-present line. Each diagram's
// DECORATIONS (labels, guides, ornaments) fade in only while its shape is
// settled, and dim during a morph so the bare reshaping line carries the moment.
// The settled shape mirrors onto the bullet list (.live). Pauses off-screen / on
// a hidden tab; honours prefers-reduced-motion by holding shape 01, static.

type Pt = { x: number; y: number };
const N = 150; // sample points per shape (a closed loop)
const easeMorph = (t: number): number => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

export function initInterestsGraph(root: HTMLElement): void {
  const figs = [...root.querySelectorAll<SVGElement>('.ifig')];
  const items = [...document.querySelectorAll<HTMLElement>('.int-item')];
  const spine = root.querySelector<SVGPathElement>('.spine');
  const dot = root.querySelector<SVGCircleElement>('.idot-c');
  const srcs = [0, 1, 2].map((k) => root.querySelector<SVGGeometryElement>(`[data-dot="${k}"]`));
  if (figs.length < 3 || !spine || !dot || srcs.some((s) => !s)) return;
  const src = srcs as SVGGeometryElement[];

  // Single-pass arc-length sampling: each shape's N points run from its start to
  // its end. This makes every shape's MIDDLE index land in the lower region — the
  // circle's bottom, the trace's deepest step, the loss curve's minimum — so
  // corresponding points stay near one another and the line reshapes smoothly,
  // instead of one stray point flying across the panel (which out-and-back
  // sampling caused, by parking each shape's far index at its top corner).
  const sample = (p: SVGGeometryElement): Pt[] => {
    const L = p.getTotalLength();
    const out: Pt[] = [];
    for (let k = 0; k < N; k++) {
      const q = p.getPointAtLength((k / (N - 1)) * L);
      out.push({ x: q.x, y: q.y });
    }
    return out;
  };
  const shapes = [sample(src[0]), sample(src[1]), sample(src[2])];

  const setD = (pts: Pt[]): void => {
    let d = `M${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
    for (let k = 1; k < N; k++) d += `L${pts[k].x.toFixed(1)} ${pts[k].y.toFixed(1)}`;
    spine.setAttribute('d', d);
  };
  const place = (p: Pt): void => {
    dot.setAttribute('cx', p.x.toFixed(2));
    dot.setAttribute('cy', p.y.toFixed(2));
  };
  const along = (pts: Pt[], u: number): Pt => {
    const x = (((u % 1) + 1) % 1) * (N - 1);
    const i = Math.floor(x);
    const f = x - i;
    const a = pts[i];
    const b = pts[i + 1] ?? pts[0];
    return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f };
  };

  let live = -1;
  const setLive = (i: number): void => {
    if (i === live) return;
    live = i;
    items.forEach((el, k) => el.classList.toggle('live', k === i));
  };

  // Initial static state: shape 01, its decoration lit.
  setD(shapes[0]);
  place(shapes[0][0]);
  figs.forEach((f, k) => { f.style.opacity = k === 0 ? '1' : '0'; });
  setLive(0);

  let inView = true;
  const idle = (): boolean => !inView || document.hidden;
  const syncPaused = (): void => { root.classList.toggle('paused', idle()); };
  new IntersectionObserver(
    (es) => { inView = es[0]?.isIntersecting ?? true; syncPaused(); },
    { threshold: 0.05 },
  ).observe(root);
  document.addEventListener('visibilitychange', syncPaused);

  root.classList.add('dot-on'); // reveal the spine + dot
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return; // hold shape 01, static

  const SETTLE = 2600; // ms a shape holds its pure form
  const MORPH = 2400; // ms reshaping into the next
  const SEG = SETTLE + MORPH;
  const CYCLE = SEG * 3;
  const SWEEP = 11000; // ms for one full there-and-back sweep of the line

  const blend: Pt[] = shapes[0].map((p) => ({ ...p })); // reused per-frame buffer
  let t = 0;
  let last = -1;

  const frame = (now: number): void => {
    if (last < 0) last = now;
    const dt = now - last;
    last = now;
    if (!idle()) {
      t += dt;
      const c = t % CYCLE;
      const a = Math.floor(c / SEG); // current shape 0,1,2
      const b = (a + 1) % 3; // next shape
      const within = c - a * SEG; // 0..SEG
      const m = within <= SETTLE ? 0 : (within - SETTLE) / MORPH; // raw morph 0..1
      const f = easeMorph(m); // eased shape blend

      for (let k = 0; k < N; k++) {
        blend[k].x = shapes[a][k].x + (shapes[b][k].x - shapes[a][k].x) * f;
        blend[k].y = shapes[a][k].y + (shapes[b][k].y - shapes[a][k].y) * f;
      }
      setD(blend);

      // Decorations: full on the settled shape; squared cross-fade during a morph
      // so both sets dim to near-nothing mid-transition and the bare line leads.
      const w = [0, 0, 0];
      if (m === 0) w[a] = 1;
      else { w[a] = (1 - m) ** 2; w[b] = m * m; }
      figs.forEach((fig, k) => { fig.style.opacity = w[k].toFixed(3); });
      setLive(m < 0.5 ? a : b);

      // the dot sweeps the line and back on a smooth cosine, so its motion stays
      // continuous on these open shapes with no teleport at the ends.
      const u = (1 - Math.cos((2 * Math.PI * t) / SWEEP)) / 2;
      place(along(blend, u));
    }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}
