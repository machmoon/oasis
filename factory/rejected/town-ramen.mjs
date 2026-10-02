// Ramen Shop: a narrow noodle bar with a timber shopfront, split noren curtains over a glowing door, a tall
// standing sign with a ramen-bowl pictogram and a row of red paper lanterns that light the wall behind them.
// Block asset: build(p) returns parts in metres on the Oasis Town grid (origin at the footprint's corner,
// y up, street side at z = 0).
export const meta = {
  title: "Ramen Shop",
  kind: "3d",
  format: "blocks",
  kit: "Oasis Town",
  description: "A narrow timber-fronted ramen bar with split noren, a bowl-pictogram sign and glowing red lanterns that slots between town shops on a half lot.",
  tags: ["3d", "low poly", "building", "ramen", "restaurant", "noodle bar", "japanese", "lanterns", "town", "kit"],
  price: 4,
  author: "oasis-factory",
  footprint: [4, 6],
  size: [1000, 1000],
};

export const params = {
  knobs: {
    wall: { type: "color", role: "surface", label: "Walls", default: "#F3E3C8" },
    curtain: { type: "color", role: "primary", label: "Noren curtain", default: "#E5484D" },
    sign: { type: "color", role: "highlight", label: "Sign", default: "#F2B33D" },
    trim: { type: "color", role: "ink", label: "Trim & roof", default: "#5B6270" },
    lanterns: { type: "range", label: "Lanterns", default: 3, min: 0, max: 4, step: 1 },
    floors: { type: "range", label: "Floors", default: 2, min: 1, max: 3, step: 1 },
    roof: { type: "choice", label: "Roof", default: "gable", options: ["gable", "flat"] },
    lights: { type: "toggle", label: "Lights on", default: true },
  },
  presets: {
    Shoyu: { wall: "#F6EEE0", curtain: "#8A3B2E", sign: "#F6EEE0", trim: "#3E3A3A" },
    Indigo: { wall: "#D8DEE3", curtain: "#2E4A7A", sign: "#F2B33D", trim: "#2B3242" },
    Matcha: { wall: "#E9EEDD", curtain: "#2F7A55", sign: "#FFD166", trim: "#3B4A44" },
  },
};

// ---- colour guards: every brand colour is clamped by role so any palette still reads as a ramen shop ----
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const safe = (c, fb) => (typeof c === "string" && /^#[0-9a-fA-F]{6}$/.test(c) ? c : fb);
function toHsl(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255, g = parseInt(hex.slice(3, 5), 16) / 255, b = parseInt(hex.slice(5, 7), 16) / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn, l = (mx + mn) / 2;
  if (d === 0) return [0, 0, l];
  const s = d / (1 - Math.abs(2 * l - 1));
  const h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [(h * 60 + 360) % 360, s, l];
}
function toHex(h, s, l) {
  h = ((h % 360) + 360) % 360;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => {
    const k = (n + h / 30) % 12;
    const v = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(clamp(v, 0, 1) * 255).toString(16).padStart(2, "0");
  };
  return "#" + f(0) + f(8) + f(4);
}
const hueDist = (a, b) => { const d = Math.abs(a - b) % 360; return d > 180 ? 360 - d : d; };
const snap = (h, list) => list.reduce((best, x) => (hueDist(h, x) < hueDist(h, best) ? x : best), list[0]);

export function build(p) {
  const parts = [];
  const box = (x, y, z, w, h, d, c, e) =>
    parts.push({ t: "box", p: [x, y, z], s: [w, h, d], c, ...(e ? { e: true } : {}) });
  const cyl = (cx, y, cz, r, h, c, n, e) =>
    parts.push({ t: "cyl", p: [cx, y, cz], r, h, c, n, ...(e ? { e: true } : {}) });

  // walls: always a light plaster so the dark timber shopfront and the roof keep their value steps
  const [wh, ws, wl] = toHsl(safe(p.wall, "#F3E3C8"));
  const wall = toHex(wh, Math.min(ws, 0.7), clamp(wl, 0.82, 0.93));
  // trim: small dark accents; roof: a mid-value, desaturated slate from the same hue
  const [th, ts, tl] = toHsl(safe(p.trim, "#5B6270"));
  const trim = toHex(th, Math.min(ts, 0.3), clamp(tl, 0.2, 0.4));
  const roofC = toHex(th, Math.min(ts, 0.22), clamp(tl, 0.36, 0.48));
  // noren: snapped to traditional dyes (beni, shu, kaki, ai, matcha, murasaki), mid value
  let [ch, cs, cl] = toHsl(safe(p.curtain, "#E5484D"));
  if (cs < 0.12) ch = 358;
  ch = snap(ch, [358, 12, 25, 215, 150, 275]);
  const curtain = toHex(ch, clamp(cs, 0.5, 0.78), clamp(cl, 0.3, 0.6));
  // sign: a light warm board (amber to cream) so the dark pictogram always reads
  const [sh, ss, sl] = toHsl(safe(p.sign, "#F2B33D"));
  const sign = ss < 0.15
    ? toHex(40, 0.45, clamp(sl, 0.82, 0.92))
    : toHex(sh >= 25 && sh <= 55 ? sh : 42, clamp(ss, 0.6, 0.9), clamp(sl, 0.58, 0.75));

  // fixed materials (no role: Brand Mode can never recolour them)
  const wood = "#8A6E52", woodDark = "#5E4A3A", glass = "#7E93A8", lit = "#FFD58A", paper = "#F6EEE0";
  const steel = "#D8DEE3", kerb = "#BFC3CA";
  const lanternRed = "#E5484D", lanternLit = "#FF6B4A", ribRed = "#C8553D";
  const haloOuter = "#B8915F", haloInner = "#E3B877";

  const W = 3.6, D = 4.8, x0 = 0.2, z0 = 0.8;
  const FLOOR = 2.6, GROUND = 3.1, BASE = 0.15;
  const floors = clamp(Math.round(p.floors), 1, 3);
  const top = BASE + GROUND + (floors - 1) * FLOOR;
  const EY = 2.85, ED = 0.6; // shopfront eave height and half-depth
  const L = !!p.lights;
  const X = (u) => x0 + u;

  // plinth and body
  box(x0 - 0.15, 0, z0 - 0.15, W + 0.3, BASE, D + 0.3, kerb);
  box(x0, BASE, z0, W, top - BASE, D, wall);

  // ground-floor timber cladding, wrapping the front and the street-side wall, with corner posts
  box(x0, BASE, z0 - 0.04, W, EY - BASE, 0.04, wood);
  box(x0 - 0.04, BASE, z0, 0.04, EY - BASE, D, wood);
  box(x0 - 0.08, BASE, z0 - 0.08, 0.14, EY - BASE, 0.14, woodDark);
  box(x0 + W - 0.06, BASE, z0 - 0.08, 0.1, EY - BASE, 0.12, woodDark);

  // shop window with koshi lattice
  const wx = X(0.3), ww = 1.5, wy = 0.8, wH = 0.85;
  box(wx, wy, z0 - 0.08, ww, wH, 0.04, L ? lit : glass, L);
  for (let i = 0; i <= 5; i++) box(wx + i * (ww - 0.05) / 5, wy, z0 - 0.11, 0.05, wH, 0.03, woodDark);
  box(wx, wy + wH / 2 - 0.025, z0 - 0.11, ww, 0.05, 0.03, woodDark);
  box(wx - 0.08, wy + wH, z0 - 0.12, ww + 0.16, 0.07, 0.08, woodDark); // head
  box(wx - 0.1, wy - 0.08, z0 - 0.16, ww + 0.2, 0.08, 0.12, woodDark); // sill

  // sliding lattice door, glowing from inside when lit
  const dx = X(2.05);
  box(dx - 0.08, BASE, z0 - 0.09, 0.08, 2.1, 0.05, woodDark);
  box(dx + 0.9, BASE, z0 - 0.09, 0.08, 2.1, 0.05, woodDark);
  box(dx - 0.08, BASE + 2.1, z0 - 0.09, 1.06, 0.08, 0.05, woodDark);
  box(dx, BASE, z0 - 0.07, 0.9, 2.1, 0.03, L ? lit : "#4E3E32", L);
  for (const bx of [0.29, 0.59]) box(dx + bx, BASE, z0 - 0.09, 0.04, 2.1, 0.02, woodDark);
  for (const by of [0.75, 1.45]) box(dx, BASE + by, z0 - 0.09, 0.9, 0.04, 0.02, woodDark);

  // noren: rod plus four long split strips with gaps that show the door behind, a white mon on each
  box(dx - 0.06, BASE + 2.15, z0 - 0.2, 1.02, 0.07, 0.11, wood);
  for (let i = 0; i < 4; i++) {
    const sx = dx - 0.04 + i * 0.26;
    box(sx, 1.25, z0 - 0.17, 0.2, 1.05, 0.04, curtain);
    box(sx + 0.05, 1.82, z0 - 0.19, 0.1, 0.1, 0.02, paper);
  }

  // lean-to eave over the window and door (half a gable sunk into the wall); stops short of the sign
  parts.push({ t: "gable", p: [x0 - 0.15, EY, z0 - ED], s: [3.35, 0.4, ED * 2], c: roofC, axis: "x" });

  // red chochin lanterns in a clean row over the window, clear of the noren; lit ones wash the timber
  const n = clamp(Math.round(p.lanterns), 0, 4);
  const step = n > 1 ? Math.min(0.6, 1.5 / (n - 1)) : 0;
  for (let i = 0; i < n; i++) {
    const cx = X(0.95 + (i - (n - 1) / 2) * step), cz = z0 - 0.25, r = 0.16;
    box(cx - 0.015, 2.45, cz - 0.015, 0.03, EY - 2.45, 0.03, trim); // cord up into the eave
    cyl(cx, 2.4, cz, r * 0.75, 0.05, trim, 8);
    cyl(cx, 1.97, cz, r, 0.43, L ? lanternLit : lanternRed, 10, L);
    cyl(cx, 2.08, cz, r + 0.012, 0.03, ribRed, 10);
    cyl(cx, 2.28, cz, r + 0.012, 0.03, ribRed, 10);
    box(cx - 0.05, 2.12, cz - r - 0.03, 0.1, 0.14, 0.05, L ? lit : paper, L); // glowing paper panel
    cyl(cx, 1.92, cz, r * 0.75, 0.05, trim, 8);
    box(cx - 0.025, 1.8, cz - 0.025, 0.05, 0.12, 0.05, ribRed); // tassel
    if (L) {
      // halo where the lantern sits against the wall in the 45-degree view, clipped clear of the door
      const hx = cx + 0.25, hw = Math.min(0.5, (step || 0.6) - 0.06);
      const l0 = Math.max(x0 + 0.08, hx - hw / 2), r0 = Math.min(X(1.95), hx + hw / 2);
      if (r0 - l0 > 0.1) box(l0, 1.75, z0 - 0.06, r0 - l0, 0.85, 0.02, haloOuter, true);
      const l1 = Math.max(x0 + 0.1, hx - 0.14), r1 = Math.min(X(1.93), hx + 0.14);
      if (r1 - l1 > 0.06) box(l1, 1.85, z0 - 0.08, r1 - l1, 0.55, 0.02, haloInner, true);
    }
  }

  // bench out front, 0.45 m seat
  for (const bx of [X(0.4), X(1.4)]) box(bx, 0, z0 - 0.75, 0.08, 0.4, 0.3, wood);
  box(X(0.35), 0.4, z0 - 0.78, 1.2, 0.06, 0.36, wood);

  // tall standing sign anchored on the pavement: lit board with a ramen-bowl pictogram on both faces
  const sxs = X(3.25), sT = floors === 1 ? 3.15 : 3.5, sZ = z0 - 0.75, sD = 0.75;
  box(sxs - 0.1, 0, sZ - 0.04, 0.35, 0.2, sD + 0.04, woodDark); // foot
  box(sxs, 0.2, sZ, 0.15, sT - 0.2, sD, sign, L);
  box(sxs - 0.04, sT, sZ - 0.04, 0.23, 0.08, sD + 0.04, trim); // cap
  const face = (u, v, w, h, c, layer) => {
    const k = layer ? 0.02 : 0;
    box(sxs - 0.03 - k, v, sZ + u, 0.03, h, w, c);
    box(sxs + 0.15 + k, v, sZ + (sD - u - w), 0.03, h, w, c);
  };
  face(0, 0.2, sD, 0.25, trim, 0); // base band
  face(0, sT - 0.2, sD, 0.2, trim, 0); // head band
  // bowl with steam and chopsticks
  face(0.1, 1.9, 0.55, 0.07, trim, 0);
  face(0.15, 1.73, 0.45, 0.17, trim, 0);
  face(0.22, 1.64, 0.31, 0.09, trim, 0);
  face(0.29, 1.58, 0.17, 0.06, trim, 0);
  face(0.18, 2.07, 0.05, 0.26, trim, 0);
  face(0.31, 2.13, 0.05, 0.26, trim, 0);
  face(0.44, 2.07, 0.05, 0.26, trim, 0);
  face(0.54, 1.97, 0.04, 0.45, trim, 0);
  face(0.61, 1.97, 0.04, 0.4, trim, 0);
  face(0.12, 1.4, 0.51, 0.05, trim, 0); // divider
  // stepped round mon in the noren colour with a paper centre
  face(0.11, 0.83, 0.53, 0.24, curtain, 0);
  face(0.17, 0.71, 0.41, 0.12, curtain, 0);
  face(0.17, 1.07, 0.41, 0.12, curtain, 0);
  face(0.25, 0.63, 0.25, 0.08, curtain, 0);
  face(0.25, 1.19, 0.25, 0.08, curtain, 0);
  face(0.305, 0.88, 0.14, 0.14, paper, 1);

  // side windows: framed with lattice, sill and head to match the front
  const sideWindow = (y, zc, w, h, on, clad) => {
    const o = clad ? 0.04 : 0;
    box(x0 - o - 0.04, y, zc - w / 2, o + 0.04, h, w, on ? lit : glass, on);
    for (let i = 0; i <= 3; i++) box(x0 - o - 0.07, y, zc - w / 2 + i * (w - 0.05) / 3, 0.03, h, 0.05, woodDark);
    box(x0 - o - 0.07, y + h / 2 - 0.025, zc - w / 2, 0.03, 0.05, w, woodDark);
    box(x0 - o - 0.12, y - 0.08, zc - w / 2 - 0.08, o + 0.12, 0.08, w + 0.16, woodDark); // sill
    box(x0 - o - 0.08, y + h, zc - w / 2 - 0.05, o + 0.08, 0.07, w + 0.1, trim); // head
  };

  // street-side wall: board-and-batten timber, kitchen window, extractor with duct, downpipe
  for (let z = z0 + 0.95; z < z0 + D - 0.35; z += 0.45) {
    if (z > z0 + 2.75 && z < z0 + 4.05) continue;
    box(x0 - 0.07, BASE + 0.1, z, 0.03, EY - BASE - 0.2, 0.05, woodDark);
  }
  sideWindow(1.0, z0 + 3.4, 1.0, 0.85, L, true);
  box(x0 - 0.32, 2.0, z0 + 0.25, 0.28, 0.55, 0.55, steel);
  box(x0 - 0.35, 2.07, z0 + 0.32, 0.03, 0.41, 0.41, trim);
  for (let k = 0; k < 3; k++) box(x0 - 0.37, 2.15 + k * 0.12, z0 + 0.32, 0.02, 0.04, 0.41, steel);
  const ductTop = p.roof === "gable" ? top : top + 0.7;
  box(x0 - 0.2, 2.55, z0 + 0.46, 0.12, ductTop - 2.55, 0.12, steel);
  if (p.roof !== "gable") box(x0 - 0.25, ductTop, z0 + 0.41, 0.22, 0.08, 0.22, trim);
  box(x0 - 0.12, BASE, z0 + D - 0.3, 0.1, top - BASE, 0.1, trim);

  // upper floors: timber floor band wrapping the corner, wide lattice window with hisashi, small window,
  // two framed side windows per floor
  for (let f = 1; f < floors; f++) {
    const fy = BASE + GROUND + (f - 1) * FLOOR;
    box(x0 - 0.06, fy - 0.12, z0 - 0.06, W + 0.12, 0.12, 0.06, wood);
    box(x0 - 0.06, fy - 0.12, z0, 0.06, 0.12, D, wood);
    const on = L && (f * 7 + floors) % 3 !== 1;
    const ux = X(0.45), uw = 2.0, uy = fy + 0.6;
    box(ux, uy, z0 - 0.04, uw, 1.2, 0.04, on ? lit : glass, on);
    for (let i = 0; i <= 6; i++) box(ux + i * (uw - 0.05) / 6, uy, z0 - 0.07, 0.05, 1.2, 0.03, woodDark);
    box(ux - 0.1, uy - 0.1, z0 - 0.2, uw + 0.2, 0.1, 0.2, trim);
    box(ux - 0.15, uy + 1.2, z0 - 0.32, uw + 0.3, 0.08, 0.32, roofC); // hisashi
    const on2 = L && !on;
    box(X(2.8), uy + 0.2, z0 - 0.04, 0.5, 0.8, 0.04, on2 ? lit : glass, on2);
    box(X(2.8) + 0.225, uy + 0.2, z0 - 0.07, 0.05, 0.8, 0.03, woodDark);
    box(X(2.75), uy + 0.12, z0 - 0.12, 0.6, 0.08, 0.12, trim);
    sideWindow(uy, z0 + 1.6, 0.9, 1.1, on2, false);
    sideWindow(uy, z0 + 3.6, 0.9, 1.1, on, false);
  }

  // roof
  if (p.roof === "gable") {
    parts.push({ t: "gable", p: [x0 - 0.2, top, z0 - 0.2], s: [W + 0.4, 1.5, D + 0.4], c: roofC, axis: "x" });
    box(x0 - 0.25, top + 1.42, z0 + D / 2 - 0.12, W + 0.5, 0.14, 0.24, trim); // ridge cap
    cyl(X(W - 0.7), top + 0.6, z0 + D - 1.0, 0.22, 1.4, steel, 8); // soup-steam flue
    cyl(X(W - 0.7), top + 2.0, z0 + D - 1.0, 0.3, 0.08, trim, 8);
  } else {
    box(x0 - 0.1, top, z0 - 0.1, W + 0.2, 0.3, D + 0.2, roofC);
    box(X(0.6), top + 0.3, z0 + 2.4, 1.2, 0.6, 1.2, steel);
    cyl(X(W - 0.7), top + 0.3, z0 + D - 1.0, 0.22, 1.2, steel, 8);
    cyl(X(W - 0.7), top + 1.5, z0 + D - 1.0, 0.32, 0.1, trim, 8); // flue cap
  }

  return { parts };
}
