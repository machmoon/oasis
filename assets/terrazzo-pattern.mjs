// Seamless terrazzo: seeded stone chips (shards, pebbles or slivers) packed with gap-filling aggregate on a mottled, speckled base.
export const meta = {
  title: "Terrazzo Chips",
  kind: "pattern",
  description: "A seamless, seeded terrazzo surface of polished stone chips for packaging, wallpapers, product backdrops and brand textures.",
  tags: ["terrazzo", "pattern", "seamless", "stone", "texture", "confetti", "surface", "memphis"],
  price: 4,
  author: "oasis-factory",
  size: [800, 800],
};

export const params = {
  knobs: {
    base: { type: "color", label: "Base", default: "#EFE8DC" },
    chip1: { type: "color", label: "Chip 1 (most)", default: "#C8553D" },
    chip2: { type: "color", label: "Chip 2", default: "#7A9E7E" },
    chip3: { type: "color", label: "Chip 3", default: "#2F2F33" },
    chip4: { type: "color", label: "Chip 4 (accent)", default: "#E3B04B" },
    shape: { type: "choice", label: "Chip shape", default: "shards", options: ["shards", "pebbles", "slivers", "mixed"] },
    count: { type: "range", label: "Chip count", default: 210, min: 20, max: 400, step: 5 },
    size: { type: "range", label: "Chip size", default: 34, min: 8, max: 70, step: 1 },
    seed: { type: "range", label: "Seed", default: 42, min: 1, max: 500, step: 1 },
    speckle: { type: "toggle", label: "Speckle", default: true },
  },
  presets: {
    Classic: { base: "#EFE8DC", chip1: "#C8553D", chip2: "#7A9E7E", chip3: "#2F2F33", chip4: "#E3B04B" },
    Midnight: { base: "#1B2333", chip1: "#F2C6C2", chip2: "#F4EDE1", chip3: "#3E8E86", chip4: "#D9A441" },
    Blush: { base: "#F3D9D2", chip1: "#B23A3A", chip2: "#6B1F2A", chip3: "#FBF5EE", chip4: "#8C8C4A" },
    Mint: { base: "#DCEBE3", chip1: "#2C5D4F", chip2: "#F7F3EA", chip3: "#E58C6B", chip4: "#1E2A2E" },
  },
};

const TAU = Math.PI * 2;

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const hx = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const mix = (a, b, t) => {
  const A = hx(a), B = hx(b);
  return "#" + A.map((v, i) => Math.max(0, Math.min(255, Math.round(v + (B[i] - v) * t))).toString(16).padStart(2, "0")).join("");
};
const lum = (h) => { const [r, g, b] = hx(h); return (0.299 * r + 0.587 * g + 0.114 * b) / 255; };
const f = (n) => n.toFixed(1);

function rotPts(pts, rot) {
  const c = Math.cos(rot), s = Math.sin(rot);
  return pts.map(([x, y]) => [x * c - y * s, x * s + y * c]);
}

function shardPath(R, r, stretch) {
  const u = r();
  const n = u < 0.3 ? 4 : u < 0.75 ? 5 : 6;
  const cut = r() < 0.45 ? Math.floor(r() * n) : -1;
  let pts = [];
  for (let i = 0; i < n; i++) {
    const a = ((i + 0.05 + r() * 0.9) / n) * TAU;
    let rad = R * (0.5 + r() * 0.5);
    if (i === cut || i === (cut + 1) % n) rad = R * (0.82 + r() * 0.18);
    pts.push([Math.cos(a) * rad, Math.sin(a) * rad * stretch]);
  }
  pts = rotPts(pts, r() * TAU);
  return "M" + pts.map(([x, y]) => `${f(x)},${f(y)}`).join("L") + "Z";
}

function pebblePath(R, r) {
  const n = 6 + Math.floor(r() * 3);
  const stretch = 0.68 + r() * 0.3;
  const ang = TAU / n;
  let pts = [];
  for (let i = 0; i < n; i++) {
    const rad = R * (0.78 + r() * 0.22);
    pts.push([Math.cos(i * ang) * rad, Math.sin(i * ang) * rad * stretch]);
  }
  pts = rotPts(pts, r() * TAU);
  const k = ((4 / 3) * Math.tan(ang / 4)) / Math.sin(ang / 2) / 2;
  let d = `M${f(pts[0][0])},${f(pts[0][1])}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
    d += ` C${f(p1[0] + (p2[0] - p0[0]) * k)},${f(p1[1] + (p2[1] - p0[1]) * k)} ${f(p2[0] - (p3[0] - p1[0]) * k)},${f(p2[1] - (p3[1] - p1[1]) * k)} ${f(p2[0])},${f(p2[1])}`;
  }
  return d + "Z";
}

export default function render(p) {
  const S = 800;
  const r = rng(p.seed * 9973 + 17);
  const chips = [p.chip1, p.chip2, p.chip3, p.chip4];
  const weights = [0.36, 0.28, 0.22, 0.14];
  const pickColor = () => {
    let t = r(), i = 0;
    while (i < 3 && t > weights[i]) { t -= weights[i]; i++; }
    return chips[i];
  };

  const maxR = p.size;
  const sizes = [];
  for (let i = 0; i < p.count; i++) sizes.push(maxR * (0.22 + 0.78 * Math.pow(r(), 1.7)));
  sizes.sort((a, b) => b - a);

  const pack = p.shape === "slivers" ? 0.62 : p.shape === "pebbles" ? 0.9 : 0.8;
  const gap = 2 + maxR * 0.06;
  const reach = 2 * maxR * pack + gap;
  const G = Math.max(1, Math.floor(S / reach));
  const cell = S / G;
  const grid = [];
  for (let i = 0; i < G * G; i++) grid.push([]);
  const placed = [];
  const near = (x, y) => {
    if (G < 3) return placed;
    const gx = Math.floor(x / cell) % G, gy = Math.floor(y / cell) % G, res = [];
    for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) {
      const list = grid[((gy + b + G) % G) * G + ((gx + a + G) % G)];
      for (let i = 0; i < list.length; i++) res.push(list[i]);
    }
    return res;
  };
  const minR = Math.max(3, maxR * 0.14);
  for (const R0 of sizes) {
    let R = R0, done = false;
    for (let lvl = 0; lvl < 4 && !done && R >= minR; lvl++, R *= 0.72) {
      for (let t = 0; t < 10; t++) {
        const x = r() * S, y = r() * S;
        let ok = true;
        for (const c of near(x, y)) {
          let dx = Math.abs(x - c.x); dx = Math.min(dx, S - dx);
          let dy = Math.abs(y - c.y); dy = Math.min(dy, S - dy);
          const m = (R + c.R) * pack + gap;
          if (dx * dx + dy * dy < m * m) { ok = false; break; }
        }
        if (ok) {
          const c = { x, y, R };
          placed.push(c);
          grid[(Math.floor(y / cell) % G) * G + (Math.floor(x / cell) % G)].push(c);
          done = true; break;
        }
      }
    }
  }

  const dark = lum(p.base) < 0.45;
  const mot = dark ? mix(p.base, "#FFFFFF", 0.07) : mix(p.base, "#000000", 0.08);
  const [mr, mg, mb] = hx(mot).map((v) => (v / 255).toFixed(3));
  const gc = dark ? 1 : 0;

  const defs = `<defs>
<filter id="mottle" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.014" numOctaves="3" seed="${p.seed}" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 ${mr}  0 0 0 0 ${mg}  0 0 0 0 ${mb}  0 0 0 1.3 -0.5"/></filter>
<filter id="grain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="${p.seed + 3}" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 ${gc}  0 0 0 0 ${gc}  0 0 0 0 ${gc}  0 0 0 ${dark ? 0.14 : 0.22} -0.06"/></filter>
</defs>`;

  let out = `<rect width="${S}" height="${S}" fill="${p.base}"/><rect width="${S}" height="${S}" filter="url(#mottle)" opacity="${dark ? 0.4 : 0.6}"/>`;

  if (p.speckle) {
    const sr = rng(p.seed * 131 + 7);
    const specks = [...chips, mix(p.base, dark ? "#FFFFFF" : "#000000", dark ? 0.25 : 0.45)];
    let dots = "";
    for (let i = 0; i < 1500; i++) {
      const x = sr() * S, y = sr() * S;
      const rad = 0.5 + Math.pow(sr(), 3) * (dark ? 1.3 : 1.9);
      const col = specks[Math.floor(sr() * specks.length)];
      dots += `<circle cx="${f(x)}" cy="${f(y)}" r="${rad.toFixed(2)}" fill="${col}"/>`;
    }
    out += `<g opacity="${dark ? 0.5 : 0.8}">${dots}</g>`;
  }

  for (const c of placed) {
    let d;
    const mode = p.shape === "mixed" ? (r() < 0.6 ? "shards" : r() < 0.5 ? "pebbles" : "slivers") : p.shape;
    if (mode === "pebbles") d = pebblePath(c.R, r);
    else if (mode === "slivers") d = shardPath(c.R, r, 0.2 + r() * 0.2);
    else d = shardPath(c.R, r, 0.6 + r() * 0.4);
    const baseCol = pickColor();
    const v = (r() - 0.5) * 0.16;
    const col = v > 0 ? mix(baseCol, "#FFFFFF", v) : mix(baseCol, "#000000", -v);
    const edge = mix(col, "#000000", 0.14);
    const sw = (0.6 + c.R * 0.012).toFixed(2);
    const ext = c.R * 1.05;
    for (const ox of [-S, 0, S]) {
      for (const oy of [-S, 0, S]) {
        const x = c.x + ox, y = c.y + oy;
        if (x + ext < 0 || x - ext > S || y + ext < 0 || y - ext > S) continue;
        out += `<path transform="translate(${f(x)} ${f(y)})" d="${d}" fill="${col}" stroke="${edge}" stroke-width="${sw}" stroke-linejoin="round"/>`;
      }
    }
  }

  out += `<rect width="${S}" height="${S}" filter="url(#grain)"/>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${S} ${S}" width="${S}" height="${S}">${defs}${out}</svg>`;
}
