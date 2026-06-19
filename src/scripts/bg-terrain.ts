// Site-wide ambient background: a hairline 3D wireframe topology that
// constantly morphs (sum-of-sines noise advancing through time) and shifts
// along Z as the page is scrolled, so we appear to fly forward through the
// terrain. Random phase offsets each load so every session is a little
// different.
//
// All height work lives on the GPU: the geometry (constant X/Z, flat Y) is
// uploaded once, and the vertex shader evaluates the noise field from a time
// + scroll uniform each frame. The CPU loop only nudges a couple of uniforms
// and the camera — no per-frame vertex recompute, no buffer re-upload. (The
// earlier version rebuilt all ~2.7k heights and re-streamed the whole
// position buffer every frame, which stutters on integrated GPUs.)
//
// Edge treatment: per-vertex distance from the Y-axis is passed to a
// fragment shader that fades alpha to 0 beyond a soft cutoff, so the mesh
// has no visible boundary regardless of its extent. (LineBasicMaterial has
// no per-vertex alpha; this is the clean way to do it.)
//
// Local minima: instead of explicit markers, amber light pools in the
// deepest basins — the fragment shader warms the line color and lifts the
// alpha as a vertex approaches the bottom of the height range, so dips glow
// faintly from within and fade as the morph fills them back in. No extra
// geometry, no chrome.
//
// Colour: uniforms are raw sRGB vec3s written straight to the framebuffer
// (no three.js Color→linear round-trip), so the linework lands in the same
// colour space as the CSS paper and renders consistently across displays
// rather than darker/harsher on uncalibrated panels.
//
// Scroll inertia: the roll chases the real scroll position through an
// exponential smoother, so the hills coast to a stop (both directions)
// instead of tracking the scrollbar rigidly.
//
// Reduced-motion renders a single static pose; paused when the tab is
// backgrounded.

import {
  Scene, PerspectiveCamera, WebGLRenderer,
  BufferGeometry, BufferAttribute,
  LineSegments, ShaderMaterial,
  Vector3,
} from 'three';

// Linework + basin glow, as raw sRGB (0–1). A soft slate rather than near-ink
// keeps the mesh present but unobtrusive; a muted ochre (not full amber) keeps
// the basin pools from reading as harsh warm blooms on punchy displays.
const INK = new Vector3(0.20, 0.225, 0.27);
const AMBER = new Vector3(0.66, 0.47, 0.21);

// Mesh — stretched in Z so the terrain has a long runway ahead of the camera
// before the shader fade takes it; X kept tighter since the camera is low and
// the sides drop out of frame quickly anyway. Grid kept relatively sparse so
// the linework reads as a clean wireframe rather than a busy mesh.
const GW = 52;         // vertices per side
const SCALE_X = 22;    // half-extent in X
const SCALE_Z = 38;    // half-extent in Z (deeper for the "off into distance" read)
const HSCALE = 0.85;   // height amplitude

// Camera — oblique aerial: high enough that the terrain fills the frame
// rather than compressing into a horizon band, but not straight-down. Pitch
// works out to ~23 degrees below horizontal.
const CAM_Y = 4.3;
const CAM_Z = 6.0;
const LOOK_Z = -4;

// Distance fade in scene units (from the Y-axis). Pulled in so the gradient
// starts in the mid-distance — reads as a gentle atmospheric haze rather than
// a hard cutoff, and any new features rotating in at the back edge dissolve
// before they pop.
const FADE_NEAR = 8;
const FADE_FAR = 38;

// Motion
const TIME_SPEED = 0.32;
const SCROLL_TO_NOISE = 0.0045; // noise units per pixel scrolled (forward travel)

// Scroll inertia — how quickly the roll catches up to the scrollbar (per s).
// Lower = longer coast after the user stops scrolling.
const SCROLL_CHASE = 2.4;

// Random per-session phase offsets — same code, different terrain every load.
const PHASES = [
  Math.random() * Math.PI * 2,
  Math.random() * Math.PI * 2,
  Math.random() * Math.PI * 2,
];

// Layered harmonics (the noise field itself) now live in the vertex shader —
// see `terrain()` in the ShaderMaterial below. The phases are passed in as a
// uniform so each session still gets its own terrain.

export function initBgTerrain(canvas: HTMLCanvasElement): void {
  const reduceMo = matchMedia('(prefers-reduced-motion: reduce)');

  const scene = new Scene();
  const camera = new PerspectiveCamera(46, 1, 0.1, 200);
  camera.position.set(0, CAM_Y, CAM_Z);
  camera.lookAt(0, 0, LOOK_Z);

  // low-power: this is ambient chrome — keep it off the discrete GPU so it
  // doesn't spin up fans / drain battery on laptops. depth+stencil off: a
  // single transparent line mesh needs neither, saving a clear each frame.
  const renderer = new WebGLRenderer({
    canvas, antialias: true, alpha: true,
    depth: false, stencil: false, powerPreference: 'low-power',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

  const xWorld = (xi: number): number => (xi / (GW - 1) - 0.5) * 2 * SCALE_X;
  const zWorld = (zi: number): number => (zi / (GW - 1) - 0.5) * 2 * SCALE_Z;

  // Build the segment list: horizontal lines along X for each Z row, then
  // vertical lines along Z for each X column. X/Z coordinates of each
  // endpoint are constant; only Y is updated per frame.
  const segCount = GW * (GW - 1) * 2;
  const positions = new Float32Array(segCount * 6);
  {
    let s = 0;
    for (let zi = 0; zi < GW; zi++) {
      for (let xi = 0; xi < GW - 1; xi++) {
        positions[s + 0] = xWorld(xi);
        positions[s + 2] = zWorld(zi);
        positions[s + 3] = xWorld(xi + 1);
        positions[s + 5] = zWorld(zi);
        s += 6;
      }
    }
    for (let xi = 0; xi < GW; xi++) {
      for (let zi = 0; zi < GW - 1; zi++) {
        positions[s + 0] = xWorld(xi);
        positions[s + 2] = zWorld(zi);
        positions[s + 3] = xWorld(xi);
        positions[s + 5] = zWorld(zi + 1);
        s += 6;
      }
    }
  }

  const geom = new BufferGeometry();
  geom.setAttribute('position', new BufferAttribute(positions, 3));

  // Time + scroll drive the noise field; the vertex shader does the height
  // work for every vertex, so the CPU never touches the position buffer again.
  const uTime = { value: 0 };
  const uScroll = { value: 0 };

  // Shader: the vertex stage evaluates the same layered sum-of-sines the CPU
  // used to, then fades per-vertex alpha to 0 beyond FADE_FAR so the mesh has
  // no visible boundary (the "ends in the middle of the screen" problem).
  const mat = new ShaderMaterial({
    uniforms: {
      uColor: { value: INK },
      uAmber: { value: AMBER },
      uBaseAlpha: { value: 0.075 },
      uFadeNear: { value: FADE_NEAR },
      uFadeFar: { value: FADE_FAR },
      uH: { value: HSCALE },
      uTime,
      uScroll,
      uPhase: { value: new Vector3(PHASES[0], PHASES[1], PHASES[2]) },
    },
    vertexShader: `
      uniform float uTime;
      uniform float uScroll;
      uniform float uH;
      uniform vec3 uPhase;
      varying float vDist;
      varying float vY;
      // Layered harmonics — identical field to the CPU version, now per-vertex
      // on the GPU. Scroll shifts the Z sample so the terrain rolls forward;
      // the fade distance still uses the true (unscrolled) world position.
      float terrain(float x, float z, float t) {
        return sin(x * 0.58 + t * 0.28 + uPhase.x) * cos(z * 0.52 - t * 0.20 + uPhase.y)
             + 0.55 * sin(x * 1.04 - z * 0.80 + t * 0.32 + uPhase.z)
             + 0.30 * cos(x * 0.46 + z * 1.22 + t * 0.18);
      }
      void main() {
        float y = terrain(position.x, position.z + uScroll, uTime) * uH;
        vDist = length(position.xz);
        vY = y;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position.x, y, position.z, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      uniform vec3 uAmber;
      uniform float uBaseAlpha;
      uniform float uFadeNear;
      uniform float uFadeFar;
      uniform float uH;
      varying float vDist;
      varying float vY;
      void main() {
        float fade = 1.0 - smoothstep(uFadeNear, uFadeFar, vDist);
        // ridges read a touch crisper than valleys — depth without extra geometry
        fade *= mix(0.72, 1.10, smoothstep(-uH, uH, vY));
        // a quiet ochre warmth pools in the deepest basins (the local minima)
        float pool = 1.0 - smoothstep(-uH, -0.45 * uH, vY);
        pool *= pool;
        vec3 col = mix(uColor, uAmber, pool * 0.70);
        gl_FragColor = vec4(col, uBaseAlpha * fade * (1.0 + pool * 1.5));
      }
    `,
    transparent: true,
  });
  scene.add(new LineSegments(geom, mat));

  // Size the drawing buffer to the layout viewport, not window.innerWidth —
  // the latter can over-report (mobile URL-bar, pinch-zoom, device emulation),
  // which would blow the buffer up to many millions of pixels for no visible
  // gain. documentElement.clientWidth is the true CSS viewport the fixed
  // canvas actually covers.
  const resize = (): void => {
    const doc = document.documentElement;
    const w = doc.clientWidth || window.innerWidth;
    const h = doc.clientHeight || window.innerHeight;
    if (w < 2 || h < 2) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  resize();
  window.addEventListener('resize', resize);

  // Cursor parallax: subtle camera tilt
  let curOffX = 0;
  let curOffY = 0;
  let tgtOffX = 0;
  let tgtOffY = 0;
  window.addEventListener(
    'pointermove',
    (e) => {
      const nx = (e.clientX / window.innerWidth - 0.5) * 2;
      const ny = (e.clientY / window.innerHeight - 0.5) * 2;
      tgtOffX = nx * 0.75;
      tgtOffY = ny * 0.32;
    },
    { passive: true },
  );

  // Scroll shifts the noise sample → the terrain rolls past. The roll
  // carries inertia: it chases the real scroll position and coasts to a
  // stop in both directions instead of tracking the scrollbar rigidly.
  let scrollY = window.scrollY;
  let scrollS = scrollY; // smoothed (drawn) scroll
  window.addEventListener(
    'scroll',
    () => {
      scrollY = window.scrollY;
    },
    { passive: true },
  );

  let running = true;
  document.addEventListener('visibilitychange', () => {
    running = !document.hidden;
  });

  let t = 0;
  let prev = 0;

  const frame = (now: number): void => {
    const dt = prev ? Math.min(0.05, (now - prev) / 1000) : 0;
    prev = now;

    if (reduceMo.matches) {
      renderer.render(scene, camera); // single static pose, no further frames
      return;
    }
    if (running) {
      t += dt * TIME_SPEED;
      curOffX += (tgtOffX - curOffX) * 0.06;
      curOffY += (tgtOffY - curOffY) * 0.06;

      scrollS += (scrollY - scrollS) * (1 - Math.exp(-dt * SCROLL_CHASE));

      // The GPU evaluates the field — we just hand it the clock and scroll.
      uTime.value = t;
      uScroll.value = scrollS * SCROLL_TO_NOISE;

      camera.position.set(curOffX * 0.95, CAM_Y + curOffY * 0.75, CAM_Z);
      camera.lookAt(curOffX * 0.45, curOffY * 0.22, LOOK_Z);

      renderer.render(scene, camera);
    }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);

  // First paint before the loop catches up.
  renderer.render(scene, camera);
}
