// Lighthouse: a chunky striped lighthouse on a rocky crag or harbour quay, with a glowing lamp room. Block asset:
// build(p) returns parts in metres on the Oasis Town grid (origin at the footprint's corner, y up, street side at z = 0).
// The whole model always fills the same 4 x 4 x 14.45 m envelope. The height knob sets the lighthouse itself, and the
// crag below makes up the rest, so the kit scale never changes between knob values.
export const meta = {
  title: "Striped Lighthouse",
  kind: "3d",
  format: "blocks",
  kit: "Oasis Town",
  description: "A toy striped lighthouse with a keeper's door, gallery and glowing beamed lamp room, perched on a stepped rocky crag or harbour quay at the water's edge of a little town.",
  tags: ["3d", "low poly", "lighthouse", "harbour", "coast", "quay", "landmark", "town", "kit", "block"],
  price: 3,
  author: "oasis-factory",
  footprint: [4, 4],
  size: [1000, 1000],
};

export const params = {
  knobs: {
    stripe: { type: "color", role: "primary", label: "Stripes", default: "#E5484D" },
    band: { type: "color", role: "surface", label: "Bands & base", default: "#F6EEE0" },
    cap: { type: "color", role: "ink", label: "Cap & gallery", default: "#5B6270" },
    rock: { type: "color", role: "muted", label: "Rocks & quay", default: "#9AA0A8" },
    height: { type: "range", label: "Lighthouse height (m)", default: 12, min: 8, max: 14, step: 1 },
    stripes: { type: "range", label: "Stripes", default: 3, min: 2, max: 5, step: 1 },
    base: { type: "choice", label: "Base", default: "rocks", options: ["rocks", "quay"] },
    lights: { type: "toggle", label: "Lamp & windows lit", default: true },
  },
  presets: {
    Tram: { stripe: "#2F7A55", band: "#F3E3C8", cap: "#3B4A44", rock: "#A39C90" },
    Sky: { stripe: "#3E7BFA", band: "#F6EEE0", cap: "#2B3242", rock: "#8C929C" },
    Midnight: { stripe: "#2B3242", band: "#F2B33D", cap: "#1E2330", rock: "#6B7280" },
  },
};

const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const hex = (c) => "#" + c.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("").toUpperCase();
const lum = (h) => { const [r, g, b] = rgb(h); return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255; };
const mix = (h, t, k) => { const a = rgb(h), b = rgb(t); return hex(a.map((v, i) => v + (b[i] - v) * k)); };
const clampLum = (h, lo, hi) => {
  let c = h;
  for (let k = 0; k < 12 && lum(c) > hi; k++) c = mix(c, "#000000", 0.18);
  for (let k = 0; k < 12 && lum(c) < lo; k++) c = mix(c, "#FFFFFF", 0.18);
  return c;
};

export function build(p) {
  const parts = [];
  const box = (x, y, z, w, h, d, c, e) => parts.push({ t: "box", p: [x, y, z], s: [w, h, d], c, ...(e ? { e: true } : {}) });
  const cyl = (cx, y, cz, r, h, c, n, e) => parts.push({ t: "cyl", p: [cx, y, cz], r, h, c, n, ...(e ? { e: true } : {}) });
  const cone = (cx, y, cz, r, h, c, n) => parts.push({ t: "cone", p: [cx, y, cz], r, h, c, n });

  const CX = 2, CZ = 2;
  const lit = "#FFD58A", hot = "#FFF3CF", glass = "#7E93A8", kerb = "#D9DCE1", wood = "#8A6E52";
  const beamTones = ["#FFE3A0", "#FFEFC6", "#FFF7E4"]; // falls off towards the sky

  // ---- colour roles: same mapping for every brand, lightness clamped within each role ----
  const cap = clampLum(p.cap, 0.04, 0.4); // trim stays dark against the sky and the amber lamp
  const band = clampLum(p.band, 0.55, 0.96); // tower body stays light, so dark trim always reads as structure
  let stripe = clampLum(p.stripe, 0.08, 0.85);
  for (let k = 0; k < 10 && lum(band) - lum(stripe) < 0.25; k++) stripe = mix(stripe, "#000000", 0.2);
  const rock = clampLum(mix(p.rock, "#9AA0A8", 0.35), 0.28, 0.7);
  const rockDark = mix(rock, "#000000", 0.2);
  const quay = p.base === "quay";

  // ---- fixed envelope: crag top GY + lighthouse height = 14.45 m at every setting ----
  const H = p.height, GY = 0.45 + (14 - H);

  // crag core plus a 0.5 m perimeter band. A stair climbs the band (right, back, then left side) and the rest is crag.
  box(0.5, 0, 0, 3, GY, 3.5, rock);
  const t = 3.5 / 8, u = 3 / 7, slots = [];
  for (let k = 0; k < 8; k++) slots.push([3.5, k * t, 0.5, t]);
  slots.push([3.5, 3.5, 0.5, 0.5]);
  for (let k = 0; k < 7; k++) slots.push([3.5 - (k + 1) * u, 3.5, u, 0.5]);
  slots.push([0, 3.5, 0.5, 0.5]);
  for (let k = 0; k < 8; k++) slots.push([0, 3.5 - (k + 1) * t, 0.5, t]);
  const N = Math.max(1, Math.ceil(GY / 0.28) - 1), rise = GY / (N + 1);
  slots.forEach(([x, z, w, d], i) => {
    if (i < N) box(x, 0, z, w, (i + 1) * rise, d, kerb); // stone steps
    else if (quay) box(x, 0, z, w, GY, d, rock);
    else box(x, 0, z, w, GY + ((i * 7) % 3) * 0.08, d, i % 2 ? rockDark : rock); // ragged rock rim
  });
  const zFree = N <= 16 ? 4 : 3.5 - (N - 17) * t; // left face that is crag, not stair

  if (quay) {
    for (let y = 0.6, s = 0; y < GY - 0.25; y += 0.6, s++) { // masonry courses
      box(0, y, -0.03, 3.5, 0.05, 0.04, rockDark);
      if (zFree > 0.4) box(-0.03, y, 0.05, 0.04, 0.05, zFree - 0.1, rockDark);
    }
    box(0, GY, 0, 3.5, 0.06, 0.15, kerb); // coping
    if (zFree > 0.3) box(0, GY, 0.15, 0.15, 0.06, zFree - 0.15, kerb);
    for (const [x, z] of [[0.35, 0.5], [3.3, 3.3]]) { // bollards on the quay top
      cyl(x, GY + (z < 1 ? 0.06 : 0), z, 0.13, 0.4, cap, 8);
      cyl(x, GY + (z < 1 ? 0.46 : 0.4), z, 0.18, 0.08, cap, 8);
    }
  } else {
    // boulders bedded into the foot of the crag and on its top corners
    cyl(1.0, 0, 0.42, 0.42, Math.min(GY + 0.2, 0.9), rockDark, 7);
    cyl(2.85, 0, 0.32, 0.32, Math.min(GY + 0.1, 0.6), rock, 6);
    cyl(0.85, GY, 0.4, 0.28, 0.32, rockDark, 6);
    cyl(3.25, GY, 3.25, 0.22, 0.3, rockDark, 6);
    cyl(0.75, GY, 3.25, 0.22, 0.38, rock, 5);
    for (let y = 1.2, s = 0; y < GY - 0.35; y += 1.15, s++) { // rock strata
      box(s % 2 ? 1.5 : 0.1, y, -0.04, s % 2 ? 1.9 : 2.2, 0.14, 0.06, rockDark);
      const zl = Math.min(zFree - 0.1, s % 2 ? 2.6 : 1.7);
      if (zl > 0.5) box(-0.04, y + 0.4, 0.1, 0.06, 0.14, zl - 0.1, rockDark);
    }
  }
  if (14 - H >= 1.5) { // safety rail along the cliff-top landing
    const yR = GY + (quay ? 0.06 : 0);
    for (const x of [1.25, 1.98, 2.71, 3.38]) box(x, yR, 0.05, 0.07, 0.84, 0.07, cap);
    box(1.25, yR + 0.84, 0.05, 2.2, 0.07, 0.07, cap);
  }

  // ---- terrace, keeper's drum and door: the drum holds the door so no opening crosses a stripe ----
  cyl(CX, GY, CZ, 1.5, 0.25, kerb, 12);
  box(CX - 0.5, GY, 0.22, 1.0, 0.12, 0.36, kerb); // step up to the terrace
  const B0 = GY + 0.25, RD = 1.25, DRUM_H = 2.35;
  cyl(CX, B0, CZ, RD, DRUM_H, band, 12);
  cyl(CX, B0 + DRUM_H, CZ, 1.33, 0.12, cap, 12); // cornice
  const S0 = B0 + DRUM_H + 0.12;

  box(CX - 0.6, B0, CZ - RD - 0.12, 1.2, 2.2, 0.5, cap); // door surround
  box(CX - 0.45, B0, CZ - RD - 0.15, 0.9, 2.0, 0.5, wood); // door
  box(CX + 0.24, B0 + 0.95, CZ - RD - 0.19, 0.09, 0.09, 0.05, cap); // handle
  box(CX - 0.72, B0 + 2.2, CZ - RD - 0.3, 1.44, 0.1, 0.6, cap); // door hood

  // windows: a recessed glass panel between proud jambs, a head and a stone sill, all on one face
  const onFace = (side, lat, y, out, wl, h, c, e) => side === "front"
    ? box(CX + lat, y, CZ - out, wl, h, 0.45, c, e)
    : box(CX - out, y, CZ + lat, 0.45, h, wl, c, e);
  const windowAt = (side, yc, r, G) => {
    const on = p.lights;
    onFace(side, -0.16, yc - G / 2, r + 0.03, 0.32, G, on ? lit : glass, on);
    onFace(side, -0.23, yc - G / 2, r + 0.09, 0.07, G, cap);
    onFace(side, 0.16, yc - G / 2, r + 0.09, 0.07, G, cap);
    onFace(side, -0.25, yc + G / 2, r + 0.1, 0.5, 0.1, cap);
    onFace(side, -0.27, yc - G / 2 - 0.08, r + 0.13, 0.54, 0.08, kerb);
  };
  windowAt("left", B0 + 1.3, RD, 0.85); // keeper's room window

  // ---- lantern stack (fixed), the striped shaft fills the rest of the height ----
  const COLLAR = 0.45, DECK = 0.2, PED = 0.4, LAMP = 1.2, RING = 0.12, CAP = 0.9, TIP = 0.24;
  const sTop = GY + H - (COLLAR + DECK + PED + LAMP + RING + CAP + TIP);
  const rBot = 1.15, rTop = 0.92;
  const n = p.stripes * 2, segH = (sTop - S0) / n;
  const radAt = (i) => rBot - (rBot - rTop) * (i / (n - 1));
  for (let i = 0; i < n; i++) cyl(CX, S0 + i * segH, CZ, radAt(i), segH, i % 2 ? band : stripe, 12);

  // one window centred on every band except the top one (kept clean under the gallery), alternating faces
  const G = Math.max(0.38, Math.min(0.75, segH * 0.65));
  for (let i = 1, j = 0; i <= n - 3; i += 2, j++) {
    const yc = Math.max(S0 + (i + 0.5) * segH, S0 + G / 2 + 0.12);
    windowAt(j % 2 ? "left" : "front", yc, radAt(i), G);
  }

  // ---- corbelled collar ends the stripes cleanly, then the gallery deck and a dense railing ----
  cyl(CX, sTop, CZ, rTop + 0.08, 0.25, cap, 12);
  cyl(CX, sTop + 0.25, CZ, rTop + 0.28, 0.2, cap, 12);
  const yDeck0 = sTop + COLLAR, rDeck = 1.45;
  cyl(CX, yDeck0, CZ, rDeck, DECK, cap, 12);
  const yDeck = yDeck0 + DECK;
  for (let k = 0; k < 24; k++) {
    const a = (k / 24) * Math.PI * 2;
    cyl(CX + Math.cos(a) * (rDeck - 0.07), yDeck, CZ + Math.sin(a) * (rDeck - 0.07), 0.035, 0.5, cap, 6);
  }

  // ---- lamp room: glass drum, hot lens band and short light beams when lit ----
  cyl(CX, yDeck, CZ, 0.95, PED, cap, 10);
  const yLamp = yDeck + PED, RL = 0.82;
  cyl(CX, yLamp, CZ, RL, LAMP, p.lights ? lit : glass, 10, p.lights);
  if (p.lights) {
    cyl(CX, yLamp + 0.44, CZ, RL + 0.02, 0.32, hot, 10, true);
    const yMid = yLamp + LAMP / 2;
    for (const dir of [-1, 1]) {
      for (let s = 0; s < 3; s++) {
        const hs = 0.28 + s * 0.14;
        const x0 = dir < 0 ? CX - 0.7 - (s + 1) * 0.36 - (s ? 0 : 0.12) : CX + 0.7 + s * 0.36 + (s ? 0.12 : 0);
        box(x0, yMid - hs / 2, CZ - hs / 2, s ? 0.36 : 0.48, hs, hs, beamTones[s], true);
      }
    }
  }
  for (let k = 0; k < 4; k++) { // mullions on the diagonals, clear of the beams
    const a = (k / 4) * Math.PI * 2 + Math.PI / 4;
    box(CX + Math.cos(a) * 0.8 - 0.045, yLamp, CZ + Math.sin(a) * 0.8 - 0.045, 0.09, LAMP, 0.09, cap);
  }
  const yRing = yLamp + LAMP;
  cyl(CX, yRing, CZ, 0.95, RING, cap, 10);

  // ---- cap and finial ----
  const yCap = yRing + RING;
  cone(CX, yCap, CZ, 1.1, CAP, cap, 10);
  cyl(CX, yCap + CAP - 0.08, CZ, 0.08, 0.2, cap, 8);
  cyl(CX, yCap + CAP + 0.12, CZ, 0.16, 0.12, p.lights ? lit : cap, 8, p.lights);

  return { parts };
}
