// Canal Tile: a 6 x 6 m stretch of town canal with stone quay walls, layered water and a little moored launch.
// Block asset: build(p) returns parts in metres on the Oasis Town grid (origin at the footprint corner, y up,
// street side at z = 0). The canal runs along x, so tiles chain left-right into a waterway.
export const meta = {
  title: "Canal Tile",
  kind: "3d",
  format: "blocks",
  kit: "Oasis Town",
  description: "A 6 m stretch of stone-walled canal with an optional moored launch, adjustable width and quay height, tiling left to right into a waterway through town.",
  tags: ["3d", "low poly", "canal", "water", "boat", "quay", "waterfront", "town", "kit", "tile"],
  price: 3,
  author: "oasis-factory",
  footprint: [6, 6],
  size: [1000, 1000],
};

export const params = {
  knobs: {
    stone: { type: "color", role: "surface", label: "Bank stone", default: "#C9BFAE" },
    water: { type: "color", role: "primary", label: "Water", default: "#4F8FD6" },
    boat: { type: "color", role: "primary", label: "Boat paint", default: "#E5484D" },
    showBoat: { type: "toggle", label: "Moored boat", default: true },
    channel: { type: "range", label: "Canal width (m)", default: 3.2, min: 2.2, max: 4, step: 0.2 },
    quay: { type: "range", label: "Quay height (m)", default: 0.85, min: 0.7, max: 1.45, step: 0.15 },
    dressing: { type: "choice", label: "Quay dressing", default: "quay", options: ["bare", "quay", "promenade"] },
    lights: { type: "toggle", label: "Lamps lit", default: true },
  },
  presets: {
    Harbour: { stone: "#B9BEC6", water: "#3E6FB0", boat: "#F2B33D" },
    Amsterdam: { stone: "#A8735E", water: "#3F6E7A", boat: "#F7B8CF" },
    Lagoon: { stone: "#E6D8BD", water: "#3FA39A", boat: "#3E7BFA" },
  },
};

export function build(p) {
  const parts = [];
  const box = (x, y, z, w, h, d, c, e) =>
    parts.push({ t: "box", p: [x, y, z], s: [w, h, d], c, ...(e ? { e: true } : {}) });
  const cyl = (cx, y, cz, r, h, c, n) => parts.push({ t: "cyl", p: [cx, y, cz], r, h, c, n });

  // ---- colour helpers: HSL with clamped bands so any brand input stays inside the kit's range ----
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rgb = (c) => {
    const v = parseInt(String(c).replace("#", ""), 16) || 0;
    return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
  };
  const hex = (a) => "#" + a.map((v) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, "0")).join("").toUpperCase();
  const mix = (c, d, t) => { const a = rgb(c), b = rgb(d); return hex(a.map((v, i) => v + (b[i] - v) * t)); };
  const toHsl = (c) => {
    const [r, g, b] = rgb(c).map((v) => v / 255);
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
    let h = 0, s = 0;
    if (d > 1e-6) {
      s = d / (1 - Math.abs(2 * l - 1));
      if (mx === r) h = ((g - b) / d) % 6;
      else if (mx === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h *= 60;
      if (h < 0) h += 360;
    }
    return [h, clamp(s, 0, 1), l];
  };
  const fromHsl = (h, s, l) => {
    l = clamp(l, 0, 1); s = clamp(s, 0, 1); h = ((h % 360) + 360) % 360;
    const C = (1 - Math.abs(2 * l - 1)) * s, X = C * (1 - Math.abs(((h / 60) % 2) - 1)), m = l - C / 2;
    const t = [[C, X, 0], [X, C, 0], [0, C, X], [0, X, C], [X, 0, C], [C, 0, X]][Math.floor(h / 60) % 6];
    return hex(t.map((v) => (v + m) * 255));
  };
  const hueDist = (a, b) => { const d = Math.abs(a - b) % 360; return d > 180 ? 360 - d : d; };
  const clampHue = (h, lo, hi) => (h >= lo && h <= hi ? h : hueDist(h, lo) < hueDist(h, hi) ? lo : hi);

  // stone: muted and capped below the canvas grey so bank tops never bleed into the background
  let [sh, ss, sl] = toHsl(p.stone);
  ss = Math.min(ss, 0.3); sl = clamp(sl, 0.48, 0.76);
  const stoneTop = fromHsl(sh, ss, sl);
  const stoneSide = fromHsl(sh, ss, sl - 0.16);
  const joint = fromHsl(sh, ss, sl - 0.26);
  const coping = fromHsl(sh, ss * 0.5, sl < 0.64 ? sl + 0.12 : sl - 0.12);

  // water: hue held in the blue-teal band, calm saturation, mid lightness; a deeper body under the skin
  let [wh, ws, wl] = toHsl(p.water);
  wh = clampHue(wh, 170, 228); ws = clamp(ws, 0.28, 0.52); wl = clamp(wl, 0.4, 0.54);
  const water = fromHsl(wh, ws, wl);
  const waterDeep = fromHsl(wh, ws, wl - 0.16);
  const ripple = fromHsl(wh, ws * 0.6, Math.min(0.84, wl + 0.2));
  const lit = "#FFD58A";
  const glint = mix(ripple, lit, 0.6); // lamp reflections: a sun glint by day, a warm streak at night

  // boat: brand accent, but always separated from the water by lightness unless the hue is clearly different
  let [bh, bs, bl] = toHsl(p.boat);
  bl = clamp(bl, 0.26, 0.62);
  const hueClear = hueDist(bh, wh) >= 60 && bs >= 0.35;
  if (!hueClear && Math.abs(bl - wl) < 0.22) bl = wl - 0.22 >= 0.18 ? wl - 0.22 : wl + 0.22;
  if (!hueClear) bs = Math.max(bs, 0.45);
  const boatC = fromHsl(bh, bs, bl);
  const boot = fromHsl(bh, Math.min(bs, 0.5), Math.max(0.12, bl - 0.2));

  const wood = "#8A6E52", woodDark = "#6E5640", metal = "#4A505B", motor = "#3B4048";
  const lampOff = "#6B7280", white = "#FBFBFB", rope = "#E8DCC0", leaf = "#79B86A";

  const BANK = p.quay, SLAB = 0.1, COPE = 0.06, WATER = 0.2;
  const TOP = BANK + COPE;
  const Wc = p.channel;
  const zA = (6 - Wc) / 2, zB = zA + Wc; // canal edges (front bank / back bank)
  const useFront = zA - 0.35, useBack0 = zB + 0.35, useBack = 6 - useBack0; // paved depth behind the coping

  // ---- banks: darker masonry body, lighter paving slab, coping along the water ----
  for (const [z, d] of [[0, zA], [zB, 6 - zB]]) {
    box(0, 0, z, 6, BANK - SLAB, d, stoneSide);
    box(0, BANK - SLAB, z, 6, SLAB, d, stoneTop);
  }
  box(0, BANK, zA - 0.35, 6, COPE, 0.35, coping);
  box(0, BANK, zB, 6, COPE, 0.35, coping);
  for (const x of [1.5, 3, 4.5]) { // paving joints
    box(x - 0.02, BANK, 0, 0.04, 0.02, useFront, joint);
    box(x - 0.02, BANK, useBack0, 0.04, 0.02, useBack, joint);
  }
  // masonry courses on the back quay wall (the face the street looks at); they grow with quay height
  const lines = [];
  for (let y = WATER + 0.26; y < BANK - 0.12; y += 0.26) lines.push(y);
  for (const y of lines) box(0, y, zB - 0.03, 6, 0.03, 0.03, joint);
  const bands = [WATER, ...lines.map((y) => y + 0.03)];
  bands.forEach((y0, i) => {
    const y1 = i < lines.length ? lines[i] : BANK;
    for (let x = i % 2 ? 0.3 : 0.6; x < 5.9; x += 0.6) box(x - 0.015, y0, zB - 0.03, 0.03, y1 - y0, 0.03, joint);
  });
  // iron ladder down the quay wall, clear of the boat
  const lx = 5.35;
  for (const rx of [lx, lx + 0.3]) box(rx, WATER, zB - 0.05, 0.05, TOP - WATER, 0.05, metal);
  for (let y = WATER + 0.18; y < TOP - 0.08; y += 0.24) box(lx + 0.05, y, zB - 0.05, 0.25, 0.04, 0.04, metal);

  // ---- water: deep body + surface skin ----
  box(0, 0, zA, 6, WATER - 0.04, Wc, waterDeep);
  box(0, WATER - 0.04, zA, 6, 0.04, Wc, water);

  // ---- boat geometry (shared origin), floating in the channel with water on both sides ----
  const L = 3.2, BW = 1.2, R = 0.62, MOT = 0.28;
  const xb = (6 - (L + R + MOT)) / 2 + MOT; // transom x
  const zh = zA + (Wc - BW) / 2 + 0.1, zc = zh + BW / 2;
  const yF = 0.44, GUN = 0.64;

  // glints: reflections of every lit lamp in the open water strip in front of the boat
  const dressed = p.dressing !== "bare";
  const lampXs = [1.0, 5.0];
  const zS = zA + 0.15, zE = p.showBoat ? zh - 0.12 : zB - 0.25;
  const glints = [];
  if (p.lights && dressed) for (const x of lampXs) glints.push([x, [0.22, 0.36, 0.5]]);
  if (p.lights && p.showBoat) glints.push([xb + L + 0.11, [0.14, 0.2, 0.26]]);
  for (const [gx, ws3] of glints) {
    [0.15, 0.5, 0.85].forEach((k, i) => {
      const z = zS + (zE - zS) * k - 0.035;
      box(gx - ws3[i] / 2, WATER, z, ws3[i], 0.02, 0.07, glint, true);
    });
  }

  // ripples: in the channel, clear of the boat and of the lamp reflections
  const rips = [[0.3, 0.3, 0.8], [2.2, 0.45, 0.7], [4.3, 0.25, 0.9], [1.6, 0.9, 0.6], [3.3, 1.05, 0.8], [5.0, 0.8, 0.6],
    [0.5, 1.6, 0.7], [4.6, 1.7, 0.8], [2.4, 2.3, 0.7], [0.9, 2.8, 0.8], [4.0, 3.1, 0.7], [1.0, 3.5, 0.6], [3.0, 3.6, 0.7]];
  for (const [x, dz, len] of rips) {
    const z = zA + dz;
    if (dz < 0.15 || dz + 0.06 > Wc - 0.2 || x + len > 5.9) continue;
    if (p.showBoat && x < xb + L + R + 0.1 && x + len > xb - MOT - 0.1 && z + 0.06 > zh - 0.12 && z < zh + BW + 0.12) continue;
    if (x < lx + 0.45 && x + len > lx - 0.1 && z > zB - 0.4) continue;
    if (glints.some(([gx]) => x < gx + 0.35 && x + len > gx - 0.35)) continue;
    box(x, WATER, z, len, 0.02, 0.06, ripple);
  }

  if (p.showBoat) {
    // hull: solid bottom, open well with side walls and transom, rounded octagonal bow
    box(xb, WATER, zh, L, yF - WATER, BW, boatC);
    box(xb, yF, zh, L, GUN - yF, 0.12, boatC);
    box(xb, yF, zh + BW - 0.12, L, GUN - yF, 0.12, boatC);
    box(xb, yF, zh + 0.12, 0.12, GUN - yF, BW - 0.24, boatC);
    cyl(xb + L, WATER, zc, R, GUN - WATER, boatC, 8);
    // white gunwale caps outline the hull from above
    box(xb, GUN, zh, L, 0.04, 0.12, white);
    box(xb, GUN, zh + BW - 0.12, L, 0.04, 0.12, white);
    box(xb, GUN, zh + 0.12, 0.12, 0.04, BW - 0.24, white);
    // dark boot stripe at the waterline on the faces the camera sees
    box(xb, WATER, zh - 0.03, L, 0.08, 0.03, boot);
    box(xb - 0.03, WATER, zh, 0.03, 0.08, BW, boot);
    // floorboards, stern bench and evenly spaced thwarts inside the well
    box(xb + 0.12, yF, zh + 0.12, L - 0.62, 0.02, BW - 0.24, wood);
    box(xb + 0.12, yF + 0.02, zh + 0.12, 0.38, 0.12, BW - 0.24, woodDark);
    for (const tx of [1.1, 2.1]) box(xb + tx, yF + 0.02, zh + 0.12, 0.22, 0.12, BW - 0.24, woodDark);
    // outboard motor hung on the transom
    box(xb - MOT, 0.46, zc - 0.14, MOT, 0.34, 0.28, motor);
    box(xb - 0.2, WATER, zc - 0.04, 0.08, 0.26, 0.08, motor);
    // bow lantern on the foredeck
    box(xb + L + 0.08, GUN, zc - 0.03, 0.06, 0.34, 0.06, metal);
    box(xb + L + 0.03, GUN + 0.34, zc - 0.08, 0.16, 0.16, 0.16, p.lights ? lit : lampOff, p.lights);
  }

  // mooring points: an iron ring plate on the wall and a painted bollard on the coping above it.
  // The bollard bands carry the boat paint, so the colour stays visible when the boat is away.
  for (const bx of [xb + 0.3, xb + L - 0.2]) {
    box(bx - 0.07, 0.5, zB - 0.04, 0.14, 0.14, 0.04, metal);
    if (p.showBoat) box(bx - 0.03, 0.55, zh + BW, 0.06, 0.04, zB - 0.04 - (zh + BW), rope);
    cyl(bx, TOP, zB + 0.22, 0.11, 0.12, metal, 10);
    cyl(bx, TOP + 0.12, zB + 0.22, 0.13, 0.1, boatC, 10);
    cyl(bx, TOP + 0.22, zB + 0.22, 0.11, 0.1, metal, 10);
    box(bx - 0.14, TOP + 0.32, zB + 0.08, 0.28, 0.05, 0.28, metal);
  }

  // ---- optional quay dressing ----
  const lamp = (x, z) => {
    box(x - 0.13, BANK, z - 0.13, 0.26, 0.15, 0.26, metal);
    cyl(x, BANK + 0.15, z, 0.06, 2.0, metal, 8);
    box(x - 0.15, BANK + 2.15, z - 0.15, 0.3, 0.3, 0.3, p.lights ? lit : lampOff, p.lights);
    box(x - 0.19, BANK + 2.45, z - 0.19, 0.38, 0.06, 0.38, metal);
  };
  if (dressed) for (const x of lampXs) lamp(x, useBack0 + useBack / 2); // centred on the far paving
  if (p.dressing === "promenade") {
    // bench on the street bank, facing the water, centred in the paved strip
    const bz = Math.max(0.06, (useFront - 0.5) / 2), bx0 = 2.3;
    for (const x of [bx0 + 0.1, bx0 + 1.2]) box(x, BANK, bz + 0.05, 0.1, 0.42, 0.4, woodDark);
    box(bx0, BANK + 0.42, bz, 1.4, 0.08, 0.5, wood);
    box(bx0, BANK + 0.5, bz, 1.4, 0.4, 0.07, wood);
    // two planters on the street bank, fully in view
    const pz = Math.max(0.06, (useFront - 0.56) / 2);
    for (const px of [0.6, 4.6]) {
      box(px, BANK, pz, 0.56, 0.38, 0.56, wood);
      box(px - 0.03, BANK + 0.38, pz - 0.03, 0.62, 0.05, 0.62, woodDark);
      cyl(px + 0.28, BANK + 0.43, pz + 0.28, 0.27, 0.28, leaf, 10);
      cyl(px + 0.28, BANK + 0.71, pz + 0.28, 0.17, 0.2, leaf, 10);
    }
  }

  return { parts };
}
