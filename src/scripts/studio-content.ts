// /3d content layer — the instrument panels that resolve out of the dark at
// each station of "The Drift". The cosmos (drift-scene.ts) is the living
// background; this module draws the *content* as hairline star-systems floating
// over it, in the same instrument grammar as the paper site's interest figures.
//
//   01 EXPERIENCE -> THE ORRERY   concentric orbits around an amber star; one
//                                 planet per role, the focused world parks at top
//   02 PROJECTS   -> THE GALAXY   a slow-turning spiral arm of project-stars,
//                                 the focused star lit amber
//
// Both share one mechanism (mountSystem): an SVG "stage", a text readout, a
// legend of names, prev/next, and an auto-tour that any hover/click overrides.
// Content (work + projects) is injected as JSON by 3d.astro — the single source
// of truth is the résumé library, exactly as the paper site reads it.
//
// Conventions match the rest of the site: reveal-on-view, paused off-screen or
// when the tab hides, and a single static pose under prefers-reduced-motion.

interface Link { label: string; href: string }
type StackItem = string | { label: string; icon?: string };
interface Item {
  id: string;
  title: string;
  role: string;
  subtitle: string;
  dateLabel: string;
  location: string;
  links: Link[];
  bulletsHtml: string[];
  awards: string[];
  grants: string[];
  stack: StackItem[];
}

const SVGNS = 'http://www.w3.org/2000/svg';
const C = 300;            // svg centre (600×600 viewBox)
const TAU = Math.PI * 2;

// ── readout (mirrors index.astro's timeline detail builder) ──────────────────

const ESC: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };
const esc = (s: string): string => s.replace(/[&<>"]/g, (c) => ESC[c]);

const iconURL = (ref: string): string =>
  ref[0] === '/' ? ref : `https://cdn.jsdelivr.net/npm/simple-icons@latest/icons/${ref}.svg`;

// Plain-slug stack entries (e.g. 'microsoftazure') read fine on the paper site
// because the icon carries the brand; here we also tidy the bare label for the
// moment before the icon paints, and for the no-icon fallback.
const NICE: Record<string, string> = {
  python: 'Python', typescript: 'TypeScript', javascript: 'JavaScript', openjdk: 'Java',
  microsoftazure: 'Azure', microsoftsqlserver: 'SQL Server', openai: 'OpenAI', docker: 'Docker',
  selenium: 'Selenium', oracle: 'Oracle', firebase: 'Firebase', swift: 'Swift', solana: 'Solana',
  pytorch: 'PyTorch', numpy: 'NumPy', scipy: 'SciPy', pandas: 'Pandas', huggingface: 'Hugging Face',
  pydantic: 'Pydantic', sqlalchemy: 'SQLAlchemy', sqlite: 'SQLite', pytest: 'pytest',
  fastapi: 'FastAPI', tailwindcss: 'Tailwind', nextdotjs: 'Next.js', react: 'React',
  supabase: 'Supabase', ffmpeg: 'FFmpeg', vercel: 'Vercel', openrouter: 'OpenRouter',
};
const nice = (label: string): string => NICE[label] ?? label;

const chips = (stack: StackItem[]): string =>
  (stack || []).map((it) => {
    const label = typeof it === 'string' ? nice(it) : it.label;
    const ref = typeof it === 'string' ? it : it.icon;
    const ic = ref ? iconURL(ref) : '';
    return `<span class="chip"${ic ? ` style="--i:url('${ic}')"` : ''}>${ic ? '<i class="ic"></i>' : ''}${esc(label)}</span>`;
  }).join('');

const TROPHY = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>';
const DOLLAR = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><path d="M12 18V6"/></svg>';

const awardsHTML = (e: Item): string => {
  const h = [
    ...(e.awards || []).map((a) => ['award', TROPHY, a] as const),
    ...(e.grants || []).map((g) => ['grant', DOLLAR, g] as const),
  ];
  return h.length ? `<div class="ro-honors">${h.map(([c, ic, t], j) => `<span class="${c}" style="--ai:${j}">${ic}${esc(t)}</span>`).join('')}</div>` : '';
};

const linksHTML = (e: Item): string =>
  e.links && e.links.length
    ? `<div class="ro-links">${e.links.map((l, j) => `<a class="ro-link" href="${esc(l.href)}" target="_blank" rel="noreferrer" style="--bi:${j}">${esc(l.label)} ↗</a>`).join('')}</div>`
    : '';

const readoutHTML = (e: Item, kind: 'role' | 'project'): string => {
  const kindLabel = kind === 'role' ? 'station 01 · experience' : 'station 02 · projects';
  const lead = kind === 'role' ? e.role : e.subtitle;
  const meta = (kind === 'role' ? [lead, e.location, e.dateLabel] : [lead, e.dateLabel]).filter(Boolean).map(esc).join('<span class="dot">·</span>');
  const bullets = e.bulletsHtml.map((h, i) => `<li class="rb" style="--bi:${i}">${h}</li>`).join('');
  return `<div class="ro-in">
    <div class="ro-kind m">${kindLabel}</div>
    <h3 class="ro-title">${esc(e.title)}</h3>
    <div class="ro-meta m">${meta}</div>
    ${awardsHTML(e)}
    <ul class="ro-bul">${bullets}</ul>
    <div class="ro-stack">${chips(e.stack)}</div>
    ${linksHTML(e)}
  </div>`;
};

// ── geometry ─────────────────────────────────────────────────────────────────

interface Node {
  i: number;
  r: number;        // orbit / spiral radius
  a0: number;       // base angle
  spd: number;      // angular speed (orrery) — galaxy uses a shared spin
  phase: number;    // twinkle phase
  ang: number;      // current angle (eased)
  x: number; y: number;
  dot: SVGCircleElement;
  halo: SVGCircleElement;
  lbl: SVGTextElement;   // catalogue number riding just outside the body
}

const el = <K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number>): SVGElementTagNameMap[K] => {
  const n = document.createElementNS(SVGNS, tag);
  for (const k in attrs) n.setAttribute(k, String(attrs[k]));
  return n;
};

const shortAngle = (cur: number, tgt: number): number => {
  let d = (tgt - cur) % TAU;
  if (d > Math.PI) d -= TAU;
  if (d < -Math.PI) d += TAU;
  return d;
};

// ── one station system ───────────────────────────────────────────────────────

interface Sys {
  setInView: (v: boolean) => void;
}

function mountSystem(root: HTMLElement, items: Item[], layout: 'orrery' | 'galaxy'): Sys {
  const stage = root.querySelector<HTMLElement>('.sys-stage');
  const readout = root.querySelector<HTMLElement>('.sys-readout');
  const legendEl = root.querySelector<HTMLElement>('.sys-legend');
  const counter = root.querySelector<HTMLElement>('.sys-count');
  const kind: 'role' | 'project' = layout === 'orrery' ? 'role' : 'project';
  const n = items.length;
  if (!stage || !readout || !n) return { setInView: () => {} };

  const svg = el('svg', { class: 'sys-svg', viewBox: '0 0 600 600', preserveAspectRatio: 'xMidYMid meet' });
  stage.appendChild(svg);

  const gWorld = el('g', { class: 'sys-world' });   // orbits / spiral arm (static-ish)
  const gNodes = el('g', { class: 'sys-nodes' });
  const gLead = el('g', { class: 'sys-lead' });      // active leader + label, always on top
  svg.appendChild(gWorld); svg.appendChild(gNodes); svg.appendChild(gLead);

  const nodes: Node[] = [];

  if (layout === 'orrery') {
    const rMin = 104, rMax = 268;
    // plate boundary + cardinal ticks — the instrument frame
    gWorld.appendChild(el('circle', { class: 'plate', cx: C, cy: C, r: 290, fill: 'none' }));
    for (const a of [-Math.PI / 2, 0, Math.PI / 2, Math.PI]) {
      gWorld.appendChild(el('line', {
        class: 'cardinal',
        x1: C + Math.cos(a) * 284, y1: C + Math.sin(a) * 284,
        x2: C + Math.cos(a) * 296, y2: C + Math.sin(a) * 296,
      }));
    }
    // central star — amber core with a layered glow, a fine ring & crosshair
    for (const [rr, op] of [[34, 0.06], [22, 0.11], [14, 0.5]] as const) {
      gWorld.appendChild(el('circle', { cx: C, cy: C, r: rr, fill: 'var(--amber)', opacity: op }));
    }
    gWorld.appendChild(el('circle', { class: 'star-core', cx: C, cy: C, r: 7, fill: 'var(--amber)' }));
    gWorld.appendChild(el('circle', { cx: C, cy: C, r: 22, fill: 'none', stroke: 'var(--amber)', 'stroke-width': 1, opacity: 0.42 }));
    for (const [x1, y1, x2, y2] of [[C - 30, C, C - 24, C], [C + 24, C, C + 30, C], [C, C - 30, C, C - 24], [C, C + 24, C, C + 30]] as const) {
      gWorld.appendChild(el('line', { x1, y1, x2, y2, stroke: 'var(--amber)', 'stroke-width': 1, opacity: 0.5 }));
    }
    for (let i = 0; i < n; i++) {
      // newest (i=0) rides the outermost, most prominent orbit
      const r = rMax - (rMax - rMin) * (n === 1 ? 0 : i / (n - 1));
      gWorld.appendChild(el('circle', { class: 'orbit', cx: C, cy: C, r, fill: 'none' }));
      // degree ticks on each orbit — instrument plate flavour
      for (let k = 0; k < 24; k++) {
        const a = (k / 24) * TAU;
        const len = k % 6 === 0 ? 5 : 2.5;
        gWorld.appendChild(el('line', {
          class: 'tick',
          x1: C + Math.cos(a) * (r - len), y1: C + Math.sin(a) * (r - len),
          x2: C + Math.cos(a) * (r + len), y2: C + Math.sin(a) * (r + len),
        }));
      }
      const halo = el('circle', { class: 'halo', cx: C, cy: C, r: 15, fill: 'var(--amber)', opacity: 0 });
      const dot = el('circle', { class: 'dot', cx: C, cy: C, r: 6 });
      const lbl = el('text', { class: 'nnum', x: C, y: C });
      lbl.textContent = String(i + 1).padStart(2, '0');
      gNodes.appendChild(halo); gNodes.appendChild(dot); gLead.appendChild(lbl);
      const a0 = -Math.PI / 2 + (i / n) * TAU * 0.6 + i * 1.1;
      nodes.push({ i, r, a0, spd: 0.11 / Math.sqrt(r / rMin), phase: i * 1.7, ang: a0, x: C, y: C, dot, halo, lbl });
    }
  } else {
    // galaxy — sqrt-spaced archimedean arm; faint core glow; the arm is redrawn
    // each frame as it turns. Chronology runs core→rim (oldest at the heart).
    const rMaxG = 256, turns = 1.55;
    for (const [rr, op] of [[40, 0.05], [22, 0.09]] as const) {
      gWorld.appendChild(el('circle', { cx: C, cy: C, r: rr, fill: 'var(--amber)', opacity: op }));
    }
    gWorld.appendChild(el('circle', { class: 'gcore', cx: C, cy: C, r: 3.4, fill: 'var(--amber)', opacity: 0.7 }));
    const arm = el('polyline', { class: 'arm', points: '', fill: 'none' });
    gWorld.appendChild(arm);
    (svg as unknown as { _arm?: SVGPolylineElement })._arm = arm;
    for (let i = 0; i < n; i++) {
      // newest (i=0) rides the frontier of the arm; oldest sits near the core
      const frac = (n - i - 0.45) / n;
      const r = rMaxG * Math.sqrt(frac);
      const a0 = -0.5 + frac * turns * TAU;
      const halo = el('circle', { class: 'halo', cx: C, cy: C, r: 14, fill: 'var(--amber)', opacity: 0 });
      const dot = el('circle', { class: 'dot', cx: C, cy: C, r: 5.5 });
      const lbl = el('text', { class: 'nnum', x: C, y: C });
      lbl.textContent = String(i + 1).padStart(2, '0');
      gNodes.appendChild(halo); gNodes.appendChild(dot); gLead.appendChild(lbl);
      nodes.push({ i, r, a0, spd: 0, phase: i * 1.3, ang: a0, x: C, y: C, dot, halo, lbl });
    }
  }

  // legend of names (also the selector)
  if (legendEl) {
    legendEl.innerHTML = items.map((e, i) =>
      `<button class="sys-leg" data-i="${i}"><span class="ln">${String(i + 1).padStart(2, '0')}</span><span class="lt">${esc(e.title)}</span></button>`,
    ).join('');
  }
  const legBtns = legendEl ? [...legendEl.querySelectorAll<HTMLButtonElement>('.sys-leg')] : [];

  // ── state
  let active = 0;
  let inView = true;
  let holdUntil = 0;
  const DWELL = layout === 'orrery' ? 5200 : 4400;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const arm = (svg as unknown as { _arm?: SVGPolylineElement })._arm;

  const setActive = (i: number, manual = false): void => {
    active = ((i % n) + n) % n;
    readout.innerHTML = readoutHTML(items[active], kind);
    legBtns.forEach((b, k) => b.classList.toggle('on', k === active));
    if (counter) counter.textContent = `${String(active + 1).padStart(2, '0')} / ${String(n).padStart(2, '0')}`;
    if (manual) holdUntil = performance.now() + 6500;
  };

  legBtns.forEach((b) => {
    b.addEventListener('click', () => setActive(+(b.dataset.i || 0), true));
    b.addEventListener('pointerenter', () => { if (matchMedia('(pointer:fine)').matches) setActive(+(b.dataset.i || 0), true); });
  });
  nodes.forEach((nd) => {
    nd.dot.style.cursor = 'pointer';
    nd.dot.addEventListener('click', () => setActive(nd.i, true));
  });
  root.querySelector('.sys-prev')?.addEventListener('click', () => setActive(active - 1, true));
  root.querySelector('.sys-next')?.addEventListener('click', () => setActive(active + 1, true));

  setActive(0);

  // ── render
  const place = (t: number): void => {
    const spin = layout === 'galaxy' ? t * 0.02 : 0;
    for (const nd of nodes) {
      let tgt: number;
      if (layout === 'orrery') {
        tgt = nd.i === active ? -Math.PI / 2 : nd.a0 + t * nd.spd;
      } else {
        tgt = nd.a0 + spin;
      }
      // ease the current angle toward target (parks the active orrery world)
      nd.ang += shortAngle(nd.ang, tgt) * (reduce ? 1 : 0.06);
      nd.x = C + Math.cos(nd.ang) * nd.r;
      nd.y = C + Math.sin(nd.ang) * nd.r;
      const on = nd.i === active;
      const tw = reduce ? 1 : 0.7 + 0.3 * Math.sin(t * 1.4 + nd.phase);
      nd.dot.setAttribute('cx', String(nd.x));
      nd.dot.setAttribute('cy', String(nd.y));
      nd.dot.setAttribute('r', String(on ? 7.5 : (layout === 'galaxy' ? 5.5 : 6)));
      nd.dot.style.opacity = String(on ? 1 : 0.5 * tw);
      nd.dot.classList.toggle('on', on);
      nd.halo.setAttribute('cx', String(nd.x));
      nd.halo.setAttribute('cy', String(nd.y));
      nd.halo.style.opacity = on ? String(0.16 + 0.06 * Math.sin(t * 2)) : '0';
      // catalogue number, riding just outside the body along its radius
      const ox = nd.x - C, oy = nd.y - C;
      const om = Math.hypot(ox, oy) || 1;
      const nx = ox / om, ny = oy / om;
      const off = on ? 18 : 15;
      nd.lbl.setAttribute('x', String(Math.max(14, Math.min(586, nd.x + nx * off))));
      nd.lbl.setAttribute('y', String(Math.max(18, Math.min(584, nd.y + ny * off)) + 4));
      nd.lbl.setAttribute('text-anchor', nx < -0.35 ? 'end' : nx > 0.35 ? 'start' : 'middle');
      nd.lbl.classList.toggle('on', on);
      nd.lbl.style.opacity = on ? '1' : '0.4';
    }
    if (arm) arm.setAttribute('points', nodes.map((nd) => `${nd.x.toFixed(1)},${nd.y.toFixed(1)}`).join(' '));
  };

  let t = 0; let prev = 0; let raf = 0;
  const frame = (now: number): void => {
    const dt = prev ? Math.min(0.05, (now - prev) / 1000) : 0;
    prev = now;
    if (!reduce) t += dt;
    place(t);
    if (!reduce && inView && !document.hidden && now > holdUntil) {
      holdUntil = now + DWELL;   // initialised to now+DWELL at mount, so the first advance waits one dwell
      setActive(active + 1);
    }
    raf = requestAnimationFrame(frame);
  };

  const start = (): void => { if (!raf) { prev = 0; raf = requestAnimationFrame(frame); } };
  const stop = (): void => { if (raf) { cancelAnimationFrame(raf); raf = 0; } };

  if (reduce) { place(0); }
  else { holdUntil = performance.now() + DWELL; start(); }
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); else if (inView && !reduce) start(); });

  return {
    setInView: (v: boolean): void => {
      inView = v;
      if (reduce) return;
      if (v && !document.hidden) start(); else stop();
    },
  };
}

// ── entry ────────────────────────────────────────────────────────────────────

export function initStudioContent(): void {
  const dataEl = document.getElementById('studio-data');
  if (!dataEl || !dataEl.textContent) return;
  let data: { work: Item[]; projects: Item[] };
  try { data = JSON.parse(dataEl.textContent); } catch { return; }

  const systems: { root: HTMLElement; sys: Sys }[] = [];
  const work = document.getElementById('sys-work');
  const projects = document.getElementById('sys-projects');
  if (work) systems.push({ root: work, sys: mountSystem(work, data.work, 'orrery') });
  if (projects) systems.push({ root: projects, sys: mountSystem(projects, data.projects, 'galaxy') });

  // reveal + run-only-in-view: each system animates only while its station is on
  // screen, and its panel fades/rises in the first time it arrives.
  const io = new IntersectionObserver((es) => {
    es.forEach((en) => {
      const hit = systems.find((s) => s.root === en.target || s.root.contains(en.target));
      if (en.isIntersecting) en.target.classList.add('in');
      if (hit) hit.sys.setInView(en.isIntersecting && en.intersectionRatio > 0.12);
    });
  }, { threshold: [0, 0.12, 0.4] });
  systems.forEach((s) => io.observe(s.root));

  // generic reveal for any non-system station content (e.g. contact)
  const revIO = new IntersectionObserver((es) => {
    es.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('in'); revIO.unobserve(en.target); } });
  }, { threshold: 0.3 });
  document.querySelectorAll('[data-reveal]').forEach((n) => revIO.observe(n));
}
