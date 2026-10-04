// Town Windmill: a smock mill with a square base, a tapered weatherboard tower, a turning cap and four lattice
// sails. Block asset: build(p) returns parts in metres on the Oasis Town grid (origin at the footprint's corner,
// y up, street side at z = 0).
export const meta = {
  title: "Town Windmill",
  kind: "3d",
  format: "blocks",
  kit: "Oasis Town",
  description: "A smock windmill with a square base, a tapered weatherboard tower, a domed cap and four lattice sails facing the street, a landmark for the edge of a little town.",
  tags: ["3d", "low poly", "windmill", "mill", "farm", "landmark", "town", "kit", "block"],
  price: 3,
  author: "oasis-factory",
  footprint: [4, 4],
  size: [1000, 1000],
};

export const params = {
  knobs: {
    tower: { type: "color", role: "surface", label: "Tower", default: "#F6EEE0" },
    sails: { type: "color", role: "primary", label: "Sail cloth", default: "#E5484D" },
    cap: { type: "color", role: "ink", label: "Cap & hub", default: "#5B6270" },
    height: { type: "range", label: "Tower height (m)", default: 7.5, min: 6.5, max: 9.5, step: 0.5 },
    angle: { type: "range", label: "Sail angle (deg)", default: 0, min: 0, max: 45, step: 5 },
    capStyle: { type: "choice", label: "Cap", default: "dome", options: ["dome", "conical"] },
    lights: { type: "toggle", label: "Lit windows", default: true },
  },
  presets: {
    Polder: { tower: "#D8DEE3", sails: "#F6EEE0", cap: "#2F7A55" },
    Harvest: { tower: "#F3E3C8", sails: "#F2B33D", cap: "#C8553D" },
    Blossom: { tower: "#F6EEE0", sails: "#F7B8CF", cap: "#3D2C4A" },
  },
};

// ---- colour helpers: pull brand colours toward the town palette, then clamp them into each slot's tonal band ----
const toRgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
const toHex = (c) => "#" + c.map((v) => Math.round(Math.max(0, Math.min(1, v)) * 255).toString(16).padStart(2, "0")).join("").toUpperCase();
const lum = (h) => { const [r, g, b] = toRgb(h); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const shade = (h, amt) => {
  const c = toRgb(h);
  return lum(h) > 0.5 ? toHex(c.map((v) => v * (1 - amt))) : toHex(c.map((v) => v + (1 - v) * amt));
};
const pull = (h, list, t) => {
  const a = toRgb(h);
  let best = list[0], bd = Infinity;
  for (const k of list) {
    const b = toRgb(k);
    const d = (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;
    if (d < bd) { bd = d; best = k; }
  }
  const b = toRgb(best);
  return toHex(a.map((v, i) => v + (b[i] - v) * t));
};
const clampHSL = (h, lo, hi, smax) => {
  const [r, g, b] = toRgb(h);
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  let l = (mx + mn) / 2, s = 0, hue = 0;
  if (d > 0) {
    s = d / (1 - Math.abs(2 * l - 1));
    if (mx === r) hue = ((g - b) / d) % 6; else if (mx === g) hue = (b - r) / d + 2; else hue = (r - g) / d + 4;
    hue *= 60; if (hue < 0) hue += 360;
  }
  l = Math.max(lo, Math.min(hi, l));
  s = Math.min(smax, s);
  const C = (1 - Math.abs(2 * l - 1)) * s, X = C * (1 - Math.abs(((hue / 60) % 2) - 1)), m = l - C / 2;
  const t = [[C, X, 0], [X, C, 0], [0, C, X], [0, X, C], [X, 0, C], [C, 0, X]][Math.floor(hue / 60) % 6];
  return toHex(t.map((v) => v + m));
};
const WALLS = ["#F3E3C8", "#F6EEE0", "#D8DEE3", "#E3F2EA", "#F2E6EE"];
const CLOTHS = ["#E5484D", "#F2B33D", "#F7B8CF", "#F6EEE0", "#3E7BFA", "#79B86A", "#2F7A55", "#C8553D"];
const INKS = ["#5B6270", "#2F7A55", "#C8553D", "#3D2C4A", "#3B4A44", "#8A6E52", "#2B4A7A"];

export function build(p) {
  const parts = [];
  const box = (x, y, z, w, h, d, c, e) => parts.push({ t: "box", p: [x, y, z], s: [w, h, d], c, ...(e ? { e: true } : {}) });
  const cyl = (cx, y, cz, r, h, c, n) => parts.push({ t: "cyl", p: [cx, y, cz], r, h, c, n });
  const cone = (cx, y, cz, r, h, c, n) => parts.push({ t: "cone", p: [cx, y, cz], r, h, c, n });

  // colours: light wall tower, mid-tone cloth, dark ink cap, all kept near the town palette
  const tower = clampHSL(pull(p.tower, WALLS, 0.5), 0.78, 0.95, 0.45);
  const sail = clampHSL(pull(p.sails, CLOTHS, 0.55), 0.45, 0.85, 0.65);
  const cap = clampHSL(pull(p.cap, INKS, 0.5), 0.22, 0.45, 0.5);
  const capLight = shade(cap, 0.24);
  const baseC = shade(tower, 0.07);
  const band = shade(tower, 0.16);
  const trim = shade(tower, 0.3);
  const wood = "#8A6E52", darkWood = "#6E5640", glass = "#7E93A8", lit = "#FFD58A", stone = "#C9CED6";
  const frameC = Math.abs(lum(sail) - lum(darkWood)) < 0.14 ? "#3A2E22" : darkWood;
  const g = p.lights ? lit : glass;

  const CX = 2, CZ = 2.1, PL = 0.12;
  const H = p.height;

  // ground: paving over the whole plot, flour sacks by the door
  box(0, 0, 0, 4, PL, 4, "#D9DCE1");
  box(0.6, PL, 0.1, 0.45, 0.42, 0.42, "#E8DCC2");
  box(0.66, PL + 0.42, 0.15, 0.34, 0.3, 0.32, "#DCCFB2");

  // square base storey with corner pilasters and a cornice
  const BY = 2.6;
  box(0.5, PL, 0.6, 3.0, BY, 3.0, baseC);
  for (const [px, pz] of [[0.47, 0.57], [3.33, 0.57], [0.47, 3.23], [3.33, 3.23]]) box(px, PL, pz, 0.2, BY, 0.2, band);
  box(0.4, PL + BY, 0.5, 3.2, 0.2, 3.2, band);

  // door set between jambs and under a lintel, on a step
  box(CX - 0.7, PL, 0.2, 1.4, 0.1, 0.4, stone);
  box(CX - 0.6, PL + 0.1, 0.52, 0.15, 2.0, 0.08, trim);
  box(CX + 0.45, PL + 0.1, 0.52, 0.15, 2.0, 0.08, trim);
  box(CX - 0.65, PL + 2.1, 0.52, 1.3, 0.22, 0.08, trim);
  box(CX - 0.45, PL + 0.1, 0.57, 0.9, 2.0, 0.03, wood);
  box(CX - 0.45, PL + 1.05, 0.55, 0.9, 0.08, 0.02, darkWood);
  box(CX + 0.25, PL + 0.85, 0.53, 0.08, 0.08, 0.04, "#3A3F48");
  // lantern on a bracket beside the door
  box(CX + 0.78, PL + 2.05, 0.4, 0.06, 0.06, 0.2, darkWood);
  box(CX + 0.72, PL + 1.72, 0.38, 0.18, 0.33, 0.18, p.lights ? lit : "#D9DCE1", p.lights);

  // base windows: one on the front, two on the -x side; all lit or all dark together
  box(0.75, PL + 1.15, 0.56, 0.55, 0.85, 0.04, trim);
  box(0.84, PL + 1.25, 0.53, 0.37, 0.65, 0.04, g, p.lights);
  box(0.71, PL + 1.1, 0.5, 0.63, 0.06, 0.1, band);
  for (const zc of [1.4, 2.75]) {
    box(0.46, PL + 1.15, zc - 0.3, 0.04, 0.85, 0.6, trim);
    box(0.43, PL + 1.25, zc - 0.2, 0.04, 0.65, 0.4, g, p.lights);
    box(0.41, PL + 1.1, zc - 0.35, 0.09, 0.06, 0.7, band);
  }

  // tapered weatherboard smock: thin octagonal courses shrinking evenly to the top
  const yS = PL + BY + 0.2, top = PL + H, len = top - yS;
  const r0 = 1.42, rTop = 0.9;
  const N = Math.max(6, Math.round(len / 0.45)), sh = len / N;
  const rAt = (i) => r0 + ((rTop - r0) * Math.max(0, Math.min(N - 1, i))) / (N - 1);
  for (let i = 0; i < N; i++) cyl(CX, yS + i * sh, CZ, rAt(i), sh, tower, 8);

  // cap: curb ring, cap house, then a dome or a conical roof, all centred on the tower axis
  cyl(CX, top, CZ, rTop + 0.1, 0.22, cap, 8);
  const capY = top + 0.22;
  cyl(CX, capY, CZ, 0.95, 0.6, capLight, 8);
  const roofY = capY + 0.6;
  const roofH = p.capStyle === "dome" ? 0.95 : 1.9;
  cone(CX, roofY, CZ, 1.08, roofH, cap, p.capStyle === "dome" ? 12 : 8);
  cyl(CX, roofY + roofH - 0.12, CZ, 0.05, 0.3, capLight, 6);
  box(CX - 0.1, roofY + roofH + 0.18, CZ - 0.1, 0.2, 0.2, 0.2, capLight);
  const hubY = capY + 0.3;

  // sail geometry, fixed so every angle stays inside the 4 m plot
  const R = 1.85, SH = 0.07, CW = 0.6, A0 = 0.4;

  // smock windows: only where they sit fully below the sweep of the sails, front and -x side as a pair
  const FH = 0.8, FW = 0.6, limit = hubY - R - 1.0;
  let yW = yS + 0.45;
  for (let k = 0; k < 2 && yW + FH <= limit; k++, yW += FH + 0.9) {
    const rMax = rAt(Math.floor((yW - yS) / sh)), rMin = rAt(Math.floor((yW + FH - yS) / sh));
    const o = rMax + 0.04, in_ = 0.7 * rMin;
    box(CX - o, yW, CZ - FW / 2, o - in_, FH, FW, trim);
    box(CX - o - 0.03, yW + 0.1, CZ - FW / 2 + 0.1, 0.06, FH - 0.2, FW - 0.2, g, p.lights);
    box(CX - FW / 2, yW, CZ - o, FW, FH, o - in_, trim);
    box(CX - FW / 2 + 0.1, yW + 0.1, CZ - o - 0.03, FW - 0.2, FH - 0.2, 0.06, g, p.lights);
  }

  // windshaft and hub, the sail plane stands 0.8 m clear of the cap
  const ZH = 0.02, ZS = 0.12, ZC = 0.16, ZF = 0.21, ZB = 0.29, ZE = 0.33;
  box(CX - 0.1, hubY - 0.1, ZE, 0.2, 0.2, CZ - 0.6 - ZE, "#8C929C");
  box(CX - 0.24, hubY - 0.24, ZH, 0.48, 0.48, ZS - ZH, cap);

  // a rectangle in sail-local coords (a along the arm, q across it): one clean box when square to the axes,
  // otherwise thin slices cut across the arm's length so the edges step in fine increments
  const PITCH = 0.08;
  const rect = (c, s, cols, a0, a1, q0, q1, z0, z1, col) => {
    const pts = [[a0, q0], [a1, q0], [a1, q1], [a0, q1]].map(([a, q]) => [a * c - q * s, a * s + q * c]);
    if (Math.abs(c) < 1e-9 || Math.abs(s) < 1e-9) {
      const xs = pts.map((v) => v[0]), ys = pts.map((v) => v[1]);
      const xa = Math.min(...xs), xb = Math.max(...xs), ya = Math.min(...ys), yb = Math.max(...ys);
      box(CX + xa, hubY + ya, z0, xb - xa, yb - ya, z1 - z0, col);
      return;
    }
    const ax = cols ? 0 : 1;
    const lo = Math.min(...pts.map((v) => v[ax])), hi = Math.max(...pts.map((v) => v[ax]));
    const n = Math.max(1, Math.ceil((hi - lo) / PITCH)), w = (hi - lo) / n;
    for (let k = 0; k < n; k++) {
      const m = lo + (k + 0.5) * w;
      let mn = Infinity, mx = -Infinity;
      for (let e = 0; e < 4; e++) {
        const P = pts[e], Q = pts[(e + 1) % 4], d = Q[ax] - P[ax];
        if (Math.abs(d) < 1e-12) continue;
        const t = (m - P[ax]) / d;
        if (t < 0 || t > 1) continue;
        const v = P[1 - ax] + t * (Q[1 - ax] - P[1 - ax]);
        mn = Math.min(mn, v); mx = Math.max(mx, v);
      }
      if (!(mx - mn > 1e-6)) continue;
      if (cols) box(CX + lo + k * w, hubY + mn, z0, w, mx - mn, z1 - z0, col);
      else box(CX + mn, hubY + lo + k * w, z0, mx - mn, w, z1 - z0, col);
    }
  };

  // four sails: a stock, a timber frame on the trailing side and three cloth panels showing the lattice between
  const ang = (p.angle * Math.PI) / 180;
  const GAP = 0.08, IN = 0.07;
  for (let a = 0; a < 4; a++) {
    const c = Math.cos(ang + (a * Math.PI) / 2), s = Math.sin(ang + (a * Math.PI) / 2);
    const cols = Math.abs(c) >= Math.abs(s);
    rect(c, s, cols, -0.1, R, -SH, SH, ZS, ZE, darkWood);
    rect(c, s, cols, A0, R, SH, SH + CW, ZF, ZB, frameC);
    const ca0 = A0 + IN, ca1 = R - IN, pl = (ca1 - ca0 - 2 * GAP) / 3;
    for (let k = 0; k < 3; k++) {
      const p0 = ca0 + k * (pl + GAP);
      rect(c, s, cols, p0, p0 + pl, SH + IN, SH + CW - IN, ZC, ZF, sail);
    }
  }

  return { parts };
}
