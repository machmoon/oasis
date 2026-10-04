// Town Bakery: a corner bakery with a single-storey shopfront. A giant 3D loaf stands on a painted sign
// plinth on the shop roof, a sloped striped awning runs the full width over a bay window of bread, and the
// flats above have a brick oven chimney. Block asset: build(p) returns parts in metres on the Oasis Town grid
// (origin at the footprint's corner, y up, street side at z = 0). It shares the Town Shop's 3.1 m ground
// floor, 2.6 m storeys and 5 m frontage, so the two pieces sit side by side on the 6 m grid.
export const meta = {
  title: "Town Bakery",
  kind: "3d",
  format: "blocks",
  kit: "Oasis Town",
  description: "A corner bakery with a giant loaf sign on its shop roof, a striped awning over a bay window full of bread and an oven chimney, with flats above that match the Town Shop.",
  tags: ["3d", "low poly", "building", "bakery", "bread", "shop", "town", "kit"],
  price: 3,
  author: "oasis-factory",
  footprint: [6, 6],
  size: [1000, 1000],
};

export const params = {
  knobs: {
    wall: { type: "color", role: "surface", label: "Walls", default: "#F3E3C8" },
    awning: { type: "color", role: "primary", label: "Awning", default: "#E5484D" },
    sign: { type: "color", role: "highlight", label: "Sign board", default: "#F2B33D" },
    floors: { type: "range", label: "Floors", default: 2, min: 1, max: 3, step: 1 },
    chimney: { type: "toggle", label: "Oven chimney", default: true },
    lights: { type: "toggle", label: "Lit windows & sign", default: true },
  },
  presets: {
    Pistachio: { wall: "#F6EEE0", awning: "#2F7A55", sign: "#F7B8CF" },
    Blueberry: { wall: "#D8DEE3", awning: "#3E7BFA", sign: "#F2B33D" },
    Rye: { wall: "#EAD9C6", awning: "#7A3E2E", sign: "#79B86A" },
  },
};

// Colour helpers. Brand inputs are clamped so no probe goes black, neon or unreadable.
const toRgb = (c) => {
  const s = typeof c === "string" && /^#[0-9a-fA-F]{6}$/.test(c) ? c : "#808080";
  return [1, 3, 5].map((i) => parseInt(s.slice(i, i + 2), 16));
};
const toHex = (r) => "#" + r.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("").toUpperCase();
const mix = (a, b, t) => { const A = toRgb(a), B = toRgb(b); return toHex(A.map((v, i) => v + (B[i] - v) * t)); };
const hsl = (c) => {
  const [r, g, b] = toRgb(c).map((v) => v / 255);
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
  let h = 0, s = 0;
  if (d > 0) {
    s = d / (1 - Math.abs(2 * l - 1));
    if (mx === r) h = ((g - b) / d + 6) % 6; else if (mx === g) h = (b - r) / d + 2; else h = (r - g) / d + 4;
    h *= 60;
  }
  return [h, s, l];
};
const fromHsl = (h, s, l) => {
  const C = (1 - Math.abs(2 * l - 1)) * s, X = C * (1 - Math.abs(((h / 60) % 2) - 1)), m = l - C / 2;
  const rgb = [[C, X, 0], [X, C, 0], [0, C, X], [0, X, C], [X, 0, C], [C, 0, X]][Math.floor(h / 60) % 6];
  return toHex(rgb.map((v) => (v + m) * 255));
};
const tame = (c, lo, hi, smax) => { const [h, s, l] = hsl(c); return fromHsl(h, Math.min(s, smax), Math.max(lo, Math.min(hi, l))); };

export function build(p) {
  const parts = [];
  const box = (x, y, z, w, h, d, c, e) => parts.push({ t: "box", p: [x, y, z], s: [w, h, d], c, ...(e ? { e: true } : {}) });
  const cyl = (cx, y, cz, r, h, c, n, e) => parts.push({ t: "cyl", p: [cx, y, cz], r, h, c, n: n || 10, ...(e ? { e: true } : {}) });

  // Kit materials. These never take brand colours.
  const KERB = "#D9DCE1", LIP = "#C9CED6", ROOF = "#5B6270", WOOD = "#8A6E52", GLASS = "#7E93A8", LIT = "#FFD58A";
  const BRICK = "#C8553D", LEAF = "#79B86A", BLOSSOM = "#F7B8CF", WHITE = "#FBFBFB", METAL = "#C9CED6";
  const DARKWOOD = mix(WOOD, "#3A2A1C", 0.3);
  const CRUST = ["#C98A4B", "#E0B070", "#A8663A"];
  const LOAF = ["#A8643A", "#C98A4B", "#E0B070"], SCORE = "#F6E2B8";

  const on = !!p.lights;
  const glow = (c) => (on ? mix(c, LIT, 0.3) : c);   // night tone derived from each part's own hue

  // Brand-driven colours, clamped for legibility.
  const wallC = tame(p.wall, 0.45, 0.94, 0.7);
  const awnC = tame(p.awning, 0.34, 0.62, 0.8);
  const signC = tame(p.sign, 0.45, 0.8, 0.9);
  const wallShade = mix(wallC, "#5B4636", 0.2);
  const signInk = mix(signC, "#2E2018", 0.55);
  const signFace = on ? mix(signC, "#FFFFFF", 0.2) : signC;
  const shutterC = mix(awnC, ROOF, 0.45);

  // One shared frame. The shop is a one-storey block at the street, and the house with flats sits behind it.
  const W = 5, BASE = 0.1, GROUND = 3.1, FLOOR = 2.6;
  const x0 = (6 - W) / 2, zf = 1.2, zh = 2.6, D = 3.2;
  const shopTop = BASE + GROUND;
  const top = BASE + GROUND + (p.floors - 1) * FLOOR;

  // Pavement covers the whole tile around the building, with a kerb lip on the street edge.
  box(0, 0, 0, 6, BASE + 0.02, 0.15, LIP);
  box(0, 0, 0.15, 6, BASE, zf - 0.15, KERB);
  box(0, 0, zf, x0, BASE, 6 - zf, KERB);
  box(x0 + W, 0, zf, 6 - x0 - W, BASE, 6 - zf, KERB);
  box(x0, 0, zh + D, W, BASE, 6 - zh - D, KERB);

  // Massing: shop block and house block, both solid from the ground.
  box(x0, 0, zf, W, shopTop, zh - zf, wallC);
  box(x0, 0, zh, W, top, D, wallC);
  box(x0 - 0.03, BASE, zf, 0.03, 0.3, zh + D - zf, wallShade);                 // side base course
  const cornBack = p.floors > 1 ? zh : zh - 0.22;                               // clears the 1-floor roof eave
  box(x0 - 0.08, shopTop, zf - 0.08, W + 0.16, 0.14, cornBack - (zf - 0.08), wallShade); // shop roof cap

  // ---------- fascia board over the awning ----------
  box(x0 + 0.1, 2.78, zf - 0.05, W - 0.2, 0.36, 0.05, signFace, on);
  box(x0 + 0.3, 2.92, zf - 0.08, W - 0.6, 0.08, 0.03, signInk);

  // ---------- giant loaf sign on the shop roof (the hero) ----------
  // Centred between the upper windows so nothing on the facade can overlap it at any floor count.
  const lcx = x0 + W / 2, lcz = zf + 0.6, yb = shopTop + 0.14;
  box(lcx - 1.3, yb, lcz - 0.55, 2.6, 0.24, 1.1, signFace, on);                // painted plinth
  box(lcx - 1.15, yb + 0.06, lcz - 0.58, 2.3, 0.12, 0.03, signInk);              // plinth inset band
  box(lcx - 1.32, yb + 0.24, lcz - 0.57, 2.64, 0.05, 1.14, signInk);             // cap
  const tier = (L, r, y, h, c) => {
    const st = L - 2 * r;
    box(lcx - st / 2, y, lcz - r, st, h, 2 * r, c, on);
    for (const s of [-1, 1]) cyl(lcx + s * st / 2, y, lcz, r, h, c, 12, on);
  };
  const y1 = yb + 0.29, h1 = 0.34, h2 = 0.22, h3 = 0.13;
  tier(2.3, 0.46, y1, h1, glow(LOAF[0]));                                         // crusty base
  tier(2.14, 0.38, y1 + h1, h2, glow(LOAF[1]));                                   // rising dome
  tier(1.86, 0.26, y1 + h1 + h2, h3, glow(LOAF[2]));                              // golden top
  const yt = y1 + h1 + h2 + h3;
  for (const dx of [-0.55, 0, 0.55]) {                                            // three slanted scores
    box(lcx + dx - 0.12, yt, lcz - 0.22, 0.16, 0.035, 0.22, glow(SCORE), on);
    box(lcx + dx + 0.02, yt, lcz, 0.16, 0.035, 0.22, glow(SCORE), on);
  }

  // ---------- door (front, left, clear of the bay so the camera sees it) ----------
  const dx0 = x0 + 0.4;
  box(dx0 - 0.08, BASE, zf - 0.04, 1.06, 2.12, 0.04, WOOD);
  box(dx0, BASE, zf - 0.07, 0.9, 2.05, 0.03, DARKWOOD);
  box(dx0 + 0.2, 1.2, zf - 0.1, 0.5, 0.65, 0.03, on ? LIT : GLASS, on);
  box(dx0 + 0.72, 1.0, zf - 0.1, 0.06, 0.18, 0.03, METAL);
  box(dx0 - 0.15, BASE, zf - 0.45, 1.2, 0.1, 0.38, KERB);

  // ---------- bay window of loaves (front, right) ----------
  const bx0 = x0 + 1.65, bx1 = x0 + 4.75, bz0 = zf - 0.65, sill = 0.7, bayTop = 2.0;
  const bw = bx1 - bx0, inX = bx0 + 0.12, inW = bw - 0.24;
  box(bx0, BASE, bz0, bw, sill - BASE, zf - bz0, WOOD);
  box(inX, sill, zf - 0.06, inW, bayTop - sill, 0.06, on ? LIT : GLASS, on);
  for (const px of [bx0, bx1 - 0.12]) box(px, sill, bz0, 0.12, bayTop - sill, 0.12, WOOD);
  for (const gx of [bx0 + 0.01, bx1 - 0.07]) box(gx, sill, bz0 + 0.12, 0.06, bayTop - sill, zf - bz0 - 0.18, GLASS);
  box(bx0 - 0.05, bayTop, bz0 - 0.05, bw + 0.1, 0.14, zf - bz0 + 0.05, WOOD);
  box(inX, sill, bz0 + 0.3, inW, 0.3, zf - 0.06 - (bz0 + 0.3), WOOD);           // display step
  const fs = inW / 4;
  for (let i = 0; i < 4; i++) {                                                   // front row on the sill
    const cx = inX + fs * (i + 0.5), col = CRUST[i % 3];
    if (i % 2 === 0) {
      cyl(cx, sill, bz0 + 0.15, 0.15, 0.12, col, 10);
      cyl(cx, sill + 0.12, bz0 + 0.15, 0.09, 0.06, mix(col, "#FFFFFF", 0.2), 10);
    } else {
      box(cx - 0.3, sill, bz0 + 0.07, 0.6, 0.11, 0.16, col);
      box(cx - 0.26, sill + 0.11, bz0 + 0.09, 0.52, 0.05, 0.12, mix(col, "#FFFFFF", 0.2));
    }
  }
  const bs = inW / 5, stepTop = sill + 0.3;
  for (let i = 0; i < 5; i++) {                                                   // tin loaves on the step
    const cx = inX + bs * (i + 0.5), col = CRUST[(i + 1) % 3];
    box(cx - 0.18, stepTop, bz0 + 0.36, 0.36, 0.18, 0.18, col);
    box(cx - 0.2, stepTop + 0.18, bz0 + 0.35, 0.4, 0.09, 0.2, mix(col, "#FFFFFF", 0.15));
  }
  box(bx0 + 0.07, 1.5, zf - 0.3, bw - 0.14, 0.05, 0.24, WOOD);                   // top shelf
  const rs = (bw - 0.14) / 6;
  for (let i = 0; i < 6; i++) cyl(bx0 + 0.07 + rs * (i + 0.5), 1.55, zf - 0.18, 0.11, 0.1, CRUST[(i + 2) % 3], 10);

  // ---------- sloped striped awning across the whole shopfront ----------
  // Each stripe is a gable with its ridge in the facade, so only the street slope shows. The underside
  // (2.3 m) clears the bay cap (2.14 m) and the door frame (2.22 m).
  const P = 0.95, ay = 2.3, AH = 0.4, stripes = 8, ax0 = x0 + 0.05, sw = (W - 0.1) / stripes;
  for (let i = 0; i < stripes; i++) {
    const c = i % 2 ? WHITE : awnC, sx = ax0 + i * sw;
    parts.push({ t: "gable", p: [sx, ay, zf - P], s: [sw, AH, 2 * P], c, axis: "x" });
    box(sx, ay - 0.22, zf - P - 0.03, sw, 0.24, 0.05, c);
    box(sx + sw * 0.25, ay - 0.3, zf - P - 0.03, sw * 0.5, 0.08, 0.05, c);
  }

  // ---------- side wall: bakehouse windows and a downpipe ----------
  box(x0 - 0.06, 0.9, zf + 0.25, 0.06, 1.2, 0.9, on ? LIT : GLASS, on);
  box(x0 - 0.09, 2.1, zf + 0.19, 0.09, 0.1, 1.02, wallShade);
  box(x0 - 0.06, 0.9, zh + 0.9, 0.06, 1.3, 1.4, on ? LIT : GLASS, on);
  box(x0 - 0.09, 2.2, zh + 0.84, 0.09, 0.1, 1.52, wallShade);
  box(x0 - 0.12, 0.8, zh + 0.84, 0.12, 0.1, 1.52, WOOD);
  box(x0 - 0.08, BASE + 0.3, zh + 0.02, 0.08, top - BASE - 0.3, 0.08, ROOF);

  // ---------- flats above: window boxes on odd floors, shutters on even floors ----------
  for (let f = 1; f < p.floors; f++) {
    const wy = BASE + GROUND + (f - 1) * FLOOR + 0.8;
    [0.25, W - 1.25].forEach((fx, i) => {
      const lit = on && (f * 5 + i * 3 + p.floors) % 5 !== 0;
      box(x0 + fx, wy, zh - 0.06, 1, 1.2, 0.06, lit ? LIT : GLASS, lit);
      box(x0 + fx - 0.06, wy + 1.2, zh - 0.08, 1.12, 0.1, 0.08, wallShade);
      if (f % 2 === 1) {
        box(x0 + fx - 0.05, wy - 0.25, zh - 0.24, 1.1, 0.2, 0.24, WOOD);
        for (let k = 0; k < 4; k++) box(x0 + fx + 0.04 + k * 0.25, wy - 0.05, zh - 0.2, 0.2, 0.12, 0.16, k % 2 ? LEAF : BLOSSOM);
      } else {
        for (const sx of [fx - 0.22, fx + 1.02]) box(x0 + sx, wy, zh - 0.05, 0.2, 1.2, 0.05, shutterC);
        box(x0 + fx - 0.05, wy - 0.1, zh - 0.12, 1.1, 0.1, 0.12, wallShade);
      }
    });
    [zh + 0.7, zh + 2.0].forEach((sz, i) => {
      const lit = on && (f + i + p.floors) % 3 !== 0;
      box(x0 - 0.06, wy, sz, 0.06, 1.2, 0.9, lit ? LIT : GLASS, lit);
      box(x0 - 0.09, wy + 1.2, sz - 0.06, 0.09, 0.1, 1.02, wallShade);
    });
  }

  // ---------- roof and chimney ----------
  parts.push({ t: "gable", p: [x0 - 0.2, top, zh - 0.2], s: [W + 0.4, 1.6, D + 0.4], c: ROOF, axis: "x" });
  if (p.chimney) {
    const cx = x0 + W - 1.4, cz = zh + D - 1.5, CH = 2.4;
    box(cx, top, cz, 0.7, CH, 0.7, BRICK);
    box(cx - 0.03, top + CH - 0.5, cz - 0.03, 0.76, 0.1, 0.76, mix(BRICK, "#3A2A1C", 0.25));
    box(cx - 0.08, top + CH, cz - 0.08, 0.86, 0.14, 0.86, ROOF);
    cyl(cx + 0.22, top + CH + 0.14, cz + 0.35, 0.1, 0.3, BRICK, 8);
    cyl(cx + 0.5, top + CH + 0.14, cz + 0.35, 0.1, 0.22, BRICK, 8);
  }
  return { parts };
}
