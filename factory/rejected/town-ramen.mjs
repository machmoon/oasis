// Ramen Shop: a narrow noodle bar with a split noren curtain over a sliding door, a tall ラーメン blade sign above the
// eave and a row of red paper lanterns that glow at night. Block asset: build(p) returns parts in metres on the
// Oasis Town grid (origin at the footprint's corner, y up, street side at z = 0).
export const meta = {
  title: "Ramen Shop",
  kind: "3d",
  format: "blocks",
  kit: "Oasis Town",
  description: "A narrow ramen bar with a split noren curtain, a tall ラーメン blade sign and glowing red paper lanterns, sized to sit between town shops.",
  tags: ["3d", "low poly", "building", "ramen", "restaurant", "noodle bar", "japanese", "town", "kit"],
  price: 3,
  author: "oasis-factory",
  footprint: [6, 6],
  size: [1000, 1000],
};

export const params = {
  knobs: {
    wall: { type: "color", role: "surface", label: "Walls", default: "#F6EEE0" },
    curtain: { type: "color", role: "primary", label: "Noren curtain", default: "#E5484D" },
    trim: { type: "color", role: "ink", label: "Trim & roof", default: "#5B6270" },
    sign: { type: "color", role: "highlight", label: "Sign", default: "#F2B33D" },
    lanterns: { type: "range", label: "Lanterns", default: 3, min: 0, max: 4, step: 1 },
    floors: { type: "range", label: "Floors", default: 2, min: 1, max: 3, step: 1 },
    roof: { type: "choice", label: "Roof", default: "gable", options: ["gable", "flat"] },
    lights: { type: "toggle", label: "Lights", default: true },
  },
  presets: {
    Tonkotsu: { wall: "#F3E3C8", curtain: "#2F3E6B", trim: "#3B3A45", sign: "#F7B8CF" },
    Miso: { wall: "#D8DEE3", curtain: "#2F7A55", trim: "#3B4A44", sign: "#FFD166" },
    Shio: { wall: "#EAF0F4", curtain: "#3E7BFA", trim: "#4A5566", sign: "#E5484D" },
  },
};

export function build(p) {
  const parts = [];
  const box = (x, y, z, w, h, d, c, e) =>
    parts.push({ t: "box", p: [x, y, z], s: [w, h, d], c, ...(e ? { e: true } : {}) });
  const cyl = (cx, y, cz, r, h, c, n) => parts.push({ t: "cyl", p: [cx, y, cz], r, h, c, n });

  // ---- colour guards: brand colours stay legible, warm and on-kit ----
  const rgb = (c) => {
    const s = typeof c === "string" && /^#[0-9a-fA-F]{6}$/.test(c) ? c : "#808080";
    return [1, 3, 5].map((i) => parseInt(s.slice(i, i + 2), 16) / 255);
  };
  const lum = (a) => 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
  const hex = (a) => "#" + a.map((v) => Math.round(Math.max(0, Math.min(1, v)) * 255).toString(16).padStart(2, "0")).join("").toUpperCase();
  const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
  const capChroma = (a, m) => {
    const c = Math.max(...a) - Math.min(...a);
    if (c <= m) return a;
    const g = lum(a);
    return mix(a, [g, g, g], 1 - m / c);
  };
  const fitLum = (a, lo, hi, liftTo) => {
    const L = lum(a);
    if (L > hi) return a.map((v) => (v * hi) / L);
    if (L < lo) { const b = liftTo || [1, 1, 1], Lb = lum(b); return mix(a, b, (lo - L) / (Lb - L)); }
    return a;
  };
  const cream = rgb("#F6EEE0");
  const wallC = hex(fitLum(capChroma(rgb(p.wall), 0.3), 0.6, 1, cream));
  const roofC = hex(fitLum(capChroma(rgb(p.trim), 0.35), 0.28, 0.5));
  const curA = fitLum(capChroma(rgb(p.curtain), 0.65), 0.05, 0.38);
  const curtainC = hex(curA);
  const hemC = hex(lum(curA) < 0.12 ? mix(curA, [1, 1, 1], 0.18) : curA.map((v) => v * 0.7));
  const signA = fitLum(capChroma(rgb(p.sign), 0.65), 0.35, 0.85);
  const signC = hex(signA);
  const glyphC = lum(signA) < 0.45 ? "#FBF6EC" : "#2A2D35";
  const crestC = "#FBFBFB";

  const glass = "#7E93A8", lit = "#FFD58A", wood = "#8A6E52", leaf = "#79B86A", leaf2 = "#5E9C52";
  const kerb = "#D9DCE1", metal = "#9AA1AB", capC = "#3A3F4A";
  const paperOff = "#D9573F", paperOn = "#FFA45C"; // red paper, and its own warm glow
  const floors = Math.max(1, Math.min(3, Math.round(p.floors)));
  const nLan = Math.max(0, Math.min(4, Math.round(p.lanterns)));
  const L = !!p.lights;

  // narrow, deep massing: 3.7 m frontage on the 6 m lot
  const W = 3.7, D = 4.85, x0 = 1.15, z0 = 1.0, B = 0.15;
  const GROUND = 3.1, FLOOR = 2.6;
  const H = GROUND + (floors - 1) * FLOOR;
  const top = B + H;

  // ---- window helpers: front face (z0) and visible side face (x0) ----
  const frontWin = (xl, y, w, h) => {
    box(xl - 0.08, y - 0.08, z0 - 0.04, w + 0.16, h + 0.16, 0.04, wood);
    box(xl, y, z0 - 0.06, w, h, 0.02, L ? lit : glass, L);
    box(xl + w / 2 - 0.02, y, z0 - 0.08, 0.04, h, 0.02, wood);
    box(xl, y + h / 2 - 0.02, z0 - 0.08, w, 0.04, 0.02, wood);
  };
  const sideWin = (y, zc, w, h) => {
    box(x0 - 0.04, y - 0.08, zc - w / 2 - 0.08, 0.04, h + 0.16, w + 0.16, wood);
    box(x0 - 0.06, y, zc - w / 2, 0.02, h, w, L ? lit : glass, L);
    box(x0 - 0.08, y, zc - 0.02, 0.02, h, 0.04, wood);
    box(x0 - 0.08, y + h / 2 - 0.02, zc - w / 2, 0.02, 0.04, w, wood);
    box(x0 - 0.2, y - 0.14, zc - w / 2 - 0.12, 0.16, 0.06, w + 0.24, wood); // sill
  };

  // ---- plinth and body, storey by storey ----
  box(x0 - 0.15, 0, z0 - 0.15, W + 0.3, B, D + 0.3, kerb);
  box(x0, B, z0, W, GROUND, D, wallC);
  for (let f = 1; f < floors; f++) box(x0, B + GROUND + (f - 1) * FLOOR, z0, W, FLOOR, D, wallC);

  // ---- ground floor: noren door (left), shop window (right) ----
  const dx = x0 + 0.4, dw = 1.0, dh = 2.1;
  box(dx - 0.05, 0, z0 - 0.5, dw + 0.1, 0.1, 0.35, kerb); // stepping stone
  box(x0, B, z0 - 0.03, dx - x0, 0.6, 0.03, wood); // wainscot
  box(dx + dw, B, z0 - 0.03, x0 + W - (dx + dw), 0.6, 0.03, wood);
  box(dx, B, z0 - 0.04, dw, dh, 0.06, wood); // sliding door
  for (const px of [0.1, 0.55]) box(dx + px, 0.85, z0 - 0.07, 0.35, 1.2, 0.03, L ? lit : glass, L);
  box(dx + 0.47, 0.85, z0 - 0.08, 0.06, 1.2, 0.01, wood);

  // noren: rod on brackets, four separate strips with open gaps, staggered depth, dark hem, split white crest
  const nx0 = x0 + 0.25, nx1 = x0 + 1.55, ns = 4, gap = 0.07;
  const sw = (nx1 - nx0 - gap * (ns - 1)) / ns;
  const rodY = 2.45, nb = 1.35;
  box(nx0 - 0.05, rodY, z0 - 0.36, nx1 - nx0 + 0.1, 0.08, 0.1, wood);
  for (const bx of [nx0 - 0.05, nx1]) box(bx, rodY, z0 - 0.26, 0.05, 0.08, 0.26, wood);
  const ncx = (nx0 + nx1) / 2;
  for (let i = 0; i < ns; i++) {
    const sx = nx0 + i * (sw + gap);
    const zf = z0 - 0.3 - (i % 2) * 0.03;
    box(sx, nb, zf, sw, rodY - nb, 0.03, curtainC);
    box(sx, rodY - 0.14, zf - 0.01, sw, 0.14, 0.01, hemC);
    for (const [hw, y0, hh] of [[0.24, 1.9, 0.24], [0.15, 1.82, 0.4]]) {
      const l = Math.max(sx, ncx - hw), r = Math.min(sx + sw, ncx + hw);
      if (r - l > 0.01) box(l, y0, zf - 0.02, r - l, hh, 0.02, crestC);
    }
  }

  // shop window with lattice and sill
  const wx = x0 + 1.85, ww = 1.6, wy = 0.9, wh = 1.2;
  box(wx, wy, z0 - 0.04, ww, wh, 0.06, wood);
  box(wx + 0.08, wy + 0.08, z0 - 0.07, ww - 0.16, wh - 0.16, 0.03, L ? lit : glass, L);
  for (const fx of [1 / 3, 2 / 3]) box(wx + ww * fx - 0.025, wy + 0.08, z0 - 0.09, 0.05, wh - 0.16, 0.02, wood);
  box(wx + 0.08, wy + wh / 2, z0 - 0.09, ww - 0.16, 0.05, 0.02, wood);
  box(wx - 0.05, wy - 0.12, z0 - 0.2, ww + 0.1, 0.08, 0.2, wood);

  // kitchen window on the visible side wall
  sideWin(1.0, z0 + 2.9, 1.4, 1.0);

  // shallow eave: high and short so the noren reads fully beneath it
  const eY = 2.8, eD = 0.55;
  box(x0, eY, z0 - eD, W, 0.15, eD, roofC);
  box(x0, eY - 0.06, z0 - eD, W, 0.06, 0.06, roofC);

  // paper lanterns: hung on arms in front of the eave, right of the noren, never over door or sign
  const lz = z0 - 0.78, zoneL = x0 + 1.99, zoneR = x0 + W - 0.25, step = (zoneR - zoneL) / 3;
  const zoneC = (zoneL + zoneR) / 2;
  for (let i = 0; i < nLan; i++) {
    const cx = zoneC + (i - (nLan - 1) / 2) * step;
    const drop = i % 2 ? 0.1 : 0;
    const yT = eY - 0.12 - drop;
    const body = L ? paperOn : paperOff;
    box(cx - 0.03, eY + 0.04, lz - 0.03, 0.06, 0.06, z0 - eD - (lz - 0.03), wood); // arm off the eave face
    box(cx - 0.015, yT, lz - 0.015, 0.03, eY + 0.04 - yT, 0.03, capC); // cord
    box(cx - 0.12, yT - 0.06, lz - 0.12, 0.24, 0.06, 0.24, capC);
    let y = yT - 0.06;
    for (const [a, b, h] of [[0.34, 0.2, 0.13], [0.44, 0.26, 0.32], [0.34, 0.2, 0.13]]) {
      y -= h;
      box(cx - a / 2, y, lz - b / 2, a, h, b, body, L);
      box(cx - b / 2, y, lz - a / 2, b, h, a, body, L);
    }
    box(cx - 0.12, y - 0.06, lz - 0.12, 0.24, 0.06, 0.24, capC);
  }

  // ---- upper floors ----
  for (let f = 1; f < floors; f++) {
    const yb = B + GROUND + (f - 1) * FLOOR;
    box(x0 - 0.03, yb - 0.06, z0 - 0.03, W + 0.06, 0.12, 0.03, roofC);
    box(x0 - 0.03, yb - 0.06, z0 + D, W + 0.06, 0.12, 0.03, roofC);
    box(x0 - 0.03, yb - 0.06, z0, 0.03, 0.12, D, roofC);
    box(x0 + W, yb - 0.06, z0, 0.03, 0.12, D, roofC);
    const y = yb + 0.65;
    for (const xl of [x0 + 1.15, x0 + 2.5]) {
      frontWin(xl, y, 0.95, 1.2);
      box(xl - 0.1, y - 0.36, z0 - 0.32, 1.15, 0.24, 0.28, wood); // planter
      box(xl - 0.04, y - 0.13, z0 - 0.28, 0.4, 0.14, 0.22, leaf);
      box(xl + 0.34, y - 0.13, z0 - 0.27, 0.32, 0.2, 0.2, leaf2);
      box(xl + 0.64, y - 0.13, z0 - 0.28, 0.35, 0.11, 0.22, leaf);
    }
    sideWin(y, z0 + 1.5, 1.0, 1.2);
    sideWin(y, z0 + 3.5, 1.0, 1.2);
  }

  // ---- blade sign: near corner, standing on the eave, nothing in front of its street face ----
  const sb = eY + 0.15;
  const sTop = floors === 1 ? top + 1.5 : Math.min(top - 0.35, sb + 3.0);
  const sh = sTop - sb;
  const sx = x0 + 0.2, sz0 = z0 - 0.82, sz1 = z0 - 0.24;
  box(sx, sb, sz0, 0.14, sh, sz1 - sz0, roofC);
  box(sx - 0.04, sTop, sz0 - 0.04, 0.22, 0.06, sz1 - sz0 + 0.08, roofC);
  const brackets = floors === 1 ? [sb + 0.1] : [sb + 0.1, sTop - 0.35];
  for (const by of brackets) box(sx + 0.03, by, sz1, 0.08, 0.08, z0 - sz1, roofC);
  const pz0 = sz0 + 0.05, pz1 = sz1 - 0.05, py0 = sb + 0.06, ph = sh - 0.12;
  box(sx + 0.14, py0, pz0, 0.03, ph, pz1 - pz0, signC, L);
  box(sx - 0.03, py0, pz0, 0.03, ph, pz1 - pz0, signC, L);

  // ラ ー メ ン, top to bottom; rects are [u, v, w, h] in a unit cell (u to screen-right, v up)
  const GLY = [
    [[0.17, 0.83, 0.66, 0.17], [0.0, 0.5, 0.83, 0.17], [0.67, 0.25, 0.16, 0.42], [0.5, 0.12, 0.25, 0.2], [0.15, 0.0, 0.4, 0.15]],
    [[0.42, 0.05, 0.16, 0.9]],
    [[0.66, 0.8, 0.18, 0.2], [0.5, 0.6, 0.2, 0.22], [0.34, 0.4, 0.2, 0.22], [0.18, 0.2, 0.2, 0.22], [0.02, 0.0, 0.2, 0.22],
      [0.22, 0.56, 0.18, 0.18], [0.4, 0.4, 0.2, 0.18], [0.58, 0.22, 0.2, 0.2]],
    [[0.08, 0.7, 0.22, 0.2], [0.1, 0.02, 0.24, 0.18], [0.3, 0.14, 0.22, 0.2], [0.48, 0.3, 0.2, 0.22], [0.64, 0.48, 0.2, 0.24], [0.78, 0.68, 0.16, 0.22]],
  ];
  const avail = ph - 0.24;
  const pitch = Math.min(0.7, avail / 4);
  const cell = Math.min(0.4, pitch * 0.86);
  const blockTop = py0 + ph - 0.12 - (avail - 4 * pitch) / 2;
  const czc = (pz0 + pz1) / 2, cz0 = czc - cell / 2, cz1 = czc + cell / 2;
  for (let k = 0; k < 4; k++) {
    const cy = blockTop - (k + 0.5) * pitch - cell / 2;
    for (const [u, v, w, h] of GLY[k]) {
      box(sx - 0.05, cy + v * cell, cz1 - (u + w) * cell, 0.02, h * cell, w * cell, glyphC); // street face
      box(sx + 0.17, cy + v * cell, cz0 + u * cell, 0.02, h * cell, w * cell, glyphC); // back face
    }
  }

  // ---- roof and kitchen exhaust ----
  if (p.roof === "gable") {
    parts.push({ t: "gable", p: [x0 - 0.2, top, z0 - 0.2], s: [W + 0.4, 1.4, D + 0.4], c: roofC, axis: "x" });
    const stX = x0 + W - 0.7, stZ = z0 + D - 0.9;
    cyl(stX, top, stZ, 0.22, 1.6, metal, 8);
    parts.push({ t: "cone", p: [stX, top + 1.6, stZ], r: 0.32, h: 0.25, c: metal, n: 8 });
  } else {
    const deck = top + 0.2;
    box(x0 - 0.1, top, z0 - 0.1, W + 0.2, 0.2, D + 0.2, roofC);
    // parapet ring: front and back run full width, sides butt between them so corners close
    box(x0 - 0.1, deck, z0 - 0.1, W + 0.2, 0.3, 0.16, roofC);
    box(x0 - 0.1, deck, z0 + D - 0.06, W + 0.2, 0.3, 0.16, roofC);
    box(x0 - 0.1, deck, z0 + 0.06, 0.16, 0.3, D - 0.12, roofC);
    box(x0 + W - 0.06, deck, z0 + 0.06, 0.16, 0.3, D - 0.12, roofC);
    box(x0 + 0.6, deck, z0 + D - 2.3, 1.0, 0.6, 0.9, "#D8DEE3"); // rooftop unit, well inside the parapet
    const stX = x0 + W - 1.1, stZ = z0 + D - 1.6;
    box(stX - 0.3, deck, stZ - 0.3, 0.6, 0.12, 0.6, metal);
    cyl(stX, deck + 0.12, stZ, 0.22, 1.3, metal, 8);
    parts.push({ t: "cone", p: [stX, deck + 1.42, stZ], r: 0.32, h: 0.25, c: metal, n: 8 });
  }

  return { parts };
}
