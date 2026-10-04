// Town Lighthouse: a striped lighthouse on a rocky base with a glowing lamp room. Block asset: build(p) returns
// parts in metres on the Oasis Town grid (origin at the footprint's corner, y up, street/sea side at z = 0).
export const meta = {
  title: "Town Lighthouse",
  kind: "3d",
  format: "blocks",
  kit: "Oasis Town",
  description: "A striped harbour lighthouse on a rocky outcrop, with a keeper's porch, a gallery and a lamp room that glows at night to mark the end of the town's pier.",
  tags: ["3d", "low poly", "lighthouse", "harbour", "coast", "landmark", "town", "kit"],
  price: 3,
  author: "oasis-factory",
  footprint: [4, 4],
  size: [1000, 1000],
};

export const params = {
  knobs: {
    stripeA: { type: "color", role: "primary", label: "Stripe colour", default: "#E5484D" },
    stripeB: { type: "color", role: "surface", label: "Base colour", default: "#F6EEE0" },
    cap: { type: "color", role: "ink", label: "Gallery & roof", default: "#5B6270" },
    height: { type: "range", label: "Height (m)", default: 11, min: 8, max: 14, step: 1 },
    stripes: { type: "range", label: "Stripes", default: 3, min: 2, max: 5, step: 1 },
    lights: { type: "toggle", label: "Lamp lit", default: true },
  },
  presets: {
    Harbour: { stripeA: "#3E7BFA", stripeB: "#F6EEE0", cap: "#2B3242" },
    Tram: { stripeA: "#2F7A55", stripeB: "#F3E3C8", cap: "#2E3B35" },
    Sunbeam: { stripeA: "#F2B33D", stripeB: "#F6EEE0", cap: "#C8553D" },
  },
};

function rgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function hex(r, g, b) {
  const h = (v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0");
  return "#" + h(r) + h(g) + h(b);
}
// Tonal variant: darken light colours, lighten dark ones, so trim survives any brand colour.
function shade(c, k) {
  const [r, g, b] = rgb(c);
  const L = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  if (L < 0.45) return hex(r + (255 - r) * k, g + (255 - g) * k, b + (255 - b) * k);
  return hex(r * (1 - k), g * (1 - k), b * (1 - k));
}

export function build(p) {
  const parts = [];
  const box = (x, y, z, w, h, d, c, e) => parts.push({ t: "box", p: [x, y, z], s: [w, h, d], c, ...(e ? { e: true } : {}) });
  const cyl = (cx, y, cz, r, h, c, n, e) => parts.push({ t: "cyl", p: [cx, y, cz], r, h, c, n: n || 10, ...(e ? { e: true } : {}) });
  const cone = (cx, y, cz, r, h, c, n) => parts.push({ t: "cone", p: [cx, y, cz], r, h, c, n: n || 10 });

  const CX = 2, CZ = 2;
  const lit = !!p.lights;
  const rockD = "#5F6670", rockM = "#7D848E", rockL = "#9AA1AA", leaf = "#79B86A";
  const wood = "#8A6E52", metal = "#8C929C", glass = "#7E93A8", kerb = "#D9DCE1";
  const capTrim = shade(p.cap, 0.3);
  const wallTrim = shade(p.stripeB, 0.22);

  // --- rocky outcrop: a low ledge with rounded, stacked boulders ------------------
  const ROCK = 0.45;
  box(0.25, 0, 0.25, 3.5, ROCK, 3.5, rockM);
  // [cx, cz, r, h, colour, sides, y]
  const boulders = [
    [0.7, 0.8, 0.6, 0.8, rockD, 7, 0],
    [3.25, 0.75, 0.6, 0.65, rockM, 6, 0],
    [0.65, 3.3, 0.65, 1.0, rockM, 7, 0],
    [3.3, 3.3, 0.65, 0.85, rockD, 6, 0],
    [2.1, 3.55, 0.42, 0.6, rockL, 6, 0],
    [0.35, 2.0, 0.35, 0.55, rockL, 6, 0],
    [3.65, 2.0, 0.32, 0.5, rockL, 6, 0],
    [0.6, 3.35, 0.38, 0.35, rockL, 6, 1.0],
    [3.35, 3.35, 0.32, 0.3, rockM, 6, 0.85],
    [0.75, 0.8, 0.3, 0.22, rockM, 6, 0.8],
  ];
  for (const [cx, cz, r, h, c, n, y] of boulders) cyl(cx, y, cz, r, h, c, n);
  // moss tufts sitting on boulder tops
  cyl(0.6, 1.35, 3.35, 0.22, 0.07, leaf, 6);
  cyl(3.25, 0.65, 0.75, 0.24, 0.07, leaf, 6);
  cyl(2.1, 0.6, 3.55, 0.2, 0.06, leaf, 6);
  // steps up the rock to the porch
  box(1.5, 0, 0.0, 1.0, 0.22, 0.55, kerb);
  box(1.5, 0.22, 0.25, 1.0, 0.23, 0.3, kerb);
  // stone plinth the tower stands on
  const BASE = 1.1;
  cyl(CX, ROCK, CZ, 1.45, BASE - ROCK, kerb, 12);

  // --- tower: alternating tapered bands -------------------------------------------
  const TOP = 3.1; // deck + parapet + lamp room + roof + finial
  const H = p.height;
  const Ht = H - BASE - TOP;
  const R0 = 1.1, R1 = 0.75;
  const bands = p.stripes * 2;
  const bh = Ht / bands;
  const radiusAt = (i) => R0 - (R0 - R1) * (i / (bands - 1));
  for (let i = 0; i < bands; i++) {
    cyl(CX, BASE + i * bh, CZ, radiusAt(i), bh, i % 2 ? p.stripeB : p.stripeA, 10);
  }
  const Ytop = BASE + Ht;

  // --- keeper's porch on the front ------------------------------------------------
  const vz = 0.55;
  box(1.4, ROCK, vz, 1.2, 2.3, 1.05, p.stripeB);
  parts.push({ t: "gable", p: [1.3, ROCK + 2.3, vz - 0.1], s: [1.4, 0.6, 1.2], c: p.cap, axis: "z" });
  box(1.5, ROCK, vz - 0.03, 1.0, 2.06, 0.03, wallTrim); // door frame
  box(1.55, ROCK, vz - 0.05, 0.9, 2.0, 0.03, wood); // door
  box(2.3, ROCK + 0.95, vz - 0.08, 0.06, 0.12, 0.03, metal); // handle
  box(1.92, ROCK + 2.08, vz - 0.06, 0.16, 0.16, 0.06, lit ? "#FFD58A" : "#C9CED6", lit); // door lamp

  // --- stair windows on the front, only where they fit the shaft -------------------
  for (let y = 3.7; y + 0.6 < Ytop - 0.35; y += 2.4) {
    const i = Math.max(0, Math.min(bands - 1, Math.floor((y - BASE) / bh)));
    const r = radiusAt(i);
    box(CX - 0.18, y, CZ - r - 0.04, 0.36, 0.6, r * 0.12 + 0.04, lit ? "#FFD58A" : glass, lit);
    box(CX - 0.24, y - 0.08, CZ - r - 0.08, 0.48, 0.08, r * 0.12 + 0.08, p.cap); // sill
  }

  // --- gallery: corbel, deck and a clean solid parapet ------------------------------
  const RG = R1 + 0.35;
  cyl(CX, Ytop - 0.15, CZ, RG - 0.12, 0.15, capTrim, 10); // corbel
  cyl(CX, Ytop, CZ, RG, 0.15, p.cap, 12); // deck
  const yDeck = Ytop + 0.15;
  cyl(CX, yDeck, CZ, RG - 0.04, 0.32, p.cap, 12); // parapet
  cyl(CX, yDeck + 0.32, CZ, RG, 0.06, capTrim, 12); // hand rail

  // --- lamp room (the hero) ----------------------------------------------------------
  const RL = 0.72, RGl = 0.66;
  cyl(CX, yDeck, CZ, RL, 0.5, capTrim, 10); // sill wall, rises clear of the parapet
  const yGlass = yDeck + 0.5, GH = 1.15;
  cyl(CX, yGlass, CZ, RGl, GH, lit ? "#FFE7A3" : glass, 10, lit);
  // glazing bars proud of the glass on the visible faces
  box(CX - 0.03, yGlass, CZ - RGl - 0.04, 0.06, GH, 0.14, p.cap);
  box(CX - RGl - 0.04, yGlass, CZ - 0.03, 0.14, GH, 0.06, p.cap);
  box(CX + RGl - 0.1, yGlass, CZ - 0.03, 0.14, GH, 0.06, p.cap);
  for (const sx of [-1, 1]) {
    const bx = CX + sx * RGl * 0.707, bz = CZ - RGl * 0.707;
    box(bx - 0.05, yGlass, bz - 0.05, 0.1, GH, 0.1, p.cap);
  }

  // --- roof and finial ----------------------------------------------------------------
  const yRim = yGlass + GH;
  cyl(CX, yRim, CZ, RL + 0.1, 0.12, p.cap, 10);
  cone(CX, yRim + 0.12, CZ, RL + 0.06, 0.85, p.cap, 10);
  const yVent = yRim + 0.12 + 0.75;
  cyl(CX, yVent, CZ, 0.15, 0.2, metal, 8);
  box(CX - 0.03, yVent + 0.2, CZ - 0.03, 0.06, 0.25, 0.06, metal);

  return { parts };
}
