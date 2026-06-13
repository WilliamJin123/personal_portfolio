// /3d — "The Drift" (flight 002): one continuous scroll-driven drift through
// open space. The camera glides forward along a lazy S-curve while slowly
// rolling; the celestial sphere counter-precesses, so the cosmos wheels past
// as you travel. Nebula banks of fbm dust slide by with real parallax, near
// motes stream past, and a ringed planet — promoted from sky prop to hero —
// sweeps its hairline rings across the frame at mid-route. A pulsing amber
// beacon waits past the end for station 03.
// Spec: docs/superpowers/specs/2026-06-11-3d-drift-design.md
//
// Scaffolding carries over from flight 001: scroll progress with exponential
// inertia, handheld sway + mouse parallax, station crossings that trigger the
// letterbox moment in the DOM (#lbox / #lbcard, owned by 3d.astro), and the
// film stack (DoF desktop-only, bloom, grain, vignette).
//
// Conventions match bg-terrain.ts: resize handler, paused when the tab is
// backgrounded, reduced-motion renders a single static pose. Throws if the
// WebGL renderer can't be constructed — the caller degrades to no-gl.

import {
  Scene, PerspectiveCamera, WebGLRenderer,
  BufferGeometry, BufferAttribute,
  Mesh, ShaderMaterial, PlaneGeometry, SphereGeometry,
  Points, PointsMaterial, Group, LineSegments, LineLoop, LineBasicMaterial,
  Color, Vector2, Vector3, BackSide, AdditiveBlending,
} from 'three';
import {
  EffectComposer, RenderPass, EffectPass,
  BloomEffect, DepthOfFieldEffect, NoiseEffect, VignetteEffect,
} from 'postprocessing';

// ── flight
const P_START = 14;        // camera z at p=0
const P_END = -250;        // camera z at p=1
const LOOK_AHEAD = 26;     // look target distance down-path
const SCROLL_CHASE = 2.2;  // progress inertia (per s) — glides, then coasts
const SWAY = 0.14;         // handheld amplitude
const ROLL_A = 0.22;       // first roll segment (rad)
const ROLL_B = 0.30;       // second roll segment (rad) — ~30° total
const PREC_TOT = 0.35;     // celestial counter-precession across the journey
const PREC_AXIS = new Vector3(0.2, 0.35, 1).normalize();

// ── light
const SUN_DIR = new Vector3(-0.52, 0.20, -0.83).normalize();
const SUN = new Color(0xd08a2e);

// ── celestial dome (camera-locked)
const STAR_N = 1400;
const STAR_R = 350;
const CONST_BOOST = 2.3;   // constellation brightening near its station
const CONST_ZONE = 0.1;    // |p - station| inside which it brightens

// ── world layers
const FIELD_N = 520;       // mid star field (parallax)
const MOTE_N = 260;        // near dust motes (streaming tube)
const BANK_N = 13;         // nebula banks, desktop
const BANK_N_M = 7;        //   …mobile

// ── hero flyby — peaks in the work→projects transition (a spectacle while
// scrolling between stations), then recedes so the Projects readout sits clear.
const PLANET_P = 0.50;     // progress of closest approach
const PLANET_R = 11;
const PLANET_OFF_X = 55;   // lateral offset from the path
const PLANET_OFF_Y = 14;

// ── contact beacon
const BEACON_Z = -290;

// ── stations: boundary progress + title card. Crossing one triggers the
// letterbox moment; look-at keyframes compose the camera per stretch.
// p-values are the scroll-fraction centres of the pinned content stations in
// 3d.astro (hero 100svh + two 178svh stations + a 150svh contact ≈ 0.27/0.62/0.95).
const STATIONS = [
  { p: 0.27, card: '01', name: 'EXPERIENCE' },
  { p: 0.62, card: '02', name: 'PROJECTS' },
  { p: 0.95, card: '03', name: 'CONTACT' },
];
const LB_HOLD = 1500;      // ms the letterbox stays before retracting
const FOCUS_ZONE = 0.06;   // |p - station| inside which focus racks near
const FLYBY_ZONE = 0.14;   // |p - PLANET_P| inside which focus tracks the planet
const FOCUS_FAR = 44;      // cruising focus distance (world units)
const FOCUS_NEAR = 16;     // station focus distance
const LOOK_KEYS = [        // per-progress look-at bias: [p, lateral, vertical]
  [0.00, 0.0, 0.4],
  [0.27, -2.5, -0.8],      // Experience: bank left into the dust
  [0.44, 3.2, 1.1],        // the flyby — lean into the ringed giant
  [0.62, 0.6, 0.5],        // Projects: planet receding, settle forward
  [0.82, 0.0, 0.4],
  [1.00, 0.5, 1.6],        // Contact: lift toward the beacon
];

// Session-random offsets keep each visit's drift its own.
const SX = Math.random() * 1000;
const SZ = Math.random() * 1000;

// Lateral + vertical meander of the drift path.
function pathX(z: number): number {
  return 7.0 * Math.sin(z * 0.014 + SX) + 4.0 * Math.sin(z * 0.027 + SZ);
}
function pathY(z: number): number {
  return 2.2 * Math.sin(z * 0.011 + SZ * 0.7);
}

function ss(a: number, b: number, x: number): number {
  const u = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return u * u * (3 - 2 * u);
}

// Accumulated barrel roll — two eased segments, never a corkscrew.
function rollOf(p: number): number {
  return ROLL_A * ss(0.05, 0.42, p) + ROLL_B * ss(0.52, 0.95, p);
}

// Look-at weight toward the planet through the flyby window.
function flybyW(p: number): number {
  return ss(0.30, 0.44, p) * (1 - ss(0.56, 0.70, p)) * 0.6;
}

function lookBias(p: number): [number, number] {
  for (let i = 1; i < LOOK_KEYS.length; i++) {
    if (p <= LOOK_KEYS[i][0]) {
      const [p0, x0, y0] = LOOK_KEYS[i - 1];
      const [p1, x1, y1] = LOOK_KEYS[i];
      const u = ss(0, 1, (p - p0) / (p1 - p0));
      return [x0 + (x1 - x0) * u, y0 + (y1 - y0) * u];
    }
  }
  return [LOOK_KEYS[LOOK_KEYS.length - 1][1], LOOK_KEYS[LOOK_KEYS.length - 1][2]];
}

// Shared GLSL: value-noise fbm for the nebula (dome band + world banks).
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

export function initDriftScene(canvas: HTMLCanvasElement): void {
  const reduceMo = matchMedia('(prefers-reduced-motion: reduce)');
  const mobile = matchMedia('(pointer: coarse)').matches || window.innerWidth < 760;

  const scene = new Scene();
  const camera = new PerspectiveCamera(50, 1, 0.5, 420);

  const renderer = new WebGLRenderer({
    canvas,
    antialias: false, // composer MSAA on desktop; grain hides the rest
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 2));

  // ── celestial group — sky dome, far stars, constellations; follows the
  // camera each frame and counter-precesses so the heavens wheel past.
  const celestial = new Group();
  scene.add(celestial);

  // sky: two-tone space gradient + dim off-axis sun + two nebula dust bands
  const skyMat = new ShaderMaterial({
    uniforms: {
      uSunDir: { value: SUN_DIR },
      uSun: { value: SUN },
      uHorizon: { value: new Color(0x0a0907) },
      uZenith: { value: new Color(0x07080c) },
      uBandN: { value: new Vector3(0.55, 0.30, 0.35).normalize() },
      uBandN2: { value: new Vector3(-0.35, 0.45, 0.55).normalize() },
      uSeed: { value: new Vector2(Math.random() * 90, Math.random() * 90) },
    },
    side: BackSide,
    depthWrite: false,
    vertexShader: `
      varying vec3 vDir;
      void main() {
        vDir = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 uSunDir, uSun, uHorizon, uZenith, uBandN, uBandN2;
      uniform vec2 uSeed;
      varying vec3 vDir;
      ${FBM2}
      void main() {
        vec3 d = normalize(vDir);
        vec3 col = mix(uHorizon, uZenith, smoothstep(-0.3, 0.4, d.y));
        // warm dust band + a fainter cool counter-band
        float nb = fbm2(d.xy * 3.1 + d.zx * 1.4 + uSeed);
        float band = exp(-pow(dot(d, uBandN), 2.0) * 9.0);
        col += vec3(0.50, 0.40, 0.27) * nb * nb * band * 0.26;
        float nb2 = fbm2(d.yx * 2.6 - d.xz * 1.2 + uSeed * 1.7);
        float band2 = exp(-pow(dot(d, uBandN2), 2.0) * 11.0);
        col += vec3(0.16, 0.20, 0.30) * nb2 * nb2 * band2 * 0.22;
        float s = max(dot(d, uSunDir), 0.0);
        col += uSun * (pow(s, 900.0) * 0.8 + pow(s, 60.0) * 0.10 + pow(s, 8.0) * 0.018);
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
  const sky = new Mesh(new SphereGeometry(380, 32, 16), skyMat);
  sky.renderOrder = -1;
  celestial.add(sky);

  // ── star shaders: dome stars are fixed-size; world stars attenuate with
  // distance so the mid field parallaxes and the near motes stream.
  const starTime = { value: 0 };
  const starFrag = `
    uniform float uT;
    varying vec3 vC;
    varying float vP;
    void main() {
      float d = length(gl_PointCoord - 0.5) * 2.0;
      float tw = 0.72 + 0.28 * sin(uT * (0.5 + fract(vP * 0.63) * 1.6) + vP);
      gl_FragColor = vec4(vC, smoothstep(1.0, 0.15, d) * tw);
    }
  `;
  const makeStarMat = (attenuate: boolean): ShaderMaterial => new ShaderMaterial({
    uniforms: { uT: starTime, uDpr: { value: renderer.getPixelRatio() } },
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    vertexShader: `
      attribute float aSize, aPhase;
      attribute vec3 aCol;
      uniform float uDpr;
      varying vec3 vC;
      varying float vP;
      void main() {
        vC = aCol; vP = aPhase;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = aSize * uDpr${attenuate ? ' * clamp(90.0 / -mv.z, 0.25, 3.2)' : ''};
      }
    `,
    fragmentShader: starFrag,
  });
  const starCloud = (
    n: number,
    fill: (i: number, pos: Float32Array, size: Float32Array, phase: Float32Array, col: Float32Array) => void,
    attenuate: boolean,
  ): Points => {
    const pos = new Float32Array(n * 3);
    const size = new Float32Array(n);
    const phase = new Float32Array(n);
    const col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) fill(i, pos, size, phase, col);
    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(pos, 3));
    g.setAttribute('aSize', new BufferAttribute(size, 1));
    g.setAttribute('aPhase', new BufferAttribute(phase, 1));
    g.setAttribute('aCol', new BufferAttribute(col, 3));
    return new Points(g, makeStarMat(attenuate));
  };

  // far shell: dome-locked twinkle field
  celestial.add(starCloud(STAR_N, (i, pos, size, phase, col) => {
    const az = Math.random() * Math.PI * 2;
    const el = Math.asin(Math.random() * 2 - 1) * 0.96;
    pos[i * 3] = Math.sin(az) * Math.cos(el) * STAR_R;
    pos[i * 3 + 1] = Math.sin(el) * STAR_R;
    pos[i * 3 + 2] = Math.cos(az) * Math.cos(el) * STAR_R;
    size[i] = 0.9 + Math.random() * 1.5;
    phase[i] = Math.random() * 50;
    const amber = Math.random() < 0.07;
    const lum = 0.35 + Math.random() * 0.6;
    col[i * 3] = (amber ? 0.82 : 0.74) * lum;
    col[i * 3 + 1] = (amber ? 0.54 : 0.79) * lum;
    col[i * 3 + 2] = (amber ? 0.18 : 0.9) * lum;
  }, false));

  // mid field: world-space stars through the corridor, core excluded
  scene.add(starCloud(FIELD_N, (i, pos, size, phase, col) => {
    const z = 50 - Math.random() * 390;
    let x = (Math.random() - 0.5) * 340;
    let y = (Math.random() - 0.5) * 260 + 10;
    const dx = x - pathX(z);
    const dy = y - pathY(z);
    const d = Math.hypot(dx, dy);
    if (d < 18) { x += (dx / (d || 1)) * 18; y += (dy / (d || 1)) * 18; }
    pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = z;
    size[i] = 1.0 + Math.random() * 1.8;
    phase[i] = Math.random() * 50;
    const amber = Math.random() < 0.06;
    const lum = 0.3 + Math.random() * 0.55;
    col[i * 3] = (amber ? 0.82 : 0.72) * lum;
    col[i * 3 + 1] = (amber ? 0.54 : 0.78) * lum;
    col[i * 3 + 2] = (amber ? 0.18 : 0.9) * lum;
  }, true));

  // near motes: a faint dust tube around the path — the streaming cue
  scene.add(starCloud(mobile ? 160 : MOTE_N, (i, pos, size, phase, col) => {
    const z = 20 - Math.random() * 320;
    const a = Math.random() * Math.PI * 2;
    const r = 3 + 33 * Math.pow(Math.random(), 1.5);
    pos[i * 3] = pathX(z) + Math.cos(a) * r;
    pos[i * 3 + 1] = pathY(z) + Math.sin(a) * r;
    pos[i * 3 + 2] = z;
    size[i] = 0.6 + Math.random() * 0.6;
    phase[i] = Math.random() * 50;
    const lum = 0.10 + Math.random() * 0.18;
    col[i * 3] = 0.72 * lum; col[i * 3 + 1] = 0.78 * lum; col[i * 3 + 2] = 0.9 * lum;
  }, true));

  // ── nebula banks: billboarded fbm dust planes scattered along the corridor.
  // Additive, no depth writes; they dissolve within ~10 units of the camera
  // so flying through one never clips.
  const banks: Mesh[] = [];
  {
    const bankGeom = new PlaneGeometry(1, 1);
    const nBanks = mobile ? BANK_N_M : BANK_N;
    for (let i = 0; i < nBanks; i++) {
      const cool = Math.random() < 0.3;
      const mat = new ShaderMaterial({
        uniforms: {
          uSeed: { value: new Vector2(Math.random() * 40, Math.random() * 40) },
          uFq: { value: 2.4 + Math.random() * 1.6 },
          uCol: { value: cool ? new Color(0x1e2434) : new Color(0x53412a) },
          uA: { value: 0.20 + Math.random() * 0.16 },
        },
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        vertexShader: `
          varying vec2 vUv;
          varying vec3 vW;
          void main() {
            vUv = uv;
            vec4 w = modelMatrix * vec4(position, 1.0);
            vW = w.xyz;
            gl_Position = projectionMatrix * viewMatrix * w;
          }
        `,
        fragmentShader: `
          uniform vec2 uSeed;
          uniform float uFq, uA;
          uniform vec3 uCol;
          varying vec2 vUv;
          varying vec3 vW;
          ${FBM2}
          void main() {
            float nb = fbm2(vUv * uFq + uSeed);
            float r = length(vUv - 0.5) * 2.0;
            float a = nb * nb * nb * smoothstep(1.0, 0.3, r) * uA;
            a *= smoothstep(9.0, 24.0, length(vW - cameraPosition));
            gl_FragColor = vec4(uCol, a);
          }
        `,
      });
      const m = new Mesh(bankGeom, mat);
      const z = -10 - (i / nBanks) * 245 - Math.random() * 12;
      // alternate banks hug the corridor so some slide right past the lens
      const near = i % 2 === 0;
      m.position.set(
        pathX(z) + (Math.random() - 0.5) * (near ? 50 : 120),
        pathY(z) + (Math.random() - 0.5) * (near ? 34 : 70) + 4,
        z,
      );
      const s = 46 + Math.random() * 50;
      m.scale.set(s, s * (0.55 + Math.random() * 0.5), 1);
      scene.add(m);
      banks.push(m);
    }
  }

  // ── hero flyby: the ringed planet, in world space on the planet side of
  // the path. Banded giant, amber crescent toward the sun, hairline rings.
  const zP = P_START + (P_END - P_START) * PLANET_P;
  const planetPos = new Vector3(pathX(zP) + PLANET_OFF_X, pathY(zP) + PLANET_OFF_Y, zP);
  const planet = new Group();
  {
    planet.position.copy(planetPos);
    const m = new ShaderMaterial({
      uniforms: { uSunDir: { value: SUN_DIR }, uSun: { value: SUN } },
      vertexShader: `
        varying vec3 vN, vW;
        void main() {
          vN = normalize(mat3(modelMatrix) * normal);
          vec4 w = modelMatrix * vec4(position, 1.0);
          vW = w.xyz;
          gl_Position = projectionMatrix * viewMatrix * w;
        }
      `,
      fragmentShader: `
        uniform vec3 uSunDir, uSun;
        varying vec3 vN, vW;
        void main() {
          vec3 n = normalize(vN);
          float diff = max(dot(n, uSunDir), 0.0);
          float bands = 0.82 + 0.18 * sin(n.y * 14.0 + sin(n.x * 5.0) * 0.7);
          vec3 col = vec3(0.115, 0.13, 0.17) * (0.10 + 0.95 * diff) * bands;
          vec3 v = normalize(cameraPosition - vW);
          col += uSun * pow(1.0 - max(dot(n, v), 0.0), 3.0) * (0.1 + diff) * 0.38;
          gl_FragColor = vec4(col, 1.0);
        }
      `,
    });
    planet.add(new Mesh(new SphereGeometry(PLANET_R, 48, 32), m));
    for (const [rr, op] of [[1.42, 0.32], [1.58, 0.20], [1.78, 0.26], [1.96, 0.13], [2.12, 0.07]]) {
      const seg = 256;
      const rp = new Float32Array(seg * 3);
      for (let i = 0; i < seg; i++) {
        const a = (i / seg) * Math.PI * 2;
        rp[i * 3] = Math.cos(a) * PLANET_R * rr;
        rp[i * 3 + 2] = Math.sin(a) * PLANET_R * rr;
      }
      const g = new BufferGeometry();
      g.setAttribute('position', new BufferAttribute(rp, 3));
      planet.add(new LineLoop(g, new LineBasicMaterial({ color: 0xbfc6d4, transparent: true, opacity: op })));
    }
    scene.add(planet);
  }

  // ── contact beacon: one pulsing amber point past the end of the route,
  // fading in through the last stretch.
  const beaconK = { value: 0 };
  {
    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(new Float32Array([
      pathX(BEACON_Z), pathY(BEACON_Z) + 1.5, BEACON_Z,
    ]), 3));
    const m = new ShaderMaterial({
      uniforms: { uT: starTime, uK: beaconK, uDpr: { value: renderer.getPixelRatio() } },
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      vertexShader: `
        uniform float uT, uDpr;
        void main() {
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mv;
          gl_PointSize = (10.0 + 3.0 * sin(uT * 2.1)) * uDpr;
        }
      `,
      fragmentShader: `
        uniform float uT, uK;
        void main() {
          float d = length(gl_PointCoord - 0.5) * 2.0;
          float pulse = 0.6 + 0.4 * sin(uT * 2.1);
          gl_FragColor = vec4(vec3(0.95, 0.62, 0.20), smoothstep(1.0, 0.1, d) * pulse * uK);
        }
      `,
    });
    const pts = new Points(g, m);
    pts.frustumCulled = false;
    scene.add(pts);
  }

  // constellations: a hairline star pattern per station (plus one free one
  // near the start), each with an amber alpha star. Brightens near its station.
  interface Cluster { mats: (PointsMaterial | LineBasicMaterial)[]; base: number[]; st: number; k: number }
  const clusters: Cluster[] = [];
  for (const c of [
    { az: 0.55, el: 0.52, st: -1 },
    { az: -0.65, el: 0.45, st: 0 },
    { az: 0.95, el: 0.62, st: 1 },
    { az: -0.15, el: 0.38, st: 2 },
  ]) {
    const n = 5 + Math.floor(Math.random() * 3);
    const dirs: Vector3[] = [];
    let a = c.az;
    let e = c.el;
    for (let i = 0; i < n; i++) {
      dirs.push(new Vector3(Math.sin(a) * Math.cos(e), Math.sin(e), -Math.cos(a) * Math.cos(e)));
      a += (Math.random() - 0.5) * 0.17;
      e += (Math.random() - 0.5) * 0.13;
    }
    const R = STAR_R * 0.98;
    const pts = new Float32Array(dirs.length * 3);
    dirs.forEach((d, i) => { pts[i * 3] = d.x * R; pts[i * 3 + 1] = d.y * R; pts[i * 3 + 2] = d.z * R; });
    const pg = new BufferGeometry();
    pg.setAttribute('position', new BufferAttribute(pts, 3));
    const starMat = new PointsMaterial({ color: 0xcfd6e4, size: 3, sizeAttenuation: false, transparent: true, opacity: 0.5, depthWrite: false });
    celestial.add(new Points(pg, starMat));
    const apg = new BufferGeometry();
    apg.setAttribute('position', new BufferAttribute(pts.slice(0, 3), 3));
    const alphaMat = new PointsMaterial({ color: 0xd08a2e, size: 4.5, sizeAttenuation: false, transparent: true, opacity: 0.8, depthWrite: false });
    celestial.add(new Points(apg, alphaMat));
    const lp = new Float32Array((dirs.length - 1) * 6);
    for (let i = 0; i < dirs.length - 1; i++) {
      lp.set([pts[i * 3], pts[i * 3 + 1], pts[i * 3 + 2], pts[i * 3 + 3], pts[i * 3 + 4], pts[i * 3 + 5]], i * 6);
    }
    const lg = new BufferGeometry();
    lg.setAttribute('position', new BufferAttribute(lp, 3));
    const lineMat = new LineBasicMaterial({ color: 0xaab2c4, transparent: true, opacity: 0.13, depthWrite: false });
    celestial.add(new LineSegments(lg, lineMat));
    clusters.push({ mats: [starMat, alphaMat, lineMat], base: [0.5, 0.8, 0.13], st: c.st, k: 1 });
  }

  // ── film stack
  const composer = new EffectComposer(renderer, { multisampling: mobile ? 0 : 4 });
  composer.addPass(new RenderPass(scene, camera));
  const grain = new NoiseEffect({ premultiply: true });
  grain.blendMode.opacity.value = 0.5;
  const bloom = new BloomEffect({
    intensity: 0.85,
    luminanceThreshold: 0.3,
    luminanceSmoothing: 0.25,
    mipmapBlur: true,
  });
  const vignette = new VignetteEffect({ offset: 0.28, darkness: 0.6 });
  let dof: DepthOfFieldEffect | null = null;
  if (!mobile) {
    dof = new DepthOfFieldEffect(camera, { focalLength: 0.06, bokehScale: 1.7 });
    dof.cocMaterial.worldFocusDistance = FOCUS_FAR;
    dof.cocMaterial.worldFocusRange = 30;
  }
  composer.addPass(new EffectPass(camera, ...(dof ? [dof] : []), bloom, grain, vignette));

  const resize = (): void => {
    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
    if (w < 2 || h < 2) return;
    composer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  resize();
  window.addEventListener('resize', resize);

  // ── scroll → progress (with inertia)
  const rawProgress = (): number => {
    const h = document.documentElement;
    const max = h.scrollHeight - window.innerHeight;
    return max > 0 ? Math.min(1, Math.max(0, h.scrollTop / max)) : 0;
  };
  let pS = rawProgress();

  // mouse parallax
  let curX = 0, curY = 0, tgtX = 0, tgtY = 0;
  window.addEventListener('pointermove', (e) => {
    tgtX = (e.clientX / window.innerWidth - 0.5) * 2;
    tgtY = (e.clientY / window.innerHeight - 0.5) * 2;
  }, { passive: true });

  // letterbox moment — crossing-based so the bars never stick
  const lbox = document.getElementById('lbox');
  const lbcard = document.getElementById('lbcard');
  let lbTimer = 0;
  let lastP = pS;
  const letterbox = (p: number): void => {
    if (!lbox || !lbcard) return;
    for (const st of STATIONS) {
      if ((lastP - st.p) * (p - st.p) < 0) {
        lbcard.innerHTML = `<span class="ax">${st.card}</span> — ${st.name}`;
        lbox.classList.add('on');
        clearTimeout(lbTimer);
        lbTimer = window.setTimeout(() => lbox.classList.remove('on'), LB_HOLD);
      }
    }
    lastP = p;
  };

  const look = new Vector3();
  const pose = (p: number, t: number): void => {
    const z = P_START + (P_END - P_START) * p;
    const swayX = SWAY * Math.sin(t * 0.43 + 1.7) * 0.6;
    const swayY = SWAY * (Math.sin(t * 0.5) + 0.55 * Math.sin(t * 1.13 + 2.1));
    camera.position.set(
      pathX(z) + swayX + curX * 0.6,
      pathY(z) + swayY + curY * 0.4,
      z,
    );
    const [bx, by] = lookBias(p);
    const lz = z - LOOK_AHEAD;
    look.set(pathX(lz) + bx + curX * 1.4, pathY(lz) + by + curY * 0.6, lz);
    look.lerp(planetPos, flybyW(p)); // the flyby pulls the gaze
    camera.lookAt(look);
    camera.rotateZ(rollOf(p) + 0.008 * Math.sin(t * 0.31));

    celestial.position.copy(camera.position); // the heavens never get closer
    celestial.setRotationFromAxisAngle(PREC_AXIS, -PREC_TOT * p - t * 0.003);
    planet.rotation.set(0.42, t * 0.02, 0.45);
    beaconK.value = ss(0.62, 0.88, p);
    for (const b of banks) b.quaternion.copy(camera.quaternion);
  };

  let running = true;
  document.addEventListener('visibilitychange', () => {
    running = !document.hidden;
  });

  let t = 0;
  let prev = 0;
  let focus = FOCUS_FAR;
  const frame = (now: number): void => {
    const dt = prev ? Math.min(0.05, (now - prev) / 1000) : 0;
    prev = now;
    if (reduceMo.matches) {
      pose(rawProgress(), 0);
      composer.render(); // single static graded frame
      return;
    }
    if (running) {
      t += dt;
      curX += (tgtX - curX) * 0.05;
      curY += (tgtY - curY) * 0.05;
      pS += (rawProgress() - pS) * (1 - Math.exp(-dt * SCROLL_CHASE));

      letterbox(pS);
      starTime.value = t;
      for (const cl of clusters) {
        const near = cl.st >= 0 && Math.abs(pS - STATIONS[cl.st].p) < CONST_ZONE;
        cl.k += ((near ? CONST_BOOST : 1) - cl.k) * (1 - Math.exp(-dt * 2));
        cl.mats.forEach((m, i) => { m.opacity = Math.min(1, cl.base[i] * cl.k); });
      }

      pose(pS, t);

      if (dof) {
        let target = FOCUS_FAR;
        if (Math.abs(pS - PLANET_P) < FLYBY_ZONE) {
          target = camera.position.distanceTo(planetPos); // rack onto the rings
        } else if (STATIONS.some((s) => Math.abs(pS - s.p) < FOCUS_ZONE)) {
          target = FOCUS_NEAR;
        }
        focus += (target - focus) * (1 - Math.exp(-dt * 2.5));
        dof.cocMaterial.worldFocusDistance = focus;
      }

      composer.render();
    }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);

  // First paint before the loop catches up.
  pose(pS, 0);
  composer.render();
}
