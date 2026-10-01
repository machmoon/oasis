// Flow Field: seeded Perlin-noise streamlines traced across a framed print, in three inks on paper.
export const meta = {
  title: "Quiet Currents",
  kind: "illustration",
  description: "Seeded flow-field line art in three inks on paper, for posters, covers, hero art and textured backdrops.",
  tags: ["flow field", "generative", "lines", "noise", "abstract", "art print", "texture", "curves"],
  price: 6,
  author: "oasis-factory",
  size: [800, 1000],
};

export const params = {
  knobs: {
    background: { type: "color", label: "Paper", default: "#F3EEE4" },
    ink1: { type: "color", label: "Main ink", default: "#1F2A44" },
    ink2: { type: "color", label: "Second ink", default: "#E2583E" },
    ink3: { type: "color", label: "Accent ink", default: "#E9B44C" },
    lineStyle: { type: "choice", label: "Line style", default: "straight", options: ["straight", "dashed", "dotted"] },
    lines: { type: "range", label: "Line count", default: 480, min: 40, max: 900, step: 10 },
    length: { type: "range", label: "Line length", default: 170, min: 20, max: 300, step: 10 },
    curl: { type: "range", label: "Curl", default: 1.2, min: 0, max: 3, step: 0.1 },
    weight: { type: "range", label: "Stroke width", default: 1.7, min: 0.4, max: 6, step: 0.1 },
    seed: { type: "range", label: "Seed", default: 42, min: 1, max: 999, step: 1 },
  },
  presets: {
    Paper: { background: "#F3EEE4", ink1: "#1F2A44", ink2: "#E2583E", ink3: "#E9B44C" },
    Midnight: { background: "#0D1321", ink1: "#F0EBD8", ink2: "#748CAB", ink3: "#E0A458" },
    Sage: { background: "#E8ECE4", ink1: "#2F4A3A", ink2: "#7D9B76", ink3: "#C9A227" },
    Riso: { background: "#FAF7F2", ink1: "#0078BF", ink2: "#FF48B0", ink3: "#00A95C" },
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
  const perm = [];
  for (let i = 0; i < 256; i++) perm[i] = i;
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    const t = perm[i]; perm[i] = perm[j]; perm[j] = t;
  }
  const P = new Array(512);
  for (let i = 0; i < 512; i++) P[i] = perm[i & 255];
  const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);
  const g = (h, x, y) => {
    switch (h & 7) {
      case 0: return x + y; case 1: return -x + y;
      case 2: return x - y; case 3: return -x - y;
      case 4: return x; case 5: return -x;
      case 6: return y; default: return -y;
    }
  };
  return (x, y) => {
    let X = Math.floor(x), Y = Math.floor(y);
    x -= X; y -= Y; X &= 255; Y &= 255;
    const u = fade(x), v = fade(y);
    const a = P[X] + Y, b = P[X + 1] + Y;
    const top = g(P[a], x, y) + u * (g(P[b], x - 1, y) - g(P[a], x, y));
    const bot = g(P[a + 1], x, y - 1) + u * (g(P[b + 1], x - 1, y - 1) - g(P[a + 1], x, y - 1));
    return top + v * (bot - top);
  };
}

export default function render(p) {
  const W = 800, H = 1000, M = 60, STEP = 7, G = 12;
  const X0 = M, Y0 = M, X1 = W - M, Y1 = H - M;
  const FW = X1 - X0, FH = Y1 - Y0;
  const r = rng(p.seed * 7919 + 13);
  const noise = makeNoise(r);
  const base = r() * Math.PI * 2;
  const s = 0.0024;
  const amp = p.curl * Math.PI * 1.6;

  const gw = Math.ceil(W / G) + 2, gh = Math.ceil(H / G) + 2;
  const field = new Float64Array(gw * gh);
  for (let j = 0; j < gh; j++) {
    for (let i = 0; i < gw; i++) {
      const x = i * G, y = j * G;
      const n = noise(x * s, y * s) + 0.5 * noise(x * s * 2.1 + 31.7, y * s * 2.1 + 17.3);
      field[j * gw + i] = base + n * amp;
    }
  }
  const angle = (x, y) => {
    let fx = x / G, fy = y / G;
    if (fx < 0) fx = 0; if (fy < 0) fy = 0;
    let i = fx | 0, j = fy | 0;
    if (i > gw - 2) i = gw - 2; if (j > gh - 2) j = gh - 2;
    const u = fx - i, v = fy - j, k = j * gw + i;
    const a = field[k] + u * (field[k + 1] - field[k]);
    const b = field[k + gw] + u * (field[k + gw + 1] - field[k + gw]);
    return a + v * (b - a);
  };

  const trace = (x, y, dir, steps, out) => {
    for (let i = 0; i < steps; i++) {
      const a = angle(x, y);
      x += Math.cos(a) * STEP * dir;
      y += Math.sin(a) * STEP * dir;
      if (x < X0 - 2 || x > X1 + 2 || y < Y0 - 2 || y > Y1 + 2) break;
      out.push(x, y);
    }
    return out;
  };

  const n = Math.round(p.lines);
  const cols = Math.max(1, Math.round(Math.sqrt((n * FW) / FH)));
  const rows = Math.ceil(n / cols);
  const cw = FW / cols, ch = FH / rows;
  const seeds = [];
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      seeds.push([X0 + (i + 0.1 + r() * 0.8) * cw, Y0 + (j + 0.1 + r() * 0.8) * ch]);
    }
  }
  for (let i = seeds.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    const t = seeds[i]; seeds[i] = seeds[j]; seeds[j] = t;
  }
  if (seeds.length > n) seeds.length = n;

  const half = Math.max(1, Math.round(p.length / STEP / 2));
  const f = (v) => Math.round(v * 10) / 10;
  const zoneA = r() * 100, zoneB = r() * 100;
  const items = [];

  for (let q = 0; q < seeds.length; q++) {
    const sx = seeds[q][0], sy = seeds[q][1];
    const jitter = r(), wj = r(), oj = r();
    const back = trace(sx, sy, -1, half, []);
    const fwd = trace(sx, sy, 1, half, []);
    if (back.length + fwd.length < 4) continue;

    const parts = [];
    let first = true;
    for (let i = back.length - 2; i >= 0; i -= 2) {
      parts.push((first ? "M" : "L") + f(back[i]) + " " + f(back[i + 1]));
      first = false;
    }
    parts.push((first ? "M" : "L") + f(sx) + " " + f(sy));
    for (let i = 0; i < fwd.length; i += 2) parts.push("L" + f(fwd[i]) + " " + f(fwd[i + 1]));

    const zone = noise(sx * 0.0021 + zoneA, sy * 0.0021 + zoneB)
      + 0.35 * noise(sx * 0.005 + zoneB, sy * 0.005 + zoneA)
      + (jitter - 0.5) * 0.22;
    items.push({ d: parts.join(""), w: p.weight * (0.55 + wj * 0.9), o: 0.82 + oj * 0.18, zone, ink: 0 });
  }

  const order = items.map((_, i) => i).sort((a, b) => items[a].zone - items[b].zone);
  const total = Math.max(1, order.length);
  for (let k = 0; k < order.length; k++) {
    const t = k / total;
    items[order[k]].ink = t < 0.52 ? 0 : t < 0.83 ? 1 : 2;
  }

  const inks = [p.ink1, p.ink2, p.ink3];
  const out = [];
  for (let i = 0; i < items.length; i++) {
    const it = items[i], w = it.w;
    let dash = "";
    if (p.lineStyle === "dashed") dash = ` stroke-dasharray="${f(w * 5 + 2)} ${f(w * 3.2 + 2)}"`;
    else if (p.lineStyle === "dotted") dash = ` stroke-dasharray="0 ${f(w * 2.4 + 1.5)}"`;
    out.push(`<path d="${it.d}" stroke="${inks[it.ink]}" stroke-width="${Math.round(w * 100) / 100}" stroke-opacity="${it.o.toFixed(2)}"${dash}/>`);
  }

  const defs = `<defs>` +
    `<clipPath id="ff-clip"><rect x="${X0}" y="${Y0}" width="${FW}" height="${FH}"/></clipPath>` +
    `<filter id="ff-grain" x="0" y="0" width="100%" height="100%">` +
    `<feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="${p.seed}" stitchTiles="stitch"/>` +
    `<feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -1.4 0.9"/>` +
    `</filter></defs>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">${defs}` +
    `<rect width="${W}" height="${H}" fill="${p.background}"/>` +
    `<g clip-path="url(#ff-clip)" fill="none" stroke-linecap="round" stroke-linejoin="round">${out.join("")}</g>` +
    `<rect width="${W}" height="${H}" filter="url(#ff-grain)" opacity="0.18"/>` +
    `</svg>`;
}
