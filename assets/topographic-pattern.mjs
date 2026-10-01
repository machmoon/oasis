// Topographic contour pattern: seeded fBm value noise traced with bucketed marching squares into smooth closed isolines, with optional paper-cut terraces.
export const meta = {
  title: "Topographic Survey",
  kind: "pattern",
  description: "Seeded topographic contour lines with optional stacked terraces, for map-inspired backgrounds, packaging and editorial texture.",
  tags: ["topographic", "contour", "map", "terrain", "lines", "pattern", "outdoor", "texture"],
  price: 5,
  author: "oasis-factory",
  size: [800, 600],
};

export const params = {
  knobs: {
    lineColor: { type: "color", label: "Lines", default: "#3A4A3C" },
    background: { type: "color", label: "Paper", default: "#F1ECE2" },
    accent: { type: "color", label: "Terrace peak", default: "#A9BC96" },
    terrain: { type: "choice", label: "Terrain", default: "warped", options: ["rolling", "ridged", "islands", "warped"] },
    levels: { type: "range", label: "Line count", default: 16, min: 4, max: 36, step: 1 },
    lineWidth: { type: "range", label: "Line width", default: 1.25, min: 0.5, max: 4, step: 0.25 },
    scale: { type: "range", label: "Scale", default: 4, min: 1.5, max: 10, step: 0.5 },
    seed: { type: "range", label: "Seed", default: 42, min: 1, max: 500, step: 1 },
    terraces: { type: "toggle", label: "Filled terraces", default: false },
    indexLines: { type: "toggle", label: "Bold every 5th line", default: true },
  },
  presets: {
    Survey: { lineColor: "#3A4A3C", background: "#F1ECE2", accent: "#A9BC96" },
    Blueprint: { lineColor: "#CFE3F5", background: "#0F2A44", accent: "#3B78AE" },
    Ember: { lineColor: "#F2A65A", background: "#1A1210", accent: "#8C2F1B" },
    Graphite: { lineColor: "#151515", background: "#FAFAF8", accent: "#C9C9C4" },
  },
};

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeNoise(r) {
  const perm = [], val = [];
  for (let i = 0; i < 256; i++) { perm.push(i); val.push(r()); }
  for (let i = 255; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const t = perm[i]; perm[i] = perm[j]; perm[j] = t; }
  for (let i = 0; i < 256; i++) perm.push(perm[i]);
  return (x, y) => {
    const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
    const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
    const X0 = ix & 255, Y0 = iy & 255, X1 = (X0 + 1) & 255, Y1 = (Y0 + 1) & 255;
    const pa = perm[X0], pb = perm[X1];
    const a = val[perm[pa + Y0]], b = val[perm[pb + Y0]], c = val[perm[pa + Y1]], d = val[perm[pb + Y1]];
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  };
}

function hex(c) { const n = parseInt(String(c).slice(1), 16) || 0; return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
function mix(a, b, t) {
  const A = hex(a), B = hex(b);
  let s = "#";
  for (let i = 0; i < 3; i++) s += Math.round(A[i] + (B[i] - A[i]) * t).toString(16).padStart(2, "0");
  return s;
}

const SEGS = [null, [3, 2], [2, 1], [3, 1], [0, 1], null, [0, 2], [3, 0], [0, 3], [0, 2], null, [0, 1], [3, 1], [2, 1], [3, 2], null];

function smooth(L) {
  const n = L.length / 2;
  const q = (v) => Math.round(v * 10) / 10;
  let d = "M" + q((L[2 * n - 2] + L[0]) / 2) + " " + q((L[2 * n - 1] + L[1]) / 2);
  for (let i = 0; i < n; i++) {
    const j = i + 1 < n ? i + 1 : 0;
    d += "Q" + q(L[2 * i]) + " " + q(L[2 * i + 1]) + " " + q((L[2 * i] + L[2 * j]) / 2) + " " + q((L[2 * i + 1] + L[2 * j + 1]) / 2);
  }
  return d + "Z";
}

export default function render(p) {
  const W = 800, H = 600, G = 12;
  const r = rng((Number(p.seed) || 1) * 7919 + 17);
  const noise = makeNoise(r);
  const ox = r() * 100, oy = r() * 100;
  const fq = 1 / (60 * (Number(p.scale) || 4));
  const ridged = p.terrain === "ridged";
  const fbm = (x, y, oct) => {
    let s = 0, amp = 0.5, norm = 0;
    for (let o = 0; o < oct; o++) {
      let n = noise(x, y);
      if (ridged) { n = 1 - Math.abs(2 * n - 1); n *= n; }
      s += amp * n; norm += amp; amp *= 0.5;
      const tx = 1.6 * x + 1.2 * y + 3.1;
      y = -1.2 * x + 1.6 * y + 7.7; x = tx;
    }
    return s / norm;
  };

  const x0 = -G, y0 = -G;
  const nx = Math.ceil((W + 2 * G) / G), ny = Math.ceil((H + 2 * G) / G), R = nx + 1;
  const N = R * (ny + 1);
  const f = new Array(N).fill(-1);
  let lo = Infinity, hi = -Infinity;
  for (let j = 1; j < ny; j++) {
    for (let i = 1; i < nx; i++) {
      const px = x0 + i * G, py = y0 + j * G, sx = px * fq + ox, sy = py * fq + oy;
      let v;
      if (p.terrain === "warped") {
        const q1 = fbm(sx, sy, 1), q2 = fbm(sx + 5.2, sy + 1.3, 1);
        v = fbm(sx + 1.8 * q1, sy + 1.8 * q2, 3);
      } else if (p.terrain === "islands") {
        const dx = (px - W / 2) / (W * 0.55), dy = (py - H / 2) / (H * 0.55);
        v = fbm(sx, sy, 3) - 0.6 * (dx * dx + dy * dy);
      } else v = fbm(sx, sy, 3);
      f[j * R + i] = v;
      if (v < lo) lo = v;
      if (v > hi) hi = v;
    }
  }
  const span = hi - lo || 1;
  for (let j = 1; j < ny; j++) for (let i = 1; i < nx; i++) f[j * R + i] = (f[j * R + i] - lo) / span;

  const L = Math.max(1, Math.round(Number(p.levels) || 16)), T = L + 1;
  const buckets = [];
  for (let k = 0; k <= L; k++) buckets.push([]);
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      const c0 = j * R + i;
      const a = f[c0], b = f[c0 + 1], c = f[c0 + R + 1], d = f[c0 + R];
      const mn = Math.min(a, b, c, d), mx = Math.max(a, b, c, d);
      const k0 = Math.max(1, Math.ceil(mn * T)), k1 = Math.min(L, Math.ceil(mx * T) - 1);
      for (let k = k0; k <= k1; k++) buckets[k].push(c0);
    }
  }

  const E = N * 2 + 2;
  const PX = new Array(E).fill(0), PY = new Array(E).fill(0), N0 = new Array(E).fill(-1), N1 = new Array(E).fill(-1);
  const stamp = new Array(E).fill(0), seen = new Array(E).fill(0);

  const lw = Number(p.lineWidth) || 1.25;
  const fills = [], lines = [];
  for (let lev = 1; lev <= L; lev++) {
    const cells = buckets[lev];
    if (!cells.length) continue;
    const t = lev / T, used = [];
    const link = (k, o) => {
      if (stamp[k] !== lev) { stamp[k] = lev; N0[k] = o; N1[k] = -1; used.push(k); } else N1[k] = o;
    };
    for (let m = 0; m < cells.length; m++) {
      const c0 = cells[m], i = c0 % R, j = (c0 - i) / R;
      const a = f[c0], b = f[c0 + 1], c = f[c0 + R + 1], d = f[c0 + R];
      const idx = (a > t ? 8 : 0) | (b > t ? 4 : 0) | (c > t ? 2 : 0) | (d > t ? 1 : 0);
      if (idx === 0 || idx === 15) continue;
      const node = (e) => {
        let k;
        if (e === 0) { k = c0 * 2; PX[k] = x0 + (i + (t - a) / (b - a)) * G; PY[k] = y0 + j * G; }
        else if (e === 1) { k = (c0 + 1) * 2 + 1; PX[k] = x0 + (i + 1) * G; PY[k] = y0 + (j + (t - b) / (c - b)) * G; }
        else if (e === 2) { k = (c0 + R) * 2; PX[k] = x0 + (i + (t - d) / (c - d)) * G; PY[k] = y0 + (j + 1) * G; }
        else { k = c0 * 2 + 1; PX[k] = x0 + i * G; PY[k] = y0 + (j + (t - a) / (d - a)) * G; }
        return k;
      };
      const seg = (e1, e2) => { const u = node(e1), v = node(e2); link(u, v); link(v, u); };
      if (idx === 5 || idx === 10) {
        const up = (a + b + c + d) / 4 > t;
        if ((idx === 5) === up) { seg(0, 3); seg(2, 1); } else { seg(0, 1); seg(3, 2); }
      } else seg(SEGS[idx][0], SEGS[idx][1]);
    }
    let d = "";
    for (let u = 0; u < used.length; u++) {
      let cur = used[u];
      if (seen[cur] === lev) continue;
      const loop = [];
      let prev = -1, guard = 0;
      while (cur >= 0 && seen[cur] !== lev && guard++ < E) {
        seen[cur] = lev;
        loop.push(PX[cur], PY[cur]);
        const nxt = N0[cur] !== prev ? N0[cur] : N1[cur];
        prev = cur; cur = nxt;
      }
      if (loop.length >= 8) d += smooth(loop);
    }
    if (!d) continue;
    if (p.terraces) fills.push(`<path d="${d}" fill="${mix(p.background, p.accent, lev / L)}" filter="url(#sh)"/>`);
    const isIdx = p.indexLines && lev % 5 === 0;
    const op = isIdx ? 1 : p.terraces ? 0.6 : 0.82;
    lines.push(`<path d="${d}" stroke-width="${(isIdx ? lw * 2 : lw).toFixed(2)}" stroke-opacity="${op}"/>`);
  }

  const defs = `<defs><filter id="sh" x="-5%" y="-5%" width="110%" height="110%"><feDropShadow dx="0" dy="1.5" stdDeviation="1.6" flood-color="#000000" flood-opacity="0.16"/></filter><clipPath id="cl"><rect width="${W}" height="${H}"/></clipPath></defs>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">${defs}<rect width="${W}" height="${H}" fill="${p.background}"/><g clip-path="url(#cl)"><g fill-rule="evenodd" stroke="none">${fills.join("")}</g><g fill="none" stroke="${p.lineColor}" stroke-linecap="round" stroke-linejoin="round">${lines.join("")}</g></g></svg>`;
}
