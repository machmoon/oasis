// Town Pond: a 6 m grass tile with one recessed pond, lily pads, reed clumps and a little wooden jetty.
// Block asset: build(p) returns parts in metres on the Oasis Town grid (origin at the footprint corner, y up,
// street side at z = 0).
export const meta = {
  title: "Town Pond",
  kind: "3d",
  format: "blocks",
  kit: "Oasis Town",
  description: "A grassy 6 m park tile with a pale-blue pond set into its banks, lily pads, reed clumps and a little wooden jetty, ready to drop between the shops of a little town.",
  tags: ["3d", "low poly", "pond", "park", "water", "jetty", "lily pad", "reeds", "town", "kit"],
  price: 3,
  author: "oasis-factory",
  footprint: [6, 6],
  size: [1000, 1000],
};

export const params = {
  knobs: {
    water: { type: "color", role: "primary", label: "Water", default: "#8EC5F0" },
    grass: { type: "color", role: "surface", label: "Grass", default: "#79B86A" },
    wood: { type: "color", role: "secondary", label: "Jetty wood", default: "#8A6E52" },
    flower: { type: "color", role: "highlight", label: "Lily flowers", default: "#F7B8CF" },
    pads: { type: "range", label: "Lily pads", default: 5, min: 0, max: 8, step: 1 },
    reeds: { type: "range", label: "Reed clumps", default: 3, min: 0, max: 6, step: 1 },
    jetty: { type: "toggle", label: "Jetty", default: true },
  },
  presets: {
    Autumn: { water: "#7FB3C9", grass: "#B5A45A", wood: "#7A5236", flower: "#E5484D" },
    Moonlit: { water: "#6E8FC9", grass: "#3F7A5C", wood: "#5E5048", flower: "#FFFFFF" },
    Blossom: { water: "#B4DCF7", grass: "#A6D08A", wood: "#B08E66", flower: "#E5484D" },
  },
};

// --- colour helpers: brand colours pass their hue through, clamped into bands that keep each material readable ---
function toHsl(hex) {
  const n = parseInt(String(hex).slice(1), 16) || 0;
  const r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
  if (mx === mn) return [0, 0, l];
  const d = mx - mn;
  const s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
  const h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
}
function toHex(h, s, l) {
  const f = (k) => {
    const kk = (k + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    return Math.round(255 * (l - a * Math.max(-1, Math.min(kk - 3, 9 - kk, 1))));
  };
  return "#" + ((1 << 24) | (f(0) << 16) | (f(8) << 8) | f(4)).toString(16).slice(1).toUpperCase();
}
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
function clampHue(h, lo, hi) {
  if (h >= lo && h <= hi) return h;
  const dist = (a, b) => { const d = Math.abs(a - b) % 360; return Math.min(d, 360 - d); };
  return dist(h, lo) <= dist(h, hi) ? lo : hi;
}
function band(hex, hue, sat, lig) {
  const [h, s, l] = toHsl(hex);
  return toHex(clampHue(h, hue[0], hue[1]), clamp(s, sat[0], sat[1]), clamp(l, lig[0], lig[1]));
}

export function build(p) {
  const parts = [];
  const box = (x, y, z, w, h, d, c) => parts.push({ t: "box", p: [x, y, z], s: [w, h, d], c });
  const cyl = (x, y, z, r, h, c, n) => parts.push({ t: "cyl", p: [x, y, z], r, h, c, n: n || 10 });
  const cone = (x, y, z, r, h, c, n) => parts.push({ t: "cone", p: [x, y, z], r, h, c, n: n || 8 });

  // --- clamped palette: water stays a soft blue, grass green-to-olive, wood a muted brown ---
  const water = band(p.water, [195, 222], [0.35, 0.7], [0.6, 0.78]);
  const grass = band(p.grass, [55, 150], [0.28, 0.55], [0.3, 0.58]);
  const wood = band(p.wood, [22, 36], [0.2, 0.4], [0.3, 0.46]);
  const flower = band(p.flower, [0, 360], [0, 1], [0.55, 0.88]);
  const [gh, , gl] = toHsl(grass);
  const pad = toHex(gh, 0.45, clamp(gl - 0.14, 0.22, 0.36));     // always darker than grass, far darker than water
  const reed = toHex(gh, 0.42, clamp(gl - 0.08, 0.26, 0.45));
  const [wh, ws, wl] = toHsl(wood);
  const darkWood = toHex(wh, ws, wl - 0.1);
  const bank = "#CDB592", cattail = "#6B4A33";

  // --- tile: sandy bank body with a grass cap, framing a recessed pond ---
  const B = 0.24, G = 0.3;                 // bank top, grass top
  const BED = 0.08, WT = 0.14;             // pond bed top, water top (0.1 m of bank wall shows above the water)
  const P0 = 0.9, P1 = 5.1;                // pond opening, 0.9 m grass edge all round
  const ring = (x, z, w, d) => { box(x, 0, z, w, B, d, bank); box(x, B, z, w, G - B, d, grass); };
  ring(0, 0, 6, P0);                       // front bank
  ring(0, P1, 6, 6 - P1);                  // back bank
  ring(0, P0, P0, P1 - P0);                // left bank
  ring(P1, P0, 6 - P1, P1 - P0);           // right bank
  const C = 0.35;                          // softened pond corners
  for (const [cx, cz] of [[P0, P0], [P1 - C, P0], [P0, P1 - C], [P1 - C, P1 - C]]) ring(cx, cz, C, C);
  box(P0, 0, P0, P1 - P0, BED, P1 - P0, bank);                   // pond bed
  box(P0, BED, P0, P1 - P0, WT - BED, P1 - P0, water);           // one continuous thin water box

  // --- jetty geometry (shared so pads and reeds can keep clear of it) ---
  const jx = 3.5, jw = 0.9, jz0 = 0.35, jz1 = 2.5;

  // --- lily pads on fixed, spaced slots in open water: clear of each other, the jetty and the reed line ---
  const slots = [
    [2.2, 2.1, 0.42], [2.5, 3.4, 0.38], [3.6, 3.4, 0.36], [1.7, 1.45, 0.3],
    [3.0, 1.35, 0.32], [1.55, 3.0, 0.32], [4.0, 4.2, 0.3], [1.65, 4.1, 0.3],
  ];
  for (let i = 0; i < p.pads; i++) {
    const [x, z, r] = slots[i];
    cyl(x, WT, z, r, 0.04, pad, 10);
    if (i % 2 === 0) cone(x, WT + 0.04, z, 0.14, 0.17, flower, 6);
  }

  // --- reed clumps in the shallows along the far edges, so they never stand in front of the pads ---
  const reedSlots = [[1.5, 4.7], [4.55, 4.55], [3.05, 4.75], [4.75, 3.4], [2.25, 4.75], [4.75, 2.3]];
  const blades = [[-0.1, -0.04, 1.0], [0.03, 0.08, 1.3], [0.1, -0.07, 0.85], [-0.03, 0.12, 0.7]];
  for (let i = 0; i < p.reeds; i++) {
    const [x, z] = reedSlots[i];
    const k = 0.9 + 0.1 * (i % 3);
    for (const [dx, dz, h] of blades) box(x + dx - 0.04, WT, z + dz - 0.04, 0.08, h * k, 0.08, reed);
    for (const bi of [1, 2]) {
      const [dx, dz, h] = blades[bi];
      const top = WT + h * k;
      box(x + dx - 0.065, top - 0.18, z + dz - 0.065, 0.13, 0.26, 0.13, cattail);   // head sleeves the stem top
      box(x + dx - 0.015, top + 0.08, z + dz - 0.015, 0.03, 0.1, 0.03, reed);         // spike on the head
    }
  }

  // --- wooden jetty: a landing on the front bank and one solid deck out over the water ---
  if (p.jetty) {
    const dB = 0.38, dH = 0.08, dT = dB + dH;
    box(jx, G, jz0, jw, dB - G, P0 - jz0, darkWood);                       // landing sleeper on the grass
    for (const pz of [1.6, jz1 - 0.12]) for (const px of [jx + 0.12, jx + jw - 0.12]) {
      cyl(px, WT, pz, 0.07, dB - WT, darkWood, 6);                          // piles standing in the water
    }
    box(jx, dB, jz0, jw, dH, jz1 - jz0, wood);                             // continuous deck
    for (let z = jz0 + 0.3; z < jz1 - 0.2; z += 0.3) box(jx, dT, z, jw, 0.02, 0.04, darkWood); // plank lines
    for (const px of [jx + 0.1, jx + jw - 0.1]) cyl(px, dT, jz1 - 0.1, 0.06, 0.4, darkWood, 6); // mooring posts
  }

  return { parts };
}
