// Flower Cart: a two-wheeled florist's cart with a tiered flower display, a high striped canopy and a handle lantern. Block asset.
// Parts are in metres on the Oasis Town grid (origin at the footprint corner, y up, street side at z = 0).
export const meta = {
  title: "Flower Cart",
  kind: "3d",
  format: "blocks",
  kit: "Oasis Town",
  description: "A florist's hand cart with spoked wooden wheels, two tiers of flower buckets under a high striped canopy and a lantern on the push handle, sized to park beside a town shop or market stall.",
  tags: ["3d", "low poly", "flower cart", "florist", "flowers", "market", "street prop", "town", "kit"],
  price: 2,
  author: "oasis-factory",
  footprint: [2, 1.5],
  size: [900, 900],
};

export const params = {
  knobs: {
    cart: { type: "color", role: "primary", label: "Cart", default: "#2F7A55" },
    canopy: { type: "color", role: "secondary", label: "Canopy", default: "#E5484D" },
    bucket: { type: "color", role: "surface", label: "Buckets", default: "#D8DEE3" },
    seed: { type: "range", label: "Flower mix", default: 7, min: 1, max: 99, step: 1 },
    buckets: { type: "range", label: "Buckets", default: 6, min: 3, max: 8, step: 1 },
    roof: { type: "choice", label: "Canopy", default: "striped", options: ["striped", "gable", "none"] },
    lights: { type: "toggle", label: "Lantern lit", default: true },
  },
  presets: {
    Blossom: { cart: "#C8553D", canopy: "#D9668C", bucket: "#F6EEE0" },
    Harbour: { cart: "#2F5E9E", canopy: "#F2B33D", bucket: "#D8DEE3" },
    Lavender: { cart: "#6B5B95", canopy: "#2F7A55", bucket: "#F3E3C8" },
  },
};

export function build(p) {
  const parts = [];
  const box = (x, y, z, w, h, d, c, e) => parts.push({ t: "box", p: [x, y, z], s: [w, h, d], c, ...(e ? { e: true } : {}) });
  const cyl = (cx, y, cz, r, h, c, n) => parts.push({ t: "cyl", p: [cx, y, cz], r, h, c, n: n || 10 });

  // ---- colour handling: brand hue passes through, saturation and lightness are clamped per role ----
  const rgb = (hex) => {
    const v = parseInt(String(hex).replace("#", ""), 16) || 0;
    return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
  };
  const toHsl = (hex) => {
    const [R, G, B] = rgb(hex), r = R / 255, g = G / 255, b = B / 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
    let h = 0, s = 0;
    if (mx !== mn) {
      const d = mx - mn;
      s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
      h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
      h /= 6;
    }
    return [h, s, l];
  };
  const toHex = (h, s, l) => {
    const f = (n) => {
      const k = (n + h * 12) % 12, a = s * Math.min(l, 1 - l);
      const c = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
      return Math.round(c * 255).toString(16).padStart(2, "0");
    };
    return "#" + f(0) + f(8) + f(4);
  };
  const tone = (hex, sMax, lMin, lMax, dl) => {
    const [h, s, l] = toHsl(hex);
    return toHex(h, Math.min(s, sMax), Math.max(lMin, Math.min(lMax, l + (dl || 0))));
  };
  const dist = (a, b) => {
    const A = rgb(a), B = rgb(b);
    return Math.hypot(A[0] - B[0], A[1] - B[1], A[2] - B[2]);
  };

  // Cart keeps a dark brand dark (and tames neon); buckets always stay a light enamel.
  const CART = tone(p.cart, 0.55, 0.22, 0.48);
  const CANOPY = tone(p.canopy, 0.72, 0.32, 0.6);
  const BUCKET = tone(p.bucket, 0.3, 0.7, 0.9);
  const BUCKET_RIM = tone(BUCKET, 0.3, 0.52, 0.76, -0.14);

  const WOOD = "#8A6E52", WOOD_DK = "#6E5640", TYRE = "#3B3F48", LEAF = "#79B86A", STEM = "#4E8F4A";
  const INK = "#5B6270", CREAM = "#F6EEE0", LIT = "#FFD58A", GLASS = "#7E93A8", WHITE = "#FBFBFB";

  // ---- cart bed: the single anchor for everything ----
  const BX0 = 0.15, BX1 = 1.72, BZ0 = 0.22, BZ1 = 1.22;
  const BW = BX1 - BX0, BD = BZ1 - BZ0;
  const BED_Y = 0.5, BED_H = 0.35, TOP = BED_Y + BED_H; // counter height 0.85 m
  box(BX0, BED_Y, BZ0, BW, BED_H, BD, CART);
  box(BX0, TOP - 0.05, BZ0 - 0.03, BW, 0.06, 0.03, WOOD); // front top rim

  // ---- wheels: wooden spoked discs with dark tyres, joined by an axle ----
  const WR = 0.38, WCX = 0.62, WCY = WR;
  const disc = (cx, cy, r, z, d, c) => {
    box(cx - r, cy - r * 0.42, z, 2 * r, r * 0.84, d, c);
    box(cx - r * 0.42, cy - r, z, r * 0.84, 2 * r, d, c);
    box(cx - r * 0.8, cy - r * 0.8, z, r * 1.6, r * 1.6, d, c);
  };
  const wheel = (zIn, dir) => {
    const z0 = dir < 0 ? zIn - 0.1 : zIn;
    disc(WCX, WCY, WR, z0, 0.1, TYRE);
    const outer = dir < 0 ? z0 - 0.02 : z0 + 0.1;
    disc(WCX, WCY, WR * 0.74, outer, 0.02, WOOD);
    const sz = dir < 0 ? outer - 0.01 : outer + 0.02;
    box(WCX - WR * 0.7, WCY - 0.03, sz, WR * 1.4, 0.06, 0.01, WOOD_DK);
    box(WCX - 0.03, WCY - WR * 0.7, sz, 0.06, WR * 1.4, 0.01, WOOD_DK);
    const hz = dir < 0 ? sz - 0.03 : sz + 0.01;
    box(WCX - 0.07, WCY - 0.07, hz, 0.14, 0.14, 0.03, CART);
    const inner = dir < 0 ? z0 + 0.1 : z0 - 0.02;
    disc(WCX, WCY, WR * 0.74, inner, 0.02, WOOD);
  };
  wheel(BZ0, -1);
  wheel(BZ1, 1);
  box(WCX - 0.04, WCY - 0.04, BZ0, 0.08, 0.08, BD, INK); // axle under the bed

  // ---- stand at the handle end: two legs, feet and a cross brace ----
  const LX = 1.46;
  for (const lz of [BZ0 + 0.04, BZ1 - 0.12]) {
    box(LX, 0, lz, 0.08, BED_Y, 0.08, WOOD);
    box(LX - 0.03, 0, lz - 0.03, 0.14, 0.05, 0.14, WOOD_DK);
  }
  box(LX + 0.01, 0.18, BZ0 + 0.12, 0.06, 0.07, BD - 0.24, WOOD);

  // ---- push handle ----
  const RY = 0.74, RH = 0.06;
  const railZ = [BZ0 + 0.08, BZ1 - 0.14];
  for (const rz of railZ) box(BX1, RY, rz, 0.23, RH, 0.06, WOOD);
  box(1.92, RY, railZ[0], 0.06, RH, railZ[1] + 0.06 - railZ[0], WOOD);

  // ---- florist's sign on the front face, clear of the wheel ----
  const SX0 = WCX + WR + 0.06, SX1 = BX1 - 0.06;
  const SY0 = BED_Y + 0.06, SY1 = TOP - 0.08;
  box(SX0, SY0, BZ0 - 0.04, SX1 - SX0, SY1 - SY0, 0.04, CREAM);
  const gx = (SX0 + SX1) / 2, gy = (SY0 + SY1) / 2, gz = BZ0 - 0.06;
  for (const [dx, dy] of [[-0.075, 0], [0.075, 0], [0, -0.075], [0, 0.075]]) box(gx + dx - 0.045, gy + dy - 0.045, gz, 0.09, 0.09, 0.02, "#E5484D");
  box(gx - 0.045, gy - 0.045, gz - 0.01, 0.09, 0.09, 0.03, "#F2B33D");

  // ---- tiered display: wooden riser at the back, buckets on a strict inset two-row grid ----
  const RISER = 0.25, RZ0 = BZ0 + BD / 2;
  box(BX0, TOP, RZ0, BW, RISER, BZ1 - RZ0, WOOD);
  box(BX0, TOP + RISER - 0.04, RZ0 - 0.03, BW, 0.04, 0.03, WOOD_DK); // step nosing

  const n = p.buckets;
  const backN = Math.ceil(n / 2), frontN = n - backN;
  const GX0 = BX0 + 0.12, GW = BW - 0.24; // inset keeps rims off the bed edge and clear of canopy posts
  const pitch = GW / 4; // fixed pitch: a bucket never grows or crowds as the count changes
  const slots = [];
  const row = (count, z, y, tier) => {
    const startX = GX0 + (GW - count * pitch) / 2 + pitch / 2;
    for (let i = 0; i < count; i++) slots.push([startX + i * pitch, y, z, tier]);
  };
  row(frontN, BZ0 + BD * 0.25, TOP, 0);
  row(backN, BZ0 + BD * 0.75, TOP + RISER, 1);

  // seed + colourway salt: each colourway gets its own mix, the seed reshuffles it
  let salt = 0;
  for (const ch of String(p.cart) + String(p.canopy) + String(p.bucket)) salt = (Math.imul(salt, 31) + ch.charCodeAt(0)) | 0;
  const hash = (i, k) => {
    let h = Math.imul((p.seed * 374761 + salt + i * 668265 + k * 2246822) | 0, 0x27d4eb2d) ^ 0x9e3779b9;
    h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
    return ((h ^ (h >>> 13)) >>> 0) / 4294967296;
  };

  // bloom palette, minus anything that would merge with the canopy or the cart body
  const BLOOMS = ["#F7B8CF", "#F2B33D", "#E5484D", "#9B7BD1", "#F08A4B", "#3E7BFA", "#D9468F"];
  let pal = BLOOMS.filter((c) => dist(c, CANOPY) >= 95 && dist(c, CART) >= 70);
  if (pal.length < 4) {
    pal = BLOOMS.slice().sort((a, b) => Math.min(dist(b, CANOPY), dist(b, CART)) - Math.min(dist(a, CANOPY), dist(a, CART))).slice(0, 4);
  }
  for (let j = pal.length - 1; j > 0; j--) {
    const r = Math.floor(hash(j, 5) * (j + 1));
    const t = pal[j]; pal[j] = pal[r]; pal[r] = t;
  }

  const BR = 0.12, BH = 0.24;
  slots.forEach(([cx, y, cz, tier], i) => {
    const bloom = pal[i % pal.length];
    cyl(cx, y, cz, BR, BH, BUCKET, 10);
    const top = y + BH;
    cyl(cx, top - 0.05, cz, BR + 0.02, 0.05, BUCKET_RIM, 10);
    cyl(cx, top, cz, BR + 0.005, 0.06, LEAF, 8);
    const lt = top + 0.06;
    const alt = hash(i, 2) < 0.5;
    if (tier === 0 && alt) {
      // posy: a dome of four heads and a crown (kept low so the back tier stays readable)
      for (const [dx, dz] of [[-0.06, -0.06], [0.06, -0.06], [-0.06, 0.06], [0.06, 0.06]]) box(cx + dx - 0.06, lt, cz + dz - 0.06, 0.12, 0.12, 0.12, bloom);
      box(cx - 0.065, lt + 0.09, cz - 0.065, 0.13, 0.11, 0.13, bloom);
    } else if (tier === 0) {
      // daisy: a flat cross of petals around a contrasting eye
      box(cx - 0.025, lt, cz - 0.025, 0.05, 0.06, 0.05, STEM);
      box(cx - 0.13, lt + 0.06, cz - 0.045, 0.26, 0.06, 0.09, bloom);
      box(cx - 0.045, lt + 0.06, cz - 0.13, 0.09, 0.06, 0.26, bloom);
      box(cx - 0.05, lt + 0.12, cz - 0.05, 0.1, 0.03, 0.1, bloom === "#F2B33D" ? WOOD_DK : "#F2B33D");
    } else if (alt) {
      // tulips: three stems at staggered heights
      for (const [dx, dz, sh] of [[-0.06, -0.01, 0.17], [0.06, -0.03, 0.24], [0, 0.06, 0.12]]) {
        box(cx + dx - 0.015, lt, cz + dz - 0.015, 0.03, sh, 0.03, STEM);
        box(cx + dx - 0.06, lt + sh, cz + dz - 0.06, 0.12, 0.12, 0.12, bloom);
      }
    } else {
      // lupin spike: a tapering stack of blooms
      box(cx - 0.02, lt, cz - 0.02, 0.04, 0.06, 0.04, STEM);
      let sy = lt + 0.06;
      for (const [w, h] of [[0.18, 0.12], [0.14, 0.11], [0.1, 0.1]]) {
        box(cx - w / 2, sy, cz - w / 2, w, h, w, bloom);
        sy += h;
      }
    }
  });

  // ---- high canopy: posts at the back corners, arms cantilever it forward with clear air above the flowers ----
  const CY = 2.6;
  if (p.roof !== "none") {
    const PZ = BZ1 - 0.06, base = TOP + RISER;
    const CX0 = 0.12, CW = BX1 + 0.03 - CX0, CZ0 = BZ0 + 0.28, CZ1 = BZ1 + 0.1, CD = CZ1 - CZ0;
    for (const px of [BX0, BX1 - 0.06]) {
      box(px, base, PZ, 0.06, CY - base, 0.06, WOOD);
      box(px, CY - 0.08, CZ0 + 0.06, 0.06, 0.08, PZ - CZ0 - 0.06, WOOD); // arm tucked under the canopy
    }
    if (p.roof === "striped") {
      const sN = 6, sw = CW / sN;
      for (let i = 0; i < sN; i++) {
        const c = i % 2 ? WHITE : CANOPY;
        box(CX0 + i * sw, CY, CZ0, sw, 0.12, CD, c);
        box(CX0 + i * sw, CY - 0.16, CZ0, sw, 0.16, 0.04, c); // valance
      }
    } else {
      box(CX0, CY, CZ0, CW, 0.06, CD, WOOD);
      box(CX0, CY - 0.1, CZ0, CW, 0.1, 0.04, WOOD);
      parts.push({ t: "gable", p: [CX0, CY + 0.06, CZ0], s: [CW, 0.45, CD], c: CANOPY, axis: "x" });
    }
  }

  // ---- lantern on the front handle rail, beyond the bed and far below the canopy ----
  const PX = 1.81, PZ = railZ[0], LY = 1.05;
  box(PX, RY + RH, PZ, 0.06, LY - (RY + RH), 0.06, INK);
  const lcx = PX + 0.03, lcz = PZ + 0.03;
  box(lcx - 0.1, LY, lcz - 0.1, 0.2, 0.04, 0.2, INK);
  box(lcx - 0.08, LY + 0.04, lcz - 0.08, 0.16, 0.2, 0.16, p.lights ? LIT : GLASS, p.lights);
  box(lcx - 0.11, LY + 0.24, lcz - 0.11, 0.22, 0.05, 0.22, INK);
  box(lcx - 0.03, LY + 0.29, lcz - 0.03, 0.06, 0.06, 0.06, INK);

  return { parts };
}
