// Park Bench: a slatted wooden park bench with optional planter boxes at each end. Block asset: build(p)
// returns parts in metres on the Oasis Town grid (origin at the footprint's corner, y up, street side at z = 0).
//
// Footprint: the brief asks for a 2 x 1 lot and a 1.5-3 m length. A 3 m bench plus two planters needs about
// 4 m, so the lot is declared as 4 x 1. It is drawn as a strip of 1 m paving flags in the kit kerb tone.
// The strip always covers the whole lot, so the model's bounds never change with any knob. A fixed-fit camera
// then keeps one world-to-pixel scale, and the flag joints show the bench length in real grid metres.
// The default bench (2 m seat) fills two flags, the brief's 2 x 1 module.
export const meta = {
  title: "Park Bench",
  kind: "3d",
  format: "blocks",
  kit: "Oasis Town",
  description: "A slatted wooden park bench on a strip of 1 m paving flags, with optional flowering planter boxes at each end, to line a town pavement or face a little square.",
  tags: ["3d", "low poly", "bench", "park", "street furniture", "planter", "seating", "town", "kit"],
  price: 1,
  author: "oasis-factory",
  footprint: [4, 1],
  size: [1000, 1000],
};

export const params = {
  knobs: {
    wood: { type: "color", role: "primary", label: "Wood stain", default: "#8A6E52" },
    frame: { type: "color", role: "ink", label: "Iron frame", default: "#5B6270" },
    planter: { type: "color", role: "primary", label: "Planter boxes", default: "#2F7A55" },
    bloom: { type: "color", role: "highlight", label: "Flowers", default: "#F7B8CF" },
    length: { type: "range", label: "Seat length (m)", default: 2, min: 1.5, max: 3, step: 0.25 },
    planters: { type: "toggle", label: "Planter boxes", default: true },
    arms: { type: "toggle", label: "Armrests", default: true },
  },
  presets: {
    Harbour: { wood: "#A9845E", frame: "#2B3242", planter: "#D8DEE3", bloom: "#E5484D" },
    Seaside: { wood: "#B89470", frame: "#2B4F9E", planter: "#F6EEE0", bloom: "#F2B33D" },
    Brick: { wood: "#6E5440", frame: "#2B3242", planter: "#C8553D", bloom: "#FFF4E0" },
  },
};

// ---- colour helpers: every brand input is clamped into the band its material lives in ----
function toHsl(hex) {
  const n = parseInt(String(hex).slice(1), 16) || 0;
  const r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
  let h = 0, s = 0;
  if (mx !== mn) {
    const d = mx - mn;
    s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
    if (mx === r) h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
    else if (mx === g) h = ((b - r) / d + 2) * 60;
    else h = ((r - g) / d + 4) * 60;
  }
  return [h, s, l];
}
function fromHsl(h, s, l) {
  h = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60) [r, g, b] = [c, x, 0]; else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x]; else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c]; else [r, g, b] = [c, 0, x];
  const f = (v) => Math.round(clamp(v + m, 0, 1) * 255).toString(16).padStart(2, "0");
  return "#" + f(r) + f(g) + f(b);
}
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

// Wood is a stain. The input sets its lightness and nudges the hue, but it always stays a warm, mid-light timber.
function woodHsl(hex) {
  const [h, s, l] = toHsl(hex);
  const hue = h >= 15 && h <= 45 && s > 0.05 ? h : 30 + ((h % 30) - 15) * 0.5;
  return [hue, clamp(s, 0.22, 0.4), clamp(l, 0.38, 0.6)];
}
// Iron frame: cool and dark, always at least 0.18 darker than the wood, so the frame never merges with the slats.
function ironTone(hex, woodL) {
  const [h, s, l] = toHsl(hex);
  return fromHsl(h, Math.min(s, 0.45), clamp(l, 0.12, Math.min(0.3, woodL - 0.18)));
}
// Painted planter: saturation is capped so a neon brand becomes a painted tone. The lightness floor keeps its faces readable at night.
function paintTone(hex) {
  const [h, s, l] = toHsl(hex);
  return fromHsl(h, Math.min(s, 0.5), clamp(l, 0.36, 0.74));
}
// Flowers stay out of the leaf-green and cyan band, and stay bright.
function bloomTone(hex) {
  let [h, s, l] = toHsl(hex);
  if (h >= 70 && h <= 200) h = h < 135 ? 52 : 222;
  return fromHsl(h, Math.max(s, 0.5), clamp(l, 0.62, 0.88));
}
// Shift lightness away from the base, for rims, seams and alternate planks.
function shade(hex, amt) {
  const [h, s, l] = toHsl(hex);
  return fromHsl(h, s, l < 0.5 ? Math.min(0.92, l + amt) : Math.max(0.08, l - amt));
}
function hash(i) {
  const v = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return v - Math.floor(v);
}

export function build(p) {
  const parts = [];
  const box = (x, y, z, w, h, d, c) => parts.push({ t: "box", p: [x, y, z], s: [w, h, d], c });
  const cyl = (x, y, z, r, h, c, n) => parts.push({ t: "cyl", p: [x, y, z], r, h, c, n });
  const cone = (x, y, z, r, h, c, n) => parts.push({ t: "cone", p: [x, y, z], r, h, c, n });

  const [wh, ws, wl] = woodHsl(p.wood);
  const wood = fromHsl(wh, ws, wl);
  const wood2 = fromHsl(wh, ws, wl - 0.06);       // alternate plank, always a touch darker
  const iron = ironTone(p.frame, wl);
  const paint = paintTone(p.planter);
  const bloom = bloomTone(p.bloom);

  // ---- paving strip: covers the full 4 x 1 lot at every knob value (fixed bounds = fixed scale) ----
  const LOT = 4, G = 0.04;
  box(0, 0, 0, LOT, G, 1, "#D9DCE1");
  for (let k = 1; k < LOT; k++) box(k - 0.01, G, 0.03, 0.02, 0.006, 0.94, "#C4C9D0"); // 1 m flag joints

  const S = clamp(p.length, 1.5, 3);              // seat length
  const PW = 0.34, GAP = 0.14;                    // planter width and the clear gap to the bench
  const side = p.planters ? PW + GAP : 0;
  const x0 = (LOT - (S + 2 * side)) / 2;          // max run 3.96 m, so it always fits inside the lot
  const bx0 = x0 + side, bx1 = bx0 + S;

  // ---- bench profile ----
  const SEAT_Y = G + 0.41, SEAT_H = 0.05;         // seat top 0.46 m above the paving
  const SZ0 = 0.24, SZ1 = 0.66;
  const LEG = 0.06, FOOT = 0.03;
  const FZ = 0.26, RZ = SZ1;
  const nBack = 4, BACK_Y0 = G + 0.52, BACK_P = 0.11, BACK_H = 0.09;
  const backTop = BACK_Y0 + (nBack - 1) * BACK_P + BACK_H; // tallest point of the piece at every setting
  const ARM_Y = G + 0.6;

  // end frames sit inset so the armrests never reach past the seat ends
  const frameXs = [bx0 + 0.06, bx1 - 0.06 - LEG];
  if (S > 1.7) frameXs.push((bx0 + bx1) / 2 - LEG / 2);

  frameXs.forEach((fx, i) => {
    const armed = i < 2 && p.arms;
    box(fx - 0.02, G, FZ - 0.02, LEG + 0.04, FOOT, LEG + 0.04, iron);
    box(fx - 0.02, G, RZ - 0.02, LEG + 0.04, FOOT, LEG + 0.04, iron);
    box(fx, G + FOOT, FZ, LEG, (armed ? ARM_Y : SEAT_Y) - G - FOOT, LEG, iron);
    // every rear post finishes flush with the top back slat: nothing pokes above the back
    box(fx, G + FOOT, RZ, LEG, backTop - G - FOOT, LEG, iron);
    box(fx, SEAT_Y - 0.05, FZ, LEG, 0.05, RZ - FZ + LEG, iron); // seat rail, hidden under the slats
    if (armed) {
      box(fx, ARM_Y, FZ - 0.04, LEG, 0.05, (RZ - 0.05) - (FZ - 0.04), iron);
      box(fx - 0.02, ARM_Y + 0.05, FZ - 0.06, LEG + 0.04, 0.04, (RZ - 0.05) - (FZ - 0.06), wood);
    }
  });
  // low stretcher tying the legs together, so the frame reads as one cast-iron piece
  box(frameXs[0] + LEG, G + 0.12, RZ + 0.01, frameXs[1] - frameXs[0] - LEG, 0.04, 0.04, iron);

  // seat: four boards with slim gaps and alternating tone
  const nSeat = 4, gap = 0.02;
  const sd = (SZ1 - SZ0 - gap * (nSeat - 1)) / nSeat;
  for (let i = 0; i < nSeat; i++) box(bx0, SEAT_Y, SZ0 + i * (sd + gap), S, SEAT_H, sd, i % 2 ? wood2 : wood);
  // back: four close boards against the front face of the rear posts
  for (let i = 0; i < nBack; i++) box(bx0, BACK_Y0 + i * BACK_P, RZ - 0.05, S, BACK_H, 0.05, i % 2 ? wood2 : wood);

  // ---- planter boxes: free-standing, 0.14 m clear of the seat ends and below the armrests ----
  if (p.planters) {
    const rim = shade(paint, 0.16), seam = shade(paint, 0.1);
    const PZ0 = 0.2, PZ1 = 0.8, PH = 0.42;
    const leaf = "#79B86A", leafDark = "#5E9A52";
    [x0, bx1 + GAP].forEach((px, s) => {
      box(px + 0.03, G, PZ0 + 0.03, PW - 0.06, PH, PZ1 - PZ0 - 0.06, paint);
      box(px, G + PH, PZ0, PW, 0.06, PZ1 - PZ0, rim);
      for (const f of [0.33, 0.66]) box(px + 0.03 + (PW - 0.06) * f - 0.015, G + 0.04, PZ0 + 0.01, 0.03, PH - 0.08, 0.02, seam);
      box(px + 0.06, G + PH + 0.06, PZ0 + 0.06, PW - 0.12, 0.02, PZ1 - PZ0 - 0.12, "#6B5440");

      const soilY = G + PH + 0.08, cx = px + PW / 2, r = 0.12;
      const hv = hash(s * 7 + 1);
      const fz = PZ0 + 0.18, h1 = 0.12 + hv * 0.05;
      cyl(cx, soilY, fz, r, h1, leaf, 7);
      cyl(cx, soilY + h1, fz, r * 0.62, 0.07, leaf, 7);
      for (let k = 0; k < 3; k++) {
        const a = k * 2.1 + hv * 3 + s;
        box(cx + Math.cos(a) * r * 0.75 - 0.033, soilY + h1, fz + Math.sin(a) * r * 0.75 - 0.033, 0.066, 0.05, 0.066, bloom);
      }
      box(cx - 0.035, soilY + h1 + 0.07, fz - 0.035, 0.07, 0.05, 0.07, bloom);
      cone(cx, soilY, PZ1 - 0.18, r * 0.95, 0.22 + hash(s * 13 + 4) * 0.1, leafDark, 7); // stays below the bench back
    });
  }

  return { parts };
}
