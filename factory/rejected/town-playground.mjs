// Town Playground: a soft-tiled play lot with a roofed tower slide, a swing frame, a sandbox and a bench.
// Block asset: build(p) returns parts in metres on the Oasis Town grid (origin at the footprint's corner,
// y up, street side at z = 0). The ground is a grid of small 0.6 m tiles, cut out wherever equipment
// stands, so no ground slab ever paints over the equipment.
export const meta = {
  title: "Town Playground",
  kind: "3d",
  format: "blocks",
  kit: "Oasis Town",
  description: "A neighbourhood playground on rubber tiles, with a roofed tower slide, a swing frame, a bench and a sandbox or hopscotch, sized to drop between 6 m town lots.",
  tags: ["3d", "low poly", "playground", "park", "slide", "swings", "sandbox", "kit"],
  price: 3,
  author: "oasis-factory",
  footprint: [6, 6],
  size: [1000, 1000],
};

export const params = {
  knobs: {
    mat: { type: "color", role: "surface", label: "Soft mat", default: "#79B86A" },
    slide: { type: "color", role: "primary", label: "Slide", default: "#E5484D" },
    frame: { type: "color", role: "secondary", label: "Frame & tower", default: "#3E7BFA" },
    seats: { type: "color", role: "highlight", label: "Seats & roof", default: "#F2B33D" },
    swings: { type: "range", label: "Swings", default: 2, min: 1, max: 3, step: 1 },
    height: { type: "range", label: "Slide height (m)", default: 1.6, min: 1.2, max: 2.0, step: 0.2 },
    roof: { type: "choice", label: "Tower top", default: "peaked", options: ["peaked", "flat", "open"] },
    sandbox: { type: "toggle", label: "Sandbox (off: hopscotch)", default: true },
  },
  presets: {
    Meadow: { mat: "#A9D18E", slide: "#F2B33D", frame: "#2F7A55", seats: "#E5484D" },
    Candy: { mat: "#F7B8CF", slide: "#3E7BFA", frame: "#7D5BA6", seats: "#F2B33D" },
    Harbour: { mat: "#7E93A8", slide: "#F2B33D", frame: "#5B6270", seats: "#C8553D" },
  },
};

// colour helpers: clamp brand colours on big surfaces so light and shadow faces stay readable
function toHsl(hex) {
  let n = parseInt(String(hex).replace("#", ""), 16);
  if (!(n >= 0)) n = 0x808080;
  const r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
  let h = 0, s = 0;
  if (mx !== mn) {
    const d = mx - mn;
    s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
    h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    h /= 6;
  }
  return [h, s, l];
}
function toHex(h, s, l) {
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s, pp = 2 * l - q;
  const f = (t) => {
    t = (t + 1) % 1;
    if (t < 1 / 6) return pp + (q - pp) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return pp + (q - pp) * (2 / 3 - t) * 6;
    return pp;
  };
  const c = (v) => Math.round(Math.max(0, Math.min(1, v)) * 255).toString(16).padStart(2, "0");
  return "#" + c(f(h + 1 / 3)) + c(f(h)) + c(f(h - 1 / 3));
}
const clampL = (hex, lo, hi) => { const [h, s, l] = toHsl(hex); return toHex(h, s, Math.max(lo, Math.min(hi, l))); };
const shade = (hex, k) => { const [h, s, l] = toHsl(hex); return toHex(h, s, Math.max(0.12, l * k)); };

export function build(p) {
  const parts = [];
  const box = (x, y, z, w, h, d, c) => parts.push({ t: "box", p: [x, y, z], s: [w, h, d], c });
  const gable = (x, y, z, w, h, d, c) => parts.push({ t: "gable", p: [x, y, z], s: [w, h, d], c, axis: "x" });
  const rope = "#5B6270", wood = "#8A6E52", sand = "#EBCB8B", cream = "#F6EEE0", glass = "#7E93A8";

  const matC = clampL(p.mat, 0.3, 0.78);
  const matAlt = shade(matC, 0.92);
  const edgeC = shade(matC, 0.62);
  const frameC = clampL(p.frame, 0.25, 0.66);
  const padC = shade(p.slide, 0.82);

  // ---- shared ground grid: 9 x 9 tiles of 0.6 m inside a 0.3 m rubber edge
  const T = 0.6, M0 = 0.3, N = 9, G = 0.15;
  const gx = (i) => +(M0 + i * T).toFixed(3);

  // ---- layout (all on the grid)
  const H = Math.max(1.2, Math.min(2.0, +p.height || 1.6));
  const tx0 = gx(6), tx1 = gx(8), tz0 = gx(5), tz1 = gx(7);   // tower x 3.9..5.1, z 3.3..4.5
  const cx0 = tx1, cw = 0.54, cx1 = cx0 + cw;                 // chute beside the tower
  const zr = (tz0 + tz1) / 2;                                  // ridge meets the deck edge
  const L = H * 0.9;                                           // half run of the slide hill
  const toe = zr - L, padZ = toe - 0.6;
  const sb = { x0: gx(1), x1: gx(5), z0: gx(1), z1: gx(4) };   // sandbox 0.9..3.3 x 0.9..2.7

  const holes = [[tx0, tx1, tz0, tz1], [gx(8), gx(9), padZ, zr + L]];
  if (p.sandbox) holes.push([sb.x0, sb.x1, sb.z0, sb.z1]);
  const sub = (segs, a, b) => {
    const out = [];
    for (const [s, e] of segs) {
      if (b <= s || a >= e) { out.push([s, e]); continue; }
      if (a > s) out.push([s, a]);
      if (b < e) out.push([b, e]);
    }
    return out;
  };
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
    const x0 = gx(i), x1 = gx(i + 1);
    let segs = [[gx(j), gx(j + 1)]];
    for (const h of holes) if (h[0] <= x0 + 0.01 && h[1] >= x1 - 0.01) segs = sub(segs, h[2], h[3]);
    for (const [s, e] of segs) if (e - s > 0.005) box(x0, 0, s, T, G, e - s, (i + j) % 2 ? matAlt : matC);
  }
  // rubber edge, segmented to match the tiles
  const ex = [0];
  for (let i = 0; i <= N; i++) ex.push(gx(i));
  ex.push(6);
  for (let i = 0; i < ex.length - 1; i++) {
    box(ex[i], 0, 0, ex[i + 1] - ex[i], 0.22, M0, edgeC);
    box(ex[i], 0, 6 - M0, ex[i + 1] - ex[i], 0.22, M0, edgeC);
  }
  for (let j = 0; j < N; j++) {
    box(0, 0, gx(j), M0, 0.22, T, edgeC);
    box(6 - M0, 0, gx(j), M0, 0.22, T, edgeC);
  }

  // ---- tower: closed box from the ground to the deck
  box(tx0, 0, tz0, tx1 - tx0, H, tz1 - tz0, frameC);
  box(tx0 + 0.08, H, tz0 + 0.08, tx1 - tx0 - 0.16, 0.03, tz1 - tz0 - 0.16, wood); // deck boards
  // ladder on the street face, left half
  for (const rx of [tx0 + 0.12, tx0 + 0.58]) box(rx, G, tz0 - 0.08, 0.06, H - G + 0.5, 0.06, cream);
  for (let y = G + 0.3; y < H - 0.05; y += 0.3) box(tx0 + 0.18, y, tz0 - 0.07, 0.4, 0.06, 0.05, cream);
  // window on the street face, right half
  const wy0 = G + 0.3, wh = Math.max(0.45, H - 0.25 - wy0);
  box(tx0 + 0.72, wy0, tz0 - 0.03, 0.36, wh, 0.03, cream);
  box(tx0 + 0.79, wy0 + 0.07, tz0 - 0.05, 0.22, wh - 0.14, 0.02, glass);
  // posts and railings (gap on the right where the slide starts)
  const open = p.roof === "open";
  const postT = open ? 0.55 : 1.1;
  const posts = [[tx0, tz0], [tx1 - 0.1, tz0], [tx0, tz1 - 0.1], [tx1 - 0.1, tz1 - 0.1],
    [tx0 + 0.62, tz0], [tx1 - 0.1, zr - 0.4], [tx1 - 0.1, zr + 0.3]];
  for (const [px, pz] of posts) box(px, H, pz, 0.1, postT, 0.1, frameC);
  const rY = H + 0.42;
  box(tx0 + 0.72, rY, tz0 + 0.02, tx1 - tx0 - 0.82, 0.08, 0.06, cream);           // front, right of ladder
  box(tx0 + 0.1, rY, tz1 - 0.08, tx1 - tx0 - 0.2, 0.08, 0.06, cream);             // back
  box(tx0 + 0.02, rY, tz0 + 0.1, 0.06, 0.08, tz1 - tz0 - 0.2, cream);             // left
  box(tx1 - 0.08, rY, tz0 + 0.1, 0.06, 0.08, zr - 0.4 - tz0 - 0.1, cream);         // right, front stub
  box(tx1 - 0.08, rY, zr + 0.4, 0.06, 0.08, tz1 - 0.1 - zr - 0.4, cream);          // right, back stub
  const topY = H + postT;
  if (p.roof === "peaked") {
    gable(tx0 - 0.15, topY, tz0 - 0.15, tx1 - tx0 + 0.3, 0.7, tz1 - tz0 + 0.3, p.seats);
  } else if (p.roof === "flat") {
    box(tx0 - 0.1, topY, tz0 - 0.1, tx1 - tx0 + 0.2, 0.15, tz1 - tz0 + 0.2, p.seats);
    const fx = (tx0 + tx1) / 2 - 0.03, fz = zr - 0.03;
    box(fx, topY + 0.15, fz, 0.06, 0.85, 0.06, rope);
    box(fx + 0.06, topY + 0.65, fz + 0.01, 0.5, 0.32, 0.04, p.slide);
  }

  // ---- slide hill beside the tower: front slope slides to the street, back slope is the climb
  gable(cx0, 0, toe, cw, H, 2 * L, p.slide);
  const dist = (L * H) / Math.sqrt(L * L + H * H), k = Math.max(0.5, 1 - 0.15 / dist);
  gable(cx1, 0, zr - k * L, 0.03, k * H, 2 * k * L, shade(frameC, 0.85)); // support skirt under a chute band
  box(cx0, 0, padZ, gx(9) - cx0, G + 0.03, toe - padZ, padC);             // landing pad at the toe
  if (zr + L < gx(9) - 0.005) {} // remaining strip behind the hill is filled by tiles above

  // ---- swing frame (back left), centred in x 0.45..3.75, clear of the tower at x 3.9
  const n = Math.max(1, Math.min(3, Math.round(p.swings)));
  const bay = 0.95, fw = n * bay + 0.4;
  const x0 = 0.45 + (3.3 - fw) / 2;
  const zA = 4.2, zB = 5.2, top = 2.3, pt = 0.12;
  for (const fx of [x0, x0 + fw - pt]) {
    for (const ez of [zA, zB]) box(fx, G, ez, pt, top - G, pt, frameC);
    box(fx, top, zA, pt, pt, zB + pt - zA, frameC);
  }
  const beamZ = (zA + zB + pt) / 2 - 0.06;
  box(x0, top + pt, beamZ, fw, pt, pt, frameC);
  const seatTop = 0.62;
  for (let i = 0; i < n; i++) {
    const sc = x0 + 0.2 + bay * (i + 0.5);
    box(sc - 0.26, seatTop - 0.07, beamZ - 0.07, 0.52, 0.07, 0.26, p.seats);
    for (const rx of [sc - 0.23, sc + 0.19]) box(rx, seatTop, beamZ + 0.04, 0.04, top + pt - seatTop, 0.04, rope);
  }

  // ---- bench at the street edge, front right, facing into the playground
  const bx0 = gx(6) + 0.05, bx1 = gx(8) - 0.05;
  for (const lx of [bx0 + 0.1, bx1 - 0.2]) {
    box(lx, G, 0.5, 0.1, 0.39, 0.4, frameC);
    box(lx, G + 0.45, 0.5, 0.1, 0.4, 0.06, frameC);
  }
  box(bx0, G + 0.39, 0.5, bx1 - bx0, 0.06, 0.42, wood);
  box(bx0, G + 0.55, 0.44, bx1 - bx0, 0.25, 0.06, wood);

  // ---- front left: sandbox in its own cut-out, or painted hopscotch on the tiles
  if (p.sandbox) {
    const rt = 0.15, wallH = G + 0.22, sandH = G + 0.1;
    const ix0 = sb.x0 + rt, ix1 = sb.x1 - rt, iz0 = sb.z0 + rt, iz1 = sb.z1 - rt;
    for (let i = 1; i < 5; i++) {
      const a = gx(i), b = gx(i + 1);
      box(a, 0, sb.z0, T, wallH, rt, wood);
      box(a, 0, sb.z1 - rt, T, wallH, rt, wood);
      for (let j = 1; j < 4; j++) {
        const za = Math.max(gx(j), iz0), zb = Math.min(gx(j + 1), iz1);
        const xa = Math.max(a, ix0), xb = Math.min(b, ix1);
        box(xa, 0, za, xb - xa, sandH, zb - za, sand);
      }
    }
    for (let j = 1; j < 4; j++) {
      const za = Math.max(gx(j), iz0), zb = Math.min(gx(j + 1), iz1);
      box(sb.x0, 0, za, rt, wallH, zb - za, wood);
      box(sb.x1 - rt, 0, za, rt, wallH, zb - za, wood);
    }
    parts.push({ t: "cone", p: [2.6, sandH, 1.9], r: 0.42, h: 0.28, c: "#D9B26E", n: 10 });
    parts.push({ t: "cyl", p: [1.55, sandH, 1.55], r: 0.17, h: 0.24, c: p.slide, n: 10 });
    box(1.51, sandH, 1.76, 0.08, 0.04, 0.34, p.seats);
  } else {
    for (let i = 1; i < 5; i++) {
      const x = gx(i) + 0.06, single = i % 2 === 1;
      if (single) box(x, G, gx(2) + 0.04, 0.48, 0.02, 0.52, p.seats);
      else {
        box(x, G, gx(1) + 0.05, 0.48, 0.02, 0.52, p.seats);
        box(x, G, gx(3) + 0.03, 0.48, 0.02, 0.52, p.seats);
      }
    }
  }

  return { parts };
}
