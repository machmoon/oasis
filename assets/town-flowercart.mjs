// Flower Cart: a little four-wheeled market cart with a low painted rail, two stepped rows of buckets heaped with
// daisies, tulips, roses and sunflowers, and a half awning hung with a lantern and festoon bulbs that glow at night.
// Block asset: build(p) returns parts in metres on the Oasis Town grid (origin at the footprint's corner, y up,
// street side at z = 0).
export const meta = {
  title: "Flower Cart",
  kind: "3d",
  format: "blocks",
  kit: "Oasis Town",
  description: "A street florist's cart on four spoked wheels, with rows of flower buckets on a stepped bed and a lantern for dusk. It sits on a pavement corner or beside the market stalls.",
  tags: ["3d", "low poly", "flower cart", "flowers", "florist", "market", "cart", "town"],
  price: 2,
  author: "oasis-factory",
  footprint: [2, 1.5],
  size: [900, 800],
};

export const params = {
  knobs: {
    cart: { type: "color", role: "surface", label: "Cart", default: "#2F7A55" },
    trim: { type: "color", role: "secondary", label: "Trim & sign", default: "#F6EEE0" },
    canopy: { type: "color", role: "primary", label: "Canopy & grip", default: "#E5484D" },
    top: { type: "choice", label: "Canopy", default: "awning", options: ["awning", "roof", "none"] },
    pots: { type: "choice", label: "Buckets", default: "zinc", options: ["zinc", "terracotta", "enamel"] },
    buckets: { type: "range", label: "Bucket count", default: 6, min: 3, max: 8, step: 1 },
    seed: { type: "range", label: "Flower mix (seed)", default: 7, min: 1, max: 99, step: 1 },
    lights: { type: "toggle", label: "Lantern lit", default: true },
  },
  presets: {
    Harbour: { cart: "#3E7BFA", trim: "#FBFBFB", canopy: "#F2B33D" },
    Blossom: { cart: "#C8553D", trim: "#F3E3C8", canopy: "#F7B8CF" },
    Slate: { cart: "#5B6270", trim: "#F3E3C8", canopy: "#79B86A" },
  },
};

export function build(p) {
  const parts = [];
  const box = (x, y, z, w, h, d, c, e) => parts.push({ t: "box", p: [x, y, z], s: [w, h, d], c, ...(e ? { e: true } : {}) });
  const cyl = (x, y, z, r, h, c, n) => parts.push({ t: "cyl", p: [x, y, z], r, h, c, n });
  const hash = (a, b) => {
    let x = Math.imul(a | 0, 374761393) ^ Math.imul((b | 0) + 1, 668265263);
    x = Math.imul(x ^ (x >>> 13), 1274126177);
    x ^= x >>> 16;
    return (x >>> 0) / 4294967296;
  };
  const darken = (hex, k) => {
    const v = parseInt(hex.slice(1), 16);
    const ch = (s) => Math.max(0, Math.min(255, Math.round(((v >> s) & 255) * k)));
    return "#" + [16, 8, 0].map((s) => ch(s).toString(16).padStart(2, "0")).join("");
  };
  const lum = (hex) => {
    const v = parseInt(hex.slice(1), 16);
    const f = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
    return 0.2126 * f((v >> 16) & 255) + 0.7152 * f((v >> 8) & 255) + 0.0722 * f(v & 255);
  };
  const ratio = (a, b) => { const A = lum(a), B = lum(b); return (Math.max(A, B) + 0.05) / (Math.min(A, B) + 0.05); };

  const WOOD = "#8A6E52", WOOD_D = "#6B5440", TYRE = "#4A4F5A", IRON = "#3B414C";
  const LEAF = "#79B86A", LEAF_D = "#5E9E52", SUN = "#F2B33D", SEEDS = "#6B4A2E";
  const lit = "#FFD58A", glass = "#7E93A8", on = !!p.lights;
  const POTS = { zinc: ["#AEB6BF", "#8C949E"], terracotta: ["#C8553D", "#8E3A28"], enamel: ["#3E7BFA", "#FBFBFB"] };
  const [potC, rimC] = POTS[p.pots] || POTS.zinc;
  // awning stripe partner: white if it contrasts with the canopy, else the cart colour, else a deep canopy shade
  const alt = ["#FBFBFB", p.cart, darken(p.canopy, 0.55)].find((c) => ratio(c, p.canopy) >= 1.7) || darken(p.canopy, 0.4);

  // ---- four spoked wheels, two on the street face so the cart reads as wheeled from the camera
  const disc = (cx, cy, R, z, d, c) => {
    for (let a = 5; a < 90; a += 10) {
      const hx = R * Math.cos((a * Math.PI) / 180), hy = R * Math.sin((a * Math.PI) / 180);
      box(cx - hx, cy - hy, z, 2 * hx, 2 * hy, d, c);
    }
  };
  const WR = 0.3, WY = WR;
  const wheel = (wx, front) => {
    disc(wx, WY, WR, front ? 0.1 : 1.32, 0.08, TYRE);
    disc(wx, WY, 0.23, front ? 0.07 : 1.4, 0.03, WOOD);
    const sz = front ? 0.05 : 1.43;
    box(wx - 0.025, WY - 0.22, sz, 0.05, 0.44, 0.02, WOOD_D);
    box(wx - 0.22, WY - 0.025, sz, 0.44, 0.05, 0.02, WOOD_D);
    box(wx - 0.06, WY - 0.06, front ? 0.03 : 1.45, 0.12, 0.12, 0.02, p.trim);
  };
  for (const wx of [0.48, 1.32]) {
    wheel(wx, true);
    wheel(wx, false);
    box(wx - 0.04, WY - 0.04, 0.18, 0.08, 0.08, 1.14, WOOD_D);         // axle
    box(wx - 0.06, 0.34, 0.3, 0.12, 0.16, 0.9, WOOD_D);                // bolster from axle to chassis
  }
  box(0.3, 0.5, 0.3, 1.2, 0.1, 0.9, WOOD_D);                           // chassis y 0.5..0.6

  // ---- bed with a LOW painted rail so every bucket shows above it
  box(0.15, 0.6, 0.22, 1.5, 0.1, 1.06, WOOD);                          // floor y 0.6..0.7
  const PY = 0.7, PH = 0.1;
  box(0.15, PY, 0.22, 1.5, PH, 0.08, p.cart);
  box(0.15, PY, 1.2, 1.5, PH, 0.08, p.cart);
  box(0.15, PY, 0.3, 0.08, PH, 0.9, p.cart);
  box(1.57, PY, 0.3, 0.08, PH, 0.9, p.cart);
  const CY = PY + PH;                                                  // caps y 0.8..0.84
  box(0.13, CY, 0.2, 1.54, 0.04, 0.12, p.trim);
  box(0.13, CY, 1.18, 1.54, 0.04, 0.12, p.trim);
  box(0.13, CY, 0.32, 0.12, 0.04, 0.86, p.trim);
  box(1.55, CY, 0.32, 0.12, 0.04, 0.86, p.trim);
  const CTOP = CY + 0.04;

  // ---- push handles with a painted grip
  for (const z of [0.3, 1.12]) box(1.65, 0.74, z, 0.35, 0.06, 0.08, p.cart);
  box(1.92, 0.73, 0.38, 0.08, 0.08, 0.74, p.canopy);

  // ---- stepped display: back row stands on a wooden riser
  const RISE = 0.22;
  box(0.23, PY, 0.75, 1.34, RISE, 0.45, WOOD);                         // riser y 0.7..0.92

  // ---- buckets: laid out in two rows inside the bed with a clear inset from rails, posts and the riser
  const FL = ["#F7B8CF", "#E5484D", "#F2B33D", "#9B7FD1", "#F08A4B", "#FF6FA0", "#FBFBFB", "#C23B6E"];
  const n = Math.max(3, Math.min(8, Math.round(p.buckets)));
  const backN = Math.ceil(n / 2), frontN = n - backN;
  const XA = 0.3, XW = 1.2, BH = 0.28;                                 // usable x 0.30..1.50
  const s = p.seed | 0;
  const slots = [];
  const row = (cnt, b, cz) => {
    const R = Math.min(0.165, XW / (2 * cnt) - 0.02);
    for (let i = 0; i < cnt; i++) slots.push([XA + ((i + 0.5) * XW) / cnt, b, cz, R]);
  };
  row(backN, PY + RISE, 0.965);                                        // z 0.75..1.18 band
  row(frontN, PY, 0.535);                                              // z 0.32..0.75 band

  let prevCol = -1;
  slots.forEach(([cx, b, cz, R], i) => {
    const BR = Math.min(0.12, R * 0.78);
    cyl(cx, b, cz, BR, BH, potC, 10);
    cyl(cx, b + BH - 0.04, cz, BR + 0.018, 0.05, rimC, 10);            // rim band, clearly above the rail

    const ft = b + BH + 0.06;
    cyl(cx, b + BH - 0.02, cz, R * 0.8, 0.08, LEAF, 8);                // leafy mound spilling over the rim
    const a0 = hash(s, i * 11 + 9) * Math.PI;
    for (let k = 0; k < 4; k++) {
      const a = a0 + (k + 0.5) * (Math.PI / 2);
      box(cx + Math.cos(a) * R * 0.62 - 0.02, ft - 0.03, cz + Math.sin(a) * R * 0.62 - 0.02, 0.04, 0.12, 0.04, LEAF_D);
    }

    let ci = Math.floor(hash(s, i * 11 + 1) * FL.length);
    if (ci === prevCol) ci = (ci + 1) % FL.length;
    prevCol = ci;
    const col = FL[ci];
    const col2 = FL[(ci + 2 + Math.floor(hash(s, i * 11 + 2) * 3)) % FL.length];
    const r = hash(s, i * 11 + 3);
    const type = r < 0.15 ? "sunflower" : r < 0.43 ? "daisy" : r < 0.72 ? "tulip" : "rose";
    const hr = type === "sunflower" ? 0.08 : type === "tulip" ? 0.045 : 0.06;

    const rr = Math.max(0.04, R - hr);                                 // heads stay inside the bucket's slot
    const ring = type === "sunflower" ? 3 : Math.max(4, Math.min(7, Math.floor((2 * Math.PI * rr) / (2 * hr * 1.02))));
    const heads = [[cx, cz, ft + 0.16]];
    for (let k = 0; k < ring; k++) {
      const a = a0 + (k / ring) * Math.PI * 2;
      heads.push([cx + Math.cos(a) * rr, cz + Math.sin(a) * rr, ft + 0.05 + hash(s, i * 31 + k) * 0.04]);
    }
    heads.forEach(([hx, hz, hy], j) => {
      const y = type === "tulip" ? hy + 0.03 : hy;
      box(hx - 0.012, ft - 0.03, hz - 0.012, 0.024, y - ft + 0.03, 0.024, LEAF_D);
      if (type === "daisy") {
        cyl(hx, y, hz, 0.06, 0.035, col, 8);
        box(hx - 0.022, y + 0.035, hz - 0.022, 0.044, 0.02, 0.044, col === SUN ? SEEDS : SUN);
      } else if (type === "tulip") {
        const c = j % 2 ? col2 : col;
        cyl(hx, y, hz, 0.045, 0.09, c, 6);
        cyl(hx, y + 0.09, hz, 0.022, 0.01, darken(c, 0.7), 6);
      } else if (type === "rose") {
        cyl(hx, y, hz, 0.06, 0.06, col, 8);
        cyl(hx, y + 0.06, hz, 0.032, 0.015, darken(col, 0.72), 8);
      } else {
        cyl(hx, y, hz, 0.08, 0.03, SUN, 10);
        cyl(hx, y + 0.03, hz, 0.04, 0.015, SEEDS, 8);
      }
    });
  });

  // ---- front gantry (all modes): two posts, a cross-rail, a hanging tulip sign and the lantern bracket
  const TOP = 2.05, ZF = 0.66;
  for (const x of [0.16, 1.58]) box(x, CTOP, ZF, 0.06, TOP - CTOP, 0.06, p.trim);
  box(0.13, TOP - 0.06, ZF, 1.54, 0.06, 0.06, p.trim);                 // cross-rail y 1.99..2.05
  // sign board hangs below the rail (y 1.70..1.90), above the tallest bloom (~1.56)
  for (const sx of [0.72, 1.06]) box(sx, 1.88, 0.645, 0.02, 0.11, 0.04, IRON);
  box(0.66, 1.7, 0.625, 0.48, 0.2, 0.03, p.trim);
  [[0.78, "#9B7FD1"], [0.9, p.canopy === p.trim ? "#E5484D" : p.canopy], [1.02, "#F08A4B"]].forEach(([ix, hc], k) => {
    const z = 0.605;
    box(ix - 0.012, 1.72, z, 0.024, 0.09, 0.02, LEAF_D);                        // stem
    box(k === 1 ? ix + 0.012 : ix - 0.047, 1.745, z, 0.035, 0.022, 0.02, LEAF);  // leaf
    box(ix - 0.045, 1.8, z, 0.09, 0.045, 0.02, hc);                             // cup
    box(ix - 0.045, 1.845, z, 0.03, 0.03, 0.02, hc);                            // petal tips
    box(ix + 0.015, 1.845, z, 0.03, 0.03, 0.02, hc);
  });
  // lantern on a bracket off the left post, outside the bed so it can never meet a bucket
  box(0.04, 1.85, 0.67, 0.12, 0.04, 0.04, IRON);                       // bracket arm
  box(0.07, 1.77, 0.68, 0.02, 0.08, 0.02, IRON);                       // hanger
  box(0.02, 1.74, 0.63, 0.12, 0.03, 0.12, IRON);                       // cap
  box(0.03, 1.58, 0.64, 0.1, 0.16, 0.1, on ? lit : glass, on);         // glass
  box(0.025, 1.55, 0.635, 0.11, 0.03, 0.11, IRON);                     // base

  // ---- half canopy over the back row
  const Z0 = 0.56, ZD = 0.82;
  let hangY, hangZ;
  if (p.top !== "none") {
    for (const x of [0.16, 1.58]) box(x, CTOP, 1.21, 0.06, TOP - CTOP, 0.06, p.trim);
    if (p.top === "awning") {
      const N = 6, sw = 1.7 / N;
      for (let i = 0; i < N; i++) {
        const c = i % 2 ? alt : p.canopy;
        box(0.05 + i * sw, TOP, Z0, sw, 0.12, ZD, c);
        box(0.05 + i * sw, TOP - 0.14, Z0, sw, 0.14, 0.03, c);         // valance
      }
      hangY = TOP - 0.14;
    } else {
      parts.push({ t: "gable", p: [0.05, TOP, Z0], s: [1.7, 0.45, ZD], c: p.canopy, axis: "x" });
      box(0.05, TOP - 0.08, Z0, 1.7, 0.08, 0.03, alt);                 // fascia under the eave
      hangY = TOP - 0.08;
    }
    hangZ = Z0 + 0.003;
  } else {
    hangY = TOP - 0.06;
    hangZ = ZF + 0.018;
  }
  // festoon bulbs either side of the sign, never in front of it
  for (const bx of [0.27, 0.41, 0.55, 1.19, 1.33, 1.47]) box(bx, hangY - 0.06, hangZ, 0.06, 0.06, 0.024, on ? lit : glass, on);

  return { parts };
}
