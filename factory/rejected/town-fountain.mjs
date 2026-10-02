// Plaza Fountain: a round stepped-stone fountain on a paved 4 x 4 m plaza square. Upper bowls overflow in
// bell-shaped water sheets, rim nozzles arc jets into the basin and a chunky plume crowns the column.
// Block asset: build(p) returns parts in metres on the Oasis Town grid (origin at the footprint's corner,
// y up, street side at z = 0). The plaza square and overall height stay fixed so it always sits on the grid
// at the same scale as town-shop.mjs.
export const meta = {
  title: "Plaza Fountain",
  kind: "3d",
  format: "blocks",
  kit: "Oasis Town",
  description: "A tiered stone fountain on its own paved square, with sheeting bowls, arcing rim jets and corner lamps: the heart of a little town plaza.",
  tags: ["3d", "low poly", "fountain", "plaza", "square", "water", "park", "town", "kit"],
  price: 3,
  author: "oasis-factory",
  footprint: [4, 4],
  size: [1000, 1000],
};

export const params = {
  knobs: {
    stone: { type: "color", role: "surface", label: "Stone", default: "#F6EEE0" },
    water: { type: "color", role: "secondary", label: "Water tint", default: "#86C3EC" },
    accent: { type: "color", role: "highlight", label: "Brass & lamp caps", default: "#F2B33D" },
    tiers: { type: "range", label: "Tiers", default: 2, min: 1, max: 3, step: 1 },
    size: { type: "range", label: "Basin diameter (m, plaza stays 4)", default: 3, min: 2.6, max: 3.2, step: 0.2 },
    jets: { type: "range", label: "Rim jets", default: 4, min: 0, max: 8, step: 1 },
    lamps: { type: "range", label: "Plaza lamps", default: 4, min: 0, max: 4, step: 1 },
    lights: { type: "toggle", label: "Lights on", default: true },
  },
  presets: {
    Travertine: { stone: "#F6EEE0", water: "#86C3EC", accent: "#F2B33D" },
    Slate: { stone: "#D8DEE3", water: "#6FCBBE", accent: "#2F7A55" },
    Terracotta: { stone: "#EBCBA9", water: "#7AB8E8", accent: "#C8553D" },
  },
};

export function build(p) {
  const parts = [];
  const C = 2; // footprint centre
  const em = (e) => (e ? { e: true } : {});
  const box = (x, y, z, w, h, d, c, e) => parts.push({ t: "box", p: [x, y, z], s: [w, h, d], c, ...em(e) });
  const cyl = (r, y, h, c, n, e, cx = C, cz = C) => parts.push({ t: "cyl", p: [cx, y, cz], r, h, c, n: n || 12, ...em(e) });
  const cone = (r, y, h, c, n, e, cx = C, cz = C) => parts.push({ t: "cone", p: [cx, y, cz], r, h, c, n: n || 12, ...em(e) });

  // ---- colour helpers: clamp themed colours so materials stay believable ----
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rgb = (h) => { const n = parseInt(String(h).slice(1, 7), 16) || 0; return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  const toHex = (a) => "#" + a.map((v) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, "0")).join("").toUpperCase();
  const toHsl = (h) => {
    const [r, g, b] = rgb(h).map((v) => v / 255);
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
    if (mx === mn) return [0, 0, l];
    const d = mx - mn, s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
    const hh = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return [hh * 60, s, l];
  };
  const hsl = (h, s, l) => {
    const k = (n) => (n + h / 30) % 12, a = s * Math.min(l, 1 - l);
    const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
    return toHex([f(0) * 255, f(8) * 255, f(4) * 255]);
  };
  const mix = (a, b, t) => { const x = rgb(a), y = rgb(b); return toHex(x.map((v, i) => v + (y[i] - v) * t)); };

  // Stone: light, low-chroma masonry so faceted sides always shade, even under a black brand.
  const [sh, ss0, sl0] = toHsl(p.stone);
  const ss = Math.min(ss0, 0.38), sl = clamp(sl0, 0.68, 0.92);
  const stone = hsl(sh, ss, sl);
  const stoneDark = hsl(sh, ss, sl - 0.14);
  const pave = mix(stone, "#D9DCE1", 0.45);
  const paveEdge = hsl(sh, Math.min(ss, 0.2), clamp(sl - 0.2, 0.55, 0.74));
  const ink = hsl(sh, Math.min(ss, 0.18), 0.34);

  // Water: hue locked to blue-teal; off-hue themes (red, orange...) fall back to sky water.
  let [wh, ws, wl] = toHsl(p.water);
  wh = wh >= 150 && wh <= 235 ? clamp(wh, 165, 215) : 203;
  ws = clamp(ws, 0.35, 0.7); wl = clamp(wl, 0.6, 0.74);
  const water = hsl(wh, ws, wl);
  const sheet = hsl(wh, ws * 0.85, Math.min(0.86, wl + 0.1));   // falling sheet
  const foam = hsl(wh, ws * 0.7, Math.min(0.9, wl + 0.16));     // spill lips and plume
  const ripple = mix(water, sheet, 0.5);                        // landing ripples: never pure white

  // Accent: readable brass-like trim, never black or blown out.
  const [ah, as, al] = toHsl(p.accent);
  const accent = hsl(ah, as, clamp(al, 0.38, 0.64));
  const bloom = mix("#F7B8CF", accent, 0.25);
  const leaf = "#79B86A", leafDark = "#5E9A52", lit = "#FFD58A", glass = "#7E93A8";

  const R = clamp(p.size / 2, 1.3, 1.6);
  const tiers = clamp(Math.round(p.tiers), 1, 3);
  const jets = clamp(Math.round(p.jets), 0, 8);
  const lamps = clamp(Math.round(p.lamps), 0, 4);

  // ---- Plaza: fixed 4 x 4 paved square, plus a walkway ring that follows the basin ----
  box(0, 0, 0, 4, 0.06, 4, paveEdge);
  box(0.12, 0.06, 0.12, 3.76, 0.03, 3.76, pave);
  const G = 0.09;
  cyl(R + 0.22, G, 0.02, paveEdge, 16);

  // ---- Stepped basin ----
  cyl(R, G + 0.02, 0.12, stoneDark);           // kerb step
  cyl(R - 0.06, G + 0.14, 0.02, stone);        // step tread
  cyl(R - 0.22, G + 0.16, 0.5, stoneDark);     // basin wall
  cyl(R - 0.12, G + 0.66, 0.12, stone);        // coping lip (top G + 0.78)
  const basinWR = R - 0.3;
  cyl(basinWR, G + 0.7, 0.06, water);          // water surface, recessed below the coping
  const basinTop = G + 0.76;

  // Lily pads with a blossom, near the rim
  const padR = basinWR - 0.2;
  for (const a of [0.9, 2.95, 5.0]) {
    const px = C + Math.cos(a) * padR, pz = C + Math.sin(a) * padR;
    cyl(0.15, basinTop, 0.02, leaf, 8, false, px, pz);
    cyl(0.07, basinTop + 0.02, 0.02, leafDark, 6, false, px + 0.05, pz - 0.04);
    cyl(0.045, basinTop + 0.02, 0.05, bloom, 6, false, px - 0.04, pz + 0.03);
  }

  // ---- Plaza lamps: front pair first, then the back pair ----
  const lampSpots = [[0.42, 0.42], [3.58, 0.42], [3.58, 3.58], [0.42, 3.58]];
  for (let i = 0; i < lamps; i++) {
    const [lx, lz] = lampSpots[i];
    box(lx - 0.15, G, lz - 0.15, 0.3, 0.1, 0.3, ink);
    box(lx - 0.06, G + 0.1, lz - 0.06, 0.12, 0.66, 0.12, ink);
    box(lx - 0.13, G + 0.76, lz - 0.13, 0.26, 0.26, 0.26, p.lights ? lit : glass, p.lights);
    box(lx - 0.16, G + 1.02, lz - 0.16, 0.32, 0.07, 0.32, accent);
  }

  // ---- Column and bowls: overall height is fixed, tiers share it ----
  const colTop = 2.35, span = colTop - basinTop;
  const bowlR = tiers === 3 ? [Math.max(0.7, 0.54 * R), Math.max(0.42, 0.32 * R)] : [Math.max(0.72, 0.5 * R)];

  cyl(0.32, basinTop, 0.12, stoneDark);         // column foot
  cyl(0.22, basinTop, colTop - basinTop, stone); // column shaft
  if (tiers === 1) {
    cyl(0.3, basinTop + 0.55, 0.16, stone, 10);  // carved knop
    cyl(0.31, basinTop + 0.6, 0.05, accent, 10);
  }

  let lowY = basinTop, lowWR = basinWR, innerR = 0.4;
  for (let k = 1; k < tiers; k++) {
    const rb = bowlR[k - 1];
    const yb = basinTop + (span * k) / tiers - 0.12;
    // Falling sheet: a flared bell from the bowl down to the water below, wider at the bottom
    const drop = yb + 0.12 - lowY;
    const rLow = Math.min(rb + 0.1, lowWR - 0.05), rHigh = Math.min(rb + 0.05, rLow);
    cyl(rLow, lowY, drop * 0.4, sheet, 14);
    cyl(rHigh, lowY + drop * 0.4, drop * 0.6, foam, 14);
    cyl(Math.min(rb + 0.18, lowWR - 0.02), lowY, 0.015, ripple, 14); // landing ripple
    // Bowl with an overflowing lip
    cyl(rb, yb + 0.12, 0.18, stone, 14);
    cyl(rb + 0.03, yb + 0.24, 0.07, foam, 14);
    cyl(rb - 0.1, yb + 0.31, 0.03, water, 14);
    cyl(0.27, yb + 0.34, 0.06, accent, 10);     // brass band where the column leaves the bowl
    if (k === 1) innerR = rLow + 0.12;
    lowY = yb + 0.34; lowWR = rb - 0.1;
  }

  // ---- Crown plume: a bold, chunky water jet that glows at night ----
  cyl(0.29, colTop, 0.06, accent, 10);
  const cr = colTop + 0.06;
  cyl(0.24, cr, 0.05, foam, 10);                 // splash dish
  cyl(0.1, cr + 0.05, 0.42, sheet, 8);           // rising stem
  cyl(0.17, cr + 0.47, 0.14, foam, 8);           // plume bulb
  cone(0.17, cr + 0.61, 0.28, foam, 8, p.lights);

  // ---- Rim jets: brass nozzles on the coping arcing into the outer basin, clear of the sheets ----
  if (jets > 0) {
    const r0 = R - 0.2, r1 = Math.max(innerR, (basinWR + innerR) / 2 - 0.05);
    const y0 = G + 0.84, y1 = basinTop, hp = 0.32 + 0.12 * R, n = 6;
    const at = (t) => [r0 + (r1 - r0) * t, y0 + (y1 - y0) * t + 4 * hp * t * (1 - t)];
    for (let i = 0; i < jets; i++) {
      const a = Math.PI / 8 + (i / jets) * Math.PI * 2;
      const ca = Math.cos(a), sa = Math.sin(a);
      box(C + ca * r0 - 0.07, G + 0.78, C + sa * r0 - 0.07, 0.14, 0.06, 0.14, accent); // nozzle
      for (let s = 0; s < n; s++) {
        const [ra, ya] = at(s / n), [rbb, yb2] = at((s + 1) / n);
        const rr = (ra + rbb) / 2, lo = Math.min(ya, yb2), hi = Math.max(ya, yb2);
        cyl(0.06, lo - 0.03, hi - lo + 0.07, sheet, 6, false, C + ca * rr, C + sa * rr);
      }
      cyl(0.13, basinTop, 0.015, ripple, 8, false, C + ca * r1, C + sa * r1);
    }
  }

  return { parts };
}
