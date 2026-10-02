// Town Pagoda: a stacked pagoda with upswept flared eaves, red corner posts, stone lanterns at the door and a
// ringed gold spire. Block asset: build(p) returns parts in metres on the Oasis Town grid. The origin is the
// footprint's corner, y is up, and the street side is at z = 0. The overall envelope (5 x 5 m, 18.3 m tall) is
// fixed for every knob value, so the piece always sits at the same scale beside other kit pieces.
export const meta = {
  title: "Town Pagoda",
  kind: "3d",
  format: "blocks",
  kit: "Oasis Town",
  description: "A three-to-five tier pagoda with upswept flared eaves, stone lanterns at the door and a ringed gold spire, a fixed-size landmark for a little town's temple square or park.",
  tags: ["3d", "low poly", "pagoda", "temple", "tower", "landmark", "japanese", "town", "kit", "block"],
  price: 5,
  author: "shrinewright", payout: "shrinewright@creators.oasis.example",
  footprint: [5, 5],
  size: [1000, 1000],
};

export const params = {
  knobs: {
    wall: { type: "color", role: "surface", label: "Walls", default: "#F6EEE0" },
    roof: { type: "color", role: "secondary", label: "Roofs", default: "#5B6270" },
    trim: { type: "color", role: "primary", label: "Posts & doors", default: "#C8553D" },
    finial: { type: "color", role: "highlight", label: "Spire & plaque", default: "#F2B33D" },
    tiers: { type: "range", label: "Tiers", default: 4, min: 3, max: 5, step: 1 },
    taper: { type: "range", label: "Taper per tier (m)", default: 0.4, min: 0.25, max: 0.5, step: 0.05 },
    lights: { type: "toggle", label: "Lanterns & windows lit", default: true },
  },
  presets: {
    Sakura: { wall: "#F7E6EA", roof: "#C8553D", trim: "#8A6E52", finial: "#F7B8CF" },
    Jade: { wall: "#F3E3C8", roof: "#2F7A55", trim: "#8A6E52", finial: "#F2B33D" },
    Ink: { wall: "#D8DEE3", roof: "#2B3242", trim: "#E5484D", finial: "#F2B33D" },
  },
};

// Colour helpers: every brand colour keeps its hue, but lightness and saturation are clamped per role. Walls stay
// light and warm (greys get a warm tint), roofs stay mid-dark against the sky, and trim is muted enough that a
// neon brand colour never out-shouts the form.
function hexToHsl(hex) {
  const raw = String(hex || "#888888").replace("#", "");
  const v = raw.length === 3 ? raw.split("").map((ch) => ch + ch).join("") : raw.padEnd(6, "0").slice(0, 6);
  const r = parseInt(v.slice(0, 2), 16) / 255, g = parseInt(v.slice(2, 4), 16) / 255, b = parseInt(v.slice(4, 6), 16) / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
  let h = 0, s = 0;
  if (mx !== mn) {
    const d = mx - mn;
    s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
    if (mx === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (mx === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h /= 6;
  }
  return [h, s, l];
}
function hslToHex(h, s, l) {
  const f = (n) => {
    const k = (n + h * 12) % 12;
    const a = s * Math.min(l, 1 - l);
    const c = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(Math.max(0, Math.min(1, c)) * 255).toString(16).padStart(2, "0");
  };
  return ("#" + f(0) + f(8) + f(4)).toUpperCase();
}
function band(hex, lo, hi, sMax, warmGreys) {
  let [h, s, l] = hexToHsl(hex);
  if (warmGreys && s < 0.12) { h = 0.1; s = 0.45; }
  return hslToHex(h, Math.min(s, sMax), Math.max(lo, Math.min(hi, l)));
}

export function build(p) {
  const parts = [];
  const box = (x, y, z, w, h, d, c, e) =>
    parts.push({ t: "box", p: [x, y, z], s: [w, h, d], c, ...(e ? { e: true } : {}) });
  const cyl = (x, y, z, r, h, c, n, e) => parts.push({ t: "cyl", p: [x, y, z], r, h, c, n: n || 8, ...(e ? { e: true } : {}) });
  const cone = (x, y, z, r, h, c, n) => parts.push({ t: "cone", p: [x, y, z], r, h, c, n: n || 8 });

  // Role-mapped colours
  const wall = band(p.wall, 0.86, 0.94, 0.6, true);
  const roof = band(p.roof, 0.26, 0.52, 0.6, false);
  const trim = band(p.trim, 0.3, 0.52, 0.58, false);
  const gold = band(p.finial, 0.55, 0.75, 1, false);

  // State colours are fixed so that recolouring never hides the lights state
  const glass = "#7E93A8", lit = "#FFD58A", stone = "#D9DCE1", step = "#BFC3CA", lanternStone = "#A9AFB8";
  const lights = !!p.lights;
  const win = () => (lights ? lit : glass);

  const n = Math.max(3, Math.min(5, Math.round(p.tiers)));
  const taper = Math.max(0.25, Math.min(0.5, p.taper));

  // Fixed envelope. Storeys get shorter as tiers are added, and the spire fills the rest, so the bounding box
  // never changes.
  const TOTAL = 18.3;
  const H0 = { 3: 3.0, 4: 2.8, 5: 2.6 }[n];   // ground storey
  const HU = { 3: 3.0, 4: 2.6, 5: 2.2 }[n];   // upper storeys
  const cx = 2.5, cz = 2.5;
  const PL = 0.4;                // plinth
  const B0 = 3.4;                // ground body; its eave spans exactly the 5 m footprint
  const O = 0.8;                 // eave overhang
  const DR = 0.55;               // depth of the upswept eave band
  const SH = 0.14;               // eave board thickness
  const LIFT = 0.38;             // upsweep toward the corners
  const SEG = 8;                 // eave boards per edge
  const CORE = 0.44, STEP = 0.2; // roof stack: core + two steps = 0.84 m
  const POST = 0.24, POST_IN = 0.18;

  // Stone plinth and front step
  box(0.2, 0, 0.2, 4.6, PL, 4.6, stone);
  box(1.8, 0, 0, 1.4, 0.2, 0.2, step);

  // Stone lanterns (toro) flanking the door, on the plinth and clear of the posts and door
  for (const sx of [-1, 1]) {
    const lx = cx + sx * 1.15, lz = 0.5;
    box(lx - 0.18, PL, lz - 0.18, 0.36, 0.12, 0.36, lanternStone);
    cyl(lx, PL + 0.12, lz, 0.07, 0.45, lanternStone, 6);
    box(lx - 0.17, PL + 0.57, lz - 0.17, 0.34, 0.06, 0.34, lanternStone);
    box(lx - 0.13, PL + 0.63, lz - 0.13, 0.26, 0.26, 0.26, lights ? lit : glass, lights);
    cone(lx, PL + 0.89, lz, 0.3, 0.24, lanternStone, 6);
  }

  let y = PL;
  let topHalf = B0 / 2;
  for (let i = 0; i < n; i++) {
    const b = B0 - i * taper;
    const h = i === 0 ? H0 : HU;
    const x0 = cx - b / 2, z0 = cz - b / 2;

    // Tier body, fascia band, corner posts
    box(x0, y, z0, b, h, b, wall);
    box(x0 - 0.03, y + h - 0.15, z0 - 0.03, b + 0.06, 0.15, b + 0.06, trim);
    for (const sx of [0, 1]) for (const sz of [0, 1]) {
      const px = sx ? x0 + b - POST_IN : x0 - (POST - POST_IN);
      const pz = sz ? z0 + b - POST_IN : z0 - (POST - POST_IN);
      box(px, y, pz, POST, h - 0.15, POST, trim);
    }

    if (i === 0) {
      // Ground storey: double door, gold split and plaque, side windows
      const dw = 1.2;
      box(cx - dw / 2, y, z0 - 0.04, dw, 2.1, 0.06, trim);
      box(cx - 0.02, y + 0.1, z0 - 0.07, 0.04, 1.9, 0.03, gold);
      box(cx - 0.35, y + 2.2, z0 - 0.05, 0.7, 0.2, 0.06, gold);
      const ww = 0.8, wy = y + 0.75, wh = 1.1;
      box(x0 - 0.04, wy, cz - ww / 2, 0.06, wh, ww, win(), lights);
      box(x0 + b - 0.02, wy, cz - ww / 2, 0.06, wh, ww, win(), lights);
    } else {
      // Upper storeys: windows sized from the clear span between posts (>= 0.3 m breathing room each side)
      // and set low in the wall, clear of the eave shadow
      const span = b - 2 * POST_IN;
      const ww = Math.max(0.45, Math.min(0.9, span - 0.6));
      const wh = Math.min(1.1, h * 0.42);
      const wy = y + (h - 0.15 - wh) * 0.4;
      box(cx - ww / 2, wy, z0 - 0.04, ww, wh, 0.06, win(), lights);
      box(cx - ww / 2 - 0.04, wy - 0.06, z0 - 0.08, ww + 0.08, 0.06, 0.1, trim); // sill
      box(x0 - 0.04, wy, cz - ww / 2, 0.06, wh, ww, win(), lights);
      box(x0 + b - 0.02, wy, cz - ww / 2, 0.06, wh, ww, win(), lights);
    }

    // Flared roof. A core slab sits on the walls, and each eave edge is a run of boards whose underside
    // and top sweep up toward the corners on a parabola. Upturned corner blocks with kicked tips finish it,
    // and two receding steps above give the concave hip.
    const yr = y + h;
    const E = b / 2 + O;
    const a = E - DR;
    box(cx - a, yr, cz - a, 2 * a, CORE, 2 * a, roof);
    const sw = (2 * a) / SEG;
    for (let k = 0; k < SEG; k++) {
      const mid = -a + (k + 0.5) * sw;
      const t = Math.abs(mid) / a;
      const ys = yr + LIFT * t * t;
      box(cx + mid - sw / 2, ys, cz - E, sw, SH, DR, roof); // front
      box(cx + mid - sw / 2, ys, cz + a, sw, SH, DR, roof); // back
      box(cx - E, ys, cz + mid - sw / 2, DR, SH, sw, roof); // left
      box(cx + a, ys, cz + mid - sw / 2, DR, SH, sw, roof); // right
    }
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      box(sx < 0 ? cx - E : cx + a, yr + 0.4, sz < 0 ? cz - E : cz + a, DR, 0.16, DR, roof);
      box(sx < 0 ? cx - E : cx + E - 0.24, yr + 0.56, sz < 0 ? cz - E : cz + E - 0.24, 0.24, 0.16, 0.24, roof);
    }
    const s3 = b / 2 + 0.15, s4 = b / 2 - 0.05;
    box(cx - s3, yr + CORE, cz - s3, 2 * s3, STEP, 2 * s3, roof);
    box(cx - s4, yr + CORE + STEP, cz - s4, 2 * s4, STEP, 2 * s4, roof);

    topHalf = s4;
    y = yr + CORE + 2 * STEP;
  }

  // Spire (sorin): a base block, a bowl, nine rings, a flame cross and a jewel, ending exactly at TOTAL
  const cw = Math.min(1.0, 2 * topHalf - 0.2);
  box(cx - cw / 2, y, cz - cw / 2, cw, 0.25, cw, roof);
  cyl(cx, y + 0.25, cz, 0.32, 0.2, gold, 8);
  const shaft0 = y + 0.45;
  const jewel0 = TOTAL - 0.4;
  cyl(cx, shaft0, cz, 0.08, jewel0 - shaft0, gold, 6);
  const r0 = shaft0 + 0.08;
  const gap = Math.min(0.45, (TOTAL - 0.85 - 0.06 - r0) / 8);
  for (let k = 0; k < 9; k++) cyl(cx, r0 + k * gap, cz, 0.26 - k * 0.011, 0.06, gold, 8);
  box(cx - 0.2, TOTAL - 0.75, cz - 0.03, 0.4, 0.35, 0.06, gold);
  box(cx - 0.03, TOTAL - 0.75, cz - 0.2, 0.06, 0.35, 0.4, gold);
  cone(cx, jewel0, cz, 0.16, 0.4, gold, 8);

  return { parts };
}
