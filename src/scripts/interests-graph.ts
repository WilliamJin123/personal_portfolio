// Hairline concept diagrams for "I'm interested in" — three distinct 3D figures,
// one per bullet, each a literal little mechanism that animates to show what the
// concept *does*. The root slowly turntable-spins (+ cursor tilt) and the page
// cross-dissolves (scale + opacity) between figures; hovering a bullet snaps to
// its figure, leaving resumes the auto-cycle.
//
//   01 Agentic Applications -> a model core ringed by a feedback loop; a token
//      travels the loop and fires a pulse out to each tool as it passes.
//   02 Full Stack          -> a UI window, a logic grid, and a data drum stacked
//      on a spine; a packet drops down through the layers and rises back up.
//   03 Applied ML          -> a loss surface with a marker that steps downhill
//      (gradient descent) toward the minimum, trailing its path, then resets.
//
// Reduced-motion renders one static pose; paused when off-screen or backgrounded.

import {
  Scene, PerspectiveCamera, WebGLRenderer,
  BufferGeometry, Float32BufferAttribute, BufferAttribute,
  LineSegments, Line, LineBasicMaterial,
  Points, PointsMaterial,
  OctahedronGeometry, EdgesGeometry,
  Group, Color, Material,
} from 'three';

const INK = new Color(0x141820);
const AMBER = new Color(0xbd741b);

const X_TILT = 0.5;      // aerial tilt so the horizontal figures read, not edge-on
const SPIN = 0.16;       // turntable rad/s
const DWELL = 4.5;       // s a figure is held before auto-advancing
const FADE = 1.0;        // s cross-dissolve

const EDGE_OP = 0.4;     // primary hairline
const FAINT_OP = 0.2;    // spokes / spine / trail
const ACCENT_OP = 0.95;  // amber moving element
const CORE_OP = 0.6;     // structural accent (core)

interface Figure {
  group: Group;
  mats: { mat: Material; base: number }[];
  update: (t: number) => void;
}

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

const lineSeg = (segs: number[], mat: Material): LineSegments => {
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(new Float32Array(segs), 3));
  return new LineSegments(g, mat);
};

// 01 — Agentic: octahedron model core, a horizontal feedback-loop ring, three
// tool glyphs on the ring, faint spokes. A token circles the loop; as it passes
// each tool a pulse darts core -> tool and back.
function agenticFigure(): Figure {
  const group = new Group();
  const inkLine = new LineBasicMaterial({ color: INK, transparent: true, opacity: EDGE_OP });
  const faintLine = new LineBasicMaterial({ color: INK, transparent: true, opacity: FAINT_OP });
  const coreInk = new LineBasicMaterial({ color: INK, transparent: true, opacity: CORE_OP });
  const amberPts = new PointsMaterial({ color: AMBER, size: 0.13, sizeAttenuation: true, transparent: true, opacity: ACCENT_OP });

  // model core
  const core = new LineSegments(new EdgesGeometry(new OctahedronGeometry(0.34)), coreInk);
  group.add(core);

  // feedback loop ring in the XZ plane
  const R = 1.7;
  const segN = 64;
  const ring: number[] = [];
  for (let i = 0; i < segN; i++) {
    const a0 = (i / segN) * Math.PI * 2;
    const a1 = ((i + 1) / segN) * Math.PI * 2;
    ring.push(Math.cos(a0) * R, 0, Math.sin(a0) * R, Math.cos(a1) * R, 0, Math.sin(a1) * R);
  }
  group.add(lineSeg(ring, inkLine));

  // tool glyphs (small squares on the ring) + faint spokes from the core
  const tools = 3;
  const toolAng: number[] = [];
  const toolPos: [number, number][] = [];
  const glyphs: number[] = [];
  const spokes: number[] = [];
  const sq = 0.17;
  for (let i = 0; i < tools; i++) {
    const a = (i / tools) * Math.PI * 2 + Math.PI / 6;
    toolAng.push(a);
    const cx = Math.cos(a) * R;
    const cz = Math.sin(a) * R;
    toolPos.push([cx, cz]);
    const c = [[cx - sq, cz - sq], [cx + sq, cz - sq], [cx + sq, cz + sq], [cx - sq, cz + sq]];
    for (let k = 0; k < 4; k++) {
      const p = c[k];
      const q = c[(k + 1) % 4];
      glyphs.push(p[0], 0, p[1], q[0], 0, q[1]);
    }
    spokes.push(0, 0, 0, cx, 0, cz);
  }
  group.add(lineSeg(glyphs, inkLine));
  group.add(lineSeg(spokes, faintLine));

  // movers: index 0 = loop token, 1..3 = tool pulses
  const moverArr = new Float32Array((1 + tools) * 3);
  const moverGeom = new BufferGeometry();
  moverGeom.setAttribute('position', new Float32BufferAttribute(moverArr, 3));
  group.add(new Points(moverGeom, amberPts));

  const win = 0.9; // angular half-window over which a pulse fires
  const update = (t: number): void => {
    const aTok = (t * 0.7) % (Math.PI * 2);
    moverArr[0] = Math.cos(aTok) * R;
    moverArr[1] = 0;
    moverArr[2] = Math.sin(aTok) * R;
    for (let i = 0; i < tools; i++) {
      let d = Math.abs(aTok - toolAng[i]) % (Math.PI * 2);
      if (d > Math.PI) d = Math.PI * 2 - d;
      const s = Math.max(0, 1 - d / win); // peaks to 1 as the token reaches the tool
      const o = (1 + i) * 3;
      moverArr[o] = toolPos[i][0] * s;
      moverArr[o + 1] = 0;
      moverArr[o + 2] = toolPos[i][1] * s;
    }
    (moverGeom.getAttribute('position') as BufferAttribute).needsUpdate = true;
    core.rotation.y = -t * 0.5;
    core.rotation.x = t * 0.3;
  };

  return {
    group,
    mats: [
      { mat: inkLine, base: EDGE_OP },
      { mat: faintLine, base: FAINT_OP },
      { mat: coreInk, base: CORE_OP },
      { mat: amberPts, base: ACCENT_OP },
    ],
    update,
  };
}

// 02 — Full Stack: a UI window (top), a logic grid (middle), a data drum
// (bottom), stacked on a central spine. A packet drops top -> bottom then rises.
function stackFigure(): Figure {
  const group = new Group();
  const inkLine = new LineBasicMaterial({ color: INK, transparent: true, opacity: EDGE_OP });
  const faintLine = new LineBasicMaterial({ color: INK, transparent: true, opacity: FAINT_OP });
  const amberPts = new PointsMaterial({ color: AMBER, size: 0.15, sizeAttenuation: true, transparent: true, opacity: ACCENT_OP });

  const W = 0.95;
  const D = 0.7;
  const yTop = 1.0;
  const yMid = 0.0;
  const yBot = -1.0;

  const seg: number[] = [];
  const faint: number[] = [];

  const rect = (y: number): void => {
    const c = [[-W, -D], [W, -D], [W, D], [-W, D]];
    for (let k = 0; k < 4; k++) {
      const p = c[k];
      const q = c[(k + 1) % 4];
      seg.push(p[0], y, p[1], q[0], y, q[1]);
    }
  };

  // top — UI window: frame + title bar + content lines
  rect(yTop);
  seg.push(-W, yTop, -D + 0.22, W, yTop, -D + 0.22);
  for (let i = 0; i < 3; i++) {
    const z = -D + 0.44 + i * 0.22;
    seg.push(-W + 0.16, yTop, z, W - 0.5, yTop, z);
  }

  // middle — logic grid
  const gx = 4;
  const gz = 3;
  for (let i = 0; i <= gx; i++) {
    const x = -W + (2 * W) * (i / gx);
    seg.push(x, yMid, -D, x, yMid, D);
  }
  for (let j = 0; j <= gz; j++) {
    const z = -D + (2 * D) * (j / gz);
    seg.push(-W, yMid, z, W, yMid, z);
  }

  // bottom — data drum (cylinder): top + bottom rings, faint mid band, verticals
  const dr = 0.62;
  const dh = 0.34;
  const drumTop = yBot + dh;
  const drumBot = yBot - dh;
  const ring = (y: number, arr: number[]): void => {
    const n = 40;
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * Math.PI * 2;
      const a1 = ((i + 1) / n) * Math.PI * 2;
      arr.push(Math.cos(a0) * dr, y, Math.sin(a0) * dr, Math.cos(a1) * dr, y, Math.sin(a1) * dr);
    }
  };
  ring(drumTop, seg);
  ring(drumBot, seg);
  ring(yBot, faint);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    seg.push(Math.cos(a) * dr, drumTop, Math.sin(a) * dr, Math.cos(a) * dr, drumBot, Math.sin(a) * dr);
  }

  // central spine
  faint.push(0, yTop, 0, 0, drumBot, 0);

  group.add(lineSeg(seg, inkLine));
  group.add(lineSeg(faint, faintLine));

  const pkArr = new Float32Array(3);
  const pkGeom = new BufferGeometry();
  pkGeom.setAttribute('position', new Float32BufferAttribute(pkArr, 3));
  group.add(new Points(pkGeom, amberPts));

  const update = (t: number): void => {
    const P = 2.6;
    const ph = (t % P) / P;
    const tri = ph < 0.5 ? ph * 2 : 2 - ph * 2; // 0 -> 1 -> 0
    pkArr[0] = 0;
    pkArr[1] = lerp(yTop, drumBot + 0.06, tri);
    pkArr[2] = 0;
    (pkGeom.getAttribute('position') as BufferAttribute).needsUpdate = true;
  };

  return {
    group,
    mats: [
      { mat: inkLine, base: EDGE_OP },
      { mat: faintLine, base: FAINT_OP },
      { mat: amberPts, base: ACCENT_OP },
    ],
    update,
  };
}

// 03 — Applied ML: a hairline loss surface (an anisotropic bowl) with a marker
// that takes gradient-descent steps toward the minimum, trailing its path, then
// resets to a new start.
function lossFigure(): Figure {
  const group = new Group();
  const surfMat = new LineBasicMaterial({ color: INK, transparent: true, opacity: EDGE_OP * 0.8 });
  const trailMat = new LineBasicMaterial({ color: AMBER, transparent: true, opacity: FAINT_OP + 0.12 });
  const markMat = new PointsMaterial({ color: AMBER, size: 0.17, sizeAttenuation: true, transparent: true, opacity: ACCENT_OP });

  const A = 0.26;
  const B = 0.42;
  const EXT = 1.5;
  const G = 15;
  const yShift = -0.55;
  const f = (x: number, z: number): number => A * x * x + B * z * z + yShift;
  const xw = (i: number): number => -EXT + (2 * EXT) * (i / (G - 1));

  const surf: number[] = [];
  for (let j = 0; j < G; j++) {
    const z = xw(j);
    for (let i = 0; i < G - 1; i++) {
      const x0 = xw(i);
      const x1 = xw(i + 1);
      surf.push(x0, f(x0, z), z, x1, f(x1, z), z);
    }
  }
  for (let i = 0; i < G; i++) {
    const x = xw(i);
    for (let j = 0; j < G - 1; j++) {
      const z0 = xw(j);
      const z1 = xw(j + 1);
      surf.push(x, f(x, z0), z0, x, f(x, z1), z1);
    }
  }
  group.add(lineSeg(surf, surfMat));

  // trail (a growing polyline through the stepped points)
  const MAXP = 40;
  const trailArr = new Float32Array(MAXP * 3);
  const trailGeom = new BufferGeometry();
  trailGeom.setAttribute('position', new Float32BufferAttribute(trailArr, 3));
  trailGeom.setDrawRange(0, 0);
  group.add(new Line(trailGeom, trailMat));

  const markArr = new Float32Array(3);
  const markGeom = new BufferGeometry();
  markGeom.setAttribute('position', new Float32BufferAttribute(markArr, 3));
  group.add(new Points(markGeom, markMat));

  // gradient-descent state
  let cx = 0;
  let cz = 0;   // current step target
  let mx = 0;
  let mz = 0;   // marker visual position (lerped toward target)
  let nPts = 0;
  let steps = 0;
  let stepAccum = 0;
  let holding = false;
  let holdT = 0;
  let lastT = 0;
  const LR = 0.32;
  const STEP_DT = 0.34;
  const MAXSTEP = 22;

  const pushTrail = (): void => {
    if (nPts >= MAXP) return;
    const o = nPts * 3;
    trailArr[o] = cx;
    trailArr[o + 1] = f(cx, cz);
    trailArr[o + 2] = cz;
    nPts++;
    trailGeom.setDrawRange(0, nPts);
    (trailGeom.getAttribute('position') as BufferAttribute).needsUpdate = true;
  };
  const reset = (): void => {
    const a = Math.random() * Math.PI * 2;
    const r = 1.05 + Math.random() * 0.4;
    cx = Math.cos(a) * r;
    cz = Math.sin(a) * r;
    mx = cx;
    mz = cz;
    nPts = 0;
    steps = 0;
    stepAccum = 0;
    holding = false;
    holdT = 0;
    pushTrail();
  };
  reset();

  const update = (t: number): void => {
    const dt = Math.max(0, Math.min(0.05, t - lastT));
    lastT = t;

    if (holding) {
      holdT += dt;
      if (holdT > 1.2) reset();
    } else {
      stepAccum += dt;
      while (stepAccum >= STEP_DT) {
        stepAccum -= STEP_DT;
        cx -= LR * 2 * A * cx;
        cz -= LR * 2 * B * cz;
        steps++;
        pushTrail();
        if (steps >= MAXSTEP || cx * cx + cz * cz < 0.0025) {
          holding = true;
          holdT = 0;
          break;
        }
      }
    }

    mx += (cx - mx) * 0.25;
    mz += (cz - mz) * 0.25;
    markArr[0] = mx;
    markArr[1] = f(mx, mz) + 0.05;
    markArr[2] = mz;
    (markGeom.getAttribute('position') as BufferAttribute).needsUpdate = true;
  };

  return {
    group,
    mats: [
      { mat: surfMat, base: EDGE_OP * 0.8 },
      { mat: trailMat, base: FAINT_OP + 0.12 },
      { mat: markMat, base: ACCENT_OP },
    ],
    update,
  };
}

export function initInterestsGraph(canvas: HTMLCanvasElement): void {
  const reduceMo = matchMedia('(prefers-reduced-motion: reduce)');

  const scene = new Scene();
  const camera = new PerspectiveCamera(40, 1, 0.1, 100);
  camera.position.set(0, 0, 7);

  const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

  const root = new Group();
  root.rotation.x = X_TILT;
  scene.add(root);

  const figures: Figure[] = [agenticFigure(), stackFigure(), lossFigure()];
  for (const fig of figures) {
    fig.group.visible = false;
    root.add(fig.group);
  }

  const setOpacity = (fig: Figure, k: number): void => {
    for (const { mat, base } of fig.mats) mat.opacity = base * k;
  };

  const resize = (): void => {
    const w = canvas.clientWidth || 320;
    const h = canvas.clientHeight || 320;
    if (w < 2 || h < 2) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  resize();
  window.addEventListener('resize', resize);

  // Lagged cursor parallax — the figure tilts/turns toward the cursor.
  let curOffY = 0;
  let curOffX = 0;
  let tgtOffY = 0;
  let tgtOffX = 0;
  window.addEventListener(
    'pointermove',
    (e) => {
      const nx = (e.clientX / window.innerWidth - 0.5) * 2;
      const ny = (e.clientY / window.innerHeight - 0.5) * 2;
      tgtOffY = nx * 0.5;
      tgtOffX = ny * 0.25;
    },
    { passive: true },
  );

  // Bullet hover focuses a figure (0/1/2). -1 = no focus, auto-cycle.
  let hover = -1;
  document.querySelectorAll<HTMLElement>('.int-item').forEach((el, i) => {
    el.addEventListener('pointerenter', () => { hover = i; });
    el.addEventListener('pointerleave', () => { hover = -1; });
  });

  let visible = true;
  new IntersectionObserver(
    (es) => { visible = es[0]?.isIntersecting ?? true; },
    { threshold: 0.05 },
  ).observe(canvas);
  let running = true;
  document.addEventListener('visibilitychange', () => { running = !document.hidden; });

  // Cross-dissolve state machine over whole figures.
  let from = 0;
  let to = 0;
  let mix = 1;       // 0..1 progress from -> to (1 == settled)
  let autoIdx = 0;
  let dwellT = 0;

  let baseY = 0;
  let prev = 0;
  let t = 0;

  const render = (): void => {
    for (const fig of figures) fig.group.visible = false;

    if (mix >= 1) {
      const fig = figures[to];
      fig.group.visible = true;
      fig.group.scale.setScalar(1);
      setOpacity(fig, 1);
      fig.update(t);
    } else {
      const e = mix * mix * (3 - 2 * mix); // smoothstep
      const a = figures[from];
      const b = figures[to];
      a.group.visible = true;
      a.group.scale.setScalar(lerp(1, 0.62, e));
      setOpacity(a, 1 - e);
      a.update(t);
      b.group.visible = true;
      b.group.scale.setScalar(lerp(0.62, 1, e));
      setOpacity(b, e);
      b.update(t);
    }

    renderer.render(scene, camera);
  };

  const frame = (now: number): void => {
    const dt = prev ? Math.min(0.05, (now - prev) / 1000) : 0;
    prev = now;

    if (reduceMo.matches) {
      render(); // single static pose
      return;
    }
    if (running && visible) {
      t += dt;

      if (mix < 1) mix = Math.min(1, mix + dt / FADE);
      if (mix >= 1) {
        from = to;
        const desired = hover >= 0 ? hover : autoIdx;
        if (desired !== to) {
          to = desired;
          mix = 0;
          dwellT = 0;
        } else if (hover < 0) {
          dwellT += dt;
          if (dwellT >= DWELL) { autoIdx = (autoIdx + 1) % 3; dwellT = 0; }
        } else {
          dwellT = 0;
          autoIdx = to;
        }
      }

      baseY += dt * SPIN;
      curOffY += (tgtOffY - curOffY) * 0.07;
      curOffX += (tgtOffX - curOffX) * 0.07;
      root.rotation.y = baseY + curOffY;
      root.rotation.x = X_TILT + curOffX;

      render();
    }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);

  // First paint before the loop catches up.
  render();
}
