// Garden Footbridge: a little arched timber footbridge over a stream, with stepped deck planks and lacquered rails.
// Block asset: build(p) returns parts in metres on the Oasis Town grid (origin at the footprint's corner, y up,
// street side at z = 0). The span runs along x from bank to bank; the stream flows front to back beneath it.
export const meta = {
  title: "Garden Footbridge",
  kind: "3d",
  format: "blocks",
  kit: "Oasis Town",
  description: "A small arched footbridge whose stepped timber deck climbs over a stream between two grassy stone banks, ready to link park paths across the town grid.",
  tags: ["3d", "low poly", "bridge", "footbridge", "stream", "park", "garden", "town", "kit"],
  price: 3,
  author: "oasis-factory",
  footprint: [6, 3],
  size: [1000, 1000],
};

export const params = {
  knobs: {
    wood: { type: "color", role: "secondary", label: "Deck wood", default: "#8A6E52" },
    rail: { type: "color", role: "primary", label: "Rails", default: "#C8553D" },
    water: { type: "toggle", label: "Water in stream", default: true },
    rise: { type: "range", label: "Arch rise (m)", default: 0.9, min: 0.5, max: 1.3, step: 0.1 },
    steps: { type: "range", label: "Deck steps", default: 9, min: 7, max: 13, step: 2 },
    width: { type: "range", label: "Deck width (m)", default: 2, min: 1.4, max: 2.6, step: 0.2 },
    railing: { type: "choice", label: "Railing", default: "posts", options: ["posts", "panels"] },
    lights: { type: "toggle", label: "Lanterns lit", default: true },
  },
  presets: {
    Garden: { wood: "#A0805E", rail: "#2F7A55" },
    Blossom: { wood: "#9A7A5C", rail: "#E58FAE" },
    Slate: { wood: "#6E5E4E", rail: "#5B6270" },
  },
};

const hex = (c) => {
  const n = parseInt(String(c).replace("#", "").slice(0, 6), 16) || 0;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const toHex = (r, g, b) =>
  "#" + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("").toUpperCase();
const shade = (c, f) => { const [r, g, b] = hex(c); return toHex(r * f, g * f, b * f); };
const mix = (c, d, t) => { const a = hex(c), b = hex(d); return toHex(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t); };
const lum = (c) => { const [r, g, b] = hex(c); return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255; };
// trim that always contrasts with its base: darken light colours, lighten dark ones
const trimOf = (c) => (lum(c) > 0.5 ? mix(c, "#000000", 0.32) : mix(c, "#FFFFFF", 0.34));

export function build(p) {
  const parts = [];
  const box = (x, y, z, w, h, d, c, e) => parts.push({ t: "box", p: [x, y, z], s: [w, h, d], c, ...(e ? { e: true } : {}) });
  const cyl = (x, y, z, r, h, c, n) => parts.push({ t: "cyl", p: [x, y, z], r, h, c, n: n || 8 });
  const cone = (x, y, z, r, h, c, n) => parts.push({ t: "cone", p: [x, y, z], r, h, c, n: n || 6 });

  const stone = "#D9DCE1", stoneDark = "#B4BAC2", leaf = "#79B86A", path = "#E4D6BC";
  const lit = "#FFD58A", paper = "#F6EEE0", roofGrey = "#5B6270";
  const BANK = 0.4, CAP = 0.04, DECK_T = 0.2;
  const N = Math.max(3, Math.round(p.steps));
  const W = p.width, z0 = 1.5 - W / 2;
  const X0 = 0.3, X1 = 5.7, segW = (X1 - X0) / N;
  const woodA = p.wood, woodB = shade(p.wood, 0.86), beamC = shade(p.wood, 0.7);
  const railC = p.rail, railTrim = trimOf(p.rail);

  // deck heights: ends rest on the banks, crown at mid-span
  const tops = [];
  for (let i = 0; i < N; i++) tops.push(BANK + DECK_T + p.rise * Math.sin((Math.PI * i) / (N - 1)));
  let maxDh = 0;
  for (let i = 1; i < N; i++) maxDh = Math.max(maxDh, Math.abs(tops[i] - tops[i - 1]));
  const beamH = Math.max(0.35, maxDh - DECK_T + 0.05);

  // ---- banks: stone body, grass on top, a sandy path landing under the deck ----
  const pz0 = Math.max(0, z0 - 0.15), pz1 = Math.min(3, z0 + W + 0.15);
  for (const bx of [0, 5]) {
    box(bx, 0, 0, 1, BANK - CAP, 3, stone);
    box(bx, BANK - CAP, pz0, 1, CAP, pz1 - pz0, path);
    if (pz0 > 0.05) box(bx, BANK - CAP, 0, 1, CAP, pz0, leaf);
    if (3 - pz1 > 0.05) box(bx, BANK - CAP, pz1, 1, CAP, 3 - pz1, leaf);
    // stone coping band on the face toward the stream
    const cx = bx === 0 ? 1 : 4.96;
    box(cx, BANK - 0.14, 0, 0.04, 0.14, 3, stoneDark);
  }

  // ---- stream bed ----
  if (p.water) {
    box(1, 0, 0, 4, 0.05, 3, "#4A5A6A");
    box(1, 0.05, 0, 4, 0.21, 3, "#5B95E8");
    for (const [rx, rz, rw] of [[1.5, 0.12, 0.9], [3.1, 0.22, 1.1], [2.2, 2.78, 1.0], [3.7, 2.86, 0.8]])
      box(rx, 0.26, rz, rw, 0.02, 0.05, "#A9C8F5");
    cyl(1.45, 0.26, 0.3, 0.2, 0.03, leaf, 8);
    cyl(4.5, 0.26, 2.72, 0.18, 0.03, leaf, 8);
    cyl(4.2, 0.26, 2.84, 0.12, 0.03, leaf, 8);
  } else {
    box(1, 0, 0, 4, 0.1, 3, "#C9B48E");
    for (const [sx, sz, sr] of [[1.4, 0.35, 0.16], [1.75, 0.2, 0.1], [4.4, 2.7, 0.18], [4.7, 0.4, 0.12], [2.6, 2.75, 0.12]])
      cyl(sx, 0.1, sz, sr, 0.08, stoneDark, 7);
    for (const [gx, gz] of [[1.25, 2.7], [4.75, 2.5], [1.3, 0.65], [4.7, 0.18]]) cone(gx, 0.1, gz, 0.14, 0.3, leaf, 6);
  }

  // ---- deck steps and arch beams ----
  for (let i = 0; i < N; i++) {
    const x = X0 + i * segW, top = tops[i];
    box(x, top - DECK_T, z0, segW, DECK_T, W, i % 2 ? woodB : woodA);
    if (i > 0 && i < N - 1) {
      const bTop = top - DECK_T;
      const bBot = Math.max(bTop - beamH, BANK);
      if (bTop - bBot > 0.04)
        for (const bz of [z0 + 0.15, z0 + W - 0.31]) box(x, bBot, bz, segW, bTop - bBot, 0.16, beamC);
    }
  }

  // ---- railings ----
  const NEWEL = 0.22, nA = X0 + NEWEL, nB = X1 - NEWEL, POST = 0.12;
  const sides = [z0 + 0.11, z0 + W - 0.11];
  for (const zc of sides) {
    // end newels carrying lanterns
    for (const [nx, top] of [[X0, tops[0]], [nB, tops[N - 1]]]) {
      box(nx, top, zc - NEWEL / 2, NEWEL, 1.05, NEWEL, railC);
      const ly = top + 1.05;
      box(nx + 0.02, ly, zc - 0.09, 0.18, 0.22, 0.18, p.lights ? lit : paper, p.lights);
      box(nx - 0.04, ly + 0.22, zc - 0.15, 0.3, 0.06, 0.3, roofGrey);
      cone(nx + NEWEL / 2, ly + 0.28, zc, 0.12, 0.14, roofGrey, 6);
    }
    // rail runs: one per step, following the deck
    for (let i = 0; i < N; i++) {
      const x = X0 + i * segW, top = tops[i];
      const ra = Math.max(x, nA), rb = Math.min(x + segW, nB);
      if (rb - ra < 0.05) continue;
      if (p.railing === "posts") {
        box(ra, top + 0.85, zc - 0.08, rb - ra, 0.1, 0.16, railC);
        box(ra, top + 0.42, zc - 0.05, rb - ra, 0.07, 0.1, railC);
      } else {
        box(ra, top, zc - 0.05, rb - ra, 0.8, 0.1, railC);
        box(ra, top + 0.8, zc - 0.08, rb - ra, 0.08, 0.16, railTrim);
        if (rb - ra > 0.3) box(ra + 0.08, top + 0.18, zc - 0.07, rb - ra - 0.16, 0.44, 0.02, railTrim);
      }
    }
    // one post per joint: stands on the lower step, flush against the higher step, tall enough for its rail
    if (p.railing === "posts") {
      for (let j = 1; j < N; j++) {
        const x = X0 + j * segW;
        const lowLeft = tops[j - 1] < tops[j];
        const px = lowLeft ? x - POST : x;
        if (px < nA + 0.04 || px + POST > nB - 0.04) continue;
        const base = Math.min(tops[j - 1], tops[j]);
        const hi = Math.max(tops[j - 1], tops[j]);
        box(px, base, zc - 0.06, POST, hi + 1.0 - base, 0.12, railC);
      }
    }
  }

  return { parts };
}
