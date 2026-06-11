// /3d — "The Flight": one continuous scroll-driven tracking shot across a
// solid, lit loss landscape. The terrain is the same noise family as the
// landing page's wireframe, rendered as a flat-shaded surface under a low
// amber sun; height-boosted fog pools in the basins and eats the distance;
// the deepest basins along the corridor glow faint amber (the minima keep
// their meaning from the paper site). A film stack — depth of field, bloom,
// grain, vignette — does the cinema.
// Spec: docs/superpowers/specs/2026-06-11-3d-flight-design.md
//
// Camera: scroll progress (exponential inertia, same constant family as
// bg-terrain.ts) travels a meandering valley carved along the path; look-at
// biases per station compose each stretch. Handheld sway + mouse parallax
// keep the frame alive. Crossing a station boundary triggers the letterbox
// moment in the DOM (elements #lbox / #lbcard, owned by 3d.astro).
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

// ── world
const X_HALF = 70;        // terrain half-extent in X
const Z_NEAR = 40;        // terrain near edge (behind the start)
const Z_FAR = -240;       // terrain far edge
const SEG_X = 140;
const SEG_Z = 300;
const HS = 5.2;           // height amplitude
const NSCALE = 0.052;     // noise feature scale
const VALLEY_W = 10;      // valley half-width (gaussian sigma)
const VALLEY_CUT = 3.0;   // extra depth carved along the path

// ── flight
const P_START = 16;       // camera z at p=0
const P_END = -150;       // camera z at p=1
const CLEARANCE = 2.5;    // camera height above the local floor
const LOOK_AHEAD = 22;    // look target distance down-path
const SCROLL_CHASE = 2.2; // progress inertia (per s) — glides, then coasts
const SWAY = 0.16;        // handheld amplitude

// ── light
const SUN_DIR = new Vector3(0.16, 0.085, -0.98).normalize();
const SUN = new Color(0xd08a2e);
const ALBEDO = new Color(0x262a32);
const AMBIENT = new Color(0x10131a);
const FOG = new Color(0x0f0c09);
const FOG_D = 0.0125;     // base fog density
const FOG_LOW = 2.4;      // extra density below y=0 (pools in basins)

// ── minima glow pools
const POOL_MAX = 8;
const POOL_SEP = 22;      // min separation between pools
const POOL_R = 3.4;       // patch half-size
const POOL_A = 0.5;       // peak alpha

// ── celestial: the sky is half the film. A twinkling star field, a nebula
// band of fbm dust, one dim ringed planet over the horizon, and a faint
// constellation per station that brightens as its stretch of the flight
// arrives. Everything rides in a camera-following group (classic skybox
// trick) so the heavens stay fixed while the terrain travels.
const STAR_N = 1400;
const STAR_R = 350;
const PLANET_DIR = new Vector3(0.42, 0.30, -0.86).normalize();
const PLANET_DIST = 300;
const PLANET_R = 21;
const CONST_BOOST = 2.3;  // constellation brightening near its station
const CONST_ZONE = 0.1;   // |p - station| inside which it brightens

// ── stations: boundary progress + title card. Crossing one triggers the
// letterbox moment; look-at keyframes compose the camera per stretch.
const STATIONS = [
  { p: 0.32, card: '01', name: 'WORK' },
  { p: 0.64, card: '02', name: 'PLAY' },
  { p: 0.96, card: '03', name: 'CONTACT' },
];
const LB_HOLD = 1500;     // ms the letterbox stays before retracting
const FOCUS_ZONE = 0.06;  // |p - station| inside which focus racks near
const FOCUS_FAR = 34;     // cruising focus distance (world units)
const FOCUS_NEAR = 15;    // station focus distance
const LOOK_KEYS = [       // per-progress look-at bias: [p, lateral, vertical]
  [0.00, 0.0, 0.8],
  [0.32, -3.5, -1.0],     // Work: dip into a basin
  [0.50, 0.0, 0.4],
  [0.64, 3.0, 1.4],       // Play: lift to the ridge
  [0.82, 0.0, 0.6],
  [1.00, 0.5, 3.2],       // Contact: rise toward the sun
];

// Deterministic value-noise fbm, randomly offset per session. CPU-side only:
// heights bake into the geometry once; the same function feeds the camera
// floor and the pool search, so the flight always clears the terrain.
const SX = Math.random() * 1000;
const SZ = Math.random() * 1000;
function hash2(ix: number, iz: number): number {
  let h = (ix * 374761393 + iz * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return (((h ^ (h >>> 16)) >>> 0) % 1048576) / 1048576;
}
function vnoise(x: number, z: number): number {
  const ix = Math.floor(x);
  const iz = Math.floor(z);
  const fx = x - ix;
  const fz = z - iz;
  const ux = fx * fx * (3 - 2 * fx);
  const uz = fz * fz * (3 - 2 * fz);
  const a = hash2(ix, iz);
  const b = hash2(ix + 1, iz);
  const c = hash2(ix, iz + 1);
  const d = hash2(ix + 1, iz + 1);
  return a + (b - a) * ux + (c - a) * uz + (a - b - c + d) * ux * uz;
}
function fbm(x: number, z: number): number {
  let v = 0;
  let amp = 0.5;
  let fx = x;
  let fz = z;
  for (let i = 0; i < 4; i++) {
    v += vnoise(fx, fz) * amp;
    fx = fx * 2.03 + 11.7;
    fz = fz * 2.03 + 7.3;
    amp *= 0.5;
  }
  return v;
}

// Lateral meander of the flight path.
function pathX(z: number): number {
  return 6.5 * Math.sin(z * 0.021 + SX) + 3.5 * Math.sin(z * 0.043 + SZ);
}

// Terrain height: fbm hills with a valley carved along the path.
function heightAt(x: number, z: number): number {
  const d = x - pathX(z);
  const g = Math.exp(-(d * d) / (2 * VALLEY_W * VALLEY_W));
  const base = (fbm(x * NSCALE + SX, z * NSCALE + SZ) - 0.5) * 2 * HS;
  return base * (1 - 0.45 * g) - VALLEY_CUT * g;
}

function lookBias(p: number): [number, number] {
  for (let i = 1; i < LOOK_KEYS.length; i++) {
    if (p <= LOOK_KEYS[i][0]) {
      const [p0, x0, y0] = LOOK_KEYS[i - 1];
      const [p1, x1, y1] = LOOK_KEYS[i];
      let u = (p - p0) / (p1 - p0);
      u = u * u * (3 - 2 * u);
      return [x0 + (x1 - x0) * u, y0 + (y1 - y0) * u];
    }
  }
  return [LOOK_KEYS[LOOK_KEYS.length - 1][1], LOOK_KEYS[LOOK_KEYS.length - 1][2]];
}

export function initFlightScene(canvas: HTMLCanvasElement): void {
  const reduceMo = matchMedia('(prefers-reduced-motion: reduce)');
  const mobile = matchMedia('(pointer: coarse)').matches || window.innerWidth < 760;

  const scene = new Scene();
  const camera = new PerspectiveCamera(50, 1, 0.5, 420);

  const renderer = new WebGLRenderer({
    canvas,
    antialias: false, // composer MSAA on desktop; fog+grain hide the rest
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 2));

  // ── terrain: indexed grid, heights baked once. Flat shading comes from
  // fragment derivatives, so no normals are stored.
  const vertsX = SEG_X + 1;
  const vertsZ = SEG_Z + 1;
  const pos = new Float32Array(vertsX * vertsZ * 3);
  for (let zi = 0; zi < vertsZ; zi++) {
    const z = Z_NEAR + (Z_FAR - Z_NEAR) * (zi / SEG_Z);
    for (let xi = 0; xi < vertsX; xi++) {
      const x = -X_HALF + 2 * X_HALF * (xi / SEG_X);
      const i = (zi * vertsX + xi) * 3;
      pos[i] = x;
      pos[i + 1] = heightAt(x, z);
      pos[i + 2] = z;
    }
  }
  const idx = new Uint32Array(SEG_X * SEG_Z * 6);
  {
    let k = 0;
    for (let zi = 0; zi < SEG_Z; zi++) {
      for (let xi = 0; xi < SEG_X; xi++) {
        const a = zi * vertsX + xi;
        const b = a + 1;
        const c = a + vertsX;
        const d = c + 1;
        idx[k++] = a; idx[k++] = c; idx[k++] = b;
        idx[k++] = b; idx[k++] = c; idx[k++] = d;
      }
    }
  }
  const terraGeom = new BufferGeometry();
  terraGeom.setAttribute('position', new BufferAttribute(pos, 3));
  terraGeom.setIndex(new BufferAttribute(idx, 1));

  const fogChunk = `
    float fogOf(vec3 w, vec3 cam, float fogD, float fogLow) {
      float dist = length(w - cam);
      float dens = fogD * (1.0 + fogLow * exp(-max(w.y + 1.5, 0.0) * 0.7));
      return clamp(1.0 - exp(-dist * dens), 0.0, 1.0);
    }
  `;
  const terraMat = new ShaderMaterial({
    uniforms: {
      uSunDir: { value: SUN_DIR },
      uSun: { value: SUN },
      uAlbedo: { value: ALBEDO },
      uAmbient: { value: AMBIENT },
      uFog: { value: FOG },
      uFogD: { value: FOG_D },
      uFogLow: { value: FOG_LOW },
    },
    vertexShader: `
      varying vec3 vW;
      void main() {
        vW = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 uSunDir, uSun, uAlbedo, uAmbient, uFog;
      uniform float uFogD, uFogLow;
      varying vec3 vW;
      ${fogChunk}
      void main() {
        // facet normal from derivatives — the angular, low-poly read
        vec3 n = normalize(cross(dFdx(vW), dFdy(vW)));
        n *= sign(n.y + 1e-4);
        float diff = max(dot(n, uSunDir), 0.0);
        vec3 col = uAlbedo * (uAmbient * 3.0 + uSun * diff * 1.9);
        // grazing warm rim on lit facets
        vec3 v = normalize(cameraPosition - vW);
        col += uSun * pow(1.0 - max(dot(n, v), 0.0), 3.0) * diff * 0.12;
        col = mix(col, uFog, fogOf(vW, cameraPosition, uFogD, uFogLow));
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
  scene.add(new Mesh(terraGeom, terraMat));

  // ── celestial group — sky, stars, planet, constellations; follows the
  // camera each frame so the heavens never get closer.
  const celestial = new Group();
  scene.add(celestial);

  // sky: gradient dome + sun disk with a haze band + nebula dust
  const skyMat = new ShaderMaterial({
    uniforms: {
      uSunDir: { value: SUN_DIR },
      uSun: { value: SUN },
      uHorizon: { value: new Color(0x171108) },
      uZenith: { value: new Color(0x0a0b0d) },
      uBandN: { value: new Vector3(0.55, 0.30, 0.35).normalize() },
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
      uniform vec3 uSunDir, uSun, uHorizon, uZenith, uBandN;
      uniform vec2 uSeed;
      varying vec3 vDir;
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
      void main() {
        vec3 d = normalize(vDir);
        vec3 col = mix(uHorizon, uZenith, smoothstep(0.0, 0.4, d.y));
        // nebula: a tilted band of warm dust, plus the faintest cool haze above
        float nb = fbm2(d.xy * 3.1 + d.zx * 1.4 + uSeed);
        float band = exp(-pow(dot(d, uBandN), 2.0) * 9.0);
        col += vec3(0.50, 0.40, 0.27) * nb * nb * band * 0.30;
        col += vec3(0.18, 0.21, 0.28) * nb * 0.06 * smoothstep(0.0, 0.35, d.y);
        float s = max(dot(d, uSunDir), 0.0);
        col += uSun * (pow(s, 700.0) * 1.4 + pow(s, 30.0) * 0.22 + pow(s, 6.0) * 0.05);
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
  const sky = new Mesh(new SphereGeometry(380, 32, 16), skyMat);
  sky.renderOrder = -1;
  celestial.add(sky);

  // stars: one shared point cloud, per-star size/phase/color, gentle twinkle
  const starTime = { value: 0 };
  {
    const sp = new Float32Array(STAR_N * 3);
    const ss = new Float32Array(STAR_N);
    const sph = new Float32Array(STAR_N);
    const scl = new Float32Array(STAR_N * 3);
    for (let i = 0; i < STAR_N; i++) {
      const az = Math.random() * Math.PI * 2;
      const el = Math.asin(Math.random()) * 0.96 + 0.02;
      sp[i * 3] = Math.sin(az) * Math.cos(el) * STAR_R;
      sp[i * 3 + 1] = Math.sin(el) * STAR_R;
      sp[i * 3 + 2] = Math.cos(az) * Math.cos(el) * STAR_R;
      ss[i] = 0.9 + Math.random() * 1.5;
      sph[i] = Math.random() * 50;
      const amber = Math.random() < 0.07;
      const lum = 0.35 + Math.random() * 0.6;
      scl[i * 3] = (amber ? 0.82 : 0.74) * lum;
      scl[i * 3 + 1] = (amber ? 0.54 : 0.79) * lum;
      scl[i * 3 + 2] = (amber ? 0.18 : 0.9) * lum;
    }
    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(sp, 3));
    g.setAttribute('aSize', new BufferAttribute(ss, 1));
    g.setAttribute('aPhase', new BufferAttribute(sph, 1));
    g.setAttribute('aCol', new BufferAttribute(scl, 3));
    const m = new ShaderMaterial({
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
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = aSize * uDpr;
        }
      `,
      fragmentShader: `
        uniform float uT;
        varying vec3 vC;
        varying float vP;
        void main() {
          float d = length(gl_PointCoord - 0.5) * 2.0;
          float tw = 0.72 + 0.28 * sin(uT * (0.5 + fract(vP * 0.63) * 1.6) + vP);
          gl_FragColor = vec4(vC, smoothstep(1.0, 0.15, d) * tw);
        }
      `,
    });
    celestial.add(new Points(g, m));
  }

  // planet: a dim banded giant over the horizon, amber crescent toward the
  // sun, ringed with hairline orbits — the site's linework, in the sky.
  {
    const pg = new Group();
    pg.position.copy(PLANET_DIR).multiplyScalar(PLANET_DIST);
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
          vec3 col = vec3(0.15, 0.17, 0.22) * (0.10 + 1.35 * diff) * bands;
          vec3 v = normalize(cameraPosition - vW);
          col += uSun * pow(1.0 - max(dot(n, v), 0.0), 3.0) * (0.1 + diff) * 0.55;
          gl_FragColor = vec4(col, 1.0);
        }
      `,
    });
    pg.add(new Mesh(new SphereGeometry(PLANET_R, 48, 32), m));
    for (const [rr, op] of [[1.55, 0.30], [1.8, 0.17], [2.02, 0.09]]) {
      const seg = 160;
      const rp = new Float32Array(seg * 3);
      for (let i = 0; i < seg; i++) {
        const a = (i / seg) * Math.PI * 2;
        rp[i * 3] = Math.cos(a) * PLANET_R * rr;
        rp[i * 3 + 2] = Math.sin(a) * PLANET_R * rr;
      }
      const g = new BufferGeometry();
      g.setAttribute('position', new BufferAttribute(rp, 3));
      pg.add(new LineLoop(g, new LineBasicMaterial({ color: 0xbfc6d4, transparent: true, opacity: op })));
    }
    pg.rotation.set(0.42, 0, 0.45);
    celestial.add(pg);
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

  // ── minima glow pools: deepest separated basins inside the corridor
  {
    const found: { x: number; z: number; h: number }[] = [];
    for (let z = -4; z > P_END - 30; z -= 2) {
      for (let dx = -26; dx <= 26; dx += 2) {
        const x = pathX(z) + dx;
        const h = heightAt(x, z);
        let isMin = true;
        for (let oz = -2; oz <= 2 && isMin; oz += 2) {
          for (let ox = -2; ox <= 2; ox += 2) {
            if (ox === 0 && oz === 0) continue;
            if (heightAt(x + ox, z + oz) <= h) { isMin = false; break; }
          }
        }
        if (isMin) found.push({ x, z, h });
      }
    }
    found.sort((a, b) => a.h - b.h);
    const kept: typeof found = [];
    for (const c of found) {
      if (kept.length >= POOL_MAX) break;
      if (kept.every((k) => (k.x - c.x) ** 2 + (k.z - c.z) ** 2 >= POOL_SEP * POOL_SEP)) kept.push(c);
    }
    const poolMat = new ShaderMaterial({
      uniforms: { uSun: { value: SUN }, uA: { value: POOL_A } },
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 uSun;
        uniform float uA;
        varying vec2 vUv;
        void main() {
          float d = length(vUv - 0.5) * 2.0;
          gl_FragColor = vec4(uSun, pow(max(1.0 - d, 0.0), 2.2) * uA);
        }
      `,
    });
    const patch = new PlaneGeometry(POOL_R * 2, POOL_R * 2).rotateX(-Math.PI / 2);
    for (const k of kept) {
      const m = new Mesh(patch, poolMat);
      m.position.set(k.x, k.h + 0.3, k.z);
      scene.add(m);
    }
  }

  // ── film stack
  const composer = new EffectComposer(renderer, { multisampling: mobile ? 0 : 4 });
  composer.addPass(new RenderPass(scene, camera));
  const grain = new NoiseEffect({ premultiply: true });
  grain.blendMode.opacity.value = 0.5;
  const bloom = new BloomEffect({
    intensity: 0.85,
    luminanceThreshold: 0.32,
    luminanceSmoothing: 0.25,
    mipmapBlur: true,
  });
  const vignette = new VignetteEffect({ offset: 0.28, darkness: 0.6 });
  let dof: DepthOfFieldEffect | null = null;
  if (!mobile) {
    dof = new DepthOfFieldEffect(camera, { focalLength: 0.06, bokehScale: 1.7 });
    dof.cocMaterial.worldFocusDistance = FOCUS_FAR;
    dof.cocMaterial.worldFocusRange = 28;
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

  const pose = (p: number, t: number): void => {
    const z = P_START + (P_END - P_START) * p;
    const px = pathX(z);
    const floor = Math.max(heightAt(px, z), heightAt(pathX(z - 4), z - 4));
    const swayX = SWAY * Math.sin(t * 0.43 + 1.7) * 0.6;
    const swayY = SWAY * (Math.sin(t * 0.5) + 0.55 * Math.sin(t * 1.13 + 2.1));
    camera.position.set(
      px + swayX + curX * 0.6,
      floor + CLEARANCE + swayY + curY * 0.4,
      z,
    );
    const [bx, by] = lookBias(p);
    const lz = z - LOOK_AHEAD;
    const lx = pathX(lz) + bx;
    camera.lookAt(lx + curX * 1.4, heightAt(lx, lz) + 2.0 + by + curY * 0.6, lz);
    camera.rotateZ(0.008 * Math.sin(t * 0.31));
    celestial.position.copy(camera.position); // the heavens never get closer
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
      if (dof) {
        const near = STATIONS.some((s) => Math.abs(pS - s.p) < FOCUS_ZONE);
        focus += ((near ? FOCUS_NEAR : FOCUS_FAR) - focus) * (1 - Math.exp(-dt * 2.5));
        dof.cocMaterial.worldFocusDistance = focus;
      }

      pose(pS, t);
      composer.render();
    }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);

  // First paint before the loop catches up.
  pose(pS, 0);
  composer.render();
}
