// Town Pond: a 6 x 6 m park tile with a stone-rimmed pond, lily pads, reed clumps and a small wooden jetty.
// Block asset: build(p) returns parts in metres on the Oasis Town grid (origin at the footprint's corner, y up, street side at z = 0).
// The ground is built as 0.5 m cells so every prop sits inside a single supporting cell; this keeps depth sorting stable.
export const meta = {
  title: "Town Pond",
  kind: "3d",
  format: "blocks",
  kit: "Oasis Town",
  description: "A stone-rimmed pond on a grass tile with lily pads, reed clumps and a little wooden jetty, sized to drop into a town park on the 6 m grid.",
  tags: ["3d", "low poly", "pond", "water", "park", "lily pad", "jetty", "reeds", "town", "kit", "block"],
  price: 3,
  author: "oasis-factory",
  footprint: [6, 6],
  size: [1000, 1000],
};

export const params = {
  knobs: {
    water: { type: "color", role: "primary", label: "Water", default: "#8FC3EA" },
    grass: { type: "color", role: "secondary", label: "Grass", default: "#79B86A" },
    blossom: { type: "color", role: "highlight", label: "Lily flowers", default: "#F7B8CF" },
    size: { type: "range", label: "Pond size (m)", default: 4, min: 3, max: 4.5, step: 0.5 },
    pads: { type: "range", label: "Lily pads", default: 5, min: 0, max: 8, step: 1 },
    reeds: { type: "range", label: "Reed clumps", default: 4, min: 0, max: 8, step: 1 },
    jetty: { type: "toggle", label: "Wooden jetty", default: true },
    lights: { type: "toggle", label: "Lanterns lit", default: true },
  },
  presets: {
    Lotus: { water: "#86C6D8", grass: "#8CC26E", blossom: "#E0527E" },
    Dusk: { water: "#9DB1E2", grass: "#62A856", blossom: "#F2B33D" },
    Spring: { water: "#9FD2F0", grass: "#8ACB62", blossom: "#FFF4E0" },
  },
};

// ---- colour helpers: brand colours are held inside a band where each material still reads as itself
function hexToHsl(hex, fb) {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || ""));
  const n = parseInt(m ? m[1] : fb.slice(1), 16);
  const r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
  let h = 0, s = 0;
  if (d > 1e-6) {
    s = d / (1 - Math.abs(2 * l - 1));
    if (mx === r) h = 60 * (((g - b) / d) % 6);
    else if (mx === g) h = 60 * ((b - r) / d + 2);
    else h = 60 * ((r - g) / d + 4);
  }
  return [(h + 360) % 360, s, l];
}
function hslToHex(h, s, l) {
  h = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = l - c / 2;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  const t = (v) => Math.round(Math.max(0, Math.min(1, v + m)) * 255).toString(16).padStart(2, "0");
  return "#" + t(r) + t(g) + t(b);
}
function band(hex, fb, hMin, hMax, sMin, sMax, lMin, lMax) {
  let [h, s, l] = hexToHsl(hex, fb);
  if (h < hMin || h > hMax) {
    const dA = Math.min(Math.abs(h - hMin), 360 - Math.abs(h - hMin));
    const dB = Math.min(Math.abs(h - hMax), 360 - Math.abs(h - hMax));
    h = dA <= dB ? hMin : hMax;
  }
  return hslToHex(h, Math.max(sMin, Math.min(sMax, s)), Math.max(lMin, Math.min(lMax, l)));
}
function flowerTone(hex, fb) {
  let [h, s, l] = hexToHsl(hex, fb);
  if (h > 70 && h < 170 && s > 0.15) l = Math.max(l, 0.84); // green flowers would vanish on green pads
  return hslToHex(h, Math.min(0.85, s), Math.max(0.55, Math.min(0.88, l)));
}

export function build(p) {
  const parts = [];
  const r3 = (v) => Math.round(v * 1000) / 1000;
  const box = (x, y, z, w, h, d, c, e) =>
    parts.push({ t: "box", p: [r3(x), r3(y), r3(z)], s: [r3(w), r3(h), r3(d)], c, ...(e ? { e: true } : {}) });
  const cyl = (cx, y, cz, r, h, c, n) => parts.push({ t: "cyl", p: [r3(cx), r3(y), r3(cz)], r, h: r3(h), c, n });
  const hash = (a, b, c = 0) => {
    let h = (a * 73856093) ^ (b * 19349663) ^ (c * 83492791);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };

  // colours: water stays pale blue, grass stays green, flowers always pop against the pads
  const WATER = band(p.water, "#8FC3EA", 190, 225, 0.45, 0.68, 0.66, 0.78);
  const GRASS = band(p.grass, "#79B86A", 92, 130, 0.3, 0.45, 0.48, 0.6);
  const FLOWER = flowerTone(p.blossom, "#F7B8CF");
  const COPE = "#D9DCE1", CAP = "#E9EBEE", STONE = "#C6CBD2";
  const WOOD = "#8A6E52", WOOD_DARK = "#6E5640", PLANK = "#A3855F", PLANK2 = "#98794F";
  const PAD = "#5FA05A", REED = "#4F8A45", CATTAIL = "#6B4A2F", SUN = "#F2B33D", TUFT = "#5E9A52";
  const LIT = "#FFD58A", UNLIT = "#3A3F4A", METAL = "#5B6270";

  // ---- grid and pond layout (all edges on the 0.5 m cell grid)
  const C = 0.5, N = 12, EXT = 0.02;
  const G = 0.3, WT = 0.28, CT = 0.42, CW = 0.35, L = 0.04;
  const S = Math.max(3, Math.min(4.5, p.size));
  const W = S, Dd = S - 0.5;
  const x0 = Math.floor((6 - W) / 2 / C) * C, x1 = x0 + W;
  const z1 = 5, z0 = z1 - Dd;
  const ci0 = Math.round(x0 / C), ci1 = Math.round(x1 / C), ck0 = Math.round(z0 / C), ck1 = Math.round(z1 / C);
  const nz = ck1 - ck0;
  const isWater = (i, k) => i >= ci0 && i < ci1 && k >= ck0 && k < ck1;
  const isRing = (i, k) => !isWater(i, k) && i >= ci0 - 1 && i <= ci1 && k >= ck0 - 1 && k <= ck1;

  // ---- ground: grass and water cells, each overlapping its far neighbour slightly so no seams show
  for (let i = 0; i < N; i++) {
    for (let k = 0; k < N; k++) {
      const w = isWater(i, k);
      const ex = i + 1 < N && isWater(i + 1, k) === w ? EXT : 0;
      const ez = k + 1 < N && isWater(i, k + 1) === w ? EXT : 0;
      box(i * C, 0, k * C, C + ex, w ? WT : G, C + ez, w ? WATER : GRASS);
    }
  }

  // ---- jetty layout (fixed columns, so it never wanders when the pond grows)
  const jc0 = 5, jx = jc0 * C, JW = 1.0;
  const jRows = Math.min(4, Math.max(3, Math.round(nz / 2)));
  const zEnd = (ck0 + jRows) * C;
  const DECK_B = 0.5, DECK_T = 0.57;
  const inJettyCols = (i) => i === jc0 || i === jc0 + 1;

  // ---- stone rim on all four sides, lipped 4 cm over the water, pillars at the corners
  for (let c = ci0; c < ci1; c++) {
    const gapHere = p.jetty && inJettyCols(c);
    const nextGap = p.jetty && inJettyCols(c + 1);
    if (!gapHere) box(c * C, G, z0 - CW, C + (c + 1 < ci1 && !nextGap ? EXT : 0), CT - G, CW + L, COPE);
    box(c * C, G, z1 - L, C + (c + 1 < ci1 ? EXT : 0), CT - G, CW + L, COPE);
  }
  for (let r = ck0; r < ck1; r++) {
    const ez = r + 1 < ck1 ? EXT : 0;
    box(x0 - CW, G, r * C, CW + L, CT - G, C + ez, COPE);
    box(x1 - L, G, r * C, CW + L, CT - G, C + ez, COPE);
  }
  for (const [cx, cz] of [[x0 - CW, z0 - CW], [x1, z0 - CW], [x0 - CW, z1], [x1, z1]])
    box(cx, G, cz, CW, 0.16, CW, CAP);

  // ---- lantern head: warm glass when lit, dark when off
  const lantern = (cx, y, cz) => {
    box(cx - 0.13, y, cz - 0.13, 0.26, 0.04, 0.26, METAL);
    box(cx - 0.11, y + 0.04, cz - 0.11, 0.22, 0.28, 0.22, p.lights ? LIT : UNLIT, p.lights);
    box(cx - 0.16, y + 0.32, cz - 0.16, 0.32, 0.06, 0.32, METAL);
    box(cx - 0.05, y + 0.38, cz - 0.05, 0.1, 0.08, 0.1, METAL);
  };

  if (p.jetty) {
    // timber abutment on the bank replaces the rim where the jetty lands
    box(jx, G, z0 - C, C + EXT, DECK_B - G, C, WOOD_DARK);
    box(jx + C, G, z0 - C, C, DECK_B - G, C, WOOD_DARK);
    // side beams and piles, one segment per water cell
    for (let r = ck0; r < ck0 + jRows; r++) {
      const ez = r + 1 < ck0 + jRows ? EXT : 0;
      box(jx, 0.42, r * C, 0.08, DECK_B - 0.42, C + ez, WOOD_DARK);
      box(jx + JW - 0.08, 0.42, r * C, 0.08, DECK_B - 0.42, C + ez, WOOD_DARK);
      const pz = r * C + C - 0.12;
      cyl(jx + 0.05, WT, pz, 0.05, 0.42 - WT, WOOD, 8);
      cyl(jx + JW - 0.05, WT, pz, 0.05, 0.42 - WT, WOOD, 8);
    }
    // cross planks, two per cell row, split at the centre line so each sits in one cell
    for (let r = ck0 - 1; r < ck0 + jRows; r++) {
      [0.015, 0.265].forEach((o, q) => {
        const col = (r + q) % 2 ? PLANK2 : PLANK;
        box(jx, DECK_B, r * C + o, C - 0.015, DECK_T - DECK_B, 0.22, col);
        box(jx + C + 0.015, DECK_B, r * C + o, C - 0.015, DECK_T - DECK_B, 0.22, col);
      });
    }
    // mooring post and lantern post standing on the end plank
    cyl(jx + 0.12, DECK_T, zEnd - 0.125, 0.06, 0.25, WOOD, 8);
    const lx = jx + JW - 0.16, lz = zEnd - 0.125;
    cyl(lx, DECK_T, lz, 0.05, 0.8, WOOD, 8);
    lantern(lx, DECK_T + 0.8, lz);
  } else {
    // no jetty: the lantern stands on the front rim where the jetty would land
    const lx = jx + 0.75, lz = z0 - CW / 2 + L / 2;
    cyl(lx, CT, lz, 0.05, 0.7, WOOD, 8);
    lantern(lx, CT + 0.7, lz);
  }

  // ---- stepping stones from the street to the pond, one per cell, staggered
  for (let k = 0; k <= ck0 - 2; k++) {
    const col = jc0 + (k % 2);
    box(col * C + 0.07, G, k * C + 0.1, 0.36, 0.04, 0.3, STONE);
  }

  // ---- reed clumps: grow outward from the back-right corner along the two back edges only
  const reedCells = [];
  for (let i = ci0; i < ci1; i++) reedCells.push({ i, k: ck1 - 1, back: true, right: i === ci1 - 1 });
  for (let k = ck0; k < ck1 - 1; k++) reedCells.push({ i: ci1 - 1, k, back: false, right: true });
  reedCells.forEach((c) => {
    const d = (ci1 - 1 - c.i) + (ck1 - 1 - c.k);
    c.key = d * 2 + ((d % 2 === 0) === c.back ? 0 : 1);
  });
  reedCells.sort((a, b) => a.key - b.key);
  const stalks = [[-0.09, -0.02], [0.06, -0.08], [0.04, 0.09]];
  const nReeds = Math.min(p.reeds, reedCells.length);
  for (let n = 0; n < nReeds; n++) {
    const { i, k, back, right } = reedCells[n];
    const cx = i * C + 0.25 + (right ? 0.04 : 0), cz = k * C + 0.25 + (back ? 0.04 : 0);
    stalks.forEach(([ox, oz], s) => {
      const h = 0.72 + hash(i, k, s) * 0.32;
      box(cx + ox - 0.025, WT, cz + oz - 0.025, 0.05, h, 0.05, REED);
      if (s < 2) box(cx + ox - 0.045, WT + h, cz + oz - 0.045, 0.09, 0.2, 0.09, CATTAIL);
    });
  }

  // ---- lily pads: one per free water cell, clustered on the open left of the pond
  const padCells = [];
  const ccx = x0 + 0.9, ccz = z0 + Dd * 0.45;
  for (let i = ci0; i <= ci1 - 2; i++) {
    for (let k = ck0; k <= ck1 - 2; k++) {
      if (p.jetty && inJettyCols(i) && k < ck0 + jRows + 1) continue;
      if (!p.jetty && inJettyCols(i) && k === ck0) continue; // keep the lantern's view clear
      const cx = i * C + 0.25, cz = k * C + 0.25;
      padCells.push({ i, k, key: Math.hypot(cx - ccx, (cz - ccz) * 1.1) + hash(i, k, 7) * 0.35 });
    }
  }
  padCells.sort((a, b) => a.key - b.key);
  const nPads = Math.min(p.pads, padCells.length);
  for (let n = 0; n < nPads; n++) {
    const { i, k } = padCells[n];
    const nearJetty = k < ck0 + jRows + 1;
    let ox = (hash(i, k, 1) - 0.5) * 0.1;
    if (nearJetty && i === jc0 - 1) ox = -0.05;
    if (nearJetty && i === jc0 + 2) ox = 0.05;
    const oz = (hash(i, k, 2) - 0.5) * 0.1;
    const px = i * C + 0.25 + ox, pz = k * C + 0.25 + oz;
    const r = Math.round((0.15 + hash(i, k, 3) * 0.04) * 100) / 100;
    cyl(px, WT, pz, r, 0.03, PAD, 10);
    if (n % 2 === 0) {
      cyl(px, WT + 0.03, pz, 0.08, 0.07, FLOWER, 6);
      box(px - 0.03, WT + 0.1, pz - 0.03, 0.06, 0.04, 0.06, SUN);
    }
  }

  // ---- garden dressing on free grass cells: two low path lights and flower tufts
  const used = new Set();
  const free = (i, k) => i >= 0 && i < N && k >= 0 && k < N && !isWater(i, k) && !isRing(i, k) &&
    !(k <= ck0 - 2 && inJettyCols(i)) && !used.has(i * N + k);
  const inset = (i, k) => [i === 0 ? 0.06 : i === N - 1 ? -0.06 : 0, k === 0 ? 0.06 : k === N - 1 ? -0.08 : 0];
  const bollard = (i, k) => {
    if (!free(i, k)) return;
    used.add(i * N + k);
    const [ox, oz] = inset(i, k);
    const cx = i * C + 0.25 + ox, cz = k * C + 0.25 + oz;
    box(cx - 0.06, G, cz - 0.06, 0.12, 0.45, 0.12, METAL);
    box(cx - 0.09, G + 0.45, cz - 0.09, 0.18, 0.14, 0.18, p.lights ? LIT : UNLIT, p.lights);
    box(cx - 0.11, G + 0.59, cz - 0.11, 0.22, 0.04, 0.22, METAL);
  };
  bollard(2, ck0 - 2);
  bollard(ci1, ck1 + 1);
  for (const [i, k] of [[1, 11], [4, 11], [9, 0], [1, 2], [10, 3]]) {
    if (!free(i, k)) continue;
    used.add(i * N + k);
    const [ox, oz] = inset(i, k);
    const tx = i * C + 0.1 + ox, tz = k * C + 0.13 + oz;
    box(tx, G, tz, 0.3, 0.14, 0.24, TUFT);
    box(tx + 0.06, G + 0.14, tz + 0.04, 0.18, 0.08, 0.16, FLOWER);
  }

  return { parts };
}
