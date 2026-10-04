// Town Bakery: a bakery whose whole street front is a shop. A full-width shopfront bay projects from the house; a giant
// scored batard loaf sits on its flat roof as the sign. Below, a tiered bay window displays boules, batards and a
// basket of baguettes under a striped awning, and a brick oven chimney smokes above. Block asset: build(p) returns
// parts in metres on the Oasis Town grid (origin at the footprint's corner, y up, street side at z = 0).
// Colour knobs are clamped by role, so any brand palette still reads as a bakery.
export const meta = {
  title: "Town Bakery",
  kind: "3d",
  format: "blocks",
  kit: "Oasis Town",
  description: "A corner bakery with a giant scored loaf on its shopfront roof, a bay window of bread under a striped awning and a smoking brick chimney, sized for the 6 m grid beside the Town Shop.",
  tags: ["3d", "low poly", "building", "bakery", "bread", "shop", "town", "kit"],
  price: 4,
  author: "oasis-factory",
  footprint: [6, 6],
  size: [1000, 1000],
};

export const params = {
  knobs: {
    wall: { type: "color", role: "surface", label: "Walls", default: "#F3E3C8" },
    awning: { type: "color", role: "primary", label: "Awning", default: "#E5484D" },
    sign: { type: "color", role: "highlight", label: "Loaf sign & bread (golden to russet)", default: "#F2B33D" },
    roof: { type: "color", role: "ink", label: "Roof & shopfront", default: "#5B6270" },
    floors: { type: "range", label: "Floors", default: 2, min: 1, max: 3, step: 1 },
    chimney: { type: "toggle", label: "Oven chimney", default: true },
    lights: { type: "toggle", label: "Lit windows", default: true },
  },
  presets: {
    Pistachio: { wall: "#E3F2EA", awning: "#2F7A55", sign: "#C98B3E", roof: "#3B4A44" },
    Terracotta: { wall: "#F6EEE0", awning: "#3E7BFA", sign: "#E0A848", roof: "#C8553D" },
    Rye: { wall: "#F7E6EC", awning: "#C8553D", sign: "#A8642C", roof: "#6B5A63" },
  },
};

// ---- colour helpers: every brand-driven colour is clamped to a role-safe range ----
function toHsl(hex, fb) {
  const s = typeof hex === "string" && /^#?[0-9a-fA-F]{6}$/.test(hex) ? hex.replace("#", "") : fb.slice(1);
  const n = parseInt(s, 16);
  const r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn, l = (mx + mn) / 2;
  const sat = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  let h = 0;
  if (d !== 0) {
    if (mx === r) h = 60 * (((g - b) / d) % 6);
    else if (mx === g) h = 60 * ((b - r) / d + 2);
    else h = 60 * ((r - g) / d + 4);
  }
  if (h < 0) h += 360;
  return [h, sat, l];
}
function toHex(h, s, l) {
  const a = s * Math.min(l, 1 - l);
  const f = (k0) => {
    const k = (k0 + h / 30) % 12;
    const v = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(Math.max(0, Math.min(1, v)) * 255).toString(16).padStart(2, "0");
  };
  return "#" + f(0) + f(8) + f(4);
}
const cl = (v, a, b) => Math.max(a, Math.min(b, v));
const hueDist = (a, b) => Math.min(Math.abs(a - b), 360 - Math.abs(a - b));
const snapHue = (h, lo, hi) => (h >= lo && h <= hi ? h : hueDist(h, lo) < hueDist(h, hi) ? lo : hi);

export function build(p) {
  const parts = [];
  const box = (x, y, z, w, h, d, c, e) => parts.push({ t: "box", p: [x, y, z], s: [w, h, d], c, ...(e ? { e: true } : {}) });
  const cyl = (cx, y, cz, r, h, c, n) => parts.push({ t: "cyl", p: [cx, y, cz], r, h, c, n: n || 8 });

  const floors = Math.max(1, Math.min(3, Math.round(p.floors)));
  const L = !!p.lights;
  const base = 0.15, SHOP = 3.2, FLOOR = 2.6;
  const X0 = 0.3, X1 = 5.7, W = X1 - X0; // building width
  const zF = 0.6, zH = 1.9, zB = 5.8; // shopfront face, house face, back wall
  const top = SHOP + (floors - 1) * FLOOR;

  // ---- role-clamped colours ----
  const [wh, ws, wl] = toHsl(p.wall, "#F3E3C8");
  const wallL = cl(wl, 0.62, 0.93);
  const wall = toHex(wh, cl(ws, 0, 0.35), wallL);
  const [rh, rs, rl] = toHsl(p.roof, "#5B6270");
  const roofWarm = rh <= 40 || rh >= 340; // terracotta tiles may stay warm, everything else desaturates to slate
  const roof = toHex(rh, cl(rs, 0, roofWarm ? 0.55 : 0.3), cl(rl, 0.32, Math.min(0.52, wallL - 0.25)));
  let [ah, as, al] = toHsl(p.awning, "#E5484D");
  if (ah >= 50 && ah <= 145) { ah = 150; as = Math.min(as, 0.5); } // limes and yellow-greens become kit tram green
  const awn = toHex(ah, cl(as, 0.42, 0.65), cl(al, 0.42, 0.55));
  const [sh, ss, sl] = toHsl(p.sign, "#F2B33D");
  const bh = snapHue(sh, 18, 46), bs = cl(ss, 0.45, 0.85);
  const bl = cl(sl, 0.36, Math.max(0.36, Math.min(0.64, wallL - 0.18)));
  const bread = toHex(bh, bs, bl);
  const breadDark = toHex(bh, bs, Math.max(0.2, bl - 0.16));
  const breadScore = toHex(bh, 0.6, Math.min(0.84, bl + 0.22));

  // fixed materials
  const glass = "#7E93A8", lit = "#FFD58A", wood = "#8A6E52", darkWood = "#6E5440", cream = "#F6EEE0";
  const kerb = "#D9DCE1", white = "#FBFBFB";
  const win = L ? lit : glass;

  // ---- masses: plinth, shopfront bay block, house ----
  box(X0 - 0.15, 0, zF - 0.15, W + 0.3, base, zB - zF + 0.3, "#BFC3CA");
  box(X0, base, zF, W, SHOP - base, zH - zF, wall); // single-storey shop block
  box(X0, base, zH, W, top - base, zB - zH, wall); // house behind
  box(X0 - 0.05, SHOP, zF - 0.05, W + 0.1, 0.08, zH - zF + 0.07, cream); // shop roof cap

  // ---- shopfront frame: pilasters and fascia with marquee bulbs ----
  box(X0, base, zF - 0.08, 0.28, 2.5, 0.08, roof);
  box(X1 - 0.28, base, zF - 0.08, 0.28, 2.5, 0.08, roof);
  box(X0, 2.65, zF - 0.06, W, 0.5, 0.06, roof);
  for (let i = 0; i < 6; i++) box(X0 + 0.55 + i * 0.86, 2.85, zF - 0.09, 0.12, 0.12, 0.03, L ? lit : cream, L);

  // ---- tiered bay window of bread (open front so the loaves read) ----
  const bx = 0.75, bw = 2.9, bz = zF - 0.5;
  box(bx, 0, bz, bw, 0.6, 0.5, wood);
  box(bx + 0.15, 0.15, bz - 0.03, bw - 0.3, 0.3, 0.03, darkWood);
  box(bx - 0.05, 0.6, bz - 0.05, bw + 0.1, 0.06, 0.55, cream); // sill
  box(bx + 0.08, 0.66, zF - 0.05, bw - 0.16, 1.44, 0.05, win, L); // glowing back of the display
  // front row: four big scored boules
  for (let i = 0; i < 4; i++) {
    const lx = bx + 0.36 + i * 0.73;
    cyl(lx, 0.66, bz + 0.2, 0.2, 0.2, i % 2 ? breadDark : bread, 8);
    cyl(lx, 0.86, bz + 0.2, 0.13, 0.07, i % 2 ? bread : breadScore, 8);
  }
  // upper shelf: two batards and a basket of standing baguettes
  box(bx + 0.1, 1.2, zF - 0.35, bw - 0.2, 0.06, 0.3, cream);
  for (const ox of [0.25, 1.7]) {
    box(bx + ox, 1.26, zF - 0.32, 0.8, 0.2, 0.24, bread);
    box(bx + ox + 0.12, 1.46, zF - 0.26, 0.56, 0.04, 0.12, breadScore);
  }
  box(bx + 1.27, 1.26, zF - 0.33, 0.36, 0.22, 0.26, darkWood);
  [0.07, 0.18, 0.29].forEach((o, k) => cyl(bx + 1.27 + o, 1.48, zF - 0.2, 0.045, 0.5 - k * 0.06, k % 2 ? breadDark : bread, 6));
  for (const px of [bx, bx + bw - 0.08]) box(px, 0.66, bz, 0.08, 1.44, 0.08, wood); // corner posts
  for (const px of [bx, bx + bw - 0.04]) box(px, 0.66, bz + 0.08, 0.04, 1.44, 0.42, glass); // side panes
  box(bx - 0.06, 2.1, bz - 0.05, bw + 0.12, 0.1, 0.55, roof); // bay cap

  // ---- door ----
  const dx = 4.25;
  box(dx - 0.08, base, zF - 0.04, 1.06, 2.1, 0.04, cream);
  box(dx, 0.17, zF - 0.07, 0.9, 1.98, 0.03, wood);
  box(dx + 0.2, 1.2, zF - 0.09, 0.5, 0.65, 0.02, win, L);
  box(dx + 0.72, 0.95, zF - 0.1, 0.06, 0.2, 0.03, "#F2B33D"); // brass handle
  box(dx - 0.1, 0, zF - 0.3, 1.1, 0.17, 0.3, kerb); // step

  // ---- striped awning: one clean slab of touching stripes with a straight valance ----
  const ax = X0 + 0.25, aw = W - 0.5, stripes = 9, sw = aw / stripes, ad = 0.55;
  for (let i = 0; i < stripes; i++) {
    const c = i % 2 ? white : awn;
    box(ax + i * sw, 2.42, zF - ad, sw, 0.14, ad, c);
    box(ax + i * sw, 2.26, zF - ad, sw, 0.16, 0.05, c);
  }

  // ---- giant batard loaf sign on the shop roof: rounded in plan and section, with diagonal scores ----
  const LX = 3.6 + 0.4 * (floors - 1), LD = 0.95, lcx = 3.0, lzc = zF + 0.1 + LD / 2;
  const layers = [[0.12, 0.86, 0.7, breadDark], [0.22, 1, 1, bread], [0.2, 0.97, 0.9, bread], [0.16, 0.88, 0.74, bread], [0.12, 0.74, 0.56, bread]];
  let ly = SHOP + 0.08;
  for (const [h, lf, df, c] of layers) {
    const len = LX * lf, dep = LD * df;
    box(lcx - (len * 0.84) / 2, ly, lzc - dep / 2, len * 0.84, h, dep, c); // body
    box(lcx - len / 2, ly, lzc - (dep * 0.6) / 2, len, h, dep * 0.6, c); // rounded ends
    ly += h;
  }
  for (let i = 0; i < 4; i++) {
    const sx = lcx + (i - 1.5) * LX * 0.14;
    [0.17, 0, -0.17].forEach((oz, k) => box(sx - 0.22 + k * 0.12, ly, lzc + oz - 0.085, 0.2, 0.04, 0.17, breadScore));
  }

  // ---- side windows ----
  box(X0 - 0.04, 0.8, zF + 0.3, 0.04, 1.2, 0.7, win, L);
  box(X0 - 0.1, 0.74, zF + 0.25, 0.1, 0.06, 0.8, cream);
  box(X0 - 0.04, 0.8, 3.3, 0.04, 1.2, 1.1, win, L);
  box(X0 - 0.1, 0.74, 3.25, 0.1, 0.06, 1.2, cream);

  // ---- flats above: every window follows the lights toggle ----
  for (let f = 1; f < floors; f++) {
    const y = SHOP + (f - 1) * FLOOR + 0.85;
    for (const fx of [1.1, 3.9]) {
      box(fx, y, zH - 0.04, 1, 1.2, 0.04, win, L);
      box(fx - 0.05, y + 1.2, zH - 0.08, 1.1, 0.08, 0.08, roof); // lintel
      if (f === 1) box(fx - 0.05, y - 0.08, zH - 0.08, 1.1, 0.08, 0.08, cream); // sill above the loaf
      else {
        box(fx - 0.05, y - 0.22, zH - 0.3, 1.1, 0.22, 0.3, wood); // window box
        for (let k = 0; k < 4; k++) box(fx + 0.04 + k * 0.24, y, zH - 0.26, 0.2, 0.16, 0.2, k % 2 ? "#79B86A" : "#F7B8CF");
      }
    }
    box(X0 - 0.04, y, 3.3, 0.04, 1.2, 1.1, win, L);
    box(X0 - 0.08, y + 1.2, 3.25, 0.08, 0.08, 1.2, roof);
  }

  // ---- roof ----
  parts.push({ t: "gable", p: [X0 - 0.2, top, zH - 0.15], s: [W + 0.4, 1.6, zB - zH + 0.35], c: roof, axis: "x" });

  // ---- brick oven chimney on the street-side slope, with a curl of smoke ----
  if (p.chimney) {
    const chx = 4.1, chz = 2.6, cw = 0.8, ch = 2.4;
    box(chx, top, chz, cw, ch, cw, "#C8553D");
    box(chx - 0.03, top + 1.5, chz - 0.03, cw + 0.06, 0.1, cw + 0.06, cream);
    box(chx - 0.08, top + ch, chz - 0.08, cw + 0.16, 0.14, cw + 0.16, "#5B6270");
    cyl(chx + cw / 2, top + ch + 0.14, chz + cw / 2, 0.16, 0.2, "#5B6270", 8);
    let sy = top + ch + 0.34;
    for (const [r, h, ox, oz] of [[0.26, 0.26, 0, 0], [0.36, 0.3, 0.14, 0.06], [0.3, 0.26, 0.3, 0.14]]) {
      cyl(chx + cw / 2 + ox, sy, chz + cw / 2 + oz, r, h, white, 8);
      sy += h;
    }
  }

  return { parts };
}
