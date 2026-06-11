// Studio mode — placeholder scene for the /studio shell: nested hairline
// icosahedron shells with two tilted orbital rings, all in the established
// linework aesthetic. Scroll progress dollies + orbits the camera (the
// scroll→scene rig future scenes plug into); pointer adds a subtle parallax
// tilt.
//
// Conventions match bg-terrain.ts: pixel-ratio cap 2, resize handler,
// paused when the tab is backgrounded, reduced-motion renders a single
// static pose. Throws if the WebGL renderer can't be constructed — the
// caller degrades to the static dark page.

import {
  Scene, PerspectiveCamera, WebGLRenderer,
  IcosahedronGeometry, EdgesGeometry,
  BufferGeometry, BufferAttribute,
  LineSegments, LineLoop, LineBasicMaterial,
  Color, Group,
} from 'three';

const LIGHT = new Color(0xe7e9ee); // light ink on the near-black ground
const AMBER = new Color(0xd08a2e); // slightly brightened amber for dark bg

// Shells — radius, mesh detail, base opacity, spin rate (rad/s)
const SHELLS: Array<[number, number, number, number]> = [
  [1.0, 1, 0.5, 0.05],
  [1.65, 2, 0.2, -0.028],
  [2.45, 3, 0.08, 0.014],
];

// Camera path — scroll progress 0→1 dollies in and orbits
const DOLLY_FAR = 7.4;
const DOLLY_NEAR = 3.4;
const ORBIT_TURNS = 0.4; // fraction of a full revolution over the page

function ring(radius: number, segments = 128): BufferGeometry {
  const pos = new Float32Array(segments * 3);
  for (let i = 0; i < segments; i++) {
    const a = (i / segments) * Math.PI * 2;
    pos[i * 3 + 0] = Math.cos(a) * radius;
    pos[i * 3 + 2] = Math.sin(a) * radius;
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(pos, 3));
  return g;
}

export function initStudioScene(canvas: HTMLCanvasElement): void {
  const reduceMo = matchMedia('(prefers-reduced-motion: reduce)');

  const scene = new Scene();
  const camera = new PerspectiveCamera(42, 1, 0.1, 60);

  const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

  const core = new Group();
  const shells = SHELLS.map(([radius, detail, opacity, spin]) => {
    const seg = new LineSegments(
      new EdgesGeometry(new IcosahedronGeometry(radius, detail)),
      new LineBasicMaterial({ color: LIGHT, transparent: true, opacity }),
    );
    seg.userData.spin = spin;
    core.add(seg);
    return seg;
  });

  // Two amber orbit rings, tilted off-axis so they read as a diagram, not a globe.
  const ringMat = new LineBasicMaterial({ color: AMBER, transparent: true, opacity: 0.4 });
  const r1 = new LineLoop(ring(2.05), ringMat);
  r1.rotation.set(1.05, 0, 0.35);
  const r2 = new LineLoop(ring(2.9), ringMat.clone());
  (r2.material as LineBasicMaterial).opacity = 0.18;
  r2.rotation.set(-0.5, 0.6, -0.2);
  core.add(r1, r2);
  scene.add(core);

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

  // Normalized scroll progress drives the camera path.
  const progress = (): number => {
    const h = document.documentElement;
    const max = h.scrollHeight - window.innerHeight;
    return max > 0 ? Math.min(1, Math.max(0, h.scrollTop / max)) : 0;
  };

  // Cursor parallax — subtle camera drift, eased per frame.
  let curX = 0, curY = 0, tgtX = 0, tgtY = 0;
  window.addEventListener(
    'pointermove',
    (e) => {
      tgtX = (e.clientX / window.innerWidth - 0.5) * 2;
      tgtY = (e.clientY / window.innerHeight - 0.5) * 2;
    },
    { passive: true },
  );

  let running = true;
  document.addEventListener('visibilitychange', () => {
    running = !document.hidden;
  });

  let prev = 0;
  const pose = (p: number, t: number): void => {
    const a = p * Math.PI * 2 * ORBIT_TURNS + t * 0.03;
    const d = DOLLY_FAR + (DOLLY_NEAR - DOLLY_FAR) * p;
    camera.position.set(
      Math.sin(a) * d + curX * 0.5,
      0.4 + p * -0.8 + curY * 0.35,
      Math.cos(a) * d,
    );
    camera.lookAt(0, 0, 0);
  };

  let t = 0;
  const frame = (now: number): void => {
    const dt = prev ? Math.min(0.05, (now - prev) / 1000) : 0;
    prev = now;
    if (reduceMo.matches) {
      pose(progress(), 0);
      renderer.render(scene, camera); // single static pose, no further frames
      return;
    }
    if (running) {
      t += dt;
      curX += (tgtX - curX) * 0.05;
      curY += (tgtY - curY) * 0.05;
      shells.forEach((s) => {
        s.rotation.y += s.userData.spin * dt;
        s.rotation.x += s.userData.spin * 0.6 * dt;
      });
      pose(progress(), t);
      renderer.render(scene, camera);
    }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);

  // First paint before the loop catches up.
  pose(progress(), 0);
  renderer.render(scene, camera);
}
