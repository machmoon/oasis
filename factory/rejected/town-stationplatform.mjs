// Tram Stop Platform: a 6 x 3 m Oasis Town tram platform. A four-post shelter carries a lit TRAM STOP fascia.
// Slatted benches stand at the canopy's front edge, with a pole clock at one end and a ticket machine,
// a bin and a planter around them. Block asset: build(p) returns parts in metres on the Oasis Town grid
// (origin at the footprint corner, y up, the tram/street side faces -z at z = 0).
export const meta = {
  title: "Tram Stop Platform",
  kind: "3d",
  format: "blocks",
  kit: "Oasis Town",
  description: "A 6 x 3 m tram platform with a four-post canopy, a lit TRAM STOP fascia, slatted benches, a pole clock and a ticket machine that sits on the street edge beside the town's tram line.",
  tags: ["3d", "low poly", "tram", "station", "platform", "transit", "bench", "clock", "town", "kit"],
  price: 3,
  author: "oasis-factory",
  footprint: [6, 3],
  size: [1000, 1000],
};

export const params = {
  knobs: {
    canopy: { type: "color", role: "primary", label: "Canopy", default: "#2F7A55" },
    sign: { type: "color", role: "highlight", label: "Sign", default: "#F2B33D" },
    deck: { type: "color", role: "surface", label: "Platform", default: "#D9DCE1" },
    posts: { type: "color", role: "ink", label: "Posts & trim", default: "#5B6270" },
    roof: { type: "choice", label: "Canopy roof", default: "gable", options: ["gable", "flat"] },
    clock: { type: "choice", label: "Clock end", default: "left", options: ["left", "right"] },
    benches: { type: "range", label: "Benches", default: 1, min: 0, max: 2, step: 1 },
    lights: { type: "toggle", label: "Lights", default: true },
  },
  presets: {
    Harbour: { canopy: "#3E7BFA", sign: "#F6EEE0", deck: "#D8DEE3", posts: "#3B4A5C" },
    Blossom: { canopy: "#C8553D", sign: "#F7B8CF", deck: "#F3E3C8", posts: "#4A4F5C" },
    Slate: { canopy: "#5B6270", sign: "#E5484D", deck: "#F6EEE0", posts: "#2B3242" },
  },
};

// --- colour helpers: every brand colour is clamped into a calm, legible band ---
function rgb(hex) {
  const n = parseInt(String(hex).replace("#", ""), 16) || 0;
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}
function toHsl(hex) {
  const [r, g, b] = rgb(hex);
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
function fromHsl(h, s, l) {
  const f = (t) => {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s, pp = 2 * l - q;
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return pp + (q - pp) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return pp + (q - pp) * (2 / 3 - t) * 6;
    return pp;
  };
  const c = (v) => Math.round(Math.max(0, Math.min(1, v)) * 255).toString(16).padStart(2, "0");
  return s === 0 ? "#" + c(l) + c(l) + c(l) : "#" + c(f(h + 1 / 3)) + c(f(h)) + c(f(h - 1 / 3));
}
const tune = (hex, sMax, lo, hi) => { const [h, s, l] = toHsl(hex); return fromHsl(h, Math.min(s, sMax), Math.max(lo, Math.min(hi, l))); };
const shade = (hex, dl) => { const [h, s, l] = toHsl(hex); return fromHsl(h, s, Math.max(0.1, Math.min(0.92, l + dl))); };
const luma = (hex) => {
  const lin = (v) => (v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
  const [r, g, b] = rgb(hex);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
};

// 3x5 / 5x5 block font for the fascia lettering (top row first)
const FONT = {
  T: ["111", "010", "010", "010", "010"],
  R: ["111", "101", "110", "101", "101"],
  A: ["111", "101", "111", "101", "101"],
  M: ["10001", "11011", "10101", "10001", "10001"],
  S: ["111", "100", "111", "001", "111"],
  O: ["111", "101", "101", "101", "111"],
  P: ["111", "101", "111", "100", "100"],
};

export function build(p) {
  const parts = [];
  const box = (x, y, z, w, h, d, c, e) => parts.push({ t: "box", p: [x, y, z], s: [w, h, d], c, ...(e ? { e: true } : {}) });
  const cyl = (x, y, z, r, h, c, n, e) => parts.push({ t: "cyl", p: [x, y, z], r, h, c, n, ...(e ? { e: true } : {}) });

  const lit = "#FFD58A", glass = "#7E93A8", wood = "#8A6E52", dark = "#2B3242", leaf = "#79B86A";
  const deck = tune(p.deck, 0.25, 0.72, 0.9);
  const canopy = tune(p.canopy, 0.62, 0.3, 0.55);
  const ink = tune(p.posts, 0.3, 0.18, 0.36);
  const sign = tune(p.sign, 0.85, 0.5, 0.8);
  const tactile = tune(p.sign, 0.65, 0.62, 0.74);
  const textInk = luma(sign) > 0.4 ? dark : "#FFFFFF";
  const on = !!p.lights;
  const off = "#B4C0CC";
  const gable = p.roof !== "flat";
  const clockRight = p.clock === "right";

  const W = 6, DH = 0.35;
  // end props mirror with the clock-end choice
  const X = (x, w) => (clockRight ? W - x - w : x);

  // --- platform deck and tactile safety strip along the tram edge ---
  box(0, 0, 0, W, DH, 3, deck);
  box(0.1, DH, 0.12, W - 0.2, 0.03, 0.33, tactile);

  // --- shelter frame: centred, four posts so the canopy is carried at both ends ---
  const CX0 = 1.2, CX1 = 4.8, SPAN = CX1 - CX0, CC = (CX0 + CX1) / 2;
  const CZ0 = 1.45, CZ1 = 2.95, CY = 2.75, PT = 0.14;
  const PZF = 1.75, PZB = 2.65;
  const pxL = CX0 + 0.12, pxR = CX1 - 0.12 - PT;
  for (const px of [pxL, pxR]) for (const pz of [PZF, PZB]) box(px, DH, pz, PT, CY - DH, PT, ink);

  // back windbreak with a centre mullion, top rail and a lit route-map case
  const gx0 = pxL + PT, gx1 = pxR;
  box(gx0, DH, PZB + 0.04, gx1 - gx0, 2.0, 0.06, glass);
  box(gx0, DH + 2.0, PZB, gx1 - gx0, 0.08, PT, ink);
  box(CC - 0.03, DH, PZB + 0.01, 0.06, 2.0, 0.03, ink);
  box(CC + 0.3, DH + 0.35, PZB + 0.01, 1.0, 1.1, 0.03, ink);                 // map frame
  box(CC + 0.35, DH + 0.4, PZB - 0.02, 0.9, 1.0, 0.03, on ? lit : off, on);  // map panel
  // side windbreak on the far (+x) end, between the right posts
  box(pxR + 0.03, DH, PZF + PT, 0.08, 2.0, PZB - PZF - PT, glass);
  box(pxR, DH + 2.0, PZF + PT, PT, 0.08, PZB - PZF - PT, ink);

  // --- canopy: slab, roof, and a fascia that is the station sign ---
  const sx0 = CX0 - 0.06, sw = SPAN + 0.12;
  const slabH = gable ? 0.22 : 0.28;
  box(sx0, CY, CZ0, sw, slabH, CZ1 - CZ0, gable ? shade(canopy, -0.1) : canopy);
  if (gable) {
    parts.push({ t: "gable", p: [CX0, CY + slabH, CZ0], s: [SPAN, 0.7, CZ1 - CZ0], c: canopy, axis: "x" });
    const barge = shade(canopy, -0.16);                                       // crisp end boards
    parts.push({ t: "gable", p: [sx0, CY + slabH, CZ0], s: [0.06, 0.76, CZ1 - CZ0], c: barge, axis: "x" });
    parts.push({ t: "gable", p: [CX1, CY + slabH, CZ0], s: [0.06, 0.76, CZ1 - CZ0], c: barge, axis: "x" });
  } else {
    box(CX0 + 0.35, CY + slabH, CZ0 + 0.45, SPAN - 0.7, 0.06, 0.85, "#3B4A5C"); // solar panel
    box(CX0 + 0.35, CY + slabH + 0.06, CZ0 + 0.45, SPAN - 0.7, 0.02, 0.04, ink);
    box(sx0, CY + slabH, CZ1 - 0.08, sw, 0.1, 0.08, ink);                      // rear coping
  }
  // fascia sign band: flush with the slab front, rising above it as a parapet
  const fy = CY - 0.08, fh = 0.58, fz = CZ0 - 0.06;
  box(sx0, fy, fz, sw, fh, 0.06, sign, on);
  box(sx0, fy + fh, fz - 0.01, sw, 0.04, 0.08, ink);                          // top cap
  // light bar under the fascia
  box(CX0 + 0.15, fy - 0.1, fz + 0.02, SPAN - 0.3, 0.1, 0.16, on ? lit : "#C9CED6", on);

  // badge (rounded square with a knocked-out T) + "TRAM STOP" lettering, centred on the fascia
  const cell = 0.08, text = "TRAM STOP";
  let textW = 0;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    textW += ch === " " ? 2 * cell : FONT[ch][0].length * cell;
    if (i < text.length - 1 && ch !== " " && text[i + 1] !== " ") textW += cell;
  }
  const BS = 0.46, total = BS + 0.14 + textW;
  let cx = sx0 + (sw - total) / 2;
  const by = fy + (fh - BS) / 2, lz = fz - 0.03;
  box(cx, by + 0.07, lz, BS, BS - 0.14, 0.03, textInk);
  box(cx + 0.07, by, lz, BS - 0.14, BS, 0.03, textInk);
  box(cx + 0.08, by + 0.3, lz - 0.02, 0.3, 0.08, 0.02, sign);
  box(cx + 0.185, by + 0.08, lz - 0.02, 0.09, 0.22, 0.02, sign);
  cx += BS + 0.14;
  const ty = fy + (fh - 5 * cell) / 2;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === " ") { cx += 2 * cell; continue; }
    const g = FONT[ch];
    for (let r = 0; r < 5; r++) {
      const row = g[r], y = ty + (4 - r) * cell;
      let c0 = -1;
      for (let c = 0; c <= row.length; c++) {
        if (row[c] === "1") { if (c0 < 0) c0 = c; }
        else if (c0 >= 0) { box(cx + c0 * cell, y, lz, (c - c0) * cell, cell, 0.03, textInk); c0 = -1; }
      }
    }
    cx += g[0].length * cell;
    if (i < text.length - 1 && text[i + 1] !== " ") cx += cell;
  }

  // --- slatted benches at the canopy's front edge, slotted between the posts ---
  const nb = Math.max(0, Math.min(2, Math.round(p.benches)));
  if (nb > 0) {
    const room = gx1 - gx0;
    const BW = nb === 1 ? 1.7 : 1.35;
    const gap = (room - nb * BW) / (nb + 1);
    const BZ = 1.05;
    for (let i = 0; i < nb; i++) {
      const bx = gx0 + gap + i * (BW + gap);
      for (const ex of [bx, bx + BW - 0.08]) {
        box(ex, DH, BZ, 0.08, 0.62, 0.51, ink);                              // end frame + armrest
        box(ex, DH, BZ + 0.43, 0.08, 0.96, 0.08, ink);                       // back upright
      }
      const ix = bx + 0.08, iw = BW - 0.16;
      box(ix, DH + 0.38, BZ + 0.02, iw, 0.08, 0.2, wood);
      box(ix, DH + 0.38, BZ + 0.24, iw, 0.08, 0.2, wood);
      box(ix, DH + 0.56, BZ + 0.44, iw, 0.16, 0.06, wood);
      box(ix, DH + 0.78, BZ + 0.44, iw, 0.16, 0.06, wood);
    }
  }

  // --- station clock on a pole at the chosen end ---
  const kx = clockRight ? W - 0.6 : 0.6, kz = 0.85, ky = 2.45, KR = 0.36;
  box(kx - 0.15, DH, kz - 0.15, 0.3, 0.08, 0.3, ink);
  cyl(kx, DH + 0.08, kz, 0.07, ky - KR - DH - 0.08 + 0.03, ink, 8);
  box(kx - KR, ky - 0.18, kz - 0.08, KR * 2, 0.36, 0.16, ink);               // rounded housing
  box(kx - 0.31, ky - 0.3, kz - 0.08, 0.62, 0.6, 0.16, ink);
  box(kx - 0.18, ky - KR, kz - 0.08, 0.36, KR * 2, 0.16, ink);
  box(kx - 0.08, ky + KR, kz - 0.06, 0.16, 0.06, 0.12, ink);                 // finial
  const face = on ? "#FFF3D6" : "#F6F7F9";
  box(kx - 0.3, ky - 0.15, kz - 0.11, 0.6, 0.3, 0.03, face, on);             // rounded dial
  box(kx - 0.26, ky - 0.25, kz - 0.11, 0.52, 0.5, 0.03, face, on);
  box(kx - 0.15, ky - 0.3, kz - 0.11, 0.3, 0.6, 0.03, face, on);
  box(kx - 0.025, ky + 0.19, kz - 0.13, 0.05, 0.08, 0.02, dark);             // 12
  box(kx - 0.025, ky - 0.27, kz - 0.13, 0.05, 0.08, 0.02, dark);             // 6
  box(kx + 0.19, ky - 0.025, kz - 0.13, 0.08, 0.05, 0.02, dark);             // 3
  box(kx - 0.27, ky - 0.025, kz - 0.13, 0.08, 0.05, 0.02, dark);             // 9
  box(kx - 0.025, ky - 0.03, kz - 0.14, 0.05, 0.2, 0.03, dark);              // minute hand
  box(kx - 0.03, ky - 0.025, kz - 0.14, 0.15, 0.05, 0.03, dark);             // hour hand
  box(kx - 0.04, ky - 0.04, kz - 0.16, 0.08, 0.08, 0.02, "#E5484D");         // centre cap

  // planter behind the clock
  const qx = X(0.25, 0.7);
  box(qx, DH, 2.2, 0.7, 0.45, 0.5, wood);
  box(qx - 0.03, DH + 0.45, 2.17, 0.76, 0.05, 0.56, shade(wood, -0.08));
  parts.push({ t: "cone", p: [qx + 0.32, DH + 0.5, 2.45], r: 0.26, h: 0.8, c: leaf, n: 8 });
  parts.push({ t: "cone", p: [qx + (clockRight ? 0.14 : 0.52), DH + 0.5, 2.5], r: 0.16, h: 0.5, c: shade(leaf, -0.08), n: 7 });

  // --- ticket machine and bin at the opposite end ---
  const mx = clockRight ? 0.35 : W - 0.85;
  box(mx, DH, 2.1, 0.5, 1.45, 0.4, shade(canopy, -0.04));
  box(mx - 0.03, DH + 1.45, 2.07, 0.56, 0.08, 0.46, ink);
  box(mx + 0.1, DH + 0.95, 2.07, 0.3, 0.3, 0.03, on ? lit : dark, on);       // screen
  box(mx + 0.12, DH + 0.6, 2.07, 0.26, 0.06, 0.03, dark);                    // ticket slot
  const bnx = clockRight ? 0.6 : W - 0.6;
  cyl(bnx, DH, 1.3, 0.2, 0.8, ink, 10);
  cyl(bnx, DH + 0.8, 1.3, 0.22, 0.06, shade(canopy, -0.04), 10);

  return { parts };
}
