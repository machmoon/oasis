// Town Apartments: a walk-up apartment block with planted balconies on every floor, a framed lobby entrance under
// a deep canopy and a timber rooftop water tank. Block asset: build(p) returns parts in metres on the Oasis Town
// grid (origin at the footprint corner, y up, street side at z = 0). It shares the Town Shop's 3.1 m ground storey,
// 2.6 m upper storeys, 5 m depth and 0.6 m setback, so the two sit flush side by side.
export const meta = {
  title: "Town Apartments",
  kind: "3d",
  format: "blocks",
  kit: "Oasis Town",
  description: "A walk-up apartment block with planted balconies stacked on a clean storey grid, a canopied lobby entrance and a timber rooftop water tank, sized to sit beside the Town Shop.",
  tags: ["3d", "low poly", "building", "apartments", "flats", "balcony", "residential", "town"],
  price: 4,
  author: "oasis-factory",
  footprint: [6, 6],
  size: [1000, 1000],
};

export const params = {
  knobs: {
    wall: { type: "color", role: "surface", label: "Walls", default: "#F6EEE0" },
    balcony: { type: "color", role: "primary", label: "Balconies, canopy & shutters", default: "#C8553D" },
    trim: { type: "color", role: "ink", label: "Trim & roof", default: "#5B6270" },
    plants: { type: "color", role: "secondary", label: "Plants", default: "#79B86A" },
    floors: { type: "range", label: "Floors", default: 4, min: 3, max: 7, step: 1 },
    width: { type: "range", label: "Width (m)", default: 5, min: 4, max: 6, step: 1 },
    tank: { type: "toggle", label: "Water tank", default: true },
    lights: { type: "toggle", label: "Lit windows", default: true },
  },
  presets: {
    Harbour: { wall: "#D8DEE3", balcony: "#4A78C8", trim: "#2F3A4A", plants: "#6FB36A" },
    Blossom: { wall: "#F2E6EE", balcony: "#D9738F", trim: "#6B4E5E", plants: "#2F7A55" },
    Sunflower: { wall: "#F3E3C8", balcony: "#D49A35", trim: "#6E5844", plants: "#5FA35A" },
  },
};

export function build(p) {
  const parts = [];
  const box = (x, y, z, w, h, d, c, e) =>
    parts.push({ t: "box", p: [x, y, z], s: [w, h, d], c, ...(e ? { e: true } : {}) });
  const cyl = (cx, y, cz, r, h, c, n) => parts.push({ t: "cyl", p: [cx, y, cz], r, h, c, n });
  const cone = (cx, y, cz, r, h, c, n) => parts.push({ t: "cone", p: [cx, y, cz], r, h, c, n });

  // ---- deterministic hash (no Math.random) ----
  const mix = (...v) => {
    let h = 2166136261;
    for (const x of v) {
      h = Math.imul(h ^ (x | 0), 16777619);
      h ^= h >>> 13;
      h = Math.imul(h, 0x5bd1e995);
      h ^= h >>> 15;
    }
    return h >>> 0;
  };

  // ---- colour guards: brand colours re-skin paint, never break the object ----
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const toHsl = (c, fb) => {
    const ok = typeof c === "string" && /^#[0-9a-fA-F]{6}$/.test(c);
    const n = parseInt((ok ? c : fb).slice(1), 16);
    const r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
    let h = 0, s = 0;
    if (mx !== mn) {
      const d = mx - mn;
      s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
      if (mx === r) h = (g - b) / d + (g < b ? 6 : 0);
      else if (mx === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h *= 60;
    }
    return [h, s, l];
  };
  const toHex = (h, s, l) => {
    const k = (n) => (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
    const t = (v) => Math.round(clamp(v, 0, 1) * 255).toString(16).padStart(2, "0");
    return "#" + t(f(0)) + t(f(8)) + t(f(4));
  };
  const hueIn = (h, a, b) => {
    if (h >= a && h <= b) return h;
    const da = Math.min(Math.abs(h - a), 360 - Math.abs(h - a));
    const db = Math.min(Math.abs(h - b), 360 - Math.abs(h - b));
    return da < db ? a : b;
  };

  // Value hierarchy: walls light, accents mid, trim dark and small, foliage always a believable green.
  const [wh, wsRaw, wlRaw] = toHsl(p.wall, "#F6EEE0");
  const ws = clamp(wsRaw, 0, 0.3), wl = clamp(wlRaw, 0.84, 0.94);
  const wall = toHex(wh, ws, wl);
  const hutC = toHex(wh, ws, wl - 0.05);
  const [th, ts, tl] = toHsl(p.trim, "#5B6270");
  const trim = toHex(th, clamp(ts, 0, 0.3), clamp(tl, 0.22, 0.4));
  let [bh, bs, bl] = toHsl(p.balcony, "#C8553D");
  const greenish = bh > 65 && bh < 170;
  bs = clamp(bs, 0.28, greenish ? 0.32 : 0.55); // green brands become a calm sage, never lime
  bl = clamp(bl, 0.45, 0.62);
  const bal = toHex(bh, bs, bl);
  let [lh, ls, ll] = toHsl(p.plants, "#79B86A");
  lh = hueIn(lh, 85, 145);
  ls = clamp(ls, 0.35, 0.6);
  ll = clamp(ll, 0.36, 0.52);
  if (greenish && Math.abs(lh - bh) < 40) {
    // keep plants clearly apart from a green-ish balcony: shift hue and drop a value step
    lh = bh < 115 ? Math.min(145, bh + 45) : Math.max(85, bh - 45);
    ls = Math.max(ls, 0.45);
    ll = clamp(Math.min(ll, bl - 0.14), 0.3, 0.52);
  }
  const leaf = toHex(lh, ls, ll);
  const leafD = toHex(lh, ls, ll - 0.08);

  const glass = "#7E93A8", lit = "#FFD58A", wood = "#8A6E52", bloom = "#F7B8CF", kerb = "#D9DCE1", deck = "#C9CED6";
  const W = p.width, D = 5, FLOOR = 2.6, GROUND = 3.1, B = 0.15;
  const x0 = (6 - W) / 2, z0 = 0.6, dc = x0 + W / 2;
  const H = GROUND + (p.floors - 1) * FLOOR;
  const Rtop = B + H;
  const litAt = (...v) => p.lights && mix(p.floors, W, ...v) % 100 < 55;
  const win = (on) => (on ? lit : glass);

  // ---- volumes: plinth, lobby storey, cornice band, upper floors ----
  const LOBBY = GROUND - 0.32, BAND = 0.22, upY = B + LOBBY + BAND;
  box(x0 - 0.15, 0, z0 - 0.15, W + 0.3, B, D + 0.3, "#BFC3CA");
  box(x0, B, z0, W, LOBBY, D, wall);
  box(x0 - 0.08, B + LOBBY, z0 - 0.08, W + 0.16, BAND, D + 0.16, trim);
  box(x0, upY, z0, W, Rtop - upY, D, wall);

  // ---- lobby: framed double door, transom, deep canopy with downlight ----
  box(dc - 0.9, B, z0 - 0.04, 1.8, 2.5, 0.04, trim);
  for (const lx of [-0.8, 0.02]) {
    box(dc + lx, B, z0 - 0.07, 0.78, 2.1, 0.03, wood);
    box(dc + lx + 0.12, B + 0.9, z0 - 0.09, 0.54, 1.05, 0.02, win(p.lights), p.lights);
  }
  box(dc - 0.12, B + 0.95, z0 - 0.09, 0.05, 0.3, 0.02, trim); // handles
  box(dc + 0.07, B + 0.95, z0 - 0.09, 0.05, 0.3, 0.02, trim);
  box(dc - 0.8, B + 2.15, z0 - 0.07, 1.6, 0.28, 0.03, win(p.lights), p.lights); // transom
  box(dc - 1.25, B + 2.55, z0 - 1.1, 2.5, 0.16, 1.1, bal); // canopy
  box(dc - 1.27, B + 2.5, z0 - 1.14, 2.54, 0.26, 0.06, trim); // canopy fascia
  box(dc - 0.22, B + 2.55, z0 - 1.17, 0.44, 0.16, 0.03, wall); // light name plate on the fascia
  box(dc - 0.15, B + 2.47, z0 - 0.62, 0.3, 0.08, 0.3, p.lights ? lit : "#D8DEE3", p.lights); // downlight
  box(dc - 1.1, 0, z0 - 0.8, 2.2, 0.08, 0.65, kerb); // entrance step

  // ground windows either side of the entrance, with planters below the sills
  const a = W / 2 - 0.9, ww = Math.min(a - 0.45, 1.4);
  for (const s of [0, 1]) {
    const wc = s === 0 ? x0 + a / 2 : x0 + W - a / 2, on = litAt(0, 50 + s);
    box(wc - ww / 2 - 0.06, B + 0.84, z0 - 0.03, ww + 0.12, 1.52, 0.03, trim);
    box(wc - ww / 2, B + 0.9, z0 - 0.05, ww, 1.4, 0.03, win(on), on);
    box(wc - ww / 2, 0, z0 - 0.5, ww, 0.42, 0.35, wood);
    box(wc - ww / 2 + 0.05, 0.42, z0 - 0.46, ww - 0.1, 0.24, 0.28, leaf);
    if (s === 1) box(wc - 0.1, 0.66, z0 - 0.4, 0.2, 0.08, 0.16, bloom);
  }

  // side windows: two per floor on each side, every one shuttered, lit pattern seeded per window
  const sideRow = (y, h, f) => {
    for (let side = 0; side < 2; side++) {
      for (let i = 0; i < 2; i++) {
        const zc = z0 + D * (i ? 0.7 : 0.3), on = litAt(f, 20 + side * 2 + i);
        if (side === 0) {
          box(x0 - 0.03, y, zc - 0.4, 0.03, h, 0.8, win(on), on);
          box(x0 - 0.1, y - 0.08, zc - 0.48, 0.1, 0.08, 0.96, trim);
          box(x0 - 0.04, y, zc - 0.72, 0.04, h, 0.3, bal);
          box(x0 - 0.04, y, zc + 0.42, 0.04, h, 0.3, bal);
        } else {
          box(x0 + W, y, zc - 0.4, 0.03, h, 0.8, win(on), on);
          box(x0 + W, y - 0.08, zc - 0.48, 0.1, 0.08, 0.96, trim);
          box(x0 + W, y, zc - 0.72, 0.04, h, 0.3, bal);
          box(x0 + W, y, zc + 0.42, 0.04, h, 0.3, bal);
        }
      }
    }
  };
  sideRow(B + 0.9, 1.4, 0);

  // ---- upper floors: one bay grid, a balcony on every bay of every floor, all on the storey line ----
  const bays = W >= 6 ? 3 : 2, bw = W / bays, balW = Math.min(bw - 0.45, 1.9), DEP = 0.9;
  const posts = Math.max(1, Math.round(balW / 0.5) - 1);
  for (let f = 1; f < p.floors; f++) {
    const y = B + GROUND + (f - 1) * FLOOR;
    for (let b = 0; b < bays; b++) {
      const bc = x0 + (b + 0.5) * bw, bx = bc - balW / 2, on = litAt(f, b);
      // french door, centred on the bay
      box(bc - 0.46, y + 0.15, z0 - 0.03, 0.92, 2.1, 0.03, trim);
      box(bc - 0.4, y + 0.15, z0 - 0.05, 0.8, 2.02, 0.03, win(on), on);
      // balcony: slab, low solid panel, open posts, trim handrail
      box(bx, y, z0 - DEP, balW, 0.15, DEP, bal);
      box(bx, y + 0.15, z0 - DEP, balW, 0.32, 0.06, bal);
      box(bx, y + 0.15, z0 - DEP + 0.06, 0.06, 0.32, DEP - 0.06, bal);
      box(bx + balW - 0.06, y + 0.15, z0 - DEP + 0.06, 0.06, 0.32, DEP - 0.06, bal);
      box(bx, y + 0.47, z0 - DEP, 0.06, 0.5, 0.06, bal);
      box(bx + balW - 0.06, y + 0.47, z0 - DEP, 0.06, 0.5, 0.06, bal);
      for (let k = 0; k < posts; k++) box(bx + (balW * (k + 1)) / (posts + 1) - 0.02, y + 0.47, z0 - DEP, 0.04, 0.5, 0.04, bal);
      box(bx - 0.02, y + 0.97, z0 - DEP - 0.02, balW + 0.04, 0.06, 0.1, trim);
      box(bx - 0.02, y + 0.97, z0 - DEP + 0.08, 0.1, 0.06, DEP - 0.08, trim);
      box(bx + balW - 0.08, y + 0.97, z0 - DEP + 0.08, 0.1, 0.06, DEP - 0.08, trim);
      // one potted plant in the outer front corner, clear of the door
      const right = bays === 3 && b === 1 ? mix(f, 77) % 2 === 1 : b === bays - 1;
      const px = right ? bx + balW - 0.4 : bx + 0.1, pz = z0 - DEP + 0.1;
      box(px, y + 0.15, pz, 0.3, 0.3, 0.3, wood);
      if (mix(p.floors, f, b, 7) % 2 === 0) {
        box(px - 0.06, y + 0.45, pz - 0.06, 0.42, 0.45, 0.42, leaf);
        if (mix(f, b, 3) % 2) box(px + 0.06, y + 0.9, pz + 0.06, 0.18, 0.1, 0.18, bloom);
      } else {
        cone(px + 0.15, y + 0.45, pz + 0.15, 0.24, 0.85, leafD, 8);
      }
      // trailing ivy on some balcony fronts
      if (mix(f, b, 11, W) % 3 === 0) box(right ? bx + balW - 0.6 : bx + 0.1, y - 0.25, z0 - DEP - 0.03, 0.5, 0.65, 0.03, leaf);
    }
    sideRow(y + 0.8, 1.3, f);
  }
  box(x0 + W + 0.08, B, z0 + 0.2, 0.1, H, 0.1, trim); // downpipe

  // ---- roof: dark parapet frame around a light deck ----
  box(x0 - 0.1, Rtop, z0 - 0.1, W + 0.2, 0.2, D + 0.2, trim);
  const ry = Rtop + 0.2;
  box(x0 - 0.1, ry, z0 - 0.1, W + 0.2, 0.4, 0.15, trim);
  box(x0 - 0.1, ry, z0 + D - 0.05, W + 0.2, 0.4, 0.15, trim);
  box(x0 - 0.1, ry, z0 + 0.05, 0.15, 0.4, D - 0.1, trim);
  box(x0 + W - 0.05, ry, z0 + 0.05, 0.15, 0.4, D - 0.1, trim);
  box(x0 + 0.05, ry, z0 + 0.05, W - 0.1, 0.04, D - 0.1, deck);
  // stair hut, back left
  const hx = x0 + 0.35, hz = z0 + D - 1.85;
  box(hx, ry, hz, 1.5, 2.2, 1.4, hutC);
  box(hx - 0.1, ry + 2.2, hz - 0.1, 1.7, 0.15, 1.6, trim);
  box(hx + 0.3, ry + 0.04, hz - 0.04, 0.9, 1.96, 0.04, trim);

  if (p.tank) {
    // classic timber water tank on a steel stand, back right
    const cx = x0 + W - 1.05, cz = z0 + D - 1.2, LEG = 1.0, R = 0.68, TH = 1.35;
    for (const [lx, lz] of [[-0.58, -0.58], [0.46, -0.58], [-0.58, 0.46], [0.46, 0.46]]) box(cx + lx, ry, cz + lz, 0.12, LEG, 0.12, trim);
    box(cx - 0.58, ry + 0.4, cz - 0.6, 1.16, 0.08, 0.04, trim);
    box(cx - 0.76, ry + LEG, cz - 0.76, 1.52, 0.12, 1.52, trim);
    const base = ry + LEG + 0.12;
    cyl(cx, base, cz, R, TH, wood, 10);
    for (const hy of [0.25, 0.95]) cyl(cx, base + hy, cz, R + 0.03, 0.08, trim, 10);
    cone(cx, base + TH, cz, R + 0.06, 0.45, trim, 10);
    box(cx - 0.1, base, cz - R - 0.04, 0.2, TH - 0.1, 0.04, trim);
  } else {
    // roof garden takes the tank's place
    box(x0 + W - 1.9, ry, z0 + D - 1.6, 1.5, 0.4, 0.9, wood);
    box(x0 + W - 1.85, ry + 0.4, z0 + D - 1.55, 1.4, 0.3, 0.8, leaf);
    cone(x0 + W - 1.5, ry + 0.7, z0 + D - 1.15, 0.32, 1.0, leafD, 8);
    box(x0 + W - 0.95, ry + 0.7, z0 + D - 1.3, 0.24, 0.12, 0.24, bloom);
  }

  return { parts };
}
