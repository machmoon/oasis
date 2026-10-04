// Clock Tower: a square brick tower with bold enamel clock dials, an open belfry with a gilded bell, and a
// spire ringed by a parapet and pinnacles. Block asset: build(p) returns parts in metres on the Oasis Town
// grid (origin at the footprint's corner, y up, street side at z = 0).
export const meta = {
  title: "Town Clock Tower",
  kind: "3d",
  format: "blocks",
  kit: "Oasis Town",
  description: "A square brick clock tower with bold enamel dials, an open belfry with a gilded bell and a pinnacled spire that anchors a little town square.",
  tags: ["3d", "low poly", "clock tower", "tower", "landmark", "belfry", "town square", "kit"],
  price: 4,
  author: "oasis-factory",
  footprint: [4, 4],
  size: [1000, 1000],
};

export const params = {
  knobs: {
    brick: { type: "color", role: "surface", label: "Brick", default: "#C8553D" },
    roof: { type: "color", role: "ink", label: "Roof & dial frame", default: "#5B6270" },
    dial: { type: "color", role: "highlight", label: "Clock dial", default: "#F6EEE0" },
    height: { type: "range", label: "Height (m)", default: 11, min: 8, max: 16, step: 1 },
    roofStyle: { type: "choice", label: "Roof", default: "spire", options: ["spire", "saddle"] },
    faces: { type: "choice", label: "Clock faces", default: "three", options: ["front", "three"] },
    lights: { type: "toggle", label: "Lit dial, bell & lamps", default: true },
  },
  presets: {
    Harbour: { brick: "#D8DEE3", roof: "#4F6D8F", dial: "#F6EEE0" },
    Sandstone: { brick: "#E2C49A", roof: "#2F7A55", dial: "#F6EEE0" },
    Slate: { brick: "#6B7280", roof: "#8E3F2E", dial: "#F3E3C8" },
  },
};

// ---------- colour helpers: each brand colour is clamped into the band its slot was designed for ----------
const toRgb = (h) => { const n = parseInt(String(h).replace("#", "").slice(0, 6), 16) || 0; return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const toHex = (r, g, b) => "#" + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("").toUpperCase();
const mix = (a, b, t) => { const A = toRgb(a), B = toRgb(b); return toHex(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t); };
const lum = (c) => { const [r, g, b] = toRgb(c); return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255; };
const tone = (c, t) => (lum(c) > 0.5 ? mix(c, "#000000", t) : mix(c, "#FFFFFF", t));
function clampHSL(c, lo, hi, sMax) {
  const [r, g, b] = toRgb(c).map((v) => v / 255);
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
  let h = 0, s = 0, l = (mx + mn) / 2;
  if (mx !== mn) {
    const d = mx - mn;
    s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
    h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    h /= 6;
  }
  l = Math.max(lo, Math.min(hi, l));
  s = Math.min(s, sMax);
  if (s === 0) return toHex(l * 255, l * 255, l * 255);
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s, pp = 2 * l - q;
  const f = (t) => { t = (t + 1) % 1; return t < 1 / 6 ? pp + (q - pp) * 6 * t : t < 0.5 ? q : t < 2 / 3 ? pp + (q - pp) * (2 / 3 - t) * 6 : pp; };
  return toHex(f(h + 1 / 3) * 255, f(h) * 255, f(h - 1 / 3) * 255);
}

export function build(p) {
  const parts = [];
  const box = (x, y, z, w, h, d, c, e) => parts.push({ t: "box", p: [x, y, z], s: [w, h, d], c, ...(e ? { e: true } : {}) });
  const cyl = (x, y, z, r, h, c, n, e) => parts.push({ t: "cyl", p: [x, y, z], r, h, c, n, ...(e ? { e: true } : {}) });
  const cone = (x, y, z, r, h, c, n, e) => parts.push({ t: "cone", p: [x, y, z], r, h, c, n, ...(e ? { e: true } : {}) });

  // Details laid on a face. d = distance of the face plane from the footprint edge; u runs left to right as
  // seen by a viewer outside that face, so every dial reads identically. off/th = depth proud and thickness.
  const face = (side, d, u, y, w, h, off, th, c, e) => {
    if (side === "front") box(u, y, d - off - th, w, h, th, c, e);
    else if (side === "left") box(d - off - th, y, 4 - u - w, th, h, w, c, e);
    else box(4 - d + off, y, u, th, h, w, c, e);
  };
  // An upward-pointing flat triangle on a face (a gable seen end-on), used for the minute hand's arrow tip.
  const faceTri = (side, d, u, y, w, h, off, th, c) => {
    if (side === "front") parts.push({ t: "gable", p: [u, y, d - off - th], s: [w, h, th], c, axis: "z" });
    else if (side === "left") parts.push({ t: "gable", p: [d - off - th, y, 4 - u - w], s: [th, h, w], c, axis: "x" });
    else parts.push({ t: "gable", p: [4 - d + off, y, u], s: [th, h, w], c, axis: "x" });
  };

  // ---------- palette ----------
  const brick = clampHSL(p.brick, 0.25, 0.74, 0.6);
  const roof = clampHSL(p.roof, 0.3, 0.5, 0.45);              // solid mid tone: holds against day and night skies
  const night = "#1E2230";
  const panel = mix(brick, night, 0.12);                      // recessed shaft panel
  const recess = mix(brick, night, 0.55), louvre = mix(brick, night, 0.3);
  const stone = lum(brick) > 0.62 ? tone(brick, 0.22) : "#F3E3C8";
  const quoin = mix(stone, brick, 0.2);
  const socle = mix(stone, "#BFC3CA", 0.55);
  const shade = mix(brick, night, 0.75), slat = mix(shade, brick, 0.25);
  const base = "#BFC3CA", wood = "#8A6E52", glass = "#7E93A8", lit = "#FFD58A", iron = "#4A4F5A";
  const bell = "#E3A53A", bellDark = "#A8742A", gold = "#F2B33D";
  const dialBase = clampHSL(p.dial, 0.86, 0.95, 0.3);         // always pale enamel, never a screen
  const dialC = p.lights ? mix(dialBase, "#FFF4D6", 0.2) : dialBase;
  const hands = "#2B3242", marks = mix(hands, dialC, 0.2);
  const L = !!p.lights;

  // ---------- vertical layout: every stage grows with the height knob ----------
  const H = p.height, ext = H - 8, k = ext / 8;
  const CS = 2.5 + 0.075 * ext;          // clock stage 2.5 to 3.1 m
  const Bh = 2.1 + 0.1 * ext;            // belfry openings 2.1 to 2.9 m
  const yB = H - 0.3 - Bh;               // belfry floor (cornice is the top 0.3 m)
  const yC = yB - 0.2 - CS;              // clock stage bottom: 2.9 m at 8 m, 9.5 m at 16 m

  // ---------- plinth, stone socle and portal ----------
  box(0.05, 0, 0.05, 3.9, 0.2, 3.9, base);
  box(0.15, 0.2, 0.15, 3.7, 0.15, 3.7, mix(base, "#FFFFFF", 0.25));
  box(0.22, 0.35, 0.22, 3.56, 0.7, 3.56, socle);
  box(0.18, 1.05, 0.18, 3.64, 0.12, 3.64, stone);
  box(0.3, 1.17, 0.3, 3.4, yC - 0.15 - 1.17, 3.4, brick);     // shaft

  box(1.2, 0.2, 0.12, 1.6, 2.35, 0.2, stone);                   // portal
  box(1.1, 2.55, 0.08, 1.8, 0.15, 0.24, stone);                 // portal cap
  box(1.3, 0.2, 0.02, 1.4, 0.15, 0.12, base);                   // threshold step
  face("front", 0.12, 1.5, 0.35, 1.0, 2.0, 0, 0.03, wood);      // double door
  face("front", 0.12, 1.98, 0.35, 0.04, 2.0, 0.03, 0.02, tone(wood, 0.25));
  face("front", 0.12, 1.5, 2.39, 1.0, 0.12, 0, 0.03, L ? lit : glass, L); // transom light
  for (const lx of [0.98, 3.02]) {
    box(lx - 0.04, 2.1, 0.1, 0.08, 0.06, 0.2, hands);
    box(lx - 0.13, 1.78, 0.03, 0.26, 0.32, 0.24, L ? lit : "#C9D3DC", L);
  }

  // ---------- shaft: recessed panels, quoins, string course and a few slit windows ----------
  const pTop = yC - 0.4;
  for (const side of ["front", "left", "right"]) face(side, 0.3, 0.8, 1.17, 2.4, pTop - 1.17, 0, 0.02, panel);
  let qi = 0;
  for (let y = 1.17; y + 0.3 <= yC - 0.15; y += 0.6, qi++) {
    const a = qi % 2 ? 0.3 : 0.48, b = qi % 2 ? 0.48 : 0.3;
    for (const cx of [0, 1]) for (const cz of [0, 1]) box(cx ? 3.74 - a : 0.26, y, cz ? 3.74 - b : 0.26, a, 0.3, b, quoin);
  }
  const tall = yC >= 7;
  const sc = tall ? (1.17 + yC) / 2 : -9;
  if (tall) box(0.24, sc, 0.24, 3.52, 0.15, 3.52, stone);
  const win = (side, y) => {
    face(side, 0.3, 1.65, y, 0.7, 1.5, 0.02, 0.04, stone);
    face(side, 0.3, 1.75, y + 0.1, 0.5, 1.3, 0.06, 0.02, L ? lit : glass, L);
    face(side, 0.3, 1.58, y - 0.08, 0.84, 0.1, 0.02, 0.1, stone);
  };
  const upper = pTop - 0.25 - 1.5;
  for (const side of ["front", "left", "right"]) {
    const minY = side === "front" ? 2.95 : 1.45;
    if (upper >= minY && (!tall || upper >= sc + 0.4)) win(side, upper);
    const low = side === "front" ? 2.95 : 1.5;
    const lowOk = tall ? low + 1.5 <= sc - 0.3 : low + 1.5 <= upper - 0.6;
    if (lowOk && upper >= minY) win(side, low);
  }

  // ---------- clock stage ----------
  box(0.12, yC - 0.15, 0.12, 3.76, 0.15, 3.76, stone);
  box(0.2, yC, 0.2, 3.6, CS, 3.6, brick);
  box(0.12, yB - 0.2, 0.12, 3.76, 0.2, 3.76, stone);

  const cy = yC + CS / 2, F = CS - 0.3, E = F - 0.28, r = E / 2, a = 0.1, rw = 0.07;
  const dialSides = p.faces === "three" ? ["front", "left", "right"] : ["front"];
  for (const side of ["front", "left", "right"]) {
    if (dialSides.indexOf(side) < 0) {
      // blank side: a louvred opening in a stone-silled recess, so it reads as finished
      face(side, 0.2, 2 - F / 2, cy - F / 2, F, F, 0, 0.04, recess);
      for (let y = cy - F / 2 + 0.2; y + 0.1 <= cy + F / 2 - 0.15; y += 0.3)
        face(side, 0.2, 2 - F / 2 + 0.15, y, F - 0.3, 0.1, 0.04, 0.03, louvre);
      face(side, 0.2, 2 - F / 2 - 0.08, cy - F / 2 - 0.12, F + 0.16, 0.12, 0, 0.1, stone);
      continue;
    }
    face(side, 0.2, 2 - F / 2, cy - F / 2, F, F, 0, 0.05, roof);              // frame plate
    face(side, 0.2, 2 - r, cy - r, E, E, 0.05, 0.03, dialC, L);                // enamel
    // chapter ring: four clean non-overlapping bars
    face(side, 0.2, 2 - r + a, cy + r - a - rw, E - 2 * a, rw, 0.08, 0.015, marks);
    face(side, 0.2, 2 - r + a, cy - r + a, E - 2 * a, rw, 0.08, 0.015, marks);
    face(side, 0.2, 2 - r + a, cy - r + a + rw, rw, E - 2 * a - 2 * rw, 0.08, 0.015, marks);
    face(side, 0.2, 2 + r - a - rw, cy - r + a + rw, rw, E - 2 * a - 2 * rw, 0.08, 0.015, marks);
    // bold hour bars at 12, 3, 6 and 9, each touching the ring
    const ri = r - a - rw, bl = 0.24;
    face(side, 0.2, 1.93, cy + ri - bl, 0.14, bl, 0.08, 0.015, marks);
    face(side, 0.2, 1.93, cy - ri, 0.14, bl, 0.08, 0.015, marks);
    face(side, 0.2, 2 + ri - bl, cy - 0.07, bl, 0.14, 0.08, 0.015, marks);
    face(side, 0.2, 2 - ri, cy - 0.07, bl, 0.14, 0.08, 0.015, marks);
    // hands: nine o'clock on every face, minute hand with an arrow tip
    const tip = cy + ri - 0.08, arrowH = 0.26, shaftTop = tip - arrowH;
    face(side, 0.2, 1.93, cy - 0.1, 0.14, shaftTop - (cy - 0.1), 0.095, 0.03, hands);
    faceTri(side, 0.2, 1.82, shaftTop, 0.36, arrowH, 0.095, 0.03, hands);
    face(side, 0.2, 2 - 0.55 * r, cy - 0.1, 0.55 * r + 0.1, 0.2, 0.095, 0.03, hands);
    face(side, 0.2, 1.86, cy - 0.14, 0.28, 0.28, 0.125, 0.03, hands);
  }

  // ---------- open belfry ----------
  box(0.2, yB, 0.2, 3.6, 0.04, 3.6, shade);
  const lintelY = H - 0.6;
  box(0.85, yB, 3.4, 2.3, lintelY - yB, 0.2, shade);           // back screen
  box(3.4, yB, 0.85, 0.2, lintelY - yB, 2.3, shade);           // right screen
  for (let y = yB + 0.3; y + 0.08 <= lintelY - 0.1; y += 0.32) {
    box(0.85, y, 3.37, 2.3, 0.08, 0.03, slat);
    box(3.37, y, 0.85, 0.03, 0.08, 2.3, slat);
  }
  for (const px of [0.2, 3.15]) for (const pz of [0.2, 3.15]) box(px, yB, pz, 0.65, H - 0.3 - yB, 0.65, brick);
  box(0.85, lintelY, 0.2, 2.3, 0.3, 0.65, brick);
  box(0.85, lintelY, 3.15, 2.3, 0.3, 0.65, brick);
  box(0.2, lintelY, 0.85, 0.65, 0.3, 2.3, brick);
  box(3.15, lintelY, 0.85, 0.65, 0.3, 2.3, brick);
  for (const o of [0.85, 2.9]) {
    box(o, lintelY - 0.2, 0.2, 0.25, 0.2, 0.65, brick);
    box(o, lintelY - 0.2, 3.15, 0.25, 0.2, 0.65, brick);
    box(0.2, lintelY - 0.2, o, 0.65, 0.2, 0.25, brick);
    box(3.15, lintelY - 0.2, o, 0.65, 0.2, 0.25, brick);
  }
  box(0.6, lintelY - 0.15, 1.92, 2.8, 0.15, 0.16, wood);        // bell beam, ends under the side lintels
  const bh = Math.min(1.25, Bh * 0.55), lip = yB + 0.25;
  cyl(2, lip, 2, 0.72, 0.14, bellDark, 12, L);
  cone(2, lip + 0.14, 2, 0.66, bh, bell, 12, L);
  const crown = lip + 0.14 + bh * 0.62;
  cyl(2, crown, 2, 0.24, 0.2, bell, 10, L);
  cyl(2, crown + 0.2, 2, 0.05, lintelY - 0.15 - (crown + 0.2), iron, 6);
  box(0.06, H - 0.3, 0.06, 3.88, 0.3, 3.88, stone);             // cornice

  // ---------- roof ----------
  let top;
  if (p.roofStyle === "spire") {
    // parapet and corner pinnacles turn the cornice into a deliberate walk around a set-back spire
    box(0.53, H, 0.1, 2.94, 0.45, 0.22, stone);
    box(0.53, H, 3.68, 2.94, 0.45, 0.22, stone);
    box(0.1, H, 0.53, 0.22, 0.45, 2.94, stone);
    box(3.68, H, 0.53, 0.22, 0.45, 2.94, stone);
    for (const px of [0.08, 3.47]) for (const pz of [0.08, 3.47]) {
      box(px, H, pz, 0.45, 0.75, 0.45, stone);
      cone(px + 0.225, H + 0.75, pz + 0.225, 0.28, 1.0, roof, 8);
    }
    const sh = 4.8 + 1.2 * k;
    cone(2, H, 2, 1.55, sh, roof, 8);
    top = H + sh;
  } else {
    const gh = 2.6 + 0.8 * k;
    parts.push({ t: "gable", p: [0.06, H, 0.06], s: [3.88, gh, 3.88], c: roof, axis: "x" });
    top = H + gh;
  }
  cyl(2, top - 0.3, 2, 0.07, 0.9, iron, 6);
  box(1.85, top + 0.6, 1.85, 0.3, 0.3, 0.3, gold, L);

  return { parts };
}
