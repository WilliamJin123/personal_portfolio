// Site-wide ambient background: a hairline 3D wireframe topology that
// constantly morphs (sum-of-sines noise advancing through time) and shifts
// along Z as the page is scrolled, so we appear to fly forward through the
// terrain. Random phase offsets each load so every session is a little
// different.
//
// Edge treatment: per-vertex distance from the Y-axis is passed to a
// fragment shader that fades alpha to 0 beyond a soft cutoff, so the mesh
// has no visible boundary regardless of its extent. (LineBasicMaterial has
// no per-vertex alpha; this is the clean way to do it.)
//
// Survey sweep: every so often a soft amber band travels front-to-back
// through the terrain — the lines it crosses warm up and brighten, like an
// instrument scanning the topology. Same telemetry language as the HUD and
// crosshair; skipped under reduced motion.
//
// Reduced-motion renders a single static pose; paused when the tab is
// backgrounded.

import {
  Scene, PerspectiveCamera, WebGLRenderer,
  BufferGeometry, BufferAttribute,
  LineSegments, ShaderMaterial,
  Color,
} from 'three';

const INK = new Color(0x141820);
const AMBER = new Color(0xbd741b);

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
const TIME_SPEED = 0.45;
const SCROLL_TO_NOISE = 0.0045; // noise units per pixel scrolled (forward travel)

// Survey sweep — period between sweeps, travel time, band half-width, and the
// Z run (starts just behind the camera, parks beyond the fade when idle)
const SWEEP_PERIOD = 17;
const SWEEP_TRAVEL = 6.5;
const SWEEP_WIDTH = 3.0;
const SWEEP_FROM = 9;
const SWEEP_TO = -44;
const SWEEP_IDLE = 999;

// Random per-session phase offsets — same code, different terrain every load.
const PHASES = [
  Math.random() * Math.PI * 2,
  Math.random() * Math.PI * 2,
  Math.random() * Math.PI * 2,
];

// Layered harmonics: a mid-wavelength primary for the dominant shape, plus
// two higher-frequency layers that break it up into many smaller hills and
// dips rather than one big rolling swell.
function noise(x: number, z: number, t: number): number {
  return (
    Math.sin(x * 0.58 + t * 0.28 + PHASES[0]) *
      Math.cos(z * 0.52 - t * 0.20 + PHASES[1]) +
    0.55 * Math.sin(x * 1.04 - z * 0.80 + t * 0.32 + PHASES[2]) +
    0.30 * Math.cos(x * 0.46 + z * 1.22 + t * 0.18)
  );
}

export function initBgTerrain(canvas: HTMLCanvasElement): void {
  const reduceMo = matchMedia('(prefers-reduced-motion: reduce)');

  const scene = new Scene();
  const camera = new PerspectiveCamera(46, 1, 0.1, 200);
  camera.position.set(0, CAM_Y, CAM_Z);
  camera.lookAt(0, 0, LOOK_Z);

  const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true });
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

  const heights = new Float32Array(GW * GW);

  function recomputeHeights(t: number, scrollOff: number): void {
    for (let zi = 0; zi < GW; zi++) {
      const z = zWorld(zi) + scrollOff;
      for (let xi = 0; xi < GW; xi++) {
        const x = xWorld(xi);
        heights[zi * GW + xi] = noise(x, z, t) * HSCALE;
      }
    }
  }

  function updateY(): void {
    let s = 0;
    for (let zi = 0; zi < GW; zi++) {
      for (let xi = 0; xi < GW - 1; xi++) {
        positions[s + 1] = heights[zi * GW + xi];
        positions[s + 4] = heights[zi * GW + (xi + 1)];
        s += 6;
      }
    }
    for (let xi = 0; xi < GW; xi++) {
      for (let zi = 0; zi < GW - 1; zi++) {
        positions[s + 1] = heights[zi * GW + xi];
        positions[s + 4] = heights[(zi + 1) * GW + xi];
        s += 6;
      }
    }
  }

  recomputeHeights(0, 0);
  updateY();

  const geom = new BufferGeometry();
  geom.setAttribute('position', new BufferAttribute(positions, 3));

  // Shader: fades per-vertex alpha to 0 beyond FADE_FAR so the mesh has no
  // visible boundary (the "ends in the middle of the screen" problem).
  const mat = new ShaderMaterial({
    uniforms: {
      uColor: { value: INK },
      uAmber: { value: AMBER },
      uBaseAlpha: { value: 0.105 },
      uFadeNear: { value: FADE_NEAR },
      uFadeFar: { value: FADE_FAR },
      uScanZ: { value: SWEEP_IDLE },
      uScanW: { value: SWEEP_WIDTH },
    },
    vertexShader: `
      varying float vDist;
      varying float vZ;
      void main() {
        vDist = length(position.xz);
        vZ = position.z;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      uniform vec3 uAmber;
      uniform float uBaseAlpha;
      uniform float uFadeNear;
      uniform float uFadeFar;
      uniform float uScanZ;
      uniform float uScanW;
      varying float vDist;
      varying float vZ;
      void main() {
        float fade = 1.0 - smoothstep(uFadeNear, uFadeFar, vDist);
        float scan = 1.0 - smoothstep(0.0, uScanW, abs(vZ - uScanZ));
        vec3 col = mix(uColor, uAmber, scan * 0.85);
        gl_FragColor = vec4(col, (uBaseAlpha + 0.115 * scan) * fade);
      }
    `,
    transparent: true,
  });
  scene.add(new LineSegments(geom, mat));

  const resize = (): void => {
    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
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

  // Scroll offset shifts the noise sample → terrain "scrolls" past
  let scrollY = 0;
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

  const positionAttr = geom.getAttribute('position') as BufferAttribute;
  let t = 0;
  let prev = 0;
  // Sweep runs on wall-clock time (t advances at TIME_SPEED, too slow here).
  // Offset so the first sweep arrives a beat after load, not mid-paint.
  let sweepT = SWEEP_PERIOD - 3.5;

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

      sweepT = (sweepT + dt) % SWEEP_PERIOD;
      if (sweepT < SWEEP_TRAVEL) {
        const k = sweepT / SWEEP_TRAVEL;
        const e = k * k * (3 - 2 * k); // ease in-out across the run
        mat.uniforms.uScanZ.value = SWEEP_FROM + (SWEEP_TO - SWEEP_FROM) * e;
      } else {
        mat.uniforms.uScanZ.value = SWEEP_IDLE;
      }

      recomputeHeights(t, scrollY * SCROLL_TO_NOISE);
      updateY();
      positionAttr.needsUpdate = true;

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
