// Town Carousel: a fairground merry-go-round with a banded cone roof, a bulb-lit valance, a candy-striped centre
// pole and bold prancing horses on brass poles. Block asset: build(p) returns parts in metres on the Oasis Town
// grid (origin at the footprint's corner, y up, street side at z = 0).
export const meta = {
  title: "Town Carousel",
  kind: "3d",
  format: "blocks",
  kit: "Oasis Town",
  description: "A merry-go-round for the town square: a striped cone roof on a high bulb-lit canopy, a candy-striped centre pole and four to eight prancing white horses.",
  tags: ["3d", "low poly", "carousel", "merry-go-round", "fairground", "park", "plaza", "town", "kit"],
  price: 4,
  author: "oasis-factory",
  footprint: [6, 6],
  size: [1000, 1000],
};

export const params = {
  knobs: {
    roofA: { type: "color", role: "primary", label: "Roof stripe A", default: "#E5484D" },
    roofB: { type: "color", role: "secondary", label: "Roof stripe B", default: "#F6EEE0" },
    trim: { type: "color", role: "ink", label: "Platform & trim", default: "#2F7A55" },
    saddle: { type: "color", role: "highlight", label: "Saddles & pennant", default: "#F2B33D" },
    horses: { type: "range", label: "Horses", default: 6, min: 4, max: 8, step: 1 },
    peak: { type: "range", label: "Roof peak (m)", default: 2.2, min: 1.2, max: 3.8, step: 0.2 },
    bands: { type: "range", label: "Roof bands", default: 5, min: 3, max: 7, step: 1 },
    lights: { type: "toggle", label: "Bulb lights", default: true },
  },
  presets: {
    Seaside: { roofA: "#3E7BFA", roofB: "#F6EEE0", trim: "#5B6270", saddle: "#E5484D" },
    Blossom: { roofA: "#B8457A", roofB: "#F7B8CF", trim: "#3D2C4A", saddle: "#79B86A" },
    Tramline: { roofA: "#2F7A55", roofB: "#F3E3C8", trim: "#5B3A29", saddle: "#3E7BFA" },
  },
};

// ---- colour helpers: fit every brand colour into a luminance band for its role, so stripes always alternate
// dark/pale, structure is always dark against a pale canvas, and accents never wash out ----
function toHsl(hex) {
  const v = /^#?([0-9a-f]{6})$/i.exec(String(hex || ""));
  const n = v ? parseInt(v[1], 16) : 0x888888;
  const r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn, l = (mx + mn) / 2;
  let h = 0;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  if (d !== 0) {
    if (mx === r) h = ((g - b) / d) % 6;
    else if (mx === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return [h, Math.min(1, s), l];
}
function fromHsl(h, s, l) {
  const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const hx = (u) => Math.round(Math.max(0, Math.min(1, u + m)) * 255).toString(16).padStart(2, "0");
  return "#" + hx(r) + hx(g) + hx(b);
}
function lum(hex) {
  const n = parseInt(hex.slice(1), 16);
  const lin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
  return 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255);
}
function fit(hex, lo, hi, sMax) {
  const [h, s0] = toHsl(hex);
  const s = Math.min(s0, sMax);
  const c = fromHsl(h, s, toHsl(hex)[2]);
  const L = lum(c);
  if (L >= lo && L <= hi) return c;
  const target = L < lo ? lo : hi;
  let a = 0, b = 1;
  for (let i = 0; i < 22; i++) {
    const m = (a + b) / 2;
    if (lum(fromHsl(h, s, m)) < target) a = m; else b = m;
  }
  return fromHsl(h, s, (a + b) / 2);
}

export function build(p) {
  const parts = [];
  const box = (x, y, z, w, h, d, c, e) =>
    parts.push({ t: "box", p: [x, y, z], s: [w, h, d], c, ...(e ? { e: true } : {}) });
  const cyl = (cx, y, cz, r, h, c, n, e) =>
    parts.push({ t: "cyl", p: [cx, y, cz], r, h, c, n, ...(e ? { e: true } : {}) });
  const cone = (cx, y, cz, r, h, c, n) => parts.push({ t: "cone", p: [cx, y, cz], r, h, c, n });

  // role mapping: roof = primary (dark stripe) + secondary (pale stripe); structure = ink (always dark);
  // saddles, pennant and drum ring = highlight (mid-tone); horses, brass, glass and bulbs stay fixed materials
  const stripeA = fit(p.roofA, 0.07, 0.24, 0.85);
  const stripeB = fit(p.roofB, 0.6, 0.82, 0.55);
  const struct = fit(p.trim, 0.012, 0.07, 0.65);
  const deckC = fit(p.trim, 0.16, 0.22, 0.22);
  const accent = fit(p.saddle, 0.2, 0.5, 0.95);

  const CX = 3, CZ = 3;
  const lit = "#FFD58A", off = "#6E6A62", glass = "#7E93A8", brass = "#D9A93A";
  const kerb = "#D9DCE1", stone = "#8C929C", slate = "#3B4150", coat = "#FAF7F0";
  const on = !!p.lights;
  const bulb = on ? lit : off;

  // ---- base: mid-stone ring, dark skirt with bulbs, flat painted deck ----
  cyl(CX, 0, CZ, 2.98, 0.15, stone, 16);
  cyl(CX, 0.15, CZ, 2.72, 0.3, struct, 16);
  const DECK = 0.49;
  cyl(CX, 0.45, CZ, 2.6, 0.04, deckC, 16);
  for (let i = 0; i < 16; i++) {
    const a = ((i + 0.5) / 16) * Math.PI * 2;
    const bx = CX + Math.sin(a) * 2.72, bz = CZ - Math.cos(a) * 2.72;
    box(bx - 0.07, 0.25, bz - 0.07, 0.14, 0.12, 0.14, bulb, on);
  }
  // single entry tread, kept inside the ground ring (ring, tread and skirt make three even risers)
  box(2.6, 0.15, 0.14, 0.8, 0.17, 0.22, struct);
  box(2.6, 0.32, 0.14, 0.8, 0.03, 0.22, kerb);

  // ---- canopy levels ----
  const VAL_Y = 3.8, VAL_H = 0.5, ROOF_Y = VAL_Y + VAL_H;
  const R = 2.6, P = Math.max(1.2, Math.min(3.8, p.peak));
  const bands = Math.max(3, Math.min(7, Math.round(p.bands)));

  // ---- centre: dark drum with mirror band, highlight ring, candy-striped pole up to the canopy ----
  const DRUM = 1.3;
  cyl(CX, DECK, CZ, 0.62, DRUM - DECK, struct, 12);
  cyl(CX, 0.75, CZ, 0.65, 0.35, on ? lit : glass, 12, on);
  cyl(CX, DRUM, CZ, 0.68, 0.12, accent, 12);
  cyl(CX, DRUM + 0.12, CZ, 0.2, VAL_Y - DRUM - 0.12, brass, 10);
  for (let y = DRUM + 0.45; y + 0.18 < VAL_Y - 0.2; y += 0.55) cyl(CX, y, CZ, 0.23, 0.18, stripeA, 10);

  // ---- valance: dark foot ring, stripe-A skirt with bulbs, stripe-B band ----
  cyl(CX, VAL_Y, CZ, 2.4, VAL_H, stripeA, 12);
  cyl(CX, VAL_Y, CZ, 2.44, 0.08, struct, 12);
  cyl(CX, VAL_Y + 0.33, CZ, 2.43, 0.13, stripeB, 12);
  for (let i = 0; i < 16; i++) {
    const a = ((i + 0.5) / 16) * Math.PI * 2;
    const bx = CX + Math.sin(a) * 2.47, bz = CZ - Math.cos(a) * 2.47;
    box(bx - 0.08, VAL_Y + 0.12, bz - 0.08, 0.16, 0.16, 0.16, bulb, on);
  }

  // ---- banded cone roof: nested cones on one slope, each a little proud of the last ----
  for (let k = 0; k < bands; k++) {
    const rk = R * (1 - k / bands);
    const y = ROOF_Y + P * (1 - rk / R) + k * 0.04;
    cone(CX, y, CZ, rk, P * (rk / R), k % 2 ? stripeB : stripeA, 12);
  }

  // ---- finial: dark collar, brass mast, lamp ball, pennant in the highlight colour ----
  const TIP = ROOF_Y + P + (bands - 1) * 0.04;
  cyl(CX, TIP - 0.35, CZ, 0.16, 0.25, struct, 8);
  cyl(CX, TIP - 0.3, CZ, 0.07, 0.95, brass, 6);
  cyl(CX, TIP + 0.65, CZ, 0.17, 0.26, bulb, 8, on);
  box(CX + 0.07, TIP + 0.25, CZ - 0.02, 0.6, 0.34, 0.04, accent);

  // ---- horses: a square loop, one or two per side; the camera-facing sides fill first so the count reads ----
  const n = Math.max(4, Math.min(8, Math.round(p.horses)));
  const HS = 1.9, S = 0.85, SLOT = 0.8;
  const sides = [
    { x: CX, z: CZ - HS, tx: 1, tz: 0 }, // front (street)
    { x: CX + HS, z: CZ, tx: 0, tz: 1 }, // right
    { x: CX, z: CZ + HS, tx: -1, tz: 0 }, // back
    { x: CX - HS, z: CZ, tx: 0, tz: -1 }, // left
  ];
  const fillOrder = [0, 3, 1, 2];
  let idx = 0;
  for (let k = 0; k < 4; k++) {
    const two = fillOrder.indexOf(k) < n - 4;
    const sd = sides[k];
    const lx = sd.tz, lz = sd.tx; // lateral axis; every lateral detail is symmetric
    for (const along of two ? [-SLOT, SLOT] : [0]) {
      const px = sd.x + sd.tx * along, pz = sd.z + sd.tz * along;
      const y0 = DECK + 0.95 + (idx % 2 ? -0.15 : 0.15);
      const sad = idx % 2 ? stripeA : accent;
      // local box: a = along travel, b = lateral, y relative to body bottom; all scaled by S
      const hb = (a1, a2, y1, y2, b1, b2, col, e) => {
        const xa = px + (sd.tx * a1 + lx * b1) * S, xb = px + (sd.tx * a2 + lx * b2) * S;
        const za = pz + (sd.tz * a1 + lz * b1) * S, zb = pz + (sd.tz * a2 + lz * b2) * S;
        box(Math.min(xa, xb), y0 + y1 * S, Math.min(za, zb), Math.abs(xb - xa), (y2 - y1) * S, Math.abs(zb - za), col, e);
      };

      cyl(px, DECK, pz, 0.05, VAL_Y - DECK, brass, 6); // pole, deck to canopy
      box(px - 0.09, VAL_Y - 0.14, pz - 0.09, 0.18, 0.14, 0.18, bulb, on); // lamp crown under the canopy

      hb(-0.5, 0.5, 0, 0.42, -0.19, 0.19, coat); // body
      hb(0.3, 0.56, 0.3, 0.86, -0.13, 0.13, coat); // neck, upright
      hb(0.4, 0.88, 0.72, 0.98, -0.13, 0.13, coat); // head, pointing forward
      hb(0.84, 0.94, 0.72, 0.88, -0.11, 0.11, slate); // nose
      for (const b of [-1, 1]) hb(0.42, 0.52, 0.98, 1.12, b > 0 ? 0.04 : -0.12, b > 0 ? 0.12 : -0.04, coat); // ears
      hb(0.22, 0.32, 0.42, 1.04, -0.08, 0.08, slate); // mane down the back of the neck
      hb(-0.62, -0.5, 0.04, 0.38, -0.06, 0.06, slate); // tail root
      hb(-0.66, -0.56, -0.28, 0.06, -0.06, 0.06, slate); // tail fall
      hb(-0.2, 0.18, 0.42, 0.52, -0.21, 0.21, sad); // saddle
      hb(-0.18, 0.16, 0.08, 0.42, -0.22, 0.22, sad, on); // blanket: glows in its own hue at night
      for (const b of [-1, 1]) {
        const b1 = b > 0 ? 0.05 : -0.16, b2 = b > 0 ? 0.16 : -0.05;
        hb(0.3, 0.42, -0.22, 0.02, b1, b2, coat); // front leg, raised
        hb(0.42, 0.6, -0.22, -0.1, b1, b2, coat); // front cannon, tucked forward
        hb(0.6, 0.66, -0.23, -0.09, b1, b2, slate); // front hoof
        hb(-0.44, -0.3, -0.5, 0.02, b1, b2, coat); // rear leg
        hb(-0.45, -0.29, -0.5, -0.42, b1 - 0.01, b2 + 0.01, slate); // rear hoof
      }
      idx++;
    }
  }

  return { parts };
}
