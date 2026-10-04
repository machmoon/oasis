// Clock Tower: one continuous square brick shaft with stone quoins, a round clock on every face, an arched belfry
// with its bell, and a pointed slate roof. Block asset: build(p) returns parts in metres on the Oasis Town grid
// (origin at the footprint's corner, y up, street side at z = 0).
export const meta = {
  title: "Town Clock Tower",
  kind: "3d",
  format: "blocks",
  kit: "Oasis Town",
  description: "A square brick clock tower with a round clock on each face, an arched belfry with its bell and a pointed roof: the landmark at the end of the high street.",
  tags: ["3d", "low poly", "clock tower", "tower", "landmark", "belfry", "town", "kit"],
  price: 4,
  author: "oasis-factory",
  footprint: [4, 4],
  size: [1000, 1000],
};

export const params = {
  knobs: {
    brick: { type: "color", role: "surface", label: "Brick", default: "#C8553D" },
    roof: { type: "color", role: "secondary", label: "Roof", default: "#5B6270" },
    stone: { type: "color", role: "muted", label: "Stone trim", default: "#F3E3C8" },
    accent: { type: "color", role: "highlight", label: "Clock rim & bell", default: "#F2B33D" },
    dial: { type: "color", role: "background", label: "Clock face", default: "#F6EEE0" },
    height: { type: "range", label: "Height (m)", default: 12, min: 8, max: 16, step: 1 },
    hour: { type: "range", label: "Clock time (o'clock)", default: 3, min: 1, max: 12, step: 1 },
    lights: { type: "toggle", label: "Lit clock, lamps & windows", default: true },
  },
  presets: {
    Sandstone: { brick: "#D9B48A", roof: "#2F7A55", stone: "#F6EEE0", accent: "#F2B33D", dial: "#F6EEE0" },
    Harbour: { brick: "#A9B8C6", roof: "#3D4A5C", stone: "#F6EEE0", accent: "#E5484D", dial: "#F6EEE0" },
    BrickLane: { brick: "#8A6E52", roof: "#C8553D", stone: "#F3E3C8", accent: "#F2B33D", dial: "#2B3242" },
  },
};

function hex(c) { const n = parseInt(c.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
function toHex(a) { return "#" + a.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("").toUpperCase(); }
function lum(c) {
  const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  const [r, g, b] = hex(c); return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}
function contrast(a, b) { const la = lum(a), lb = lum(b); return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05); }
function mix(a, b, t) { const A = hex(a), B = hex(b); return toHex(A.map((v, i) => v + (B[i] - v) * t)); }
function toHsl(c) {
  const [r, g, b] = hex(c).map((v) => v / 255), mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
  if (mx === mn) return [0, 0, l];
  const d = mx - mn, s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
  const h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h / 6, s, l];
}
function fromHsl(h, s, l) {
  if (s === 0) return toHex([l * 255, l * 255, l * 255]);
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s, pp = 2 * l - q;
  const k = (t) => { t = (t + 1) % 1; return t < 1 / 6 ? pp + (q - pp) * 6 * t : t < 0.5 ? q : t < 2 / 3 ? pp + (q - pp) * (2 / 3 - t) * 6 : pp; };
  return toHex([k(h + 1 / 3) * 255, k(h) * 255, k(h - 1 / 3) * 255]);
}
function clampL(c, lo, hi) { const [h, s, l] = toHsl(c); return fromHsl(h, s, Math.max(lo, Math.min(hi, l))); }
function shiftL(c, d, lo, hi) { const [h, s, l] = toHsl(c); return fromHsl(h, s, Math.max(lo, Math.min(hi, l + d))); }

export function build(p) {
  const parts = [];
  const box = (x, y, z, w, h, d, c, e) => parts.push({ t: "box", p: [x, y, z], s: [w, h, d], c, ...(e ? { e: true } : {}) });
  const INK = "#2B3242", LIT = "#FFD58A", GLASS = "#7E93A8", WOOD = "#8A6E52", PAVE = "#BFC3CA", KERB = "#D9DCE1";

  // ---- colours: brick keeps its hue inside a band where lit and shaded faces separate; trim always reads against it
  let brick = clampL(p.brick, 0.34, 0.8);
  let stone = clampL(p.stone, 0.62, 0.95);
  for (let i = 0; i < 24 && contrast(stone, brick) < 1.8; i++) {
    if (lum(stone) >= lum(brick)) {
      if (toHsl(stone)[2] < 0.95) stone = shiftL(stone, 0.03, 0, 0.95);
      else brick = shiftL(brick, -0.03, 0.28, 1);
    } else stone = shiftL(stone, -0.03, 0.25, 1);
  }
  const brickDk = shiftL(brick, -0.09, 0.14, 1);     // coursing bricks and base course
  const inner = shiftL(brick, -0.2, 0.1, 1);         // shaded inside of the belfry
  const floorC = shiftL(brick, -0.14, 0.12, 1);
  const roofC = clampL(p.roof, 0.22, 0.6);
  const dialC = p.lights ? mix(p.dial, LIT, 0.6) : p.dial;
  const handC = contrast(INK, dialC) >= 3 ? INK : "#FFF6E6";
  let rim = clampL(p.accent, 0.4, 0.66);
  for (let i = 0; i < 12 && contrast(rim, dialC) < 1.6; i++) rim = shiftL(rim, lum(dialC) > 0.3 ? -0.04 : 0.04, 0.15, 0.85);

  // ---- vertical layout: every stage derived from the height knob, one continuous shaft
  const H = p.height, t = (H - 8) / 8;
  const PL = 0.3, STR = 0.14, BAND = 0.2, LINTEL = 0.3, CORN = 0.2, EAVE = 0.12;
  const roofH = 1.2 + 1.8 * t;
  const BH = 1.1 + 0.5 * t;                          // belfry opening height
  const R = 0.8 + 0.2 * t;                           // clock radius
  const CS = 2 * R + 0.4 + 0.5 * t;                  // clock stage (string course to belfry band)
  const sTop = H - roofH - EAVE - CORN - LINTEL - BH - BAND;
  const cb = sTop - CS;                              // string course under the clock
  const cy = cb + STR + (sTop - cb - STR) / 2;
  const bY = sTop + BAND, lY = bY + BH, eY = lY + LINTEL + CORN, rY = eY + EAVE;

  const S = { x: 0.3, z: 0.3, w: 3.4, d: 3.4 }, cx = 2, cz = 2;

  // slab on a face: u runs left to right as seen from outside that face; d0..d1 = depth into the wall (negative = proud)
  const slab = (side, u, y, w, h, d0, d1, c, e) => {
    if (side === 0) box(S.x + S.w - u - w / 2, y, S.z + d0, w, h, d1 - d0, c, e);
    else if (side === 1) box(S.x + S.w - d1, y, S.z + S.d - u - w / 2, d1 - d0, h, w, c, e);
    else if (side === 2) box(S.x + u - w / 2, y, S.z + S.d - d1, w, h, d1 - d0, c, e);
    else box(S.x + d0, y, S.z + u - w / 2, d1 - d0, h, w, c, e);
  };
  const face = (side, u, y, w, h, proud, c, e) => slab(side, u, y, w, h, -proud, 0.02, c, e);
  const wrap = (y, h, out, c) => box(S.x - out, y, S.z - out, S.w + 2 * out, h, S.d + 2 * out, c);
  const quoins = (y, h) => {
    for (const [qx, qz] of [[S.x - 0.05, S.z - 0.05], [S.x + S.w - 0.29, S.z - 0.05], [S.x - 0.05, S.z + S.d - 0.29], [S.x + S.w - 0.29, S.z + S.d - 0.29]])
      box(qx, y, qz, 0.34, h, 0.34, stone);
  };

  // ---- ground: the full 4 x 4 tile, paved with a kerb course
  box(0, 0, 0, 4, 0.15, 4, PAVE);
  box(0.1, 0.15, 0.1, 3.8, 0.15, 3.8, KERB);

  // ---- the shaft: one closed box from the paving to the belfry band
  box(S.x, PL, S.z, S.w, sTop - PL, S.d, brick);
  wrap(PL, 0.45, 0.02, brickDk);                     // dark base course
  quoins(PL, sTop - PL);                             // continuous corner quoins, full height
  wrap(cb, STR, 0.08, stone);                        // string course: start of the clock stage

  // storey rhythm on the shaft: windows and thin bands, regenerated for every height
  const winRows = [], bands = [];
  for (let y = 3.2; y + 1.1 <= cb - 0.35; y += 2.6) winRows.push(y);
  for (let b = 2.75; b + 0.1 <= cb - 0.4; b += 2.6) bands.push(b);
  for (const b of bands) wrap(b, 0.1, 0.07, stone);
  for (const y of winRows) for (const side of [0, 1, 2, 3]) {
    face(side, S.w / 2, y, 0.55, 1.1, 0.04, p.lights ? LIT : GLASS, p.lights);
    face(side, S.w / 2, y - 0.12, 0.8, 0.12, 0.07, stone);
    face(side, S.w / 2, y + 1.1, 0.71, 0.12, 0.06, stone);
  }

  // brick coursing: a strict running-bond grid of darker bricks, kept clear of every opening and band
  const free = (side, u0, y0) => {
    const u1 = u0 + 0.42, y1 = y0 + 0.16;
    if (side === 0 && y0 < PL + 2.55) return false;
    for (const wy of winRows) if (y1 > wy - 0.24 && y0 < wy + 1.3 && u1 > S.w / 2 - 0.5 && u0 < S.w / 2 + 0.5) return false;
    for (const b of bands) if (y1 > b - 0.06 && y0 < b + 0.16) return false;
    return true;
  };
  for (let r = 0; ; r++) {
    const y = PL + 0.62 + r * 0.42;
    if (y + 0.16 > cb - 0.12) break;
    for (const side of [0, 1, 2, 3]) {
      for (let j = 0; ; j++) {
        const u0 = 0.5 + (r % 2) * 0.3 + j * 0.62;
        if (u0 + 0.42 > S.w - 0.45) break;
        const h = (Math.imul(r * 73 + j * 151 + side * 37 + 11, 2654435761) >>> 0) % 5;
        if (h < 2 && free(side, u0, y)) face(side, u0 + 0.21, y, 0.42, 0.16, 0.025, brickDk);
      }
    }
  }

  // ---- door with stone surround and two bracketed lamps
  const DU = S.w / 2;
  face(0, DU, PL, 0.9, 2.0, 0.05, WOOD);
  face(0, DU - 0.51, PL, 0.12, 2.0, 0.08, stone);
  face(0, DU + 0.51, PL, 0.12, 2.0, 0.08, stone);
  face(0, DU, PL + 2.0, 1.16, 0.2, 0.08, stone);
  face(0, DU + 0.28, PL + 0.9, 0.06, 0.25, 0.09, INK);
  for (const u of [DU - 0.95, DU + 0.95]) {
    face(0, u, PL + 1.55, 0.12, 0.5, 0.04, INK);                         // wall plate
    face(0, u, PL + 1.99, 0.08, 0.06, 0.3, INK);                         // arm
    slab(0, u, PL + 1.94, 0.3, 0.05, -0.36, -0.06, INK);                 // lamp cap, hung from the arm
    slab(0, u, PL + 1.6, 0.24, 0.34, -0.33, -0.09, p.lights ? LIT : GLASS, p.lights);
    slab(0, u, PL + 1.55, 0.28, 0.05, -0.35, -0.07, INK);                // lamp base
  }

  // ---- round clocks on all four faces, hands set by the hour knob
  const disc = (side, r, proud, c, e) => {
    const N = 12, sh = (2 * r) / N;
    for (let i = 0; i < N; i++) {
      const y0 = cy - r + i * sh, m = y0 + sh / 2 - cy, w = 2 * Math.sqrt(Math.max(0, r * r - m * m));
      if (w > 0.05) face(side, S.w / 2, y0, w, sh, proud, c, e);
    }
  };
  const hand = (side, a, len, th, proud) => {
    const s = Math.sin(a), c = Math.cos(a), U = S.w / 2;
    if (Math.abs(s) < 1e-6) face(side, U, c > 0 ? cy - th / 2 : cy - len, th, len + th / 2, proud, handC);
    else if (Math.abs(c) < 1e-6) face(side, U + (s * (len - th / 2)) / 2, cy - th / 2, len + th / 2, th, proud, handC);
    else {
      const n = Math.ceil(len / (th * 0.55));
      for (let i = 0; i <= n; i++) { const d = (i * len) / n; face(side, U + s * d, cy + c * d - th / 2, th, th, proud, handC); }
    }
  };
  const Rd = R - 0.17, mr = Rd - 0.14, hourA = (p.hour * Math.PI) / 6;
  for (const side of [0, 1, 2, 3]) {
    const U = S.w / 2;
    disc(side, R, 0.02, INK);
    disc(side, R - 0.06, 0.04, rim);
    disc(side, Rd, 0.06, dialC, p.lights);
    face(side, U, cy + mr - 0.11, 0.1, 0.22, 0.08, handC);   // 12
    face(side, U, cy - mr - 0.11, 0.1, 0.22, 0.08, handC);   // 6
    face(side, U + mr, cy - 0.05, 0.22, 0.1, 0.08, handC);   // 3
    face(side, U - mr, cy - 0.05, 0.22, 0.1, 0.08, handC);   // 9
    hand(side, 0, Rd * 0.78, 0.1, 0.09);                     // minute hand on the hour
    hand(side, hourA, Rd * 0.52, 0.13, 0.1);                 // hour hand
    face(side, U, cy - 0.09, 0.18, 0.18, 0.12, rim);         // hub
  }

  // ---- belfry: band, piers on the same footprint, arched openings, bell
  wrap(sTop, BAND, 0.1, stone);
  box(S.x + 0.02, bY, S.z + 0.02, S.w - 0.04, 0.03, S.d - 0.04, floorC);
  const PW = 0.6, ow = S.w - 2 * PW;
  for (const [px, pz] of [[S.x, S.z], [S.x + S.w - PW, S.z], [S.x, S.z + S.d - PW], [S.x + S.w - PW, S.z + S.d - PW]])
    box(px, bY, pz, PW, BH, PW, brick);
  quoins(bY, BH);
  box(S.x, lY, S.z, S.w, LINTEL, S.d, brick);
  // back and left openings are closed by a shaded inner wall, so the front and right show a deep, solid recess
  for (const side of [2, 3]) slab(side, S.w / 2, bY, ow + 0.04, BH + 0.02, 0.15, 0.27, inner);
  for (const side of [0, 1, 2, 3]) {
    for (const [u, du] of [[PW, 1], [S.w - PW, -1]]) {
      slab(side, u + du * 0.14, lY - 0.16, 0.28, 0.16, 0, 0.3, brick);   // stepped arch shoulders
      slab(side, u + du * 0.06, lY - 0.32, 0.12, 0.16, 0, 0.3, brick);
    }
    face(side, S.w / 2, lY, 0.34, LINTEL, 0.04, stone);                  // keystone
  }
  box(S.x + 0.2, lY - 0.14, cz - 0.08, S.w - 0.3, 0.14, 0.16, WOOD);    // headstock beam under the lintel
  const yb = bY + Math.max(0.15, BH - 1.15), crown = yb + 0.82;
  box(cx - 0.06, yb - 0.1, cz - 0.06, 0.12, 0.12, 0.12, INK);           // clapper
  parts.push({ t: "cyl", p: [cx, yb, cz], r: 0.55, h: 0.1, c: rim, n: 10 });
  parts.push({ t: "cyl", p: [cx, yb + 0.1, cz], r: 0.44, h: 0.5, c: rim, n: 10 });
  parts.push({ t: "cone", p: [cx, yb + 0.6, cz], r: 0.44, h: 0.22, c: rim, n: 10 });
  if (lY - 0.14 - crown > 0.01) box(cx - 0.06, crown, cz - 0.06, 0.12, lY - 0.14 - crown, 0.12, WOOD);

  // ---- cornice, roof-coloured eaves (no bright deck), pinnacles, spire and finial
  wrap(lY + LINTEL, CORN, 0.15, stone);
  wrap(eY, EAVE, 0.22, roofC);
  for (const [px, pz] of [[S.x + 0.02, S.z + 0.02], [S.x + S.w - 0.02, S.z + 0.02], [S.x + 0.02, S.z + S.d - 0.02], [S.x + S.w - 0.02, S.z + S.d - 0.02]]) {
    box(px - 0.13, rY, pz - 0.13, 0.26, 0.2, 0.26, stone);
    parts.push({ t: "cone", p: [px, rY + 0.2, pz], r: 0.17, h: 0.5, c: roofC, n: 6 });
  }
  parts.push({ t: "cone", p: [cx, rY, cz], r: 1.95, h: roofH, c: roofC, n: 8 });
  parts.push({ t: "cyl", p: [cx, rY + roofH - 0.2, cz], r: 0.07, h: 0.6, c: rim, n: 6 });

  return { parts };
}
