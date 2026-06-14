// /3d — "The Drift" as ONE diegetic, navigable system. The content is not an
// overlay: the text and the diagrams ARE the 3D world. Two systems hang in the
// dark — the EXPERIENCE star (amber sun + tilted orbit rings, each role a body
// in orbit) and the PROJECTS galaxy (a spiral you thread) — ending at the
// CONTACT beacon. Three ways to move through them, by design (flight 003):
//
//   · SCROLL  flies one continuous, eased glide along the route — no per-point
//     stops, no per-node turning; the camera just looks ahead and drifts.
//   · DRAG    free-looks the view (yaw/pitch) so you can glance off the path
//     and around a system; it eases back to forward when you let go.
//   · CLICK a node  diverts the camera to frame it and fades its full dossier
//     up to read; scroll / Esc / click-away releases back to the glide.
//
// Each node always wears a small title tag so the field stays legible while you
// glide; the full dossier only opens on focus, so it never clutters. All text
// is rendered to high-DPI canvas textures (no DoF — content stays sharp).
// Content comes from #studio-data — the same résumé library the paper site
// reads. A hidden DOM mirror (owned by 3d.astro) carries the same content for
// assistive tech, search, and the no-WebGL fallback.

import {
  Scene, PerspectiveCamera, WebGLRenderer,
  BufferGeometry, BufferAttribute,
  Mesh, ShaderMaterial, PlaneGeometry, SphereGeometry,
  Points, Group, LineLoop, LineBasicMaterial, LineSegments,
  Color, Vector2, Vector3, BackSide, AdditiveBlending, Raycaster,
  CanvasTexture, MeshBasicMaterial, DoubleSide, SRGBColorSpace,
} from 'three';
import {
  EffectComposer, RenderPass, EffectPass,
  BloomEffect, NoiseEffect, VignetteEffect,
} from 'postprocessing';

// ── tokens (match 3d.astro / the paper site)
const COL = {
  ink: '#e7e9ee', ink2: '#c2c6cd', mute: '#8b8f98', faint: '#6a6f78',
  amber: '#d08a2e', grant: '#5fb98f', ground: '#0b0c0e',
};
const AMBER = new Color(0xd08a2e);
const SUN_DIR = new Vector3(-0.5, 0.22, -0.84).normalize();

// ── flight — the route is short and dense (the systems cluster, they don't
// string out one-per-30-units the way the old fly-past did)
const CAM_START = 14;
const STEP = 18;            // z between successive bodies (was 30 — denser)
const FIRST = -22;          // z of the first body
const TAIL = 40;            // travel past the last body
const LOOK_AHEAD = 22;
const GLIDE_CHASE = 3.2;    // how fast the camera eases to its target pose / s
const SWAY = 0.1;

// ── free-look (drag)
const YAW_MAX = 0.72;       // ~41°
const PITCH_MAX = 0.46;     // ~26°
const LOOK_SENS = 0.0026;   // radians per px dragged
const LOOK_EASE = 9;        // view chases the drag target / s
const RECENTER = 0.55;      // idle decay of the drag target / s (slow return)

// ── label canvas
let SS = 2;                 // supersample (lowered on mobile to bound texture memory)
const DW = 1000;            // design width (px)
const WORLD_W = 8.4;        // dossier plane width (world units)
const TAG_W = 4.0;          // title-tag plane width (world units)
const NEAR_FULL = 16;       // distance (world) for full tag opacity
const NEAR_FADE = 52;       // distance beyond which a tag is gone

const TAU = Math.PI * 2;
const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
const clamp = (x: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, x));
const ss = (a: number, b: number, x: number): number => {
  const u = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return u * u * (3 - 2 * u);
};
// dt-based smoothing factor (frame-rate independent)
const chase = (dt: number, rate: number): number => 1 - Math.exp(-dt * rate);

const FBM2 = `
  float h21(vec2 p){return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);}
  float n2(vec2 p){
    vec2 i = floor(p); vec2 f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(h21(i), h21(i + vec2(1.0, 0.0)), u.x),
               mix(h21(i + vec2(0.0, 1.0)), h21(i + vec2(1.0, 1.0)), u.x), u.y);
  }
  float fbm2(vec2 p){
    float v = 0.0; float a = 0.5;
    for (int i = 0; i < 4; i++) { v += n2(p) * a; p = p * 2.13 + 7.7; a *= 0.5; }
    return v;
  }
`;

// ── content types (mirrors the JSON injected by 3d.astro)
interface Token { type: 'text' | 'bold' | 'link'; value?: string; label?: string; href?: string }
interface Item {
  id: string; title: string; role: string; subtitle: string;
  dateLabel: string; location: string;
  awards: string[]; grants: string[]; stack: string[];
  links: { label: string; href: string }[];
  bullets: Token[][];
}
interface Data { work: Item[]; projects: Item[] }

// ── text layout onto a canvas ────────────────────────────────────────────────
// Two-pass: measure to size the canvas, then draw. Returns a mesh + redraw().

interface Run { text: string; color: string; weight: number }

function makeLabel(item: Item, kind: 'experience' | 'projects' | 'contact', idx: number, n: number, aniso: number): {
  mesh: Mesh; redraw: () => void; mat: MeshBasicMaterial;
} {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  const tex = new CanvasTexture(canvas);
  tex.anisotropy = aniso;
  tex.colorSpace = SRGBColorSpace;
  const mat = new MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, side: DoubleSide, opacity: 0 });
  const geo = new PlaneGeometry(1, 1);
  const mesh = new Mesh(geo, mat);
  mesh.renderOrder = 12;

  const f = (w: number, px: number, mono = false): string => `${w} ${px}px ${mono ? "'Geist Mono'" : "'Geist'"}, sans-serif`;

  // wrap an array of styled runs within maxW; returns the y after the block
  const flow = (run: Run[], x: number, y: number, maxW: number, lh: number, px: number, draw: boolean): number => {
    let cx = x, cy = y;
    for (const r of run) {
      ctx.font = f(r.weight, px);
      const parts = r.text.split(/(\s+)/);
      for (const w of parts) {
        if (!w) continue;
        if (/^\s+$/.test(w)) { cx += ctx.measureText(' ').width; continue; }
        const ww = ctx.measureText(w).width;
        if (cx + ww > x + maxW && cx > x) { cx = x; cy += lh; }
        if (draw) { ctx.fillStyle = r.color; ctx.fillText(w, cx, cy); }
        cx += ww;
      }
    }
    return cy + lh;
  };

  const kindLabel = kind === 'experience' ? 'experience' : kind === 'projects' ? 'project' : 'contact';
  const lead = kind === 'experience' ? item.role : item.subtitle;
  const metaBits = (kind === 'experience' ? [lead, item.location, item.dateLabel] : [lead, item.dateLabel]).filter(Boolean);

  // one layout pass; draw=false measures height, draw=true paints
  const layout = (draw: boolean): number => {
    ctx.textBaseline = 'top';
    let y = 0;
    // eyebrow
    if (draw) { ctx.fillStyle = COL.amber; ctx.font = f(500, 21, true); ctx.fillText(`${String(idx + 1).padStart(2, '0')} / ${String(n).padStart(2, '0')}  ·  ${kindLabel}`, 0, y); }
    y += 34;
    // title
    y = flow([{ text: item.title, color: COL.ink, weight: 600 }], 0, y, DW, 52, 44, draw) + 6;
    // meta
    if (metaBits.length) { ctx.font = f(400, 22, true); y = flow(metaBits.map((b, i) => ({ text: (i ? '·  ' : '') + b + '  ', color: COL.mute, weight: 400 })), 0, y, DW, 30, 22, draw) + 8; }
    // awards / grants
    for (const a of item.awards) { y = flow([{ text: '✦ ' + a, color: COL.amber, weight: 500 }], 0, y, DW, 30, 21, draw) + 2; }
    for (const g of item.grants) { y = flow([{ text: '✦ ' + g, color: COL.grant, weight: 500 }], 0, y, DW, 30, 21, draw) + 2; }
    y += 12;
    // bullets
    for (const toks of item.bullets) {
      const runs: Run[] = [{ text: '—  ', color: COL.faint, weight: 400 }];
      for (const t of toks) {
        if (t.type === 'bold') runs.push({ text: t.value || '', color: COL.amber, weight: 600 });
        else if (t.type === 'link') runs.push({ text: t.label || '', color: COL.amber, weight: 400 });
        else runs.push({ text: t.value || '', color: COL.ink2, weight: 400 });
      }
      y = flow(runs, 0, y, DW, 35, 25, draw) + 8;
    }
    // stack
    if (item.stack.length) { y += 6; y = flow([{ text: item.stack.join('   ·   '), color: COL.mute, weight: 400 }], 0, y, DW, 30, 20, draw) + 2; }
    return y;
  };

  const redraw = (): void => {
    const h = Math.ceil(layout(false));
    canvas.width = DW * SS;
    canvas.height = h * SS;
    ctx.setTransform(SS, 0, 0, SS, 0, 0);
    ctx.clearRect(0, 0, DW, h);
    // a soft dark scrim so the text holds against a bright nebula behind it
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, 'rgba(8,9,12,0.0)');
    g.addColorStop(0.04, 'rgba(8,9,12,0.46)');
    g.addColorStop(0.96, 'rgba(8,9,12,0.46)');
    g.addColorStop(1, 'rgba(8,9,12,0.0)');
    ctx.fillStyle = g;
    ctx.fillRect(-40, -16, DW + 80, h + 32);
    ctx.shadowColor = 'rgba(0,0,0,0.7)';
    ctx.shadowBlur = 7;
    layout(true);
    ctx.shadowBlur = 0;
    tex.needsUpdate = true;
    mesh.scale.set(WORLD_W, WORLD_W * (h / DW), 1);
  };
  redraw();
  return { mesh, redraw, mat };
}

// ── title tag ─────────────────────────────────────────────────────────────────
// The always-on, one-glance label that rides above each node so the system
// reads while you glide (the full dossier only opens on click). Eyebrow + title.

function makeTitleTag(item: Item, kind: 'experience' | 'projects', idx: number, aniso: number): {
  mesh: Mesh; redraw: () => void; mat: MeshBasicMaterial;
} {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  const tex = new CanvasTexture(canvas);
  tex.anisotropy = aniso;
  tex.colorSpace = SRGBColorSpace;
  const mat = new MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, side: DoubleSide, opacity: 0 });
  const mesh = new Mesh(new PlaneGeometry(1, 1), mat);
  mesh.renderOrder = 11;

  const TW = 760;
  const f = (w: number, px: number, mono = false): string => `${w} ${px}px ${mono ? "'Geist Mono'" : "'Geist'"}, sans-serif`;
  const eyebrow = `${String(idx + 1).padStart(2, '0')}  ·  ${kind === 'experience' ? 'experience' : 'project'}`;

  // wrap the title across up to two lines; returns total height
  const layout = (draw: boolean): number => {
    ctx.textBaseline = 'top';
    let y = 0;
    if (draw) { ctx.fillStyle = COL.amber; ctx.font = f(500, 18, true); ctx.fillText(eyebrow, 0, y); }
    y += 26;
    ctx.font = f(600, 33);
    const words = item.title.split(' ');
    let line = '', lines = 0;
    const flush = (): void => { if (draw) { ctx.fillStyle = COL.ink; ctx.fillText(line, 0, y); } y += 40; lines++; line = ''; };
    for (const w of words) {
      const test = line ? line + ' ' + w : w;
      if (ctx.measureText(test).width > TW && line && lines < 1) { flush(); line = w; }
      else line = test;
    }
    if (line) flush();
    return y;
  };

  const redraw = (): void => {
    const h = Math.ceil(layout(false));
    canvas.width = TW * SS; canvas.height = h * SS;
    ctx.setTransform(SS, 0, 0, SS, 0, 0);
    ctx.clearRect(0, 0, TW, h);
    ctx.shadowColor = 'rgba(0,0,0,0.85)'; ctx.shadowBlur = 9;
    layout(true);
    ctx.shadowBlur = 0;
    tex.needsUpdate = true;
    mesh.scale.set(TAG_W, TAG_W * (h / TW), 1);
  };
  redraw();
  return { mesh, redraw, mat };
}

// ── the scene ────────────────────────────────────────────────────────────────

export function initStudioScene(canvas: HTMLCanvasElement): void {
  const reduceMo = matchMedia('(prefers-reduced-motion: reduce)');
  const mobile = matchMedia('(pointer: coarse)').matches || window.innerWidth < 760;
  SS = mobile ? 1.4 : 2;     // bound canvas-texture memory on phones

  const dataEl = document.getElementById('studio-data');
  let data: Data = { work: [], projects: [] };
  try { if (dataEl?.textContent) data = JSON.parse(dataEl.textContent); } catch { /* fallback below */ }

  const scene = new Scene();
  const camera = new PerspectiveCamera(52, 1, 0.4, 600);
  const renderer = new WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 2));
  const aniso = renderer.capabilities.getMaxAnisotropy();

  // path meander (kept gentle so the glide is predictable)
  const SX = Math.random() * 1000, SZ = Math.random() * 1000;
  const pathX = (z: number): number => 4.5 * Math.sin(z * 0.012 + SX) + 2.2 * Math.sin(z * 0.026 + SZ);
  const pathY = (z: number): number => 1.8 * Math.sin(z * 0.01 + SZ * 0.6);

  // ── cosmos ─────────────────────────────────────────────────────────────────
  const celestial = new Group();
  scene.add(celestial);

  const skyMat = new ShaderMaterial({
    uniforms: {
      uSunDir: { value: SUN_DIR }, uSun: { value: AMBER },
      uHorizon: { value: new Color(0x0a0907) }, uZenith: { value: new Color(0x07080c) },
      uBandN: { value: new Vector3(0.55, 0.3, 0.35).normalize() },
      uBandN2: { value: new Vector3(-0.35, 0.45, 0.55).normalize() },
      uSeed: { value: new Vector2(Math.random() * 90, Math.random() * 90) },
    },
    side: BackSide, depthWrite: false,
    vertexShader: `varying vec3 vDir; void main(){ vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `
      uniform vec3 uSunDir,uSun,uHorizon,uZenith,uBandN,uBandN2; uniform vec2 uSeed; varying vec3 vDir;
      ${FBM2}
      void main(){
        vec3 d = normalize(vDir);
        vec3 col = mix(uHorizon, uZenith, smoothstep(-0.3, 0.4, d.y));
        float nb = fbm2(d.xy*3.1 + d.zx*1.4 + uSeed);
        float band = exp(-pow(dot(d,uBandN),2.0)*9.0);
        col += vec3(0.50,0.40,0.27)*nb*nb*band*0.26;
        float nb2 = fbm2(d.yx*2.6 - d.xz*1.2 + uSeed*1.7);
        float band2 = exp(-pow(dot(d,uBandN2),2.0)*11.0);
        col += vec3(0.16,0.20,0.30)*nb2*nb2*band2*0.22;
        float s = max(dot(d,uSunDir),0.0);
        col += uSun*(pow(s,900.0)*0.8 + pow(s,60.0)*0.10 + pow(s,8.0)*0.018);
        gl_FragColor = vec4(col,1.0);
      }`,
  });
  const sky = new Mesh(new SphereGeometry(420, 32, 16), skyMat);
  sky.renderOrder = -1; celestial.add(sky);

  // star clouds
  const starTime = { value: 0 };
  const starFrag = `
    uniform float uT; varying vec3 vC; varying float vP;
    void main(){
      float d = length(gl_PointCoord-0.5)*2.0;
      float tw = 0.72 + 0.28*sin(uT*(0.5+fract(vP*0.63)*1.6)+vP);
      gl_FragColor = vec4(vC, smoothstep(1.0,0.15,d)*tw);
    }`;
  const starMat = (attenuate: boolean): ShaderMaterial => new ShaderMaterial({
    uniforms: { uT: starTime, uDpr: { value: renderer.getPixelRatio() } },
    transparent: true, depthWrite: false, blending: AdditiveBlending,
    vertexShader: `
      attribute float aSize,aPhase; attribute vec3 aCol; uniform float uDpr; varying vec3 vC; varying float vP;
      void main(){ vC=aCol; vP=aPhase; vec4 mv = modelViewMatrix*vec4(position,1.0);
        gl_Position = projectionMatrix*mv; gl_PointSize = aSize*uDpr${attenuate ? '*clamp(90.0/-mv.z,0.25,3.2)' : ''}; }`,
    fragmentShader: starFrag,
  });
  const starCloud = (n: number, fill: (i: number, p: Float32Array, s: Float32Array, ph: Float32Array, c: Float32Array) => void, att: boolean): Points => {
    const p = new Float32Array(n * 3), s = new Float32Array(n), ph = new Float32Array(n), c = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) fill(i, p, s, ph, c);
    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(p, 3));
    g.setAttribute('aSize', new BufferAttribute(s, 1));
    g.setAttribute('aPhase', new BufferAttribute(ph, 1));
    g.setAttribute('aCol', new BufferAttribute(c, 3));
    return new Points(g, starMat(att));
  };
  // dome twinkle field
  celestial.add(starCloud(1300, (i, p, s, ph, c) => {
    const az = Math.random() * TAU, el = Math.asin(Math.random() * 2 - 1) * 0.96, R = 380;
    p[i * 3] = Math.sin(az) * Math.cos(el) * R; p[i * 3 + 1] = Math.sin(el) * R; p[i * 3 + 2] = Math.cos(az) * Math.cos(el) * R;
    s[i] = 0.9 + Math.random() * 1.4; ph[i] = Math.random() * 50;
    const a = Math.random() < 0.07, l = 0.35 + Math.random() * 0.6;
    c[i * 3] = (a ? 0.82 : 0.74) * l; c[i * 3 + 1] = (a ? 0.54 : 0.79) * l; c[i * 3 + 2] = (a ? 0.18 : 0.9) * l;
  }, false));

  // ── content placement ────────────────────────────────────────────────────
  // a flat list of stops; each carries a body + a tag + a dossier, clustered
  // toward its system (experience left, projects right) so the field reads as
  // two constellations rather than a single corridor of beads.
  interface Stop {
    z: number; body: Vector3; pick: Mesh;
    tag: ReturnType<typeof makeTitleTag>; tagGroup: Group;
    label: ReturnType<typeof makeLabel>; group: Group;
    bm: ShaderMaterial;
  }
  const stops: Stop[] = [];
  const redraws: (() => void)[] = [];
  const pickList: Mesh[] = [];

  const allItems: { item: Item; kind: 'experience' | 'projects'; idx: number; n: number }[] = [
    ...data.work.map((item, idx) => ({ item, kind: 'experience' as const, idx, n: data.work.length })),
    ...data.projects.map((item, idx) => ({ item, kind: 'projects' as const, idx, n: data.projects.length })),
  ];

  const expStart = FIRST;
  const expEnd = FIRST - (data.work.length - 1) * STEP;
  const projStart = expEnd - STEP * 1.5;

  // EXPERIENCE star + tilted orbit rings (the system you enter)
  const expStarPos = new Vector3(-15, 6, (expStart + expEnd) / 2);
  {
    const star = new Group(); star.position.copy(expStarPos);
    for (const [r, op] of [[7, 0.06], [4.4, 0.12]] as const) star.add(new Mesh(new SphereGeometry(r, 16, 16), new MeshBasicMaterial({ color: AMBER, transparent: true, opacity: op })));
    star.add(new Mesh(new SphereGeometry(1.7, 24, 24), new MeshBasicMaterial({ color: AMBER })));
    for (let k = 0; k < data.work.length; k++) {
      const rr = 13 + k * 9;
      const seg = 128; const pos = new Float32Array(seg * 3);
      for (let i = 0; i < seg; i++) { const a = (i / seg) * TAU; pos[i * 3] = Math.cos(a) * rr; pos[i * 3 + 1] = 0; pos[i * 3 + 2] = Math.sin(a) * rr; }
      const g = new BufferGeometry(); g.setAttribute('position', new BufferAttribute(pos, 3));
      const ring = new LineLoop(g, new LineBasicMaterial({ color: 0xbfc6d4, transparent: true, opacity: 0.16 }));
      ring.rotation.x = 1.15; ring.rotation.z = 0.18; star.add(ring);
    }
    scene.add(star);
  }

  // PROJECTS galaxy — a sqrt-spaced spiral disc you thread through
  const galCenter = new Vector3(11, -4, projStart - (data.projects.length - 1) * STEP / 2);
  {
    const N = mobile ? 900 : 1800; const arms = 2; const wind = 2.4;
    const p = new Float32Array(N * 3), s = new Float32Array(N), ph = new Float32Array(N), c = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const t = Math.pow(Math.random(), 0.62); const rad = 4 + t * 52;
      const arm = (i % arms) / arms * TAU; const a = arm + t * wind + (Math.random() - 0.5) * 0.5;
      const thick = (1 - t) * 5 + 1.2;
      p[i * 3] = galCenter.x + Math.cos(a) * rad + (Math.random() - 0.5) * thick;
      p[i * 3 + 1] = galCenter.y + (Math.random() - 0.5) * thick * 0.7;
      p[i * 3 + 2] = galCenter.z + Math.sin(a) * rad + (Math.random() - 0.5) * thick;
      s[i] = 0.7 + Math.random() * 1.5; ph[i] = Math.random() * 50;
      const amb = Math.random() < 0.12 - t * 0.08, l = (0.3 + Math.random() * 0.5) * (1.1 - t * 0.5);
      c[i * 3] = (amb ? 0.85 : 0.72) * l; c[i * 3 + 1] = (amb ? 0.55 : 0.78) * l; c[i * 3 + 2] = (amb ? 0.2 : 0.92) * l;
    }
    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(p, 3));
    g.setAttribute('aSize', new BufferAttribute(s, 1));
    g.setAttribute('aPhase', new BufferAttribute(ph, 1));
    g.setAttribute('aCol', new BufferAttribute(c, 3));
    scene.add(new Points(g, starMat(true)));
    // core glow
    const core = new Mesh(new SphereGeometry(3, 16, 16), new MeshBasicMaterial({ color: AMBER, transparent: true, opacity: 0.14 }));
    core.position.copy(galCenter); scene.add(core);
  }

  // near dust — a faint tube of motes around the route that visibly streams
  // past as you glide (the traversal cue; world-space so the camera moves
  // through it). Cheap, and lifts the detail toward the terrain-bg bar.
  {
    const M = mobile ? 170 : 320;
    const zA = CAM_START, zB = FIRST - allItems.length * STEP - TAIL;
    scene.add(starCloud(M, (i, p, s, ph, c) => {
      const z = lerp(zA, zB, Math.random());
      const a = Math.random() * TAU, rad = 3 + Math.random() * 16;
      p[i * 3] = pathX(z) + Math.cos(a) * rad;
      p[i * 3 + 1] = pathY(z) + Math.sin(a) * rad * 0.7;
      p[i * 3 + 2] = z;
      s[i] = 0.5 + Math.random() * 1.0; ph[i] = Math.random() * 50;
      const l = 0.18 + Math.random() * 0.3;
      c[i * 3] = 0.72 * l; c[i * 3 + 1] = 0.77 * l; c[i * 3 + 2] = 0.9 * l;
    }, true));
  }

  // body marker shader (a glowing point that pulses faintly when near)
  const bodyMat = (): ShaderMaterial => new ShaderMaterial({
    uniforms: { uT: starTime, uK: { value: 0 }, uDpr: { value: renderer.getPixelRatio() }, uCol: { value: new Color(0xcdd3df) } },
    transparent: true, depthWrite: false, blending: AdditiveBlending,
    vertexShader: `uniform float uT,uK,uDpr; void main(){ vec4 mv=modelViewMatrix*vec4(position,1.0); gl_Position=projectionMatrix*mv; gl_PointSize=(8.0+6.0*uK+2.0*sin(uT*2.0))*uDpr*clamp(120.0/-mv.z,0.4,4.2); }`,
    fragmentShader: `uniform float uK; uniform vec3 uCol; void main(){ float d=length(gl_PointCoord-0.5)*2.0; vec3 col=mix(uCol, vec3(0.95,0.62,0.2), uK*0.7); gl_FragColor=vec4(col, smoothstep(1.0,0.1,d)*(0.55+0.45*uK)); }`,
  });

  // build each stop: body point + invisible pick sphere + connector + tag + dossier
  allItems.forEach((entry, i) => {
    const z = FIRST - i * STEP;
    const sys = entry.kind === 'experience' ? expStarPos : galCenter;
    const side = entry.kind === 'experience' ? -1 : 1;   // exp clusters left, projects right
    // the node sits between the path centerline and its system, scattered so the
    // cluster reads as a constellation (the camera no longer turns to each, so
    // spread is free); z stays monotonic so the scroll order is preserved.
    const bx = pathX(z) + side * (6.5 + (i % 3) * 1.6) + Math.sin(i * 1.7) * 1.4;
    const by = pathY(z) + ((i % 3) - 1) * 2.4 + 0.4 * Math.cos(z * 0.5) + (side < 0 ? 1.2 : -1.0);
    const body = new Vector3(bx, by, z);

    // visible glow marker
    const bg = new BufferGeometry();
    bg.setAttribute('position', new BufferAttribute(new Float32Array([bx, by, z]), 3));
    const bm = bodyMat();
    const pts = new Points(bg, bm); pts.frustumCulled = false; scene.add(pts);

    // invisible pick sphere (raycast target for click-to-focus)
    const pick = new Mesh(new SphereGeometry(2.6, 12, 12), new MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }));
    pick.position.copy(body); pick.userData.idx = i; pick.renderOrder = -2;
    scene.add(pick); pickList.push(pick);

    // faint connector back to its system anchor
    const cg = new BufferGeometry();
    cg.setAttribute('position', new BufferAttribute(new Float32Array([bx, by, z, sys.x, sys.y, sys.z]), 3));
    scene.add(new LineSegments(cg, new LineBasicMaterial({ color: 0x8a90a0, transparent: true, opacity: 0.08 })));

    // always-on title tag, riding just above the node
    const tag = makeTitleTag(entry.item, entry.kind, entry.idx, aniso);
    redraws.push(tag.redraw);
    const tagGroup = new Group();
    tagGroup.position.set(bx, by + 2.6, z);
    tagGroup.add(tag.mesh); scene.add(tagGroup);
    tag.mesh.userData.idx = i; pickList.push(tag.mesh);  // the title text is a click target too

    // full dossier (hidden until this node is focused), floating beside the node
    const label = makeLabel(entry.item, entry.kind, entry.idx, entry.n, aniso);
    redraws.push(label.redraw);
    const group = new Group();
    group.position.set(bx + side * 5.2, by - 0.6, z);
    group.add(label.mesh); scene.add(group);

    stops.push({ z, body, pick, tag, tagGroup, label, group, bm });
  });

  // CONTACT beacon at the end
  const beaconZ = FIRST - allItems.length * STEP - 6;
  const beaconK = { value: 0 };
  {
    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(new Float32Array([pathX(beaconZ), pathY(beaconZ) + 1.4, beaconZ]), 3));
    const m = new ShaderMaterial({
      uniforms: { uT: starTime, uK: beaconK, uDpr: { value: renderer.getPixelRatio() } },
      transparent: true, depthWrite: false, blending: AdditiveBlending,
      vertexShader: `uniform float uT,uDpr; void main(){ vec4 mv=modelViewMatrix*vec4(position,1.0); gl_Position=projectionMatrix*mv; gl_PointSize=(16.0+5.0*sin(uT*2.1))*uDpr; }`,
      fragmentShader: `uniform float uT,uK; void main(){ float d=length(gl_PointCoord-0.5)*2.0; float pulse=0.6+0.4*sin(uT*2.1); gl_FragColor=vec4(vec3(0.95,0.62,0.20), smoothstep(1.0,0.1,d)*pulse*uK); }`,
    });
    const pts = new Points(g, m); pts.frustumCulled = false; scene.add(pts);
  }

  // ── film stack (no DoF — text must stay sharp)
  const composer = new EffectComposer(renderer, { multisampling: mobile ? 0 : 4 });
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new BloomEffect({ intensity: 0.7, luminanceThreshold: 0.55, luminanceSmoothing: 0.3, mipmapBlur: true });
  const grain = new NoiseEffect({ premultiply: true }); grain.blendMode.opacity.value = 0.4;
  const vignette = new VignetteEffect({ offset: 0.3, darkness: 0.62 });
  composer.addPass(new EffectPass(camera, bloom, grain, vignette));

  const resize = (): void => {
    const w = canvas.clientWidth || window.innerWidth, h = canvas.clientHeight || window.innerHeight;
    if (w < 2 || h < 2) return;
    composer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix();
  };
  resize(); window.addEventListener('resize', resize);

  // redraw labels once webfonts are ready (first paint may use fallback metrics)
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => redraws.forEach((r) => r()));

  // ── travel + interaction ─────────────────────────────────────────────────
  const rawP = (): number => {
    const h = document.documentElement; const max = h.scrollHeight - window.innerHeight;
    return max > 0 ? Math.min(1, Math.max(0, h.scrollTop / max)) : 0;
  };
  const Z0 = CAM_START, Z1 = beaconZ - TAIL;

  // free-look (drag) state
  let yaw = 0, pitch = 0, tgtYaw = 0, tgtPitch = 0;
  let dragging = false, moved = false, downX = 0, downY = 0, lastX = 0, lastY = 0;
  // focus (click-to-read) state
  let focusIdx = -1, focusK = 0, focusAtP = 0;
  let interacted = false;
  const markInteract = (): void => { if (!interacted) { interacted = true; document.body.classList.add('did-interact'); } };

  const ray = new Raycaster();
  const ndc = new Vector2();
  const pickAt = (clientX: number, clientY: number): number => {
    const r = canvas.getBoundingClientRect();
    ndc.set(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObjects(pickList, false)[0];
    return hit ? (hit.object.userData.idx as number) : -1;
  };

  canvas.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    dragging = true; moved = false; downX = lastX = e.clientX; downY = lastY = e.clientY;
    canvas.setPointerCapture(e.pointerId); canvas.style.cursor = 'grabbing';
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - lastX, dy = e.clientY - lastY; lastX = e.clientX; lastY = e.clientY;
    if (Math.hypot(e.clientX - downX, e.clientY - downY) > 5) { moved = true; markInteract(); }
    // drag right → look right; drag down → look down (signs applied at use site)
    tgtYaw = clamp(tgtYaw + dx * LOOK_SENS, -YAW_MAX, YAW_MAX);
    tgtPitch = clamp(tgtPitch + dy * LOOK_SENS, -PITCH_MAX, PITCH_MAX);
  });
  const endDrag = (e: PointerEvent): void => {
    if (!dragging) return;
    dragging = false; canvas.style.cursor = 'grab';
    try { canvas.releasePointerCapture(e.pointerId); } catch { /* already released */ }
    if (!moved) {                      // a click, not a drag → pick / release
      const idx = pickAt(e.clientX, e.clientY);
      focusIdx = idx; focusAtP = rawP(); if (idx >= 0) markInteract();
    }
  };
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);
  addEventListener('keydown', (e) => { if (e.key === 'Escape') focusIdx = -1; });

  // letterbox crossings (DOM owned by 3d.astro) at each region boundary
  const lbox = document.getElementById('lbox'); const lbcard = document.getElementById('lbcard');
  let lbTimer = 0; let lastP = rawP();
  const REGIONS = [
    { p: 0.04, card: '01', name: 'EXPERIENCE' },
    { p: clamp(Math.abs(Z0 - projStart) / Math.abs(Z0 - Z1), 0.1, 0.9), card: '02', name: 'PROJECTS' },
    { p: 0.985, card: '03', name: 'CONTACT' },
  ];
  const letterbox = (p: number): void => {
    if (!lbox || !lbcard) return;
    for (const r of REGIONS) {
      if ((lastP - r.p) * (p - r.p) < 0) {
        lbcard.innerHTML = `<span class="ax">${r.card}</span> — ${r.name}`;
        lbox.classList.add('on'); clearTimeout(lbTimer);
        lbTimer = window.setTimeout(() => lbox.classList.remove('on'), 1500);
      }
    }
    lastP = p;
  };

  // eased camera state (smoothing both the glide and any focus diversions)
  const camPos = new Vector3(pathX(Z0), pathY(Z0), Z0);
  const camLook = new Vector3(pathX(Z0 - LOOK_AHEAD), pathY(Z0 - LOOK_AHEAD), Z0 - LOOK_AHEAD);
  const dPos = new Vector3(), dLook = new Vector3(), dir = new Vector3(), right = new Vector3();
  const UP = new Vector3(0, 1, 0);
  const tmp = new Vector3();

  const pose = (p: number, t: number, dt: number): void => {
    const z = Z0 + (Z1 - Z0) * p;
    const calm = 1 - focusK * 0.7;     // settle the handheld feel while reading
    const swX = SWAY * Math.sin(t * 0.43 + 1.7) * 0.6 * calm;
    const swY = SWAY * (Math.sin(t * 0.5) + 0.55 * Math.sin(t * 1.13 + 2.1)) * calm;

    // glide pose — straight down the path, looking ahead (no per-node turning)
    dPos.set(pathX(z) + swX, pathY(z) + swY, z);
    const lz = z - LOOK_AHEAD;
    dLook.set(pathX(lz), pathY(lz), lz);

    // focus pose — pull alongside the focused node and frame its dossier
    if (focusIdx >= 0) {
      const s = stops[focusIdx];
      tmp.copy(s.group.position);
      dPos.lerp(new Vector3(lerp(pathX(s.z), tmp.x, 0.45), tmp.y + 1.6, s.z + 15.5), focusK);
      dLook.lerp(tmp, focusK);
    }

    // ease the real camera toward the desired pose (the smoothing that makes
    // the flight buttery and the diversions glide instead of snap)
    const f = chase(dt, GLIDE_CHASE);
    camPos.lerp(dPos, f); camLook.lerp(dLook, f);

    // apply free-look on top: rotate the view direction by yaw/pitch
    dir.copy(camLook).sub(camPos).normalize();
    dir.applyAxisAngle(UP, -yaw);                       // yaw>0 → look right
    right.copy(dir).cross(UP).normalize();
    dir.applyAxisAngle(right, -pitch);                  // pitch>0 → look down
    camera.position.copy(camPos);
    camera.lookAt(tmp.copy(camPos).add(dir));
    camera.rotateZ(0.006 * Math.sin(t * 0.31) * calm);

    celestial.position.copy(camera.position);

    // tags: billboard + proximity opacity (hidden on the focused node, whose
    // full dossier is up). dossiers: only the focused one is visible.
    for (let j = 0; j < stops.length; j++) {
      const s = stops[j];
      const dist = camera.position.distanceTo(s.body);
      const near = ss(NEAR_FADE, NEAR_FULL, dist);
      const isFocus = j === focusIdx ? focusK : 0;
      s.tag.mat.opacity = Math.max(0, near * (1 - isFocus) * 0.92);
      s.label.mat.opacity = isFocus;
      s.tagGroup.quaternion.copy(camera.quaternion);
      s.group.quaternion.copy(camera.quaternion);
      s.bm.uniforms.uK.value = Math.max(near * 0.7, isFocus);
    }
    beaconK.value = ss(0.6, 0.94, p);
  };

  let running = true;
  document.addEventListener('visibilitychange', () => { running = !document.hidden; });
  canvas.style.cursor = 'grab';

  let t = 0, prev = 0;
  const frame = (now: number): void => {
    const dt = prev ? Math.min(0.05, (now - prev) / 1000) : 0; prev = now;
    if (running) {
      // reduced motion: the world doesn't drift on its own (no time advance, no
      // ambient sway/twinkle, camera snaps to the scroll target), but scroll,
      // drag-look and click-to-read still respond — it's the user that moves.
      const rm = reduceMo.matches;
      t += rm ? 0 : dt;
      const p = rawP();
      // scrolling releases a focus (the glide resumes)
      if (focusIdx >= 0 && Math.abs(p - focusAtP) > 0.012) focusIdx = -1;
      focusK = rm ? (focusIdx >= 0 ? 1 : 0) : focusK + chase(dt, 4) * ((focusIdx >= 0 ? 1 : 0) - focusK);
      // free-look: chase the drag target, and decay it back to forward when idle
      if (!dragging) { const r = chase(dt, RECENTER); tgtYaw -= tgtYaw * r; tgtPitch -= tgtPitch * r; }
      const lf = rm ? 1 : chase(dt, LOOK_EASE);
      yaw += (tgtYaw - yaw) * lf; pitch += (tgtPitch - pitch) * lf;
      letterbox(p); starTime.value = t;
      pose(p, t, rm ? 10 : dt);   // dt=10 → chase factor ≈1 → snap (no glide easing)
      composer.render();
    }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
  pose(rawP(), 0, 10); composer.render();
}
