// Town Cafe: a corner cafe with glass on both street faces, a wraparound striped awning and parasol
// tables on the pavement. Block asset: build(p) returns parts in metres on the Oasis Town grid (origin at
// the footprint's corner, y up, street side at z = 0). The terrace runs z 0 to 1.5, and the west side is
// the second street, so the corner reads from the 45 degree camera.
// Colour guards: walls stay pale and soft, the roof sits at a fixed mid value, trim stays dark, and the
// parasol and awning accents keep saturation and contrast against white stripes and pavement under any
// brand. Glass, foliage, wood and the warm lit glow are fixed materials with no role.
export const meta = {
  title: "Town Cafe",
  kind: "3d",
  format: "blocks",
  kit: "Oasis Town",
  description: "A corner cafe with glass on both street faces, a wraparound striped awning and parasol tables on the pavement, scaled to sit beside the Town Shop.",
  tags: ["3d", "low poly", "building", "cafe", "coffee", "terrace", "parasol", "corner", "town", "kit"],
  price: 4,
  author: "oasis-factory",
  footprint: [6, 6],
  size: [1000, 1000],
};

export const params = {
  knobs: {
    wall: { type: "color", role: "surface", label: "Walls", default: "#F6EEE0" },
    parasol: { type: "color", role: "primary", label: "Parasols", default: "#2F7A55" },
    trim: { type: "color", role: "ink", label: "Trim & roof", default: "#5B6270" },
    sign: { type: "color", role: "highlight", label: "Awning & lettering", default: "#F2B33D" },
    tables: { type: "range", label: "Outdoor tables", default: 2, min: 0, max: 3, step: 1 },
    floors: { type: "range", label: "Floors", default: 1, min: 1, max: 2, step: 1 },
    roof: { type: "choice", label: "Roof", default: "flat", options: ["flat", "gable"] },
    lights: { type: "toggle", label: "Lights on", default: true },
  },
  presets: {
    Harbour: { wall: "#D8DEE3", parasol: "#3E7BFA", trim: "#2B3242", sign: "#F2B33D" },
    Bistro: { wall: "#F3E3C8", parasol: "#2B3242", trim: "#C8553D", sign: "#E5484D" },
    Blossom: { wall: "#F6EEE0", parasol: "#F7B8CF", trim: "#4A4F63", sign: "#79B86A" },
  },
};

// ---- colour guards ----
const HEX = /^#[0-9a-fA-F]{6}$/;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
function rgb(c, fb) {
  const s = HEX.test(String(c)) ? c : fb;
  const n = parseInt(s.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}
function hex(r, g, b) {
  const h = (v) => Math.round(clamp(v, 0, 1) * 255).toString(16).padStart(2, "0");
  return "#" + h(r) + h(g) + h(b);
}
function toHsl([r, g, b]) {
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
  if (mx === mn) return [0, 0, l];
  const d = mx - mn, s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
  const h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h / 6, s, l];
}
function fromHsl(h, s, l) {
  if (s <= 0) return hex(l, l, l);
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s, pp = 2 * l - q;
  const f = (t) => {
    t = ((t % 1) + 1) % 1;
    if (t < 1 / 6) return pp + (q - pp) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return pp + (q - pp) * (2 / 3 - t) * 6;
    return pp;
  };
  return hex(f(h + 1 / 3), f(h), f(h - 1 / 3));
}
// neutral masses: keep hue, cap saturation, force lightness into a fixed band
function tone(c, fb, sMax, lMin, lMax) {
  const [h, s, l] = toHsl(rgb(c, fb));
  return fromHsl(h, Math.min(s, sMax), clamp(l, lMin, lMax));
}
// accents: grey or washed-out inputs fall back to the kit hue, so an accent never fades to cream or grey
function accent(c, fb, sMin, sMax, lMin, lMax) {
  let [h, s, l] = toHsl(rgb(c, fb));
  if (s < 0.12) { const d = toHsl(rgb(fb, fb)); h = d[0]; s = d[1]; }
  return fromHsl(h, clamp(s, sMin, sMax), clamp(l, lMin, lMax));
}
function mix(a, b, t) {
  const x = rgb(a, "#808080"), y = rgb(b, "#808080");
  return hex(x[0] + (y[0] - x[0]) * t, x[1] + (y[1] - x[1]) * t, x[2] + (y[2] - x[2]) * t);
}

export function build(p) {
  const parts = [];
  const em = (e) => (e ? { e: true } : {});
  const box = (x, y, z, w, h, d, c, e) => parts.push({ t: "box", p: [x, y, z], s: [w, h, d], c, ...em(e) });
  const cyl = (cx, y, cz, r, h, c, n, e) => parts.push({ t: "cyl", p: [cx, y, cz], r, h, c, n: n || 10, ...em(e) });
  const cone = (cx, y, cz, r, h, c, n) => parts.push({ t: "cone", p: [cx, y, cz], r, h, c, n: n || 8 });

  // value ladder that holds under any brand: wall (0.84+) > accents (0.38-0.6) > roof (0.42) > trim (0.26)
  const wallC = tone(p.wall, "#F6EEE0", 0.25, 0.84, 0.93);
  const roofC = tone(p.trim, "#5B6270", 0.35, 0.4, 0.45);
  const trimC = tone(p.trim, "#5B6270", 0.35, 0.24, 0.29);
  const paraC = accent(p.parasol, "#2F7A55", 0.35, 0.7, 0.38, 0.56);
  const awnC = accent(p.sign, "#F2B33D", 0.4, 0.85, 0.5, 0.6);
  const unitC = mix(roofC, wallC, 0.55);
  const unitTop = mix(unitC, "#FFFFFF", 0.3);

  // fixed materials
  const glass = "#7E93A8", glare = "#B4C4D3", lit = "#FFD58A", wood = "#8A6E52", kerb = "#D9DCE1";
  const white = "#FBFBFB", leaf = "#79B86A", blossom = "#F7B8CF", stone = "#BFC3CA", slate = "#2B3242";
  const L = !!p.lights;
  const floors = clamp(Math.round(p.floors), 1, 2);
  const tables = clamp(Math.round(p.tables), 0, 3);

  // building: the corner sits at the west front, with a side pavement along x = 0.1
  const x0 = 0.55, W = 5.15, z0 = 1.6, D = 4.2;
  const GROUND = 3.4, FLOOR = 2.6, BASE = 0.15;
  const H = GROUND + (floors - 1) * FLOOR;
  const g = 0.06; // pavement top

  box(0.1, 0, 0.1, 5.8, g, 1.4, kerb); // front terrace, z 0.1 to 1.5
  box(0.1, 0, 1.5, 0.35, g, 4.4, kerb); // side pavement on the corner street
  box(x0 - 0.1, 0, z0 - 0.1, W + 0.2, BASE, D + 0.2, stone); // plinth
  box(x0, BASE, z0, W, H, D, wallC);

  // ---- front glass: lit lower panes, clear transom with glare ----
  const gy = 0.45, gh = 2.0, low = 1.5;
  const dx = x0 + W - 1.2; // door frame runs dx to dx + 0.95
  const gx = x0 + 0.15, gw = dx - 0.2 - gx;
  box(gx, gy, z0 - 0.04, gw, low, 0.06, L ? lit : glass, L);
  box(gx, gy + low, z0 - 0.04, gw, gh - low, 0.06, glass);
  box(gx - 0.06, gy - 0.08, z0 - 0.12, gw + 0.12, 0.08, 0.12, trimC); // sill
  box(gx - 0.06, gy + gh, z0 - 0.07, gw + 0.12, 0.07, 0.03, trimC); // head
  box(gx, gy + low, z0 - 0.07, gw, 0.07, 0.03, trimC); // transom bar
  for (const k of [1, 2]) box(gx + (gw * k) / 3 - 0.04, gy, z0 - 0.07, 0.08, gh, 0.03, trimC);
  for (let k = 0; k < 3; k++) {
    const pc = gx + (gw * (k + 0.5)) / 3;
    box(pc - 0.01, gy + low - 0.3, z0 - 0.06, 0.02, 0.3, 0.02, trimC); // pendant lamp inside
    box(pc - 0.12, gy + low - 0.42, z0 - 0.065, 0.24, 0.12, 0.025, trimC);
    box(pc - 0.3, gy + low + 0.1, z0 - 0.06, 0.07, 0.3, 0.02, glare);
  }
  box(gx + 0.2, gy + 0.55, z0 - 0.07, gw - 0.4, 0.06, 0.03, trimC); // counter line inside

  // glass door
  box(dx, BASE, z0 - 0.04, 0.95, 2.2, 0.06, trimC);
  box(dx + 0.1, BASE + 0.12, z0 - 0.07, 0.75, 1.85, 0.03, L ? lit : glass, L);
  box(dx + 0.2, BASE + 1.35, z0 - 0.09, 0.06, 0.4, 0.02, glare);
  box(dx + 0.74, BASE + 0.95, z0 - 0.1, 0.06, 0.3, 0.03, white);

  // ---- corner post and side glass on the corner street ----
  box(x0 - 0.08, BASE, z0 - 0.08, 0.16, 2.45, 0.16, trimC);
  const gz = z0 + 0.15, gl = 2.85;
  box(x0 - 0.04, gy, gz, 0.06, low, gl, L ? lit : glass, L);
  box(x0 - 0.04, gy + low, gz, 0.06, gh - low, gl, glass);
  box(x0 - 0.12, gy - 0.08, gz - 0.06, 0.12, 0.08, gl + 0.12, trimC);
  box(x0 - 0.07, gy + gh, gz - 0.06, 0.03, 0.07, gl + 0.12, trimC);
  box(x0 - 0.07, gy + low, gz, 0.03, 0.07, gl, trimC);
  for (const k of [1, 2]) box(x0 - 0.07, gy, gz + (gl * k) / 3 - 0.04, 0.03, gh, 0.08, trimC);
  for (let k = 0; k < 3; k++) box(x0 - 0.06, gy + low + 0.1, gz + (gl * k) / 3 + 0.2, 0.02, 0.3, 0.07, glare);
  box(x0 - 0.07, gy + 0.55, gz + 0.2, 0.03, 0.06, gl - 0.4, trimC);

  // ---- wraparound stepped awning: front run plus side run, closed with end cheeks ----
  const P = 0.45, hp = P / 2;
  const fxs = x0 - P - 0.04, flen = W + P + 0.04, fn = 10, fsw = flen / fn;
  for (let i = 0; i < fn; i++) {
    const c = i % 2 ? white : awnC, sx = fxs + i * fsw;
    box(sx, 2.86, z0 - hp, fsw, 0.12, hp, c);
    box(sx, 2.74, z0 - P, fsw, 0.14, hp, c);
    box(sx, 2.6, z0 - P - 0.04, fsw, 0.26, 0.04, c); // valance
  }
  const sn = 5, ssw = 0.6;
  for (let j = 0; j < sn; j++) {
    const c = j % 2 ? awnC : white, sz = z0 + j * ssw;
    box(x0 - hp, 2.86, sz, hp, 0.12, ssw, c);
    box(x0 - P, 2.74, sz, hp, 0.14, ssw, c);
    box(x0 - P - 0.04, 2.6, sz, 0.04, 0.26, ssw, c);
  }
  box(x0 + W, 2.6, z0 - P - 0.04, 0.04, 0.38, P + 0.04, awnC); // east cheek
  box(x0 - P - 0.04, 2.6, z0 + sn * ssw, P + 0.04, 0.38, 0.04, awnC); // north cheek
  // festoon bulbs on the valance
  for (let i = 0; i < 10; i++) box(x0 - 0.3 + i * ((W + 0.1) / 9), 2.64, z0 - P - 0.08, 0.08, 0.08, 0.04, L ? lit : glare, L);
  for (let j = 0; j < 5; j++) box(x0 - P - 0.08, 2.64, z0 + 0.3 + j * 0.6, 0.04, 0.08, 0.08, L ? lit : glare, L);

  // ---- dark fascia wrapping the corner, lettered in the accent colour ----
  box(x0 - 0.06, 3.02, z0 - 0.06, W + 0.06, 0.3, 0.06, trimC);
  box(x0 - 0.06, 3.02, z0, 0.06, 0.3, D, trimC);
  const cx = x0 + W / 2;
  box(cx - 0.14, 3.08, z0 - 0.09, 0.28, 0.18, 0.03, awnC); // cup
  box(cx + 0.14, 3.12, z0 - 0.09, 0.07, 0.1, 0.03, awnC);
  box(cx - 1.6, 3.14, z0 - 0.09, 1.2, 0.07, 0.03, awnC);
  box(cx + 0.4, 3.14, z0 - 0.09, 1.2, 0.07, 0.03, awnC);
  box(x0 - 0.09, 3.14, z0 + 0.8, 0.03, 0.07, 2.4, awnC);

  // menu board on the side wall, past the glass
  box(x0 - 0.05, 0.8, z0 + 3.25, 0.05, 0.85, 0.55, wood);
  box(x0 - 0.08, 0.86, z0 + 3.31, 0.03, 0.73, 0.43, slate);
  box(x0 - 0.1, 1.4, z0 + 3.38, 0.02, 0.04, 0.29, white);

  // ---- upper floor: three tall front windows with a French balcony, two on the side ----
  if (floors > 1) {
    const y0 = BASE + GROUND, wy = y0 + 0.5, wh = 1.5;
    box(x0 - 0.08, y0 - 0.1, z0 - 0.08, W + 0.08, 0.1, 0.08, trimC); // cornice
    box(x0 - 0.08, y0 - 0.1, z0, 0.08, 0.1, D, trimC);
    const gap = (W - 3) / 4;
    for (let i = 0; i < 3; i++) {
      const fx = x0 + gap + i * (1 + gap), on = L && i < 2;
      box(fx, wy, z0 - 0.04, 1, wh, 0.06, on ? lit : glass, on);
      box(fx + 0.46, wy, z0 - 0.07, 0.08, wh, 0.03, trimC);
      box(fx - 0.08, wy + wh, z0 - 0.08, 1.16, 0.1, 0.08, trimC); // lintel
      if (!on) box(fx + 0.15, wy + 0.9, z0 - 0.06, 0.07, 0.4, 0.02, glare);
      if (i === 1) {
        box(fx - 0.1, wy - 0.1, z0 - 0.35, 1.2, 0.1, 0.35, trimC); // balcony slab
        box(fx - 0.1, wy + 0.75, z0 - 0.35, 1.2, 0.05, 0.05, trimC); // rail
        for (let k = 0; k < 3; k++) box(fx - 0.1 + k * 0.575, wy, z0 - 0.35, 0.05, 0.75, 0.05, trimC);
      } else {
        box(fx - 0.06, wy - 0.08, z0 - 0.12, 1.12, 0.08, 0.12, trimC); // sill
        box(fx, wy - 0.3, z0 - 0.32, 1, 0.22, 0.32, trimC); // window box
        box(fx + 0.05, wy - 0.08, z0 - 0.28, 0.9, 0.1, 0.16, leaf);
        for (const bx of [0.12, 0.44, 0.76]) box(fx + bx, wy + 0.02, z0 - 0.24, 0.12, 0.08, 0.1, blossom);
      }
    }
    for (let i = 0; i < 2; i++) {
      const zz = z0 + 0.6 + i * 2, on = L && i === 0;
      box(x0 - 0.04, wy, zz, 0.06, wh, 1, on ? lit : glass, on);
      box(x0 - 0.07, wy, zz + 0.46, 0.03, wh, 0.08, trimC);
      box(x0 - 0.08, wy + wh, zz - 0.08, 0.08, 0.1, 1.16, trimC);
      box(x0 - 0.12, wy - 0.08, zz - 0.06, 0.12, 0.08, 1.12, trimC);
      if (!on) box(x0 - 0.06, wy + 0.9, zz + 0.15, 0.02, 0.4, 0.07, glare);
    }
  }

  // ---- roof: eave sits above the fascia, never on the awning ----
  const top = BASE + H;
  if (p.roof === "gable") {
    parts.push({ t: "gable", p: [x0 - 0.15, top, z0 - 0.15], s: [W + 0.3, 1.6, D + 0.3], c: roofC, axis: "x" });
    box(x0 + W - 1.3, top, z0 + D - 1.1, 0.5, 2.0, 0.5, unitC); // chimney
    box(x0 + W - 1.36, top + 2.0, z0 + D - 1.16, 0.62, 0.1, 0.62, trimC);
  } else {
    box(x0 - 0.1, top, z0 - 0.1, W + 0.2, 0.3, D + 0.2, roofC);
    box(x0 - 0.1, top + 0.3, z0 - 0.1, W + 0.2, 0.08, 0.12, trimC); // parapet lips on both street edges
    box(x0 - 0.1, top + 0.3, z0 + 0.02, 0.12, 0.08, D + 0.08, trimC);
    box(x0 + 0.8, top + 0.3, z0 + 1.6, 1.4, 0.6, 1.2, unitC); // vent unit
    box(x0 + 1.0, top + 0.9, z0 + 1.8, 1.0, 0.06, 0.8, unitTop);
    cyl(x0 + W - 1.0, top + 0.3, z0 + D - 1.0, 0.25, 0.7, unitC, 8); // flue
    cyl(x0 + W - 1.0, top + 1.0, z0 + D - 1.0, 0.3, 0.08, trimC, 8);
  }

  // ---- terrace: props make way for a third table, and spacing and parasol size adapt to the count ----
  if (tables < 3) {
    box(0.15, g, 1.0, 0.4, 0.38, 0.38, trimC); // corner planter
    cyl(0.35, g + 0.38, 1.19, 0.22, 0.32, leaf, 8);
    box(0.27, g + 0.7, 1.12, 0.12, 0.08, 0.12, blossom);
    box(5.3, g, 0.25, 0.5, 0.85, 0.22, wood); // A-board
    box(5.35, g + 0.1, 0.22, 0.4, 0.68, 0.03, slate);
    box(5.42, 0.55, 0.2, 0.26, 0.04, 0.02, white);
  }
  const sp = tables === 3 ? 1.77 : 1.9, R = tables === 3 ? 0.6 : 0.66, tz = 0.66;
  for (let i = 0; i < tables; i++) {
    const tx = 3.0 + (i - (tables - 1) / 2) * sp;
    cyl(tx, g, tz, 0.2, 0.04, trimC, 10);
    cyl(tx, g + 0.04, tz, 0.05, 0.62, trimC, 8);
    cyl(tx, 0.72, tz, 0.34, 0.04, white, 12);
    cyl(tx + 0.16, 0.76, tz - 0.1, 0.05, 0.08, white, 8); // cup
    cyl(tx - 0.15, 0.76, tz + 0.1, 0.04, 0.07, L ? lit : "#F6EEE0", 8, L); // candle
    // parasol: canopy tops out at 2.19 m, 0.4 m under the awning valance
    cyl(tx, 0.76, tz, 0.035, 1.1, stone, 6);
    cyl(tx, 1.86, tz, R * 0.96, 0.05, white, 8);
    cone(tx, 1.91, tz, R, 0.28, paraC, 8);
    for (const s of [-1, 1]) {
      const chx = tx + s * 0.5;
      box(chx - 0.04, g, tz - 0.04, 0.08, 0.34, 0.08, wood);
      box(chx - 0.15, 0.4, tz - 0.15, 0.3, 0.05, 0.3, wood);
      box(s < 0 ? chx - 0.15 : chx + 0.1, 0.45, tz - 0.15, 0.05, 0.36, 0.3, wood);
    }
  }

  return { parts };
}
