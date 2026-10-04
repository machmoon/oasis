// Plaza Fountain: a round stepped stone fountain whose bowls overflow in flared sheets of water, crowned by a jet.
// Block asset: build(p) returns parts in metres on the Oasis Town grid (origin at the footprint's corner,
// y up, street side at z = 0). Everything is centred on the 4 x 4 lot and stays inside it at every size.
export const meta = {
  title: "Plaza Fountain",
  kind: "3d",
  format: "blocks",
  kit: "Oasis Town",
  description: "A round plaza fountain with a stepped stone basin, bowls that overflow in flared sheets of water and an arcing crown jet. It makes the centrepiece of a town square.",
  tags: ["3d", "low poly", "fountain", "plaza", "square", "water", "stone", "town", "kit", "block"],
  price: 3,
  author: "oasis-factory",
  footprint: [4, 4],
  size: [1000, 1000],
};

export const params = {
  knobs: {
    stone: { type: "color", role: "surface", label: "Stone", default: "#D9DCE1" },
    water: { type: "color", role: "primary", label: "Water", default: "#A9D8F2" },
    accent: { type: "color", role: "highlight", label: "Plaque & orb", default: "#F2B33D" },
    tiers: { type: "range", label: "Tiers", default: 2, min: 1, max: 3, step: 1 },
    size: { type: "range", label: "Fountain size", default: 0.8, min: 0.6, max: 1.0, step: 0.05 },
    top: { type: "choice", label: "Top", default: "jet", options: ["jet", "ball", "spire"] },
    lights: { type: "toggle", label: "Night lights", default: true },
  },
  presets: {
    Sandstone: { stone: "#E8D3B0", water: "#9CD6D0", accent: "#2F7A55" },
    Slate: { stone: "#B7BEC8", water: "#8CC4E8", accent: "#C8553D" },
    Blossom: { stone: "#F6EEE0", water: "#B9DDF5", accent: "#E5484D" },
  },
};

// ---------- colour helpers: every input stays plausible for its material ----------
const hex = (c) => {
  const n = parseInt(String(c).replace("#", ""), 16) || 0;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const toHex = (v) => "#" + v.map((x) => Math.max(0, Math.min(255, Math.round(x))).toString(16).padStart(2, "0")).join("").toUpperCase();
const mix = (a, b, t) => {
  const A = hex(a), B = hex(b);
  return toHex(A.map((x, i) => x + (B[i] - x) * t));
};
const toHsl = (c) => {
  const [r, g, b] = hex(c).map((x) => x / 255);
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  const l = (mx + mn) / 2;
  let h = 0, s = 0;
  if (d > 1e-6) {
    s = d / (1 - Math.abs(2 * l - 1));
    if (mx === r) h = ((g - b) / d) % 6;
    else if (mx === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return [h, Math.min(1, s), l];
};
const fromHsl = (h, s, l) => {
  const C = (1 - Math.abs(2 * l - 1)) * s, X = C * (1 - Math.abs(((h / 60) % 2) - 1)), m = l - C / 2;
  const [r, g, b] = h < 60 ? [C, X, 0] : h < 120 ? [X, C, 0] : h < 180 ? [0, C, X] : h < 240 ? [0, X, C] : h < 300 ? [X, 0, C] : [C, 0, X];
  return toHex([r, g, b].map((v) => (v + m) * 255));
};
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const hueDist = (a, b) => { const d = Math.abs(a - b) % 360; return Math.min(d, 360 - d); };

// water: a calm, pale aqua-to-sky blue whatever the brand input
const waterHue = (c) => {
  let [h, s] = toHsl(c);
  if (s < 0.1) h = 200;
  if (h < 180 || h > 215) h = hueDist(h, 180) < hueDist(h, 215) ? 180 : 215;
  return h;
};
const waterTone = (c) => {
  const [, s, l] = toHsl(c);
  return fromHsl(waterHue(c), s < 0.1 ? 0.42 : clamp(s, 0.3, 0.55), clamp(l, 0.72, 0.84));
};
// stone: always light and low in chroma, never a black glyph or a neon block
const stoneTone = (c) => {
  let [h, s, l] = toHsl(c);
  l = clamp(l, 0.62, 0.92);
  s = Math.min(s, 0.22 / Math.max(0.05, 1 - Math.abs(2 * l - 1)));
  return fromHsl(h, s, l);
};
// accent: keeps its hue, never too dark or too pale to read on stone
const accentTone = (c) => {
  const [h, s, l] = toHsl(c);
  return fromHsl(h, s, clamp(l, 0.35, 0.66));
};

export function build(p) {
  const parts = [];
  const box = (x, y, z, w, h, d, c, e) => parts.push({ t: "box", p: [x, y, z], s: [w, h, d], c, ...(e ? { e: true } : {}) });
  const cyl = (cx, y, cz, r, h, c, n, e) => parts.push({ t: "cyl", p: [cx, y, cz], r, h, c, n: n || 12, ...(e ? { e: true } : {}) });
  const cone = (cx, y, cz, r, h, c, n, e) => parts.push({ t: "cone", p: [cx, y, cz], r, h, c, n: n || 10, ...(e ? { e: true } : {}) });

  const CX = 2, CZ = 2;
  const s = clamp(Number(p.size) || 0.8, 0.6, 1);
  const tiers = clamp(Math.round(Number(p.tiers) || 2), 1, 3);
  const L = !!p.lights;

  // ---------- tonal families ----------
  const stone = stoneTone(p.stone);
  const dark = "#4A4F5A";
  const step1C = mix(stone, dark, 0.2);
  const step2C = mix(stone, dark, 0.1);
  const underC = mix(stone, dark, 0.16);
  const copeC = mix(stone, "#FFFFFF", 0.2);
  const waterC = waterTone(p.water);
  const wh = waterHue(p.water);
  const waterHi = mix(waterC, "#FFFFFF", 0.22);
  // falling water: day = pale tint of the water; night = a brighter, cooler glow of the SAME hue
  const fallC = L ? fromHsl(wh, 0.6, 0.8) : mix(waterC, "#FFFFFF", 0.35);
  const rippleC = mix(waterC, "#FFFFFF", 0.55);
  const foam = L ? fromHsl(wh, 0.5, 0.93) : "#FFFFFF";
  const accent = accentTone(p.accent);
  const lampOn = "#FFD58A", glassOff = "#7E93A8", metal = "#8C929C", capC = "#5B6270";

  // ---------- water primitives ----------
  // Overflow sheet: a continuous bell of stacked bands following the free-fall profile r = r0 + flare*sqrt(fall).
  // Bands share edges, so the sheet is one closed surface; it whitens as it falls (aeration) and ends in foam.
  const curtain = (r0, flare, yTop, yBot) => {
    const NB = 8, D = yTop - yBot;
    for (let i = 0; i < NB; i++) {
      const yHi = yTop - (D * i) / NB;
      const yLo = i === NB - 1 ? yBot - 0.02 : yTop - (D * (i + 1)) / NB;
      const r = r0 + flare * Math.sqrt((i + 0.5) / NB);
      cyl(CX, yLo, CZ, r, yHi - yLo, mix(fallC, "#FFFFFF", 0.05 + (0.3 * i) / (NB - 1)), 16, L);
    }
    const rBot = r0 + flare;
    cyl(CX, yBot - 0.005, CZ, rBot + 0.1, 0.015, rippleC, 16);   // ripple ring spreading on the pool
    cyl(CX, yBot - 0.01, CZ, rBot + 0.05, 0.04, foam, 16, L);    // churned foam where the sheet lands
  };
  // Arcing spout: a continuous stepped ribbon along an axis, each segment spanning its neighbour's end point.
  const ribbon = (dx, dz, r0, y0, kick, thr, y1) => {
    const N = Math.max(6, Math.ceil(thr / 0.05)), drop = y0 - y1, th = 0.08, w = 0.08;
    const Y = (t) => y0 + kick * t - (kick + drop) * t * t;
    for (let i = 0; i < N; i++) {
      const t0 = i / N, t1 = (i + 1) / N;
      const ra = r0 + thr * t0 - 0.005, rb = r0 + thr * t1 + 0.005;
      const lo = Math.min(Y(t0), Y(t1)) - th / 2, hi = Math.max(Y(t0), Y(t1)) + th / 2;
      if (dx) {
        const xa = CX + dx * ra, xb = CX + dx * rb;
        box(Math.min(xa, xb), lo, CZ - w / 2, Math.abs(xb - xa), hi - lo, w, fallC, L);
      } else {
        const za = CZ + dz * ra, zb = CZ + dz * rb;
        box(CX - w / 2, lo, Math.min(za, zb), w, hi - lo, Math.abs(zb - za), fallC, L);
      }
    }
  };
  const splash = (x, z, ySurf) => {
    cyl(x, ySurf - 0.005, z, 0.12, 0.015, rippleC, 10);
    cyl(x, ySurf - 0.01, z, 0.065, 0.04, foam, 8, L);
  };
  const AXES = [[1, 0], [0, 1], [-1, 0], [0, -1]];

  // ---------- basin: one radial profile from R ----------
  const R = 1.97 * s;            // outer step (1.97 at max keeps it inside the 4 m lot)
  const Rb = R - 0.34;           // basin wall
  const Rw = Rb - 0.16;          // basin water
  const wallH = 0.32 + 0.22 * s;
  const wallTop = 0.24 + wallH, copeTop = wallTop + 0.1, WT = copeTop + 0.03;
  cyl(CX, 0, CZ, R, 0.12, step1C, 16);
  cyl(CX, 0.12, CZ, R - 0.17, 0.12, step2C, 16);
  cyl(CX, 0.24, CZ, Rb, wallH, stone, 16);
  cyl(CX, wallTop, CZ, Rb + 0.06, 0.1, copeC, 16);
  cyl(CX, wallTop, CZ, Rw, WT - wallTop, waterC, 16);          // brim-full pool, 0.03 proud of the coping

  // front plaque keyed into the wall on the street side, sized to the facet it sits on
  const pw = Math.min(0.5 + 0.4 * s, 0.74 * Rb);
  const back = Rb * Math.cos(Math.PI / 8) - 0.07;
  box(CX - pw / 2, 0.32, CZ - Rb - 0.03, pw, wallH - 0.16, Rb + 0.03 - back, accent);

  // four lamp bollards on the upper step at the diagonals, clear of the plaque
  const lr = Rb + 0.1;
  for (const ad of [45, 135, 225, 315]) {
    const a = (ad * Math.PI) / 180, lx = CX + Math.cos(a) * lr, lz = CZ + Math.sin(a) * lr;
    cyl(lx, 0.24, lz, 0.06, 0.36, metal, 8);
    cyl(lx, 0.6, lz, 0.075, 0.13, L ? lampOn : glassOff, 8, L);
    cyl(lx, 0.73, lz, 0.09, 0.04, capC, 8);
  }

  // ---------- column ----------
  const colR = 0.1 + 0.08 * s;
  cyl(CX, wallTop, CZ, colR + 0.12, WT + 0.12 - wallTop, stone, 12);   // pedestal rising out of the pool

  // ---------- tier 2: a wide shallow saucer whose sheet flares into the basin ----------
  const r2 = Math.min(Rb * 0.55, Rw - 0.27);
  const w2 = r2 - 0.09;
  const y2 = WT + 0.75 + 0.55 * s;
  const top2 = y2 + 0.19;
  // ---------- tier 3: a small deep goblet, a shorter step up (shrinking rhythm) ----------
  const r3 = Math.max(Rb * 0.28, colR + 0.12);
  const w3 = r3 - 0.07;
  const y3 = top2 + 0.45 + 0.35 * s;
  const top3 = y3 + 0.29;

  if (tiers >= 2) {
    cyl(CX, y2 - 0.26, CZ, r2 * 0.35, 0.12, underC, 10);
    cyl(CX, y2 - 0.14, CZ, r2 * 0.7, 0.14, step2C, 12);
    cyl(CX, y2, CZ, r2, 0.16, stone, 12);
    cyl(CX, y2 + 0.06, CZ, r2 + 0.03, 0.1, copeC, 12);          // rim band, crowns the sheet
    cyl(CX, y2 + 0.06, CZ, w2, 0.13, waterHi, 12);
    const r0 = r2 + 0.05;
    const flare = Math.min(0.1 + 0.2 * s, Rw - 0.12 - r0);
    if (flare >= 0.04) curtain(r0, flare, y2 + 0.12, WT);
  }
  if (tiers >= 3) {
    cyl(CX, y3 - 0.18, CZ, r3 * 0.6, 0.18, step2C, 10);
    cyl(CX, y3, CZ, r3, 0.24, stone, 12);
    cyl(CX, y3 + 0.14, CZ, r3 + 0.03, 0.12, copeC, 12);
    cyl(CX, y3 + 0.1, CZ, w3, 0.19, waterHi, 12);
    const r0 = r3 + 0.05;
    const flare = Math.min(0.06 + 0.1 * s, w2 - 0.12 - r0);
    if (flare >= 0.04) curtain(r0, flare, y3 + 0.22, top2);
  }

  const topY = tiers === 1 ? WT : tiers === 2 ? top2 : top3;
  const colTop = tiers === 1 ? WT + 1.0 + 0.8 * s : topY + 0.1;
  const capR = colR + (tiers === 1 ? 0.08 : 0.03);
  cyl(CX, WT + 0.12, CZ, colR, colTop - WT - 0.12, stone, 10);
  if (tiers === 1) cyl(CX, WT + 0.45, CZ, colR + 0.05, 0.12, underC, 10);   // knuckle on the tall column
  cyl(CX, colTop, CZ, capR, 0.08, copeC, 10);
  const oy = colTop + 0.08;

  // the receiving pool for anything falling from the top: always the topmost water, so nothing crosses a bowl
  const recvY = topY;
  const recvR = tiers === 1 ? Rw : tiers === 2 ? w2 : w3;
  const lo = tiers === 1 ? colR + 0.27 : capR + 0.06;
  const hi = recvR - 0.13;
  const land = hi - lo >= 0.01 ? lo + (hi - lo) * 0.6 : 0;

  // ---------- top ornament ----------
  if (p.top === "jet") {
    const jetH = (0.5 + 0.7 * s) * (tiers === 1 ? 1.25 : 1);
    const j0 = oy + 0.05;
    cyl(CX, oy, CZ, capR - 0.02, 0.05, waterHi, 10);
    cyl(CX, j0, CZ, 0.13, jetH * 0.4, fallC, 8, L);
    cyl(CX, j0 + jetH * 0.4, CZ, 0.095, jetH * 0.35, fallC, 8, L);
    cyl(CX, j0 + jetH * 0.75, CZ, 0.065, jetH * 0.25, fallC, 8, L);
    const tip = j0 + jetH;
    cyl(CX, tip - 0.04, CZ, land ? 0.12 : 0.16, 0.08, foam, 10, L);
    // four arcs bloom from the tip and land in the topmost pool
    if (land) for (const [dx, dz] of AXES) {
      ribbon(dx, dz, 0, tip, 0.28, land, recvY - 0.02);
      splash(CX + dx * land, CZ + dz * land, recvY);
    }
  } else {
    if (p.top === "ball") {
      cyl(CX, oy, CZ, 0.09, 0.1, stone, 8);
      cyl(CX, oy + 0.1, CZ, 0.17, 0.07, accent, 10);
      cyl(CX, oy + 0.17, CZ, 0.25, 0.22, accent, 12);
      cyl(CX, oy + 0.39, CZ, 0.17, 0.07, accent, 10);
    } else {
      cyl(CX, oy, CZ, colR + 0.02, 0.12, step1C, 10);
      cone(CX, oy + 0.12, CZ, colR + 0.04, 0.85, stone, 10);
      cyl(CX, oy + 0.62, CZ, 0.07, 0.08, copeC, 8);                 // carved stone collar on the spire
    }
    // single tier: four stone spouts on the cap pour arcs into the basin
    if (tiers === 1 && land) for (const [dx, dz] of AXES) {
      const r0 = capR - 0.02;
      box(CX + dx * (capR - 0.04) - 0.05, colTop + 0.02, CZ + dz * (capR - 0.04) - 0.05, 0.1, 0.07, 0.1, copeC);
      ribbon(dx, dz, r0, colTop + 0.06, 0.12, land - r0, WT - 0.02);
      splash(CX + dx * land, CZ + dz * land, WT);
    }
  }

  return { parts };
}
