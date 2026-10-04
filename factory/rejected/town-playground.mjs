// Town Playground: a soft-mat play lot with a slide clubhouse, a swing frame and a sandbox. Block asset: build(p)
// returns parts in metres on the Oasis Town grid (origin at the footprint's corner, y up, street side at z = 0).
// Layout uses reserved zones, so no knob value can push one object into another or past the kerb:
//   swings   x 0.40-3.00, z 4.15-5.27 (the frame grows to the right with the seat count; it peaks at x 3.00)
//   bench    x 3.30-3.78, z 4.50-5.40
//   slide    x 4.08-5.45, z 0.90-5.35 (the clubhouse hides the back slope; the ladder is on its -x face)
//   rider    x 3.50-3.90, z 1.35-2.30
//   sandbox  x 0.60-3.00, z 0.80-2.80 (or hopscotch painted into the mat tiles)
//   lamp     x 5.36-5.74, z 0.26-0.64 (fixed height)
export const meta = {
  title: "Town Playground",
  kind: "3d",
  format: "blocks",
  kit: "Oasis Town",
  description: "A corner playground on a tiled soft mat with a slide clubhouse, a swing frame, a spring rider, a bench, a park lamp and a sandbox or hopscotch. It fills one 6 m town lot.",
  tags: ["3d", "low poly", "playground", "park", "slide", "swings", "sandbox", "town", "kit", "block"],
  price: 3,
  author: "oasis-factory",
  footprint: [6, 6],
  size: [1000, 1000],
};

export const params = {
  knobs: {
    mat: { type: "color", role: "surface", label: "Soft mat", default: "#79B86A" },
    slide: { type: "color", role: "primary", label: "Slide, seats & roof", default: "#E5484D" },
    frame: { type: "color", role: "secondary", label: "Frames & posts", default: "#3E7BFA" },
    swings: { type: "range", label: "Swings", default: 2, min: 1, max: 3, step: 1 },
    sandbox: { type: "toggle", label: "Sandbox (off: hopscotch)", default: true },
    lights: { type: "toggle", label: "Lamp lit", default: true },
  },
  presets: {
    Candy: { mat: "#F7B8CF", slide: "#3E7BFA", frame: "#F2B33D" },
    Civic: { mat: "#8FA3B5", slide: "#2F7A55", frame: "#5B6270" },
    Terracotta: { mat: "#C8553D", slide: "#F2B33D", frame: "#2F7A55" },
  },
};

// ---- colour helpers: clamp brand colours into the kit's band, keep adjacent colours apart ----
function safeHex(h, fb) { return typeof h === "string" && /^#[0-9a-fA-F]{6}$/.test(h) ? h : fb; }
function toHsl(hex) {
  const n = parseInt(hex.slice(1), 16);
  const r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
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
function toHex(h, s, l) {
  const f = (t) => {
    t = (t + 1) % 1;
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s, pp = 2 * l - q;
    if (t < 1 / 6) return pp + (q - pp) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return pp + (q - pp) * (2 / 3 - t) * 6;
    return pp;
  };
  const c = (v) => Math.round(Math.max(0, Math.min(1, v)) * 255).toString(16).padStart(2, "0");
  return "#" + (s === 0 ? c(l) + c(l) + c(l) : c(f(h + 1 / 3)) + c(f(h)) + c(f(h - 1 / 3)));
}
function band(hex, lo, hi, smax) {
  const [h, s, l] = toHsl(hex);
  return toHex(h, Math.min(s, smax), Math.max(lo, Math.min(hi, l)));
}
function tone(hex, d) { // darken light colours, lighten dark ones
  const [h, s, l] = toHsl(hex);
  return toHex(h, s, l < 0.42 ? Math.min(0.9, l + d) : Math.max(0.1, l - d));
}
function apart(hex, ref, minD) { // if a colour shares hue (or greyness) with its neighbour, force a lightness gap
  const [h, s, l] = toHsl(hex), [hr, sr, lr] = toHsl(ref);
  const dh = Math.min(Math.abs(h - hr), 1 - Math.abs(h - hr));
  if ((dh > 0.09 && s > 0.2 && sr > 0.2) || Math.abs(l - lr) >= minD) return hex;
  const nl = lr > 0.5 ? lr - minD : lr + minD;
  return toHex(h, s, Math.max(0.12, Math.min(0.85, nl)));
}

export function build(p) {
  const parts = [];
  const box = (x, y, z, w, h, d, c, e) => parts.push({ t: "box", p: [x, y, z], s: [w, h, d], c, ...(e ? { e: true } : {}) });
  const gable = (x, y, z, w, h, d, c, axis) => parts.push({ t: "gable", p: [x, y, z], s: [w, h, d], c, axis });

  const MAT = band(safeHex(p.mat, "#79B86A"), 0.4, 0.62, 0.6);
  const MAT2 = tone(MAT, 0.07);
  const SLIDE = apart(band(safeHex(p.slide, "#E5484D"), 0.4, 0.6, 0.85), MAT, 0.18);
  const RAIL = tone(SLIDE, 0.14);
  const FRAME = apart(band(safeHex(p.frame, "#3E7BFA"), 0.3, 0.58, 0.8), MAT, 0.18);
  const BEAM = tone(FRAME, 0.1);
  const KERB = "#D9DCE1", WOOD = "#8A6E52", WOOD2 = "#A88A6A", SAND = "#E6C47C", SAND2 = "#D2A95E", SAND3 = "#C99A55";
  const RUBBER = "#3B4048", INK = "#5B6270", CREAM = "#F6EEE0", SUN = "#F2B33D", GLASS = "#7E93A8";

  const swings = Math.max(1, Math.min(3, Math.round(p.swings)));
  const G = 0.18; // mat top

  // ---- ground: raised kerb ring around a full 7 x 7 grid of 0.8 m rubber tiles, all laid side by side ----
  box(0, 0, 0, 6, 0.22, 0.2, KERB);
  box(0, 0, 5.8, 6, 0.22, 0.2, KERB);
  box(0, 0, 0.2, 0.2, 0.22, 5.6, KERB);
  box(5.8, 0, 0.2, 0.2, 0.22, 5.6, KERB);
  const matC = (i, j) => ((i + j) % 2 ? MAT2 : MAT);
  const hopZone = (i, j) => !p.sandbox && i <= 3 && j >= 1 && j <= 3; // x 0.2-3.4, z 1.0-3.4
  for (let i = 0; i < 7; i++) for (let j = 0; j < 7; j++)
    if (!hopZone(i, j)) box(0.2 + 0.8 * i, 0, 0.2 + 0.8 * j, 0.8, G, 0.8, matC(i, j));
  if (!p.sandbox) {
    // the hopscotch is painted into the mat as its own 0.4 m tiles, so nothing is stacked on the floor
    const hop = { 0: [4], 1: [4], 2: [3, 5], 3: [4], 4: [3, 5], 5: [3, 4, 5] };
    for (let sz = 0; sz < 6; sz++) for (let sx = 0; sx < 8; sx++) {
      let c = matC(Math.floor(sx / 2), 1 + Math.floor(sz / 2));
      if (hop[sz].includes(sx)) c = sz === 5 ? SUN : CREAM;
      box(0.2 + sx * 0.4, 0, 1.0 + sz * 0.4, 0.4, G, 0.4, c);
    }
  }

  // ---- slide clubhouse (right): the chute runs to the street and its back slope is hidden inside the house ----
  const H = 1.6, L = 2.1, zc = 3.0, DT = G + H + 0.15; // chute top at zc, deck top DT
  gable(4.47, G, zc - L, 0.66, H, 2 * L, RAIL, "x"); // chute bed (the groove you see from above)
  for (const lx of [4.35, 5.13]) gable(lx, G, zc - L, 0.12, H + 0.12, 2 * L, SLIDE, "x"); // side walls
  box(4.2, G, zc, 1.2, H + 0.09, 2.2, WOOD); // clubhouse body (z 3.0-5.2 covers the back slope ending at 5.1)
  box(4.15, DT - 0.06, zc - 0.05, 1.3, 0.06, 2.3, WOOD2); // deck lip
  box(4.16, G + 0.7, 4.3, 0.04, 0.5, 0.6, GLASS); // side window
  box(4.15, G + 0.64, 4.24, 0.05, 0.06, 0.72, WOOD2); // window sill
  for (const px of [4.2, 5.28]) for (const pz of [zc, 5.08]) box(px, DT, pz, 0.12, 1.0, 0.12, FRAME); // posts
  box(4.2, DT + 0.5, 3.95, 0.12, 0.08, 1.13, FRAME); // left guard (gap at the ladder)
  box(4.32, DT + 0.5, 5.08, 0.96, 0.08, 0.12, FRAME); // back guard
  box(5.28, DT + 0.5, zc + 0.12, 0.12, 0.08, 1.96, FRAME); // right guard
  box(4.15, DT + 1.0, zc - 0.05, 1.3, 0.12, 2.3, RAIL); // roof band seats the roof on the posts
  gable(4.05, DT + 1.12, zc - 0.15, 1.5, 0.65, 2.5, SLIDE, "z");
  // ladder on the camera-facing side
  for (const lz of [3.2, 3.82]) box(4.08, G, lz, 0.12, DT + 0.55 - G, 0.1, FRAME);
  for (let y = G + 0.3; y < DT - 0.05; y += 0.3) box(4.06, y, 3.3, 0.1, 0.06, 0.52, CREAM);

  // ---- swing frame (back left): every seat is built in the same loop as its chains; the frame widens with the count ----
  const cx = (i) => 0.95 + 0.75 * i;
  const xl = 0.4, xr = cx(swings - 1) + 0.43;
  for (const lx of [xl, xr]) {
    for (const lz of [4.15, 5.15]) box(lx, G, lz, 0.12, 2.2, 0.12, FRAME);
    box(lx, G + 2.2, 4.15, 0.12, 0.12, 1.12, FRAME); // top crossbar
    box(lx, G + 0.5, 4.27, 0.12, 0.08, 0.88, FRAME); // low brace
  }
  box(xl, G + 2.32, 4.64, xr + 0.12 - xl, 0.14, 0.14, BEAM);
  for (let i = 0; i < swings; i++) {
    const c = cx(i);
    box(c - 0.23, G + 0.42, 4.56, 0.46, 0.1, 0.3, SLIDE); // seat
    for (const ox of [-0.19, 0.14]) box(c + ox, G + 0.52, 4.685, 0.05, 1.8, 0.05, INK); // chains
  }

  // ---- bench for grown-ups, watching the swings (clear of the frame at 3 swings and of the ladder) ----
  box(3.3, G + 0.4, 4.5, 0.42, 0.06, 0.9, WOOD);
  box(3.72, G + 0.46, 4.5, 0.06, 0.42, 0.9, WOOD);
  for (const bz of [4.56, 5.28]) box(3.36, G, bz, 0.36, 0.4, 0.06, INK);

  // ---- spring rider: a little horse on a spring, head to the street ----
  const rider = (x, z, col) => {
    parts.push({ t: "cyl", p: [x, G, z], r: 0.2, h: 0.04, c: INK, n: 10 });
    parts.push({ t: "cyl", p: [x, G + 0.04, z], r: 0.07, h: 0.34, c: INK, n: 8 });
    box(x - 0.14, G + 0.38, z - 0.35, 0.28, 0.26, 0.75, col); // body
    box(x - 0.12, G + 0.5, z - 0.55, 0.24, 0.34, 0.22, col); // head
    box(x - 0.13, G + 0.7, z - 0.58, 0.26, 0.06, 0.03, RUBBER); // eyes
    box(x - 0.1, G + 0.64, z - 0.05, 0.2, 0.04, 0.26, RUBBER); // saddle
    box(x - 0.2, G + 0.64, z - 0.28, 0.4, 0.05, 0.05, INK); // handlebar
  };
  rider(3.7, 1.9, SUN);

  // ---- park lamp (front right corner, fixed height) ----
  box(5.43, G, 0.33, 0.24, 0.1, 0.24, INK);
  box(5.5, G, 0.4, 0.1, 2.8, 0.1, INK);
  box(5.4, G + 2.8, 0.3, 0.3, 0.32, 0.3, p.lights ? "#FFD58A" : GLASS, p.lights);
  box(5.36, G + 3.12, 0.26, 0.38, 0.06, 0.38, INK);

  if (p.sandbox) {
    // ---- sandbox (front left), set well inside the kerb: timber rim, corner seats, sand and toys ----
    const x0 = 0.6, x1 = 3.0, z0 = 0.8, z1 = 2.8, t = 0.16, rh = 0.3, SY = G + 0.2;
    box(x0, G, z0, x1 - x0, rh, t, WOOD);
    box(x0, G, z1 - t, x1 - x0, rh, t, WOOD);
    box(x0, G, z0 + t, t, rh, z1 - z0 - 2 * t, WOOD);
    box(x1 - t, G, z0 + t, t, rh, z1 - z0 - 2 * t, WOOD);
    for (const [ax, az] of [[x0, z0], [x1 - 0.36, z0], [x0, z1 - 0.36], [x1 - 0.36, z1 - 0.36]])
      box(ax, G + rh, az, 0.36, 0.05, 0.36, WOOD2); // corner seats
    box(x0 + t, G, z0 + t, x1 - x0 - 2 * t, 0.2, z1 - z0 - 2 * t, SAND);
    parts.push({ t: "cone", p: [1.4, SY, 2.0], r: 0.4, h: 0.3, c: SAND2, n: 10 }); // dug-up mound
    box(2.0, SY, 1.7, 0.44, 0.3, 0.44, SAND3); // sandcastle
    parts.push({ t: "cone", p: [2.22, SY + 0.3, 1.92], r: 0.24, h: 0.32, c: SAND3, n: 6 });
    parts.push({ t: "cyl", p: [1.15, SY, 1.35], r: 0.16, h: 0.26, c: SLIDE, n: 10 }); // bucket
    parts.push({ t: "cyl", p: [1.15, SY + 0.26, 1.35], r: 0.17, h: 0.03, c: RAIL, n: 10 });
    box(1.5, SY, 1.2, 0.26, 0.04, 0.2, FRAME); // spade blade
    box(1.76, SY, 1.27, 0.36, 0.05, 0.06, WOOD); // spade handle
  } else {
    rider(0.75, 2.05, SLIDE); // second rider beside the hopscotch keeps the slide colour on show
  }

  return { parts };
}
