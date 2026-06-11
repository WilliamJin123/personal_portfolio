// Hairline concept diagrams for "I'm interested in" — three distinct 3D figures,
// one per bullet, each a literal little mechanism that animates to show what the
// concept *does*. Each figure has its own motion inside a shared pivot that
// carries cursor parallax. The page cross-dissolves (scale + opacity) between
// figures; hovering a bullet snaps to its figure.
//
//   01 Agentic Applications -> an "AI model" sparkle ringed by camera-facing tool
//      icons (gear / search / code) on a feedback loop; a token circles the loop
//      and fires a pulse out to each tool as it passes.
//   02 Full Stack          -> a UI window, a logic grid, and a data drum stacked
//      on a spine; a cube packet drops down through the layers and rises back up.
//   03 Machine Learning    -> a feed-forward net with depth; weights rest faint
//      and an activation wave sweeps left-to-right, firing nodes + weights amber.
//
// Reduced-motion renders one static pose; paused when off-screen or backgrounded.

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
const SPIN = 0.16;       // turntable rad/s (stack)
const DWELL = 4.5;       // s a figure is held before auto-advancing
const FADE = 1.0;        // s cross-dissolve

const EDGE_OP = 0.62;    // primary hairline
const FAINT_OP = 0.22;   // spine
const ACCENT_OP = 0.95;  // amber moving element
const CORE_OP = 0.86;    // amber sparkle

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

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

// Single 4-point "AI sparkle" outline as 2D [u,v] pairs.
const star2d = (rO: number, rI: number): number[] => {
  const pts: [number, number][] = [];
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2;
    const r = k % 2 === 0 ? rO : rI;
    pts.push([Math.cos(a) * r, Math.sin(a) * r]);
  }
  const s: number[] = [];
  for (let k = 0; k < 8; k++) {
    const p = pts[k];
    const q = pts[(k + 1) % 8];
    s.push(p[0], p[1], q[0], q[1]);
  }
  return s;
};

// Two 4-point stars crossed in perpendicular planes — a sparkle with 3D depth.
const sparkle3d = (rO: number, rI: number): number[] => {
  const s2 = star2d(rO, rI);
  const segs: number[] = [];
  for (let i = 0; i < s2.length; i += 4) segs.push(s2[i], s2[i + 1], 0, s2[i + 2], s2[i + 3], 0);
  for (let i = 0; i < s2.length; i += 4) segs.push(s2[i], 0, s2[i + 1], s2[i + 2], 0, s2[i + 3]);
  return segs;
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

// 01 — Agentic: a model sparkle (crossed 3D) at the center of a single feedback
// loop ring carrying three camera-facing tool icons (gear / search / code). A
// token circles the loop and pulses out to each tool as it passes; the whole
// thing turntable-spins.
function agenticFigure(): Figure {
  const { group, spin } = figureGroups(AERIAL);
  const inkLine = new LineBasicMaterial({ color: INK, transparent: true, opacity: EDGE_OP });
  const amberLine = new LineBasicMaterial({ color: AMBER, transparent: true, opacity: CORE_OP });
  const amberPts = new PointsMaterial({ color: AMBER, size: 0.14, sizeAttenuation: true, transparent: true, opacity: ACCENT_OP });

  const core = lineSeg(sparkle3d(0.5, 0.15), amberLine);
  spin.add(core);

  const R = 1.5;
  const segN = 64;
  const ring: number[] = [];
  for (let i = 0; i < segN; i++) {
    const a0 = (i / segN) * Math.PI * 2;
    const a1 = ((i + 1) / segN) * Math.PI * 2;
    ring.push(Math.cos(a0) * R, 0, Math.sin(a0) * R, Math.cos(a1) * R, 0, Math.sin(a1) * R);
  }
  spin.add(lineSeg(ring, inkLine));

  const glyphs = [gearGlyph(0.27), searchGlyph(0.28), codeGlyph(0.3)];
  const tools: LineSegments[] = [];
  const hot: LineSegments[] = [];          // amber twin of each glyph — lights up as the call lands
  const hotMats: LineBasicMaterial[] = [];
  const toolPos: [number, number][] = [];
  const toolAng: number[] = [];
  for (let i = 0; i < 3; i++) {
    const a = Math.PI / 2 + (i / 3) * Math.PI * 2;
    toolAng.push(a);
    const cx = Math.cos(a) * R;
    const cz = Math.sin(a) * R;
    toolPos.push([cx, cz]);
    const m = glyphXY(glyphs[i], inkLine);
    m.position.set(cx, 0, cz);
    spin.add(m);
    tools.push(m);
    const hm = new LineBasicMaterial({ color: AMBER, transparent: true, opacity: 0 });
    const h = glyphXY(glyphs[i], hm);
    h.position.set(cx, 0, cz);
    spin.add(h);
    hot.push(h);
    hotMats.push(hm);
  }

  const moverArr = new Float32Array(4 * 3);
  const moverGeom = new BufferGeometry();
  moverGeom.setAttribute('position', new Float32BufferAttribute(moverArr, 3));
  spin.add(new Points(moverGeom, amberPts));

  const win = 0.9;
  let fadeK = 1;
  let lastT = 0;
  const hotOp = [0, 0, 0]; // per-tool flash with a decay tail, so hits linger
  return {
    group,
    setFade: (k) => {
      fadeK = k;
      inkLine.opacity = EDGE_OP * k;
      amberLine.opacity = CORE_OP * k;
      amberPts.opacity = ACCENT_OP * k;
    },
    update: (t, cam) => {
      const dtl = Math.min(0.05, Math.max(0, t - lastT));
      lastT = t;
      spin.rotation.y = t * SPIN;
      core.rotation.y = -t * 0.8; // crossed sparkle shimmers in 3D
      for (const m of tools) m.lookAt(cam.position); // billboard so icons stay readable
      const aTok = (t * 0.65) % (Math.PI * 2);
      moverArr[0] = Math.cos(aTok) * R;
      moverArr[1] = 0;
      moverArr[2] = Math.sin(aTok) * R;
      let sMax = 0;
      for (let i = 0; i < 3; i++) {
        let d = Math.abs(aTok - toolAng[i]) % (Math.PI * 2);
        if (d > Math.PI) d = Math.PI * 2 - d;
        const s = Math.max(0, 1 - d / win);
        const o = (1 + i) * 3;
        moverArr[o] = toolPos[i][0] * s;
        moverArr[o + 1] = s < 0.04 ? 999 : 0; // hide idle pulses off-screen
        moverArr[o + 2] = toolPos[i][1] * s;
        hot[i].lookAt(cam.position);
        hotOp[i] = Math.max(hotOp[i] - dtl * 1.6, s * s); // sharp attack, slow decay
        hotMats[i].opacity = ACCENT_OP * hotOp[i] * fadeK; // the tool fires as the call lands
        if (s > sMax) sMax = s;
      }
      core.scale.setScalar(1 + 0.35 * sMax); // the model breathes with each call/response
      (moverGeom.getAttribute('position') as BufferAttribute).needsUpdate = true;
    },
  };
}

// 02 — Full Stack: a UI window (top), a logic grid (middle), a database drum
// (bottom) on a spine. A cube packet drops top -> bottom then rises.
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

  const packet = lineSeg(cubeSegs(0.1), amberLine);
  spin.add(packet);

  let fadeK = 1;
  let lastT = 0;
  const layerOp = [0, 0, 0]; // per-layer flash with a decay tail
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
      // request lifecycle: ease down through the layers, dwell at the database
      // (the commit), ease back up with the response
      const P = 3.4;
      const ph = (t % P) / P;
      const ease = (k: number): number => k * k * (3 - 2 * k);
      const yLo = drumBot + 0.08;
      let py = yTop;
      if (ph < 0.44) py = lerp(yTop, yLo, ease(ph / 0.44));
      else if (ph < 0.54) py = yLo;
      else if (ph < 0.98) py = lerp(yLo, yTop, ease((ph - 0.54) / 0.44));
      packet.position.set(0, py, 0);
      packet.rotation.y = t * 0.9;
      for (let i = 0; i < 3; i++) {
        const s = Math.max(0, 1 - Math.abs(py - flashY[i]) / 0.38);
        layerOp[i] = Math.max(layerOp[i] - dtl * 1.8, s); // flash lingers after the packet moves on
        flashMats[i].opacity = ACCENT_OP * layerOp[i] * fadeK;
      }
    },
  };
}

// 03 — Machine Learning: a feed-forward net staggered in depth (so the sway reveals
// 3D). Round nodes + faint resting weights; an activation wavefront sweeps left
// to right, firing nodes and the weights between them amber (the forward pass).
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
  nodeGeom.setAttribute('aAct', new Float32BufferAttribute(nodeAct, 1));
  nodeGeom.setAttribute('aActB', new Float32BufferAttribute(nodeActB, 1));
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

  return {
    group,
    setFade: (k) => {
      nodeMat.uniforms.uFade.value = k;
      edgeMat.uniforms.uFade.value = k;
    },
    update: (t) => {
      spin.rotation.y = 0.35 * Math.sin(t * 0.4); // gentle sway reveals z-depth; layers stay readable
      // One training step per cycle: the forward pass sweeps left -> right
      // (amber activations), a beat, then the backward pass returns right ->
      // left (green gradients — backprop). Heads park at -9 between passes.
      const T = 4.4;
      const ph = (t % T) / T;
      let hF = -9;
      let hB = -9;
      if (ph < 0.42) hF = ph / 0.42;
      else if (ph >= 0.5 && ph < 0.92) hB = 1 - (ph - 0.5) / 0.42;
      edgeMat.uniforms.uHead.value = hF;
      edgeMat.uniforms.uHeadB.value = hB;
      const WW = 0.22; // a node fires while a head is within this of its layer
      for (let n = 0; n < nNodes; n++) {
        const coord = nodeLayer[n] / 3;
        nodeAct[n] = hF < -1 ? 0 : Math.max(0, 1 - Math.abs(coord - hF) / WW);
        nodeActB[n] = hB < -1 ? 0 : Math.max(0, 1 - Math.abs(coord - hB) / WW);
      }
      (nodeGeom.getAttribute('aAct') as BufferAttribute).needsUpdate = true;
      (nodeGeom.getAttribute('aActB') as BufferAttribute).needsUpdate = true;
    },
  };
}

export function initInterestsGraph(canvas: HTMLCanvasElement): void {
  const reduceMo = matchMedia('(prefers-reduced-motion: reduce)');

  const scene = new Scene();
  const camera = new PerspectiveCamera(40, 1, 0.1, 100);
  camera.position.set(0, 0, 7);

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
  // (amber index + underline, styled in the page CSS).
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
  let t = 0;

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
