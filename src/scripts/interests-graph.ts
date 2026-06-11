// Hairline concept instruments for "I'm interested in" — three figures, one
// per bullet, each a small mechanism that plays its concept as a complete
// causal story rather than posing as an icon:
//
//   01 Agentic Applications -> THE LOOP. A gyroscope core (the model) ringed
//      by three tool stations (gear / search / code). One call at a time: an
//      amber pulse rides a spoke out (the call), the tool fires with a ripple
//      (it runs), the pulse rides back (the result), the core's rings flash as
//      the observation lands — and a context arc accretes around the core.
//      After three calls the context clears and the loop begins again.
//   02 Full Stack          -> THE ROUND TRIP. UI window / logic grid / data
//      drum on a spine. A click ripples on the window, a packet drops through
//      the logic layer (the matched cell fires) down to the drum, the commit
//      rings outward, the response rises — and a new content line draws
//      itself into the window. Data became UI; that's the whole job.
//   03 Machine Learning    -> THE TRAINING STEP. A feed-forward net staggered
//      in depth: amber activations sweep forward, green gradients sweep back
//      (backprop), and with each completed step a hairline loss curve under
//      the net descends one notch toward its minimum — gradient descent on
//      an instrument readout.
//
// Reduced-motion renders one static mid-action pose; paused when off-screen
// or backgrounded.

import {
  Scene, PerspectiveCamera, WebGLRenderer,
  BufferGeometry, Float32BufferAttribute, BufferAttribute,
  LineSegments, LineBasicMaterial, ShaderMaterial,
  Points, PointsMaterial,
  Group, Color,
} from 'three';

const INK = new Color(0x141820);
const AMBER = new Color(0xbd741b);
const GREEN = new Color(0x3a7d5c); // grant green — the backward pass (gradients)

const AERIAL = 0.62;     // tilt for the horizontal figures (agentic / stack)
const NET_TILT = 0.14;   // near face-on so the layered structure reads clearly
const SPIN = 0.16;       // turntable rad/s
const DWELL = 4.5;       // s a figure is held before auto-advancing
const FADE = 1.0;        // s cross-dissolve

const EDGE_OP = 0.62;    // primary hairline
const FAINT_OP = 0.22;   // guides / spine / spokes
const ACCENT_OP = 0.95;  // amber moving elements

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
const ez = (k: number): number => k * k * (3 - 2 * k); // smoothstep

interface Figure {
  group: Group;                              // outer (tilt) group — visibility / scale
  setFade: (k: number) => void;              // fade the figure's materials
  update: (t: number, cam: PerspectiveCamera) => void;
}

const lineSeg = (segs: number[], mat: LineBasicMaterial): LineSegments => {
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(new Float32Array(segs), 3));
  return new LineSegments(g, mat);
};

// A flat 2D glyph ([u,v, u,v] pairs) as a LineSegments in the XY plane (normal
// +Z) so it can be billboarded to face the camera.
const glyphXY = (g2: number[], mat: LineBasicMaterial): LineSegments => {
  const segs: number[] = [];
  for (let i = 0; i < g2.length; i += 4) segs.push(g2[i], g2[i + 1], 0, g2[i + 2], g2[i + 3], 0);
  return lineSeg(segs, mat);
};

const circle2d = (r: number, n: number): number[] => {
  const s: number[] = [];
  for (let k = 0; k < n; k++) {
    const a0 = (k / n) * Math.PI * 2;
    const a1 = ((k + 1) / n) * Math.PI * 2;
    s.push(Math.cos(a0) * r, Math.sin(a0) * r, Math.cos(a1) * r, Math.sin(a1) * r);
  }
  return s;
};

// Circle / arc lying flat in the XZ plane at height y.
const arcSegsXZ = (r: number, a0: number, a1: number, n: number, y = 0): number[] => {
  const s: number[] = [];
  for (let k = 0; k < n; k++) {
    const b0 = a0 + (k / n) * (a1 - a0);
    const b1 = a0 + ((k + 1) / n) * (a1 - a0);
    s.push(Math.cos(b0) * r, y, Math.sin(b0) * r, Math.cos(b1) * r, y, Math.sin(b1) * r);
  }
  return s;
};
const circleSegsXZ = (r: number, n: number, y = 0): number[] => arcSegsXZ(r, 0, Math.PI * 2, n, y);

const gearGlyph = (R: number): number[] => {
  const s: number[] = [];
  const tot = 16; // 8 teeth
  let first: [number, number] | null = null;
  let prev: [number, number] | null = null;
  for (let k = 0; k < tot; k++) {
    const a = (k / tot) * Math.PI * 2;
    const r = k % 2 === 0 ? R : R * 0.74;
    const p: [number, number] = [Math.cos(a) * r, Math.sin(a) * r];
    if (prev) s.push(prev[0], prev[1], p[0], p[1]);
    else first = p;
    prev = p;
  }
  if (prev && first) s.push(prev[0], prev[1], first[0], first[1]);
  const hr = R * 0.42;
  const hn = 12;
  for (let k = 0; k < hn; k++) {
    const a0 = (k / hn) * Math.PI * 2;
    const a1 = ((k + 1) / hn) * Math.PI * 2;
    s.push(Math.cos(a0) * hr, Math.sin(a0) * hr, Math.cos(a1) * hr, Math.sin(a1) * hr);
  }
  return s;
};

const searchGlyph = (R: number): number[] => {
  const s: number[] = [];
  const lr = R * 0.6;
  const cx = -R * 0.18;
  const cy = R * 0.18;
  const n = 18;
  for (let k = 0; k < n; k++) {
    const a0 = (k / n) * Math.PI * 2;
    const a1 = ((k + 1) / n) * Math.PI * 2;
    s.push(cx + Math.cos(a0) * lr, cy + Math.sin(a0) * lr, cx + Math.cos(a1) * lr, cy + Math.sin(a1) * lr);
  }
  const ha = -Math.PI / 4;
  s.push(
    cx + Math.cos(ha) * lr, cy + Math.sin(ha) * lr,
    cx + Math.cos(ha) * (lr + R * 0.7), cy + Math.sin(ha) * (lr + R * 0.7),
  );
  return s;
};

const codeGlyph = (w: number): number[] => {
  const h = w * 0.8;
  return [
    -w, 0, -w * 0.42, h, -w, 0, -w * 0.42, -h, // <
    w, 0, w * 0.42, h, w, 0, w * 0.42, -h, //     >
    -w * 0.16, -h * 0.95, w * 0.16, h * 0.95, //  /
  ];
};

const cubeSegs = (c: number): number[] => {
  const v = [
    [-c, -c, -c], [c, -c, -c], [c, c, -c], [-c, c, -c],
    [-c, -c, c], [c, -c, c], [c, c, c], [-c, c, c],
  ];
  const E = [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]];
  const s: number[] = [];
  for (const [a, b] of E) s.push(v[a][0], v[a][1], v[a][2], v[b][0], v[b][1], v[b][2]);
  return s;
};

const figureGroups = (tilt: number): { group: Group; spin: Group } => {
  const group = new Group();
  group.rotation.x = tilt;
  const spin = new Group();
  group.add(spin);
  return { group, spin };
};

// 01 — Agentic: the loop. Pulse out (call) -> tool fires (run) -> pulse back
// (result) -> core flash (observe) -> context arc accretes. Three tools per
// cycle, sequenced; the whole instrument turntable-spins.
function agenticFigure(): Figure {
  const { group, spin } = figureGroups(AERIAL);
  const inkLine = new LineBasicMaterial({ color: INK, transparent: true, opacity: EDGE_OP });
  const faintLine = new LineBasicMaterial({ color: INK, transparent: true, opacity: FAINT_OP });
  const corePt = new PointsMaterial({ color: AMBER, size: 0.15, sizeAttenuation: true, transparent: true, opacity: ACCENT_OP });
  const pulsePt = new PointsMaterial({ color: AMBER, size: 0.15, sizeAttenuation: true, transparent: true, opacity: ACCENT_OP });

  // ── core: a hairline gyroscope — the outer ring precesses about Y, the
  // nested inner ring counter-spins about X; an amber point sits at the pivot.
  const gyroFlashMat = new LineBasicMaterial({ color: AMBER, transparent: true, opacity: 0 });
  const oGrp = new Group();
  oGrp.add(glyphXY(circle2d(0.46, 40), inkLine));
  oGrp.add(glyphXY(circle2d(0.46, 40), gyroFlashMat));
  const iGrp = new Group();
  iGrp.add(glyphXY(circle2d(0.31, 32), inkLine));
  iGrp.add(glyphXY(circle2d(0.31, 32), gyroFlashMat));
  oGrp.add(iGrp);
  spin.add(oGrp);

  const coreGeom = new BufferGeometry();
  coreGeom.setAttribute('position', new Float32BufferAttribute(new Float32Array([0, 0, 0]), 3));
  spin.add(new Points(coreGeom, corePt));

  // ── orbit guide, spokes, tool stations
  const R = 1.5;
  spin.add(lineSeg(circleSegsXZ(R, 64), faintLine));

  const glyphs = [gearGlyph(0.27), searchGlyph(0.28), codeGlyph(0.3)];
  const tools: LineSegments[] = [];
  const hot: LineSegments[] = [];          // amber twin of each glyph — fires as the call lands
  const hotMats: LineBasicMaterial[] = [];
  const toolAng: number[] = [];
  const spokes: number[] = [];
  for (let i = 0; i < 3; i++) {
    const a = Math.PI / 2 + (i / 3) * Math.PI * 2;
    toolAng.push(a);
    const cx = Math.cos(a);
    const cz = Math.sin(a);
    spokes.push(cx * 0.66, 0, cz * 0.66, cx * (R - 0.34), 0, cz * (R - 0.34));
    const m = glyphXY(glyphs[i], inkLine);
    m.position.set(cx * R, 0, cz * R);
    spin.add(m);
    tools.push(m);
    const hm = new LineBasicMaterial({ color: AMBER, transparent: true, opacity: 0 });
    const h = glyphXY(glyphs[i], hm);
    h.position.set(cx * R, 0, cz * R);
    spin.add(h);
    hot.push(h);
    hotMats.push(hm);
  }
  spin.add(lineSeg(spokes, faintLine));

  // ── tool ripple — one billboarded circle, moved to whichever tool is firing
  const blipMat = new LineBasicMaterial({ color: AMBER, transparent: true, opacity: 0 });
  const blip = glyphXY(circle2d(0.3, 28), blipMat);
  spin.add(blip);

  // ── context arcs — one third of a ring accretes per observation
  const arcMats = [0, 1, 2].map(() => new LineBasicMaterial({ color: AMBER, transparent: true, opacity: 0 }));
  const arcOp = [0, 0, 0];
  for (let i = 0; i < 3; i++) {
    const a0 = Math.PI / 2 + (i / 3) * Math.PI * 2 + 0.16;
    const a1 = Math.PI / 2 + ((i + 1) / 3) * Math.PI * 2 - 0.16;
    spin.add(lineSeg(arcSegsXZ(0.82, a0, a1, 18), arcMats[i]));
  }

  // ── the pulse — a single amber point riding the active spoke
  // NOTE: mutable attributes use BufferAttribute (keeps the array reference);
  // Float32BufferAttribute copies, so per-frame writes would never upload.
  const pulseArr = new Float32Array(3);
  const pulseGeom = new BufferGeometry();
  pulseGeom.setAttribute('position', new BufferAttribute(pulseArr, 3));
  spin.add(new Points(pulseGeom, pulsePt));

  const TOOL_P = 2.7; // s per call; full cycle = 3 calls
  let fadeK = 1;
  let lastT = 0;
  let gyroFl = 0;
  const hotOp = [0, 0, 0];
  return {
    group,
    setFade: (k) => {
      fadeK = k;
      inkLine.opacity = EDGE_OP * k;
      faintLine.opacity = FAINT_OP * k;
      corePt.opacity = ACCENT_OP * k;
      pulsePt.opacity = ACCENT_OP * k;
    },
    update: (t, cam) => {
      const dtl = Math.min(0.05, Math.max(0, t - lastT));
      lastT = t;
      spin.rotation.y = t * SPIN;
      oGrp.rotation.y = t * 0.55;
      iGrp.rotation.x = t * 1.15;
      for (const m of tools) m.lookAt(cam.position); // billboard so icons stay readable
      for (const h of hot) h.lookAt(cam.position);
      blip.lookAt(cam.position);

      const tc = t % (TOOL_P * 3);
      const i = Math.min(2, Math.floor(tc / TOOL_P)); // active tool
      const u = (tc % TOOL_P) / TOOL_P;               // progress within this call
      const ca = Math.cos(toolAng[i]);
      const sa = Math.sin(toolAng[i]);

      // pulse: out 0–0.30, at tool 0.30–0.50, back 0.50–0.80, absorb 0.80–1
      let r = -1;
      if (u < 0.30) r = lerp(0.55, R, ez(u / 0.30));
      else if (u >= 0.50 && u < 0.80) r = lerp(R, 0.55, ez((u - 0.50) / 0.30));
      pulseArr[0] = ca * r;
      pulseArr[1] = r < 0 ? 999 : 0; // hidden while the tool runs / core absorbs
      pulseArr[2] = sa * r;
      (pulseGeom.getAttribute('position') as BufferAttribute).needsUpdate = true;

      // the tool fires while the call is with it; flash lingers after
      const fire = u >= 0.30 && u < 0.50 ? 1 : 0;
      for (let k = 0; k < 3; k++) {
        hotOp[k] = Math.max(hotOp[k] - dtl * 1.7, k === i ? fire : 0);
        hotMats[k].opacity = ACCENT_OP * hotOp[k] * fadeK;
      }

      // ripple expanding from the firing tool
      if (fire) {
        const k2 = (u - 0.30) / 0.20;
        blip.position.set(ca * R, 0, sa * R);
        blip.scale.setScalar(lerp(0.45, 1.7, ez(k2)));
        blipMat.opacity = ACCENT_OP * (1 - k2) * 0.8 * fadeK;
      } else {
        blipMat.opacity = 0;
      }

      // the core absorbs the observation — rings flash, pivot point breathes
      const absorb = u >= 0.80 ? 1 - (u - 0.80) / 0.20 : 0;
      gyroFl = Math.max(gyroFl - dtl * 2.2, absorb);
      gyroFlashMat.opacity = ACCENT_OP * gyroFl * 0.85 * fadeK;
      corePt.size = 0.15 * (1 + 0.55 * gyroFl);

      // context accretes one arc per completed observation; clears on restart
      for (let k = 0; k < 3; k++) {
        const on = k < i || (k === i && u > 0.86) ? 1 : 0;
        arcOp[k] += (on - arcOp[k]) * Math.min(1, dtl * 3.2);
        arcMats[k].opacity = ACCENT_OP * 0.8 * arcOp[k] * fadeK;
      }
    },
  };
}

// 02 — Full Stack: the round trip. Click ripple (UI) -> packet descends ->
// logic cell fires -> DB commit rings -> response rises -> a new content
// line renders into the window.
function stackFigure(): Figure {
  const { group, spin } = figureGroups(AERIAL);
  const inkLine = new LineBasicMaterial({ color: INK, transparent: true, opacity: EDGE_OP });
  const faintLine = new LineBasicMaterial({ color: INK, transparent: true, opacity: FAINT_OP });
  const amberLine = new LineBasicMaterial({ color: AMBER, transparent: true, opacity: ACCENT_OP });

  const W = 0.95;
  const D = 0.7;
  const yTop = 1.05;
  const yMid = 0.0;
  const yBot = -1.0;

  const seg: number[] = [];
  const faint: number[] = [];

  const rect = (y: number, arr: number[]): void => {
    const c = [[-W, -D], [W, -D], [W, D], [-W, D]];
    for (let k = 0; k < 4; k++) {
      const p = c[k];
      const q = c[(k + 1) % 4];
      arr.push(p[0], y, p[1], q[0], y, q[1]);
    }
  };

  rect(yTop, seg);
  seg.push(-W, yTop, -D + 0.26, W, yTop, -D + 0.26);
  for (let i = 0; i < 2; i++) {
    const bx = -W + 0.16 + i * 0.17;
    const bz = -D + 0.13;
    const r = 0.045;
    seg.push(bx - r, yTop, bz - r, bx + r, yTop, bz - r);
    seg.push(bx + r, yTop, bz - r, bx + r, yTop, bz + r);
    seg.push(bx + r, yTop, bz + r, bx - r, yTop, bz + r);
    seg.push(bx - r, yTop, bz + r, bx - r, yTop, bz - r);
  }
  for (let i = 0; i < 3; i++) {
    const z = -D + 0.5 + i * 0.22;
    seg.push(-W + 0.16, yTop, z, W - 0.4, yTop, z);
  }

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

  const dr = 0.6;
  const drumTop = yBot + 0.42;
  const drumBot = yBot - 0.42;
  const ellipse = (y: number, arr: number[]): void => {
    const n = 44;
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * Math.PI * 2;
      const a1 = ((i + 1) / n) * Math.PI * 2;
      arr.push(Math.cos(a0) * dr, y, Math.sin(a0) * dr, Math.cos(a1) * dr, y, Math.sin(a1) * dr);
    }
  };
  ellipse(drumTop, seg);
  ellipse(drumTop - 0.12, seg);
  ellipse(drumTop - 0.24, seg);
  ellipse(drumBot, seg);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    seg.push(Math.cos(a) * dr, drumTop, Math.sin(a) * dr, Math.cos(a) * dr, drumBot, Math.sin(a) * dr);
  }

  faint.push(0, yTop, 0, 0, drumBot, 0); // spine

  spin.add(lineSeg(seg, inkLine));
  spin.add(lineSeg(faint, faintLine));

  // Amber twin of each layer's outline — flashes as the packet passes through.
  const flashSegs: number[][] = [[], [], []];
  rect(yTop, flashSegs[0]);
  rect(yMid, flashSegs[1]);
  ellipse(drumTop, flashSegs[2]);
  const flashY = [yTop, yMid, drumTop];
  const flashMats = flashSegs.map(() => new LineBasicMaterial({ color: AMBER, transparent: true, opacity: 0 }));
  flashSegs.forEach((s, i) => spin.add(lineSeg(s, flashMats[i])));

  // ── click — two staggered ripples on the window where the request begins
  const CLICK_X = 0.42;
  const CLICK_Z = 0.33;
  const clickMats = [0, 1].map(() => new LineBasicMaterial({ color: AMBER, transparent: true, opacity: 0 }));
  const clicks = clickMats.map((m) => {
    const c = lineSeg(circleSegsXZ(0.15, 22), m);
    c.position.set(CLICK_X, yTop, CLICK_Z);
    spin.add(c);
    return c;
  });

  // ── the logic cell the request routes through — fires as the packet passes
  const cellMat = new LineBasicMaterial({ color: AMBER, transparent: true, opacity: 0 });
  {
    const x0 = 0;
    const x1 = (2 * W) / gx;
    const z0 = -D + (2 * D) / gz;
    const z1 = -D + (4 * D) / gz;
    spin.add(lineSeg([
      x0, yMid, z0, x1, yMid, z0,
      x1, yMid, z0, x1, yMid, z1,
      x1, yMid, z1, x0, yMid, z1,
      x0, yMid, z1, x0, yMid, z0,
    ], cellMat));
  }

  // ── commit ring — an ellipse that rings outward from the drum on write
  const commitMat = new LineBasicMaterial({ color: AMBER, transparent: true, opacity: 0 });
  const commit = lineSeg(circleSegsXZ(dr, 44), commitMat);
  commit.position.y = drumTop;
  spin.add(commit);

  // ── the rendered line — the response becomes UI, drawn left to right
  const renderMat = new LineBasicMaterial({ color: AMBER, transparent: true, opacity: 0 });
  const RENDER_LEN = (W - 0.4) - (-W + 0.16);
  const renderLine = lineSeg([0, 0, 0, 1, 0, 0], renderMat);
  renderLine.position.set(-W + 0.16, yTop, -D + 1.16);
  renderLine.scale.x = 0;
  spin.add(renderLine);

  const packet = lineSeg(cubeSegs(0.1), amberLine);
  spin.add(packet);

  let fadeK = 1;
  let lastT = 0;
  let cellOp = 0;
  let renderOp = 0;
  const layerOp = [0, 0, 0];
  return {
    group,
    setFade: (k) => {
      fadeK = k;
      inkLine.opacity = EDGE_OP * k;
      faintLine.opacity = FAINT_OP * k;
      amberLine.opacity = ACCENT_OP * k;
    },
    update: (t) => {
      const dtl = Math.min(0.05, Math.max(0, t - lastT));
      lastT = t;
      spin.rotation.y = t * SPIN;
      // request lifecycle: click -> descend -> commit -> rise -> render
      const P = 4.6;
      const ph = (t % P) / P;
      const yLo = drumBot + 0.08;
      let py = yTop;
      if (ph < 0.10) py = yTop;
      else if (ph < 0.42) py = lerp(yTop, yLo, ez((ph - 0.10) / 0.32));
      else if (ph < 0.54) py = yLo;
      else if (ph < 0.86) py = lerp(yLo, yTop, ez((ph - 0.54) / 0.32));
      packet.position.set(0, py, 0);
      packet.rotation.y = t * 0.9;

      // click ripples while the packet is still parked at the top
      for (let k = 0; k < 2; k++) {
        const s = (ph - k * 0.035) / 0.105;
        if (s > 0 && s < 1) {
          clicks[k].scale.set(lerp(0.4, 2.1, ez(s)), 1, lerp(0.4, 2.1, ez(s)));
          clickMats[k].opacity = ACCENT_OP * (1 - s) * 0.9 * fadeK;
        } else {
          clickMats[k].opacity = 0;
        }
      }

      // layer outlines flash as the packet passes; flash lingers
      for (let i = 0; i < 3; i++) {
        const s = Math.max(0, 1 - Math.abs(py - flashY[i]) / 0.38);
        layerOp[i] = Math.max(layerOp[i] - dtl * 1.8, s);
        flashMats[i].opacity = ACCENT_OP * layerOp[i] * fadeK;
      }

      // the routed cell fires as the request crosses the logic layer
      const cs = Math.max(0, 1 - Math.abs(py - yMid) / 0.26);
      cellOp = Math.max(cellOp - dtl * 1.5, cs);
      cellMat.opacity = ACCENT_OP * cellOp * fadeK;

      // commit ring while the packet dwells at the drum
      if (ph >= 0.42 && ph < 0.58) {
        const k = (ph - 0.42) / 0.16;
        commit.scale.set(1 + 0.55 * ez(k), 1, 1 + 0.55 * ez(k));
        commitMat.opacity = ACCENT_OP * (1 - k) * 0.9 * fadeK;
      } else {
        commitMat.opacity = 0;
      }

      // the response renders: a new content line draws into the window, holds,
      // and dissolves under the next cycle's click
      if (ph >= 0.86) {
        const k = ez(Math.min(1, (ph - 0.86) / 0.12));
        renderLine.scale.x = RENDER_LEN * k;
        renderOp = k;
      } else {
        renderOp = Math.max(0, renderOp - dtl * 1.1);
        if (renderOp <= 0.001) renderLine.scale.x = 0;
      }
      renderMat.opacity = ACCENT_OP * renderOp * fadeK;
    },
  };
}

// 03 — Machine Learning: the training step. Forward pass (amber) -> backprop
// (green) -> the loss curve under the net descends one notch. Eight epochs,
// then the readout clears and training restarts.
function netFigure(): Figure {
  const { group, spin } = figureGroups(NET_TILT);
  const counts = [3, 5, 5, 3]; // symmetric -> clean, well-shaped silhouette
  const xs = [-1.5, -0.5, 0.5, 1.5];
  const zs = [0.3, 0.1, -0.1, -0.3]; // each layer at its own base depth (receding)
  const gap = 0.62;
  const zSpread = 0.78; // fan each layer's nodes through depth so it's a 3D lattice, not a flat sheet

  const layers: number[][] = [];
  const npos: number[] = [];
  const nodeLayer: number[] = [];
  let idx = 0;
  for (let l = 0; l < 4; l++) {
    const arr: number[] = [];
    const c = counts[l];
    const dir = l % 2 === 0 ? 1 : -1; // alternate fan direction -> edges weave through depth
    for (let k = 0; k < c; k++) {
      const y = (k - (c - 1) / 2) * gap; // single centered column per layer (same silhouette)
      const zk = c > 1 ? dir * (k / (c - 1) - 0.5) * zSpread : 0; // ordered depth fan within the layer
      npos.push(xs[l], y, zs[l] + zk);
      nodeLayer.push(l);
      arr.push(idx++);
    }
    layers.push(arr);
  }
  const nNodes = idx;

  const pairs: number[] = [];
  const edgeSrcLayer: number[] = [];
  for (let l = 0; l < 3; l++) {
    for (const a of layers[l]) for (const b of layers[l + 1]) { pairs.push(a, b); edgeSrcLayer.push(l); }
  }
  const nEdges = pairs.length / 2;

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const nodeAct = new Float32Array(nNodes);   // forward activation (amber)
  const nodeActB = new Float32Array(nNodes);  // backward gradient (green)
  const nodeGeom = new BufferGeometry();
  nodeGeom.setAttribute('position', new Float32BufferAttribute(new Float32Array(npos), 3));
  nodeGeom.setAttribute('aAct', new BufferAttribute(nodeAct, 1));
  nodeGeom.setAttribute('aActB', new BufferAttribute(nodeActB, 1));
  const nodeMat = new ShaderMaterial({
    uniforms: { uInk: { value: INK }, uAmber: { value: AMBER }, uGreen: { value: GREEN }, uFade: { value: 1 }, uDpr: { value: dpr } },
    vertexShader: `
      attribute float aAct;
      attribute float aActB;
      varying float vAct;
      varying float vActB;
      uniform float uDpr;
      void main() {
        vAct = aAct;
        vActB = aActB;
        gl_PointSize = mix(7.0, 23.0, max(aAct, aActB)) * uDpr; // grows when firing
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying float vAct;
      varying float vActB;
      uniform vec3 uInk; uniform vec3 uAmber; uniform vec3 uGreen; uniform float uFade;
      void main() {
        vec2 d = gl_PointCoord - 0.5;
        if (dot(d, d) > 0.25) discard; // round dot
        vec3 c = mix(uInk, uAmber, vAct);
        c = mix(c, uGreen, vActB);
        float a = mix(0.72, 1.0, max(vAct, vActB)) * uFade;
        gl_FragColor = vec4(c, a);
      }
    `,
    transparent: true,
    depthWrite: false,
  });
  spin.add(new Points(nodeGeom, nodeMat));

  // Each edge carries two per-vertex attributes: aEnd (0 at the source node, 1
  // at the target) so the fragment shader knows where along the wire it is, and
  // aSeg (the network position of the edge's source layer) so a moving "head"
  // can be turned into a bright pulse that travels source -> target.
  const edgePos = new Float32Array(nEdges * 6);
  const edgeEnd = new Float32Array(nEdges * 2);
  const edgeSeg = new Float32Array(nEdges * 2);
  for (let e = 0; e < nEdges; e++) {
    const a = pairs[e * 2];
    const b = pairs[e * 2 + 1];
    for (let c = 0; c < 3; c++) {
      edgePos[e * 6 + c] = npos[a * 3 + c];
      edgePos[e * 6 + 3 + c] = npos[b * 3 + c];
    }
    edgeEnd[e * 2] = 0;
    edgeEnd[e * 2 + 1] = 1;
    const seg = edgeSrcLayer[e] / 3; // 0, 1/3, 2/3 — gaps fire in sequence
    edgeSeg[e * 2] = seg;
    edgeSeg[e * 2 + 1] = seg;
  }
  const edgeGeom = new BufferGeometry();
  edgeGeom.setAttribute('position', new Float32BufferAttribute(edgePos, 3));
  edgeGeom.setAttribute('aEnd', new Float32BufferAttribute(edgeEnd, 1));
  edgeGeom.setAttribute('aSeg', new Float32BufferAttribute(edgeSeg, 1));
  const edgeMat = new ShaderMaterial({
    uniforms: {
      uInk: { value: INK }, uAmber: { value: AMBER }, uGreen: { value: GREEN }, uFade: { value: 1 },
      uHead: { value: -9 }, uHeadB: { value: -9 },
    },
    vertexShader: `
      attribute float aEnd;
      attribute float aSeg;
      varying float vEnd;
      varying float vSeg;
      void main() { vEnd = aEnd; vSeg = aSeg; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
    `,
    fragmentShader: `
      uniform vec3 uInk; uniform vec3 uAmber; uniform vec3 uGreen; uniform float uFade; uniform float uHead; uniform float uHeadB;
      varying float vEnd; varying float vSeg;
      float pulseAt(float head) {
        float local = (head - vSeg) * 3.0;             // head's progress within this edge's gap (each gap = 1/3)
        if (local < 0.0 || local > 1.0) return 0.0;     // head not crossing this gap right now
        return smoothstep(0.34, 0.0, abs(vEnd - local)); // bright streak riding the wire along the gap
      }
      void main() {
        float pf = pulseAt(uHead);                      // forward pass — amber activation
        float pb = pulseAt(uHeadB);                     // backward pass — green gradient
        vec3 c = mix(uInk, uAmber, pf);
        c = mix(c, uGreen, pb);
        float a = mix(0.30, 1.0, max(pf, pb)) * uFade;  // faint resting weight -> bright as the signal passes
        gl_FragColor = vec4(c, a);
      }
    `,
    transparent: true,
    depthWrite: false,
  });
  spin.add(new LineSegments(edgeGeom, edgeMat));

  // ── loss readout — hairline axes + a curve that gains one descending
  // segment per training cycle. Sits outside the sway group: it's the
  // instrument panel, not the apparatus.
  const X0 = 0.50;
  const X1 = 1.64;
  const Y0 = -1.94;
  const H = 0.52;
  const EPOCHS = 8;
  const faintLine = new LineBasicMaterial({ color: INK, transparent: true, opacity: FAINT_OP });
  group.add(lineSeg([
    X0, Y0 + H + 0.10, 0, X0, Y0, 0,
    X0, Y0, 0, X1, Y0, 0,
  ], faintLine));

  const px: number[] = [];
  const pyv: number[] = [];
  let seed = Math.random() * 10;
  const regen = (): void => {
    seed = Math.random() * 10;
    for (let i = 0; i < EPOCHS; i++) {
      px[i] = X0 + 0.07 + (i / (EPOCHS - 1)) * (X1 - X0 - 0.14);
      const jit = i > 0 ? 0.05 * Math.sin(i * 9.7 + seed) : 0;
      pyv[i] = Y0 + 0.05 + (0.10 + 0.82 * Math.exp(-0.55 * i) + jit) * H;
    }
  };
  regen();

  const lossPos = new Float32Array((EPOCHS - 1) * 6);
  const lossGeom = new BufferGeometry();
  lossGeom.setAttribute('position', new BufferAttribute(lossPos, 3));
  const lossMat = new LineBasicMaterial({ color: AMBER, transparent: true, opacity: ACCENT_OP * 0.85 });
  group.add(new LineSegments(lossGeom, lossMat));

  const headArr = new Float32Array(3);
  const headGeom = new BufferGeometry();
  headGeom.setAttribute('position', new BufferAttribute(headArr, 3));
  const headMat = new PointsMaterial({ color: AMBER, size: 0.09, sizeAttenuation: true, transparent: true, opacity: ACCENT_OP });
  group.add(new Points(headGeom, headMat));

  let fadeK = 1;
  let lastN = -1;
  let plotOp = 1;
  let lastT = 0;
  return {
    group,
    setFade: (k) => {
      fadeK = k;
      nodeMat.uniforms.uFade.value = k;
      edgeMat.uniforms.uFade.value = k;
      faintLine.opacity = FAINT_OP * k;
    },
    update: (t) => {
      const dtl = Math.min(0.05, Math.max(0, t - lastT));
      lastT = t;
      spin.rotation.y = 0.35 * Math.sin(t * 0.4); // gentle sway reveals z-depth; layers stay readable
      // One training step per cycle: the forward pass sweeps left -> right
      // (amber activations), a beat, then the backward pass returns right ->
      // left (green gradients — backprop). Heads park at -9 between passes.
      const T = 4.4;
      const n = Math.floor(t / T);
      const ph = (t % T) / T;
      if (n !== lastN) {
        lastN = n;
        if (n % EPOCHS === 0) regen(); // readout cleared — fresh run
      }
      const e = n % EPOCHS; // epoch index: e segments already on the readout

      let hF = -9;
      let hB = -9;
      if (ph < 0.42) hF = ph / 0.42;
      else if (ph >= 0.5 && ph < 0.92) hB = 1 - (ph - 0.5) / 0.42;
      edgeMat.uniforms.uHead.value = hF;
      edgeMat.uniforms.uHeadB.value = hB;
      const WW = 0.22; // a node fires while a head is within this of its layer
      for (let k = 0; k < nNodes; k++) {
        const coord = nodeLayer[k] / 3;
        nodeAct[k] = hF < -1 ? 0 : Math.max(0, 1 - Math.abs(coord - hF) / WW);
        nodeActB[k] = hB < -1 ? 0 : Math.max(0, 1 - Math.abs(coord - hB) / WW);
      }
      (nodeGeom.getAttribute('aAct') as BufferAttribute).needsUpdate = true;
      (nodeGeom.getAttribute('aActB') as BufferAttribute).needsUpdate = true;

      // the step lands: after backprop completes, the curve extends one notch
      const stepK = ph >= 0.92 ? ez((ph - 0.92) / 0.08) : 0;
      let hx = px[Math.min(e, EPOCHS - 1)];
      let hy = pyv[Math.min(e, EPOCHS - 1)];
      for (let s = 0; s < EPOCHS - 1; s++) {
        let ax = px[s]; let ay = pyv[s]; let bx = ax; let by = ay;
        if (s < e) { bx = px[s + 1]; by = pyv[s + 1]; } // settled history
        else if (s === e && e < EPOCHS - 1 && stepK > 0) {
          bx = lerp(ax, px[s + 1], stepK);
          by = lerp(ay, pyv[s + 1], stepK);
          hx = bx; hy = by;
        } else { ax = hx; ay = hy; bx = hx; by = hy; } // future — collapsed, invisible
        lossPos[s * 6 + 0] = ax; lossPos[s * 6 + 1] = ay; lossPos[s * 6 + 2] = 0;
        lossPos[s * 6 + 3] = bx; lossPos[s * 6 + 4] = by; lossPos[s * 6 + 5] = 0;
      }
      (lossGeom.getAttribute('position') as BufferAttribute).needsUpdate = true;
      headArr[0] = hx; headArr[1] = hy;
      (headGeom.getAttribute('position') as BufferAttribute).needsUpdate = true;

      // converged: hold the full curve a beat, then clear for the next run
      const tgt = e === EPOCHS - 1 && ph > 0.6 ? 0 : 1;
      plotOp += (tgt - plotOp) * Math.min(1, dtl * 3);
      lossMat.opacity = ACCENT_OP * 0.85 * plotOp * fadeK;
      headMat.opacity = ACCENT_OP * plotOp * fadeK;
    },
  };
}

export function initInterestsGraph(canvas: HTMLCanvasElement): void {
  const reduceMo = matchMedia('(prefers-reduced-motion: reduce)');

  const scene = new Scene();
  const camera = new PerspectiveCamera(40, 1, 0.1, 100);
  camera.position.set(0, 0, 6.55);

  const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

  const pivot = new Group();
  scene.add(pivot);

  const figures: Figure[] = [agenticFigure(), stackFigure(), netFigure()];
  for (const fig of figures) {
    fig.group.visible = false;
    pivot.add(fig.group);
  }

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

  let curOffY = 0;
  let curOffX = 0;
  let tgtOffY = 0;
  let tgtOffX = 0;
  window.addEventListener(
    'pointermove',
    (e) => {
      const nx = (e.clientX / window.innerWidth - 0.5) * 2;
      const ny = (e.clientY / window.innerHeight - 0.5) * 2;
      tgtOffY = nx * 0.4;
      tgtOffX = ny * 0.18;
    },
    { passive: true },
  );

  let hover = -1;
  const items = [...document.querySelectorAll<HTMLElement>('.int-item')];
  items.forEach((el, i) => {
    el.addEventListener('pointerenter', () => { hover = i; });
    el.addEventListener('pointerleave', () => { hover = -1; });
  });
  // The bullet list mirrors the stage: whichever figure is up carries .live
  // (amber index + underline + caption, styled in the page CSS).
  const setLive = (i: number): void => items.forEach((el, k) => el.classList.toggle('live', k === i));
  setLive(0);

  let visible = true;
  new IntersectionObserver(
    (es) => { visible = es[0]?.isIntersecting ?? true; },
    { threshold: 0.05 },
  ).observe(canvas);
  let running = true;
  document.addEventListener('visibilitychange', () => { running = !document.hidden; });

  let from = 0;
  let to = 0;
  let mix = 1;
  let autoIdx = 0;
  let dwellT = 0;

  let prev = 0;
  // Start mid-action so the very first frame (and the reduced-motion static
  // pose) shows each mechanism doing its job, not waiting to.
  let t = 21;

  const render = (): void => {
    for (const fig of figures) fig.group.visible = false;

    if (mix >= 1) {
      const fig = figures[to];
      fig.group.visible = true;
      fig.group.scale.setScalar(1);
      fig.setFade(1);
      fig.update(t, camera);
    } else {
      const e = mix * mix * (3 - 2 * mix); // smoothstep
      const a = figures[from];
      const b = figures[to];
      a.group.visible = true;
      a.group.scale.setScalar(lerp(1, 0.62, e));
      a.setFade(1 - e);
      a.update(t, camera);
      b.group.visible = true;
      b.group.scale.setScalar(lerp(0.62, 1, e));
      b.setFade(e);
      b.update(t, camera);
    }

    renderer.render(scene, camera);
  };

  const frame = (now: number): void => {
    const dt = prev ? Math.min(0.05, (now - prev) / 1000) : 0;
    prev = now;

    if (reduceMo.matches) {
      render();
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
          setLive(to);
        } else if (hover < 0) {
          dwellT += dt;
          if (dwellT >= DWELL) { autoIdx = (autoIdx + 1) % 3; dwellT = 0; }
        } else {
          dwellT = 0;
          autoIdx = to;
        }
      }

      curOffY += (tgtOffY - curOffY) * 0.07;
      curOffX += (tgtOffX - curOffX) * 0.07;
      pivot.rotation.y = curOffY;
      pivot.rotation.x = curOffX;

      render();
    }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);

  // First paint before the loop catches up.
  render();
}
