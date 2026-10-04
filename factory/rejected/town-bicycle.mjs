// Town Bicycle: a toy city bicycle leaning on a steel staple stand. Block asset: build(p) returns parts in metres on
// the Oasis Town grid (origin at the footprint's corner, y up, street side at z = 0). The bike runs along the 2 m side.
// Wheels are 8-box octagon tyres. Square tubes are used wherever the frame is straight up or straight across. The
// diagonal tubes are thin, finely stepped plates, so they read as clean lines rather than staircases. The stand is a
// low staple placed between the wheels, so it never sits behind a wheel and never shadows the top tube.
export const meta = {
  title: "Town Bicycle",
  kind: "3d",
  format: "blocks",
  kit: "Oasis Town",
  description: "A city bicycle with a wicker basket, parked against a steel staple stand or propped on its centre stand, for kerbs outside shops, stations and parks.",
  tags: ["3d", "low poly", "bicycle", "bike", "bike stand", "street furniture", "town", "kit"],
  price: 2,
  author: "oasis-factory",
  footprint: [2, 1],
  size: [1000, 1000],
};

export const params = {
  knobs: {
    frame: { type: "color", role: "primary", label: "Frame", default: "#2F7A55" },
    saddle: { type: "color", role: "secondary", label: "Saddle & grips", default: "#8A6E52" },
    stand: { type: "choice", label: "Parked on", default: "hoop", options: ["hoop", "kickstand"] },
    basket: { type: "toggle", label: "Front basket", default: true },
    lights: { type: "toggle", label: "Bike lamps", default: true },
  },
  presets: {
    Postbox: { frame: "#E5484D", saddle: "#3A3532" },
    Sky: { frame: "#3E7BFA", saddle: "#6B4F3A" },
    Plum: { frame: "#7D5BA6", saddle: "#4A3A30" },
  },
};

// ---- colour helpers: clamp incoming colours into the band each slot was designed for ----
function hex2rgb(h) {
  const s = /^#?[0-9a-fA-F]{6}$/.test(h || "") ? h.replace("#", "") : "2F7A55";
  return [0, 2, 4].map((i) => parseInt(s.slice(i, i + 2), 16) / 255);
}
function rgb2hex(c) {
  return "#" + c.map((v) => Math.round(Math.max(0, Math.min(1, v)) * 255).toString(16).padStart(2, "0")).join("").toUpperCase();
}
function toHsl([r, g, b]) {
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
function fromHsl([h, s, l]) {
  if (!s) return [l, l, l];
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s, pp = 2 * l - q;
  const f = (t) => {
    t = ((t % 1) + 1) % 1;
    return t < 1 / 6 ? pp + (q - pp) * 6 * t : t < 1 / 2 ? q : t < 2 / 3 ? pp + (q - pp) * (2 / 3 - t) * 6 : pp;
  };
  return [f(h + 1 / 3), f(h), f(h - 1 / 3)];
}
const clampHsl = (hex, lo, hi, smax) => {
  const [h, s, l] = toHsl(hex2rgb(hex));
  return rgb2hex(fromHsl([h, Math.min(s, smax), Math.max(lo, Math.min(hi, l))]));
};

export function build(p) {
  const parts = [];
  const box = (x, y, z, w, h, d, c, e) =>
    parts.push({ t: "box", p: [x, y, z], s: [w, h, d], c, ...(e ? { e: true } : {}) });

  // Diagonal tube as a thin plate of 1 cm steps. The plate is shallow in z, so no stair ledges show from the camera.
  const rod = (xa, ya, xb, yb, th, z, d, c) => {
    const dx = xb - xa, dy = yb - ya, len = Math.hypot(dx, dy);
    const t = th / ((Math.abs(dx) + Math.abs(dy)) / len); // keep the perpendicular thickness close to th
    const n = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / 0.01));
    for (let i = 0; i < n; i++) {
      const x0 = xa + (dx * i) / n, x1 = xa + (dx * (i + 1)) / n;
      const y0 = ya + (dy * i) / n, y1 = ya + (dy * (i + 1)) / n;
      box(Math.min(x0, x1) - t / 2, Math.min(y0, y1) - t / 2, z, Math.abs(x1 - x0) + t, Math.abs(y1 - y0) + t, d, c);
    }
  };

  // Octagon ring of exactly 8 thin boxes: 4 flats plus 4 corner blocks that share faces with the flats.
  const octo = (cx, cy, R, T, z, d, c) => {
    const a = 0.48 * R, b = R - T + 0.02 * R;
    box(cx - a, cy + R - T, z, 2 * a, T, d, c);
    box(cx - a, cy - R, z, 2 * a, T, d, c);
    box(cx - R, cy - a, z, T, 2 * a, d, c);
    box(cx + R - T, cy - a, z, T, 2 * a, d, c);
    for (const sx of [-1, 1]) for (const sy of [-1, 1])
      box(sx > 0 ? cx + a : cx - b, sy > 0 ? cy + a : cy - b, z, b - a, b - a, d, c);
  };

  // ---- palette: brand only on the frame (clamped legible), leather stays leather ----
  const F = clampHsl(p.frame, 0.32, 0.5, 0.8);
  const SAD = clampHsl(p.saddle, 0.2, 0.45, 0.32);
  const TYRE = "#2B3242", SPOKE = "#C9CED6", HUB = "#C9CED6", DARK = "#5B6270", CHAIN = "#3A3F4A";
  const STAND = "#9AA1AB", SLEEVE = "#2B3242";
  const WICKER = "#B08A5E", WEAVE = "#8A6E52", LEAF = "#79B86A", LEAF2 = "#5E9E52", BREAD = "#E0A458";
  const lit = !!p.lights;

  // ---- anchors (metres) ----
  const R = 0.32, T = 0.28 * R, cy = R, zc = 0.42;
  const xr = 0.44, xf = 1.48;              // axles: tyres span x 0.12 .. 1.80
  const bx = 0.86, by = cy;                // bottom bracket at axle height
  const hx = 1.34;                         // head tube x
  const headBot = cy + 0.4, headTop = headBot + 0.2;
  const topY = 0.88, tt = 0.045;           // top tube top / main tube size
  const zN = zc - 0.045, zFar = zc + 0.033, pd = 0.012; // stay & fork plates either side of the wheels

  // ---- wheels: octagon tyre, cross spokes, hub, axle ----
  for (const cx of [xr, xf]) {
    octo(cx, cy, R, T, zc - 0.025, 0.05, TYRE);
    box(cx - 0.008, cy - R + T, zc - 0.008, 0.016, 2 * (R - T), 0.016, SPOKE);
    box(cx - R + T, cy - 0.008, zc - 0.008, 2 * (R - T), 0.016, 0.016, SPOKE);
    box(cx - 0.04, cy - 0.04, zc - 0.03, 0.08, 0.08, 0.06, HUB);
    box(cx - 0.018, cy - 0.018, zc - 0.06, 0.036, 0.036, 0.12, DARK);
  }

  // ---- frame ----
  box(bx - 0.05, by - 0.05, zc - 0.06, 0.1, 0.1, 0.12, DARK);                  // bottom bracket shell
  box(bx - tt / 2, by, zc - tt / 2, tt, topY - by, tt, F);                     // seat tube (vertical)
  box(bx, topY - tt, zc - tt / 2, hx - 0.03 - bx, tt, tt, F);                  // top tube (horizontal)
  box(hx - 0.03, headBot, zc - 0.03, 0.06, headTop - headBot, 0.06, F);        // head tube
  rod(bx, by, hx, headBot + 0.03, 0.05, zc - tt / 2, 0.02, F);                 // down tube
  box(bx - 0.035, topY - 0.08, zc - 0.045, 0.07, 0.08, 0.09, F);               // seat lug
  box(hx - 0.045, headBot - 0.035, zc - 0.045, 0.09, 0.035, 0.09, F);          // fork crown
  for (const z of [zN, zFar]) {
    box(xr, cy - 0.015, z, bx - xr, 0.03, pd, F);                              // chainstay
    rod(bx, topY - 0.05, xr, cy, 0.03, z, pd, F);                              // seat stay
    rod(hx, headBot - 0.02, xf, cy, 0.034, z, pd, F);                          // fork leg
  }

  // ---- drivetrain on the street side, cranks level ----
  box(xr - 0.06, cy - 0.06, zc - 0.065, 0.12, 0.12, 0.02, DARK);               // rear sprocket
  octo(bx, by, 0.1, 0.035, zc - 0.08, 0.02, DARK);                             // chainring
  box(xr, cy + 0.055, zc - 0.075, bx - xr, 0.015, 0.01, CHAIN);                // chain
  box(bx - 0.03, by - 0.03, zc - 0.1, 0.06, 0.06, 0.04, HUB);                  // crank boss
  box(bx, by - 0.018, zc - 0.1, 0.16, 0.036, 0.02, HUB);                       // near crank, forward
  box(bx + 0.13, by - 0.015, zc - 0.19, 0.06, 0.03, 0.09, DARK);               // near pedal
  box(bx - 0.16, by - 0.018, zc + 0.06, 0.16, 0.036, 0.02, HUB);               // far crank, back
  box(bx - 0.18, by - 0.015, zc + 0.08, 0.06, 0.03, 0.09, DARK);               // far pedal

  // ---- seat and rear lamp ----
  box(bx - 0.016, topY, zc - 0.016, 0.032, 0.1, 0.032, SPOKE);                 // seat post
  box(bx - 0.15, topY + 0.1, zc - 0.07, 0.25, 0.06, 0.14, SAD);                // saddle
  box(bx + 0.1, topY + 0.11, zc - 0.035, 0.08, 0.04, 0.07, SAD);               // saddle nose
  box(bx - 0.08, topY - 0.075, zc - 0.025, 0.045, 0.055, 0.05, lit ? "#FF5A4E" : "#7C4A46", lit); // rear lamp

  // ---- swept-back city bars ----
  box(hx - 0.02, headTop, zc - 0.02, 0.04, 0.12, 0.04, SPOKE);                 // stem
  box(hx - 0.035, headTop + 0.12, zc - 0.26, 0.06, 0.035, 0.52, SPOKE);        // bar
  for (const zs of [zc - 0.26, zc + 0.19]) box(hx - 0.19, headTop + 0.12, zs, 0.155, 0.035, 0.07, SAD); // grips
  box(hx - 0.02, headTop + 0.155, zc - 0.17, 0.04, 0.03, 0.04, SPOKE);         // bell

  // ---- front basket on a head-tube bracket, or a head-tube lamp ----
  const lens = lit ? "#FFE3A0" : "#B9C2CC";
  if (p.basket) {
    const x0 = hx + 0.06, L = 0.3, b0 = headTop - 0.04, zA = zc - 0.15, D = 0.3, H = 0.2, w = 0.025;
    box(hx + 0.03, b0 + 0.02, zc - 0.02, x0 - hx - 0.03, 0.04, 0.04, DARK);   // bracket
    box(x0, b0, zA, L, w, D, WICKER);                                         // floor
    box(x0, b0 + w, zA, L, H - w, w, WICKER);                                 // street wall
    box(x0, b0 + w, zA + D - w, L, H - w, w, WICKER);                         // back wall
    box(x0, b0 + w, zA + w, w, H - w, D - 2 * w, WICKER);                     // rear end
    box(x0 + L - w, b0 + w, zA + w, w, H - w, D - 2 * w, WICKER);             // front end
    box(x0, b0 + 0.06, zA - 0.02, L, 0.035, 0.02, WEAVE);                     // weave band
    box(x0, b0 + H - 0.035, zA - 0.02, L, 0.035, 0.02, WEAVE);                // rim band
    box(x0 + 0.04, b0 + w, zc - 0.09, 0.14, 0.24, 0.14, LEAF);                // greens
    box(x0 + 0.07, b0 + w + 0.24, zc - 0.06, 0.08, 0.05, 0.08, LEAF2);        // greens tuft
    box(x0 + 0.2, b0 + w, zc + 0.01, 0.055, 0.31, 0.055, BREAD);              // baguette
    box(x0 + L, b0 + 0.05, zc - 0.035, 0.05, 0.07, 0.07, DARK);               // lamp housing
    box(x0 + L + 0.05, b0 + 0.06, zc - 0.025, 0.02, 0.05, 0.05, lens, lit);   // lamp lens
  } else {
    box(hx + 0.03, headBot + 0.08, zc - 0.035, 0.05, 0.07, 0.07, DARK);
    box(hx + 0.08, headBot + 0.09, zc - 0.025, 0.02, 0.05, 0.05, lens, lit);
  }

  // ---- stand ----
  if (p.stand === "hoop") {
    // low staple between the wheels, just behind the bike; the down tube rests on its rubber sleeve
    const z0 = zc + 0.08, sw = 0.06, hy = 0.64, l1 = 0.98, l2 = 1.3;
    for (const lx of [l1, l2]) {
      box(lx - 0.02, 0, z0 - 0.02, sw + 0.04, 0.015, sw + 0.04, DARK);       // floor flange
      box(lx, 0.015, z0, sw, hy - sw - 0.015, sw, STAND);                    // leg
    }
    box(l1 + 0.03, hy - sw, z0, l2 - l1, sw, sw, STAND);                     // top bar (stepped corners)
    const sxc = bx + (hy - 0.03 - by) / ((headBot + 0.03 - by) / (hx - bx)); // down tube x at bar height
    box(sxc - 0.03, hy - sw - 0.01, zc - 0.0025, 0.06, sw + 0.02, z0 - (zc - 0.0025), SLEEVE);
  } else {
    // centre stand under the bottom bracket: post plus a wide foot bar
    box(bx - 0.02, 0.02, zc - 0.03, 0.04, by - 0.05 - 0.02, 0.06, DARK);
    box(bx - 0.045, 0, zc - 0.16, 0.09, 0.02, 0.32, DARK);
  }

  return { parts };
}
