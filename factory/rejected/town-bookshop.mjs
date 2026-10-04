// Town Bookshop: a corner bookshop whose painted shopfront wraps the street corner with two deep windows of chunky
// book spines, under a big hanging book sign. Block asset: build(p) returns parts in metres on the Oasis Town grid
// (origin at the footprint's corner, y up, street side at z = 0).
export const meta = {
  title: "Town Bookshop",
  kind: "3d",
  format: "blocks",
  kit: "Oasis Town",
  description: "A corner bookshop with a wrap-around painted shopfront, shelves of book spines filling both windows and a big hanging book sign over the pavement.",
  tags: ["3d", "low poly", "bookshop", "bookstore", "books", "shop", "building", "town", "kit"],
  price: 4,
  author: "oasis-factory",
  footprint: [6, 6],
  size: [1000, 1000],
};

export const params = {
  knobs: {
    front: { type: "color", role: "primary", label: "Shopfront", default: "#2F7A55" },
    wall: { type: "color", role: "surface", label: "Facade", default: "#F6EEE0" },
    sign: { type: "color", role: "highlight", label: "Sign", default: "#F2B33D" },
    seed: { type: "range", label: "Book shuffle", default: 7, min: 1, max: 99, step: 1 },
    floors: { type: "range", label: "Floors", default: 2, min: 1, max: 3, step: 1 },
    roof: { type: "choice", label: "Roof", default: "gable", options: ["gable", "flat"] },
    lights: { type: "toggle", label: "Lit windows", default: true },
  },
  presets: {
    Ink: { front: "#2B4C7E", wall: "#F6EEE0", sign: "#F7B8CF" },
    Oxblood: { front: "#8C2F39", wall: "#F6EEE0", sign: "#F2B33D" },
    Teal: { front: "#1F6F78", wall: "#F6EEE0", sign: "#F7B8CF" },
  },
};

const hexRgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const rgbHex = (c) => "#" + c.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("").toUpperCase();
const mix = (a, b, t) => { const A = hexRgb(a), B = hexRgb(b); return rgbHex(A.map((v, i) => v + (B[i] - v) * t)); };
const lum = (h) => { const [r, g, b] = hexRgb(h); return (0.299 * r + 0.587 * g + 0.114 * b) / 255; };
const chroma = (h) => { const c = hexRgb(h); return (Math.max(...c) - Math.min(...c)) / 255; };

export function build(p) {
  const parts = [];
  const box = (x, y, z, w, h, d, c, e) => parts.push({ t: "box", p: [x, y, z], s: [w, h, d], c, ...(e ? { e: true } : {}) });

  // seeded hash, no Math.random
  const seed = Math.round(p.seed) | 0;
  let k = 0;
  const rnd = () => {
    let x = Math.imul((k++ + 1) ^ Math.imul(seed + 17, 0x9e3779b1), 0x85ebca6b);
    x ^= x >>> 13; x = Math.imul(x, 0xc2b2ae35); x ^= x >>> 16;
    return (x >>> 0) / 4294967296;
  };

  const lights = !!p.lights, front = p.front, sign = p.sign;
  // joinery tone: always a strong lightness step away from the shopfront so doors and frames never merge into it
  const L = lum(front);
  const ink = L < 0.2 ? mix(front, "#FFFFFF", 0.5) : mix(front, "#1B1F27", Math.min(0.75, 0.45 + Math.max(0, L - 0.3) * 0.9));
  // facade render: any brand input is pulled to a light, calm tint so the house never goes muddy or loud
  let wallC = p.wall;
  for (let t = 0.05; t <= 0.95 && (lum(wallC) < 0.88 || chroma(wallC) > 0.2); t += 0.05) wallC = mix(p.wall, "#FFF8EC", t);
  const wallBand = mix(wallC, "#000000", 0.12);
  const shell = "#F3E3C8", shellBand = "#DCCBAE"; // side and back walls stay kit cream in every colourway
  const wood = "#8A6E52", glass = "#7E93A8", lit = "#FFD58A", slate = "#5B6270", kerb = "#D9DCE1", paper = "#FBFBFB";
  const interior = lights ? "#5A4330" : "#33363F";
  const spines = ["#C8553D", "#3E7BFA", "#F2B33D", "#F7B8CF", "#E5484D", "#F6EEE0", "#7D5BA6", "#79B86A", "#2F7A55", "#D8DEE3", "#8A6E52"];

  const B = 0.12, W = 5, D = 4.1, x0 = 0.5, z0 = 1.7, FLOOR = 2.6, RET = 1.6;
  const floors = Math.max(1, Math.min(3, Math.round(p.floors)));
  const G = 3.3 + 0.3 * (floors - 1); // the shop storey grows with the building so it never looks undersized
  const H = G + (floors - 1) * FLOOR, top = B + H, xR = x0 + W;
  const fh = 0.62 + 0.12 * (floors - 1), fy1 = B + G - 0.1, fy0 = fy1 - fh; // fascia band
  const wy0 = B + 0.5, wy1 = fy0 - 0.12; // display window opening
  const rows = Math.max(3, Math.round((wy1 - wy0) / 0.62)), rowH = (wy1 - wy0) / rows;

  // ---- book filler: chunky spines with a hairline of shadow between them, flat stacks and one face-out per shelf ----
  let last = -1;
  const pick = () => { let i = Math.floor(rnd() * spines.length); if (i === last) i = (i + 1) % spines.length; last = i; return spines[i]; };
  const books = (axis, a0, a1, yb, maxH, plane, dep) => {
    const put = (a, y, w, h, d, c, off) => axis === "x" ? box(a, y, plane - off, w, h, d, c) : box(plane - off, y, a, d, h, w, c);
    let a = a0, faced = false;
    while (a < a1) {
      const r = rnd();
      if (r < 0.05) { a += 0.06 + 0.06 * rnd(); continue; }
      if (r < 0.14 && a1 - a > 0.5) {
        const sw = 0.36 + 0.1 * rnd(), n = 2 + (rnd() < 0.5 ? 1 : 0), th = maxH * 0.2;
        for (let j = 0; j < n; j++) put(a + 0.02 * (j % 2), yb + j * th, sw - 0.04, th, dep, pick(), 0);
        a += sw + 0.03;
        continue;
      }
      if (!faced && r < 0.26 && a1 - a > 0.55 && a > a0 + 0.3) {
        const w = maxH * 0.72, h = maxH * 0.95, c = pick();
        put(a, yb, w, h, dep, c, 0);
        put(a + w * 0.15, yb + h * 0.56, w * 0.7, h * 0.18, 0.02, c === "#F6EEE0" ? "#2B3242" : paper, 0.02);
        faced = true;
        a += w + 0.04;
        continue;
      }
      const w = 0.11 + 0.1 * rnd();
      if (a + w > a1) break;
      const h = maxH * (0.7 + 0.3 * rnd()), c = pick();
      put(a, yb, w, h, dep, c, 0);
      if (rnd() < 0.5) put(a, yb + h * 0.72, w, 0.05, 0.02, c === "#F2B33D" || c === "#F6EEE0" ? "#2B3242" : "#F2B33D", 0.02);
      a += w + 0.015;
    }
  };

  // ---- ground and shell ----
  box(x0 - 0.45, 0, 0.05, W + 0.85, B, z0 + D + 0.1 - 0.05, kerb);
  box(x0, B, z0, W, H, D, shell);
  if (floors > 1) box(x0, B + G, z0 - 0.03, W, H - G, 0.03, wallC); // painted front render on the flats

  // ---- painted shopfront wrapping the visible corner ----
  box(x0 - 0.08, B, z0 - 0.08, W + 0.14, fy1 - B, 0.08, front);
  box(x0 - 0.08, B, z0, 0.08, fy1 - B, RET, front);
  box(xR, B, z0, 0.06, fy1 - B, 0.4, front);
  box(x0 - 0.18, fy0, z0 - 0.18, W + 0.28, fh, 0.1, front); // fascia
  box(x0 - 0.18, fy0, z0 - 0.08, 0.1, fh, RET + 0.08, front);
  box(xR, fy0, z0 - 0.08, 0.1, fh, 0.48, front);
  box(x0 - 0.26, fy1, z0 - 0.26, W + 0.4, 0.1, 0.18, ink); // cornice
  box(x0 - 0.26, fy1, z0 - 0.08, 0.18, 0.1, RET + 0.14, ink);
  box(xR, fy1, z0 - 0.08, 0.14, 0.1, 0.56, ink);

  const wx0 = x0 + 0.3, wx1 = xR - 1.62, ww = wx1 - wx0;
  box(x0 - 0.16, B, z0 - 0.16, 0.34, fy0 - B, 0.34, ink); // corner post
  box(wx1 + 0.12, B, z0 - 0.16, 0.18, fy0 - B, 0.08, ink);
  box(xR - 0.28, B, z0 - 0.16, 0.3, fy0 - B, 0.08, ink);
  box(x0 - 0.16, B, z0 + RET - 0.2, 0.08, fy0 - B, 0.2, ink);

  // name plaques on both fascia faces
  const pw = ww * 0.82, ph = fh * 0.6, pxs = wx0 + (ww - pw) / 2, py = fy0 + (fh - ph) / 2;
  box(pxs, py, z0 - 0.21, pw, ph, 0.03, sign);
  let lx = pxs + pw * 0.07;
  for (const f of [0.24, 0.14, 0.36]) { box(lx, py + ph * 0.32, z0 - 0.23, pw * f, ph * 0.36, 0.02, ink); lx += pw * (f + 0.06); }
  box(x0 - 0.21, py, z0 + 0.3, 0.03, ph, RET - 0.6, sign);
  box(x0 - 0.23, py + ph * 0.32, z0 + 0.42, 0.02, ph * 0.36, RET - 0.84, ink);

  // ---- main display window: wide shadow box of shelves ----
  box(wx0, wy0, z0 - 0.11, ww, wy1 - wy0, 0.03, interior);
  box(wx0 - 0.14, wy0 - 0.14, z0 - 0.42, ww + 0.28, 0.14, 0.34, ink);
  box(wx0 - 0.12, wy1, z0 - 0.36, ww + 0.24, fy0 - wy1, 0.28, ink);
  box(wx0 - 0.12, wy0, z0 - 0.36, 0.12, wy1 - wy0, 0.28, ink);
  box(wx1, wy0, z0 - 0.36, 0.12, wy1 - wy0, 0.28, ink);
  box(wx0 + 0.1, B + 0.1, z0 - 0.11, ww - 0.2, wy0 - 0.24 - (B + 0.1), 0.03, mix(front, ink, 0.4)); // stall riser panel
  if (lights) box(wx0, wy1 - 0.07, z0 - 0.32, ww, 0.07, 0.21, lit, true);
  for (let r = 0; r < rows; r++) {
    const yb = wy0 + r * rowH;
    if (r > 0) box(wx0, yb - 0.06, z0 - 0.32, ww, 0.06, 0.21, wood);
    books("x", wx0 + 0.04, wx1 - 0.04, yb, rowH - (r === rows - 1 ? 0.14 : 0.1), z0 - 0.3, 0.18);
  }

  // ---- corner return window on the side street ----
  const sz0 = z0 + 0.3, sz1 = z0 + RET - 0.3, sl = sz1 - sz0;
  box(x0 - 0.11, wy0, sz0, 0.03, wy1 - wy0, sl, interior);
  box(x0 - 0.42, wy0 - 0.14, sz0 - 0.14, 0.34, 0.14, sl + 0.28, ink);
  box(x0 - 0.36, wy1, sz0 - 0.12, 0.28, fy0 - wy1, sl + 0.24, ink);
  box(x0 - 0.36, wy0, sz0 - 0.12, 0.28, wy1 - wy0, 0.12, ink);
  box(x0 - 0.36, wy0, sz1, 0.28, wy1 - wy0, 0.12, ink);
  if (lights) box(x0 - 0.32, wy1 - 0.07, sz0, 0.21, 0.07, sl, lit, true);
  for (let r = 0; r < rows; r++) {
    const yb = wy0 + r * rowH;
    if (r > 0) box(x0 - 0.32, yb - 0.06, sz0, 0.21, 0.06, sl, wood);
    books("z", sz0 + 0.04, sz1 - 0.04, yb, rowH - (r === rows - 1 ? 0.14 : 0.1), x0 - 0.3, 0.18);
  }

  // ---- door with transom ----
  const dx0 = xR - 1.25;
  box(dx0 - 0.1, B, z0 - 0.42, 1.1, 0.12, 0.34, "#C9CED6");
  box(dx0, B + 0.12, z0 - 0.12, 0.9, 2.08, 0.04, ink);
  box(dx0 + 0.15, B + 1.2, z0 - 0.15, 0.6, 0.8, 0.03, lights ? lit : glass, lights);
  box(dx0 + 0.15, B + 0.35, z0 - 0.15, 0.6, 0.6, 0.03, front);
  box(dx0 + 0.74, B + 1.05, z0 - 0.16, 0.06, 0.18, 0.04, sign);
  box(dx0, B + 2.2, z0 - 0.12, 0.9, 0.06, 0.04, ink);
  box(dx0, B + 2.26, z0 - 0.1, 0.9, fy0 - 0.06 - (B + 2.26), 0.02, lights ? lit : glass, lights);

  // ---- hanging sign: a big closed book on a bracket, broad cover facing the camera, silhouetted past the corner ----
  const T = 0.34, sx0 = xR - 0.52, sd = 1.1 + 0.1 * (floors - 1), sh = 0.95 + 0.1 * (floors - 1);
  const ay = fy1 - 0.16, near = z0 - 0.3, far = near - sd, sTop = ay - 0.12, sBot = sTop - sh, cxS = sx0 + T / 2;
  box(cxS - 0.05, ay - 0.04, z0 - 0.21, 0.1, 0.18, 0.03, ink); // wall plate on the fascia
  box(cxS - 0.04, ay, far - 0.06, 0.08, 0.1, z0 - 0.18 - (far - 0.06), ink); // arm
  box(cxS - 0.06, ay - 0.02, far - 0.1, 0.12, 0.14, 0.06, ink); // finial
  box(cxS - 0.04, ay - 0.3, z0 - 0.26, 0.08, 0.3, 0.08, ink); // knee brace
  for (const cz of [far + 0.12, near - 0.16]) box(cxS - 0.02, sTop, cz, 0.04, 0.12, 0.04, slate);
  box(sx0, sBot, far, 0.05, sh, sd, sign); // covers
  box(sx0 + T - 0.05, sBot, far, 0.05, sh, sd, sign);
  box(sx0, sBot, far, T, sh, 0.07, sign); // spine
  box(sx0 + 0.05, sBot + 0.05, far + 0.07, T - 0.1, sh - 0.1, sd - 0.11, paper); // page block, white on top
  for (const by of [0.16, sh - 0.24]) box(sx0 + 0.02, sBot + by, far - 0.03, T - 0.04, 0.08, 0.03, ink);
  box(sx0 + 0.08, sBot + sh * 0.38, far - 0.03, T - 0.16, sh * 0.26, 0.03, paper);
  for (const s of [-1, 1]) {
    const px = s < 0 ? sx0 - 0.03 : sx0 + T, px2 = s < 0 ? sx0 - 0.05 : sx0 + T + 0.03;
    box(px, sBot + 0.06, far + 0.08, 0.03, sh - 0.12, 0.05, ink); // hinge line
    box(px, sBot + sh * 0.4, far + 0.22, 0.03, sh * 0.38, sd - 0.4, ink); // title panel
    box(px2, sBot + sh * 0.62, far + 0.32, 0.02, sh * 0.08, sd - 0.6, paper);
    box(px2, sBot + sh * 0.48, far + 0.38, 0.02, sh * 0.06, sd - 0.72, paper);
  }

  // ---- drainpipe on the visible side ----
  box(x0 - 0.1, B, z0 + D - 0.3, 0.1, top - B - 0.05, 0.1, slate);

  // ---- flats above: shuttered windows with flower boxes ----
  const on2 = (f) => lights && ((f + seed) % 2) === 0;
  for (let f = 1; f < floors; f++) {
    const yb = B + G + (f - 1) * FLOOR;
    if (f > 1) {
      box(x0 - 0.06, yb - 0.06, z0 - 0.06, W + 0.06, 0.12, 0.06, wallBand);
      box(x0 - 0.06, yb - 0.06, z0, 0.06, 0.12, D, shellBand);
    }
    const wy = yb + 0.6;
    [x0 + W * 0.27, x0 + W * 0.73].forEach((cx, i) => {
      const on = lights && ((f * 5 + i * 3 + seed) % 4) !== 0;
      box(cx - 0.5, wy, z0 - 0.06, 1.0, 1.4, 0.04, on ? lit : glass, on);
      box(cx - 0.58, wy + 1.4, z0 - 0.09, 1.16, 0.08, 0.06, ink);
      box(cx - 0.58, wy, z0 - 0.09, 0.08, 1.4, 0.06, ink);
      box(cx + 0.5, wy, z0 - 0.09, 0.08, 1.4, 0.06, ink);
      box(cx - 0.03, wy, z0 - 0.09, 0.06, 1.4, 0.03, ink);
      box(cx - 0.5, wy + 0.9, z0 - 0.09, 1.0, 0.05, 0.03, ink);
      for (const shx of [cx - 0.96, cx + 0.58]) {
        box(shx, wy, z0 - 0.07, 0.38, 1.4, 0.04, front);
        for (const sy of [0.35, 0.7, 1.05]) box(shx + 0.05, wy + sy, z0 - 0.09, 0.28, 0.04, 0.02, ink);
      }
      box(cx - 0.62, wy - 0.1, z0 - 0.21, 1.24, 0.1, 0.18, ink);
      box(cx - 0.58, wy - 0.4, z0 - 0.35, 1.16, 0.3, 0.32, wood);
      box(cx - 0.54, wy - 0.1, z0 - 0.33, 1.08, 0.12, 0.26, "#79B86A");
      for (let b = 0; b < 4; b++) {
        const bw = 0.16 + 0.08 * rnd();
        box(cx - 0.5 + b * 0.27, wy + 0.02, z0 - 0.3 + 0.04 * rnd(), bw, 0.1 + 0.06 * rnd(), 0.14, b % 2 ? "#F7B8CF" : paper);
      }
    });
    const zc = z0 + D / 2;
    box(x0 - 0.05, wy, zc - 0.5, 0.05, 1.3, 1.0, on2(f) ? lit : glass, on2(f));
    box(x0 - 0.08, wy + 1.3, zc - 0.58, 0.08, 0.08, 1.16, ink);
    box(x0 - 0.08, wy - 0.1, zc - 0.58, 0.08, 0.1, 1.16, ink);
    box(x0 - 0.08, wy, zc - 0.58, 0.08, 1.3, 0.08, ink);
    box(x0 - 0.08, wy, zc + 0.5, 0.08, 1.3, 0.08, ink);
  }

  // ---- roof ----
  if (floors > 1) box(x0, top - 0.16, z0 - 0.07, W, 0.16, 0.07, ink); // eaves band
  if (p.roof === "gable") {
    parts.push({ t: "gable", p: [x0 - 0.2, top, z0 - 0.2], s: [W + 0.4, 1.6, D + 0.4], c: slate, axis: "x" });
    const chz = z0 + D * 0.62;
    box(xR - 1.3, top, chz, 0.5, 1.9, 0.5, "#C8553D");
    box(xR - 1.36, top + 1.9, chz - 0.06, 0.62, 0.1, 0.62, slate);
  } else {
    box(x0 - 0.1, top, z0 - 0.1, W + 0.2, 0.35, D + 0.2, slate);
    box(xR - 1.8, top + 0.35, z0 + 2, 1.1, 0.7, 1.1, "#D8DEE3");
    box(x0 + 0.6, top + 0.35, z0 + 1.2, 1.4, 0.25, 1.0, glass); // skylight over the stacks
  }

  return { parts };
}
