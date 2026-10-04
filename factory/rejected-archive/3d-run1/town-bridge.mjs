// Arched Footbridge: a stepped timber footbridge that arches over a stream, for parks and canals in Oasis Town.
// Block asset: build(p) returns parts in metres (origin at the footprint corner, y up, street side at z = 0).
// One stepped profile drives the whole bridge. Each tread is a solid block: a plank on top of a darker body
// that reaches down to the arch soffit, and the body always meets its neighbours so the deck can't open up.
// The posts stand on the tread edges, and each handrail runs a fixed height above its own tread. The rails
// therefore climb and fall with the deck in the same steps. The deck lands 0.45 m inside each tile edge, on
// grassy stone banks.
export const meta = {
  title: "Arched Footbridge",
  kind: "3d",
  format: "blocks",
  kit: "Oasis Town",
  description: "A stepped timber footbridge arching over a stream between grassy stone banks, with stepped railings and end lanterns for park and canal crossings.",
  tags: ["3d", "low poly", "bridge", "footbridge", "park", "canal", "water", "town", "kit"],
  price: 3,
  author: "oasis-factory",
  footprint: [6, 3],
  size: [1000, 1000],
};

export const params = {
  knobs: {
    wood: { type: "color", role: "surface", label: "Deck wood", default: "#8A6E52" },
    rail: { type: "color", role: "primary", label: "Railings", default: "#C8553D" },
    stone: { type: "color", role: "muted", label: "Stone banks", default: "#D9DCE1" },
    arch: { type: "range", label: "Arch height (m)", default: 0.9, min: 0.3, max: 1.4, step: 0.1 },
    steps: { type: "range", label: "Deck steps", default: 7, min: 5, max: 9, step: 2 },
    width: { type: "range", label: "Deck width (m)", default: 1.6, min: 1.2, max: 2.0, step: 0.2 },
    railing: { type: "choice", label: "Railing", default: "open", options: ["open", "panel", "low"] },
    water: { type: "toggle", label: "Water", default: true },
    lights: { type: "toggle", label: "Lanterns lit", default: true },
  },
  presets: {
    Lacquer: { wood: "#6E4F3A", rail: "#2B3242", stone: "#F3E3C8" },
    Park: { wood: "#A88B6A", rail: "#2F7A55", stone: "#D8DEE3" },
    Harbour: { wood: "#7A6A5A", rail: "#3E7BFA", stone: "#F6EEE0" },
  },
};

function hexToHsl(hex) {
  const n = parseInt(hex.slice(1), 16);
  const r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
  if (mx === mn) return [0, 0, l];
  const d = mx - mn;
  const s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
  const h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h / 6, s, l];
}
function hslToHex(h, s, l) {
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s, pp = 2 * l - q;
  const f = (t) => {
    t = (t + 1) % 1;
    if (t < 1 / 6) return pp + (q - pp) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return pp + (q - pp) * (2 / 3 - t) * 6;
    return pp;
  };
  const ch = (v) => Math.round(Math.max(0, Math.min(1, v)) * 255).toString(16).padStart(2, "0");
  return "#" + ch(f(h + 1 / 3)) + ch(f(h)) + ch(f(h - 1 / 3));
}
// keep the knob's hue, hold saturation and lightness in a band that preserves the material read
function tame(hex, sMax, lMin, lMax) {
  const [h, s, l] = hexToHsl(hex);
  return hslToHex(h, Math.min(s, sMax), Math.max(lMin, Math.min(lMax, l)));
}
function shade(hex, k) {
  const n = parseInt(hex.slice(1), 16);
  const ch = (v) => Math.max(0, Math.min(255, Math.round(v * k))).toString(16).padStart(2, "0");
  return "#" + ch((n >> 16) & 255) + ch((n >> 8) & 255) + ch(n & 255);
}

export function build(p) {
  const parts = [];
  const box = (x, y, z, w, h, d, c, e) => {
    if (w <= 0.001 || h <= 0.001 || d <= 0.001) return;
    parts.push({ t: "box", p: [x, y, z], s: [w, h, d], c, ...(e ? { e: true } : {}) });
  };
  const cyl = (cx, y, cz, r, h, c, n) => { if (h > 0.001) parts.push({ t: "cyl", p: [cx, y, cz], r, h, c, n: n || 8 }); };
  const cone = (cx, y, cz, r, h, c, n) => parts.push({ t: "cone", p: [cx, y, cz], r, h, c, n: n || 8 });

  // material-safe colours: brand hues pass through, lightness and saturation stay in a wood / stone band
  const wood = tame(p.wood, 0.42, 0.36, 0.58), woodAlt = shade(wood, 0.92), body = shade(wood, 0.7);
  const rail = tame(p.rail, 0.5, 0.3, 0.5), railPanel = shade(rail, 0.82);
  const stone = tame(p.stone, 0.2, 0.62, 0.86), stoneDark = shade(stone, 0.82);
  const WATER = "#5F95E0", RIPPLE = "#DCE8FA", LILY = "#79B86A";
  const GRASS = "#79B86A", GRASS_DARK = "#5E9A52", LIT = "#FFD58A", OFF = "#7E93A8";

  // ---- banks: stone walls with a grass top ----
  const BANK = 0.9, BANK_H = 0.35, GTOP = BANK_H + 0.05;
  for (const bx of [0, 6 - BANK]) {
    box(bx, 0, 0, BANK, BANK_H, 3, stone);
    box(bx, BANK_H, 0, BANK, 0.05, 3, GRASS);
  }
  // a bush on the front-right bank corner, clear of the widest deck and its lantern
  cyl(5.65, GTOP, 0.2, 0.15, 0.16, GRASS_DARK, 8);
  cone(5.65, GTOP + 0.16, 0.2, 0.15, 0.24, GRASS, 8);

  // ---- channel: water, or a dry grassy ditch with stepping stones ----
  const zd0 = 1.5 - p.width / 2, zd1 = 1.5 + p.width / 2;
  let bed;
  if (p.water) {
    const WTOP = 0.14;
    box(BANK, 0, 0, 6 - 2 * BANK, WTOP, 3, WATER);
    bed = WTOP;
    // ripples and lily pads on the open water in front of and behind the deck
    for (const [x, z, w] of [[1.5, 0.16, 0.6], [3.3, 0.3, 0.5], [4.3, 0.12, 0.4], [2.0, 2.82, 0.5], [3.6, 2.7, 0.6]]) {
      box(x, WTOP, z, w, 0.02, 0.06, RIPPLE);
    }
    for (const [x, z] of [[2.5, 0.18], [4.6, 2.85]]) cyl(x, WTOP, z, 0.13, 0.03, LILY, 8);
    for (const [x, z, h] of [[1.0, 0.1, 0.55], [1.14, 0.2, 0.4]]) cyl(x, WTOP, z, 0.05, h, GRASS, 6);
  } else {
    box(BANK, 0, 0, 6 - 2 * BANK, 0.06, 3, GRASS_DARK);
    bed = 0.06;
    for (const [x, z] of [[1.3, 0.2], [2.3, 0.15], [3.3, 0.22], [4.3, 0.14], [2.0, 2.78], [3.8, 2.8]]) {
      box(x, bed, z, 0.36, 0.08, 0.26, stoneDark);
    }
  }

  // ---- stepped deck along one shared profile ----
  const N = p.steps, A = p.arch, BASE = 0.6, PL = 0.16;
  const xs = 0.45, xe = 6 - xs, sw = (xe - xs) / N;
  const top = [];
  for (let i = 0; i < N; i++) top.push(BASE + A * Math.sin(Math.PI * i / (N - 1)));
  const crownU = GTOP + 0.15 + 0.6 * A;
  const U = (x) => {
    if (x <= BANK || x >= 6 - BANK) return GTOP;
    return GTOP + (crownU - GTOP) * Math.sin(Math.PI * (x - BANK) / (6 - 2 * BANK));
  };
  const stepX = (i) => xs + i * sw;

  for (let i = 0; i < N; i++) {
    const x0 = stepX(i), x1 = x0 + sw, xc = x0 + sw / 2;
    let b;
    if (x0 < BANK || x1 > 6 - BANK) b = GTOP; // landing treads rest on the bank
    else {
      const nb = Math.min(i > 0 ? top[i - 1] : 99, i < N - 1 ? top[i + 1] : 99);
      b = Math.max(bed + 0.12, Math.min(U(xc), top[i] - 0.3, nb - 0.12));
    }
    box(x0, b, zd0, sw, top[i] - PL - b, zd1 - zd0, body);                          // body / stringers
    box(x0, top[i] - PL, zd0 - 0.04, sw, PL, zd1 - zd0 + 0.08, i % 2 ? woodAlt : wood); // plank
  }

  // ---- railings: posts on each tread boundary, rails a fixed height above each tread ----
  const low = p.railing === "low";
  const RH = low ? 0.5 : 0.95, PW = 0.1, RT = 0.08, NEWEL = 0.26;
  for (const zp of [zd0, zd1 - PW]) {
    for (let j = 0; j <= N; j++) {
      const end = j === 0 || j === N;
      const tA = top[Math.max(0, j - 1)], tB = top[Math.min(N - 1, j)];
      const lo = Math.min(tA, tB), hi = Math.max(tA, tB);
      const px = j === 0 ? stepX(0) : j === N ? stepX(N) - PW : stepX(j) - PW / 2;
      const pTop = hi + RH + RT + (end ? NEWEL : 0);
      box(px, lo, zp, PW, pTop - lo, PW, rail);
      if (end) {
        const cx = px + PW / 2, cz = zp + PW / 2;
        box(cx - 0.16, pTop, cz - 0.16, 0.32, 0.05, 0.32, rail);                         // base plate
        box(cx - 0.13, pTop + 0.05, cz - 0.13, 0.26, 0.28, 0.26, p.lights ? LIT : OFF, p.lights);
        cone(cx, pTop + 0.33, cz, 0.22, 0.2, rail, 4);
      }
    }
    for (let i = 0; i < N; i++) {
      const x0 = stepX(i), y = top[i];
      box(x0, y + RH, zp - 0.01, sw, RT, PW + 0.02, rail);                               // handrail
      if (p.railing === "open") box(x0, y + RH * 0.5, zp + 0.02, sw, 0.06, PW - 0.04, rail);
      else if (p.railing === "panel") box(x0, y, zp + 0.025, sw, RH, PW - 0.05, railPanel);
    }
  }

  return { parts };
}
