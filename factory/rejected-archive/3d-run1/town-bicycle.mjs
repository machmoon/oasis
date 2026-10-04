// Town Bicycle: a city bike leaning against a steel hoop stand on its own paving slab. This is a block asset:
// build(p) returns parts in metres on the Oasis Town grid (origin at the footprint's corner, y up, street side
// at z = 0).
// The frame is mostly straight thin boxes: a vertical seat tube and head tube, horizontal stays, a rear rack and a
// top tube. Only the down tube and fork are diagonal, drawn as short, evenly stepped bars.
// Wheels are octagonal rings of 8 thin boxes each. The whole bike shears towards the stand so it visibly leans
// on the rail. A second bike can be parked head-to-tail on the far side of the stand.
export const meta = {
  title: "Town Bicycle",
  kind: "3d",
  format: "blocks",
  kit: "Oasis Town",
  description: "A city bike leaning on a steel hoop stand, with an optional basket of blossoms, for parking outside any shop on the street.",
  tags: ["3d", "low poly", "bicycle", "bike", "bike rack", "street furniture", "town", "kit"],
  price: 1,
  author: "oasis-factory",
  footprint: [2, 1],
  size: [1000, 1000],
};

export const params = {
  knobs: {
    frame: { type: "color", role: "primary", label: "Frame", default: "#E5484D" },
    accent: { type: "color", role: "secondary", label: "Mudguards & chain guard", default: "#F6EEE0" },
    style: { type: "choice", label: "Frame style", default: "step-through", options: ["step-through", "classic"] },
    bikes: { type: "range", label: "Bikes parked", default: 1, min: 1, max: 2, step: 1 },
    basket: { type: "toggle", label: "Basket", default: true },
    lights: { type: "toggle", label: "Front lamp", default: true },
  },
  presets: {
    Tram: { frame: "#2F7A55", accent: "#F3E3C8" },
    Sky: { frame: "#3E7BFA", accent: "#F6EEE0" },
    Terracotta: { frame: "#C8553D", accent: "#F7B8CF" },
  },
};

// Colour guards. The frame stays a mid-value colour, so thin tubes read against both pale paving and dark tyres.
// The accent stays a pale tint, so mudguards always separate from the tyres they sit on.
function hexToHsl(hex) {
  const n = parseInt(String(hex).replace("#", "").padEnd(6, "0").slice(0, 6), 16);
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
function hslToHex(h, s, l) {
  const f = (t) => {
    t = (t + 1) % 1;
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s, pp = 2 * l - q;
    if (t < 1 / 6) return pp + (q - pp) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return pp + (q - pp) * (2 / 3 - t) * 6;
    return pp;
  };
  const to = (v) => Math.round(Math.max(0, Math.min(1, v)) * 255).toString(16).padStart(2, "0");
  return "#" + to(f(h + 1 / 3)) + to(f(h)) + to(f(h - 1 / 3));
}
function guard(hex, lLo, lHi, sMax) {
  const [h, s, l] = hexToHsl(hex);
  return hslToHex(h, Math.min(s, sMax), Math.max(lLo, Math.min(lHi, l)));
}

export function build(p) {
  const parts = [];
  const r4 = (v) => Math.round(v * 10000) / 10000;
  const put = (x, y, z, w, h, d, c, e) =>
    parts.push({ t: "box", p: [r4(x), r4(y), r4(z)], s: [r4(w), r4(h), r4(d)], c, ...(e ? { e: true } : {}) });

  const FRAME = guard(p.frame, 0.38, 0.56, 0.8);
  const ACC = guard(p.accent, 0.74, 0.9, 0.55);
  const TYRE = "#2B3242", METAL = "#8C929C", STAND = "#5B6270", SPOKE = "#C9CED6";
  const WOOD = "#8A6E52", WEAVE = "#6E5640", LIT = "#FFD58A", GLASS = "#D8DEE3";
  const BLOSSOM = "#F7B8CF", LEAF = "#79B86A", SLAB = "#D9DCE1", PLATE = "#BFC3CA";
  const city = p.style !== "classic";

  // ground slab filling the 2 x 1 footprint
  const G = 0.04;
  put(0, 0, 0, 2, G, 1, SLAB);

  // lean: the bike's plane shifts towards the stand as it rises
  const ZC0 = 0.3, LEAN = 0.14;
  const lp = (y) => ZC0 + LEAN * y;

  // hoop stand: its rail meets the back face of the seat and head tubes at y = 0.84
  const ZR = lp(0.84) + 0.0275, RD = 0.07, MIR = 2 * ZR + RD;
  put(0.04, G, ZR, 0.07, 0.8, RD, STAND);
  put(1.89, G, ZR, 0.07, 0.8, RD, STAND);
  put(0.04, G + 0.8, ZR, 1.92, 0.08, RD, STAND);
  put(0.11, G + 0.74, ZR, 0.06, 0.06, RD, STAND); // inner shoulders soften the corners
  put(1.83, G + 0.74, ZR, 0.06, 0.06, RD, STAND);
  put(0.01, G, ZR - 0.04, 0.13, 0.02, RD + 0.08, PLATE);
  put(1.86, G, ZR - 0.04, 0.13, 0.02, RD + 0.08, PLATE);

  // L: a bike-local box with z relative to the leaning plane. Tall boxes are split so the lean stays continuous.
  // A flip mirrors the whole bike head-to-tail onto the far side of the rail.
  let flip = false;
  const L = (x, y, z, w, h, d, c, e, ly) => {
    if (ly === undefined && h > 0.21) {
      const n = Math.ceil(h / 0.2), hh = h / n;
      for (let i = 0; i < n; i++) L(x, y + i * hh, z, w, hh, d, c, e, y + (i + 0.5) * hh);
      return;
    }
    const zz = lp(ly === undefined ? y + h / 2 : ly) + z;
    put(flip ? 2 - x - w : x, y + G, flip ? MIR - zz - d : zz, w, h, d, c, e);
  };

  // evenly stepped tube for the few diagonal members: bars of equal size, one regular stair
  const stairs = (x1, y1, x2, y2, th, d, c, zoff) => {
    const dx = x2 - x1, dy = y2 - y1, e = th * 0.3;
    if (Math.abs(dx) >= Math.abs(dy)) {
      const n = Math.max(1, Math.ceil(Math.abs(dy) / (th * 0.9))), sx = dx / n, sy = dy / n;
      for (let i = 0; i < n; i++) {
        const lo = Math.min(x1 + i * sx, x1 + (i + 1) * sx) - e, yc = y1 + (i + 0.5) * sy;
        L(lo, yc - th / 2, zoff - d / 2, Math.abs(sx) + 2 * e, th, d, c, false, yc);
      }
    } else {
      const n = Math.max(1, Math.ceil(Math.abs(dx) / (th * 0.9))), sx = dx / n, sy = dy / n;
      for (let i = 0; i < n; i++) {
        const lo = Math.min(y1 + i * sy, y1 + (i + 1) * sy) - e, xc = x1 + (i + 0.5) * sx;
        L(xc - th / 2, lo, zoff - d / 2, th, Math.abs(sy) + 2 * e, d, c, false, lo + Math.abs(sy) / 2 + e);
      }
    }
  };

  const R = 0.32, T = 0.055, WD = 0.05, CY = R, RX = 0.42, FX = 1.6;

  const wheel = (cx) => {
    const z = -WD / 2;
    L(cx - 0.18, CY + R - T, z, 0.36, T, WD, TYRE);
    L(cx - 0.18, CY - R, z, 0.36, T, WD, TYRE);
    L(cx - R, CY - 0.18, z, T, 0.36, WD, TYRE);
    L(cx + R - T, CY - 0.18, z, T, 0.36, WD, TYRE);
    for (const [sx, sy] of [[-1, -1], [-1, 1], [1, -1], [1, 1]])
      L(cx + sx * 0.22 - 0.055, CY + sy * 0.22 - 0.055, z, 0.11, 0.11, WD, TYRE);
    L(cx - R + T, CY - 0.01, -0.015, 2 * (R - T), 0.02, 0.03, SPOKE);
    L(cx - 0.01, CY - R + T, -0.015, 0.02, 2 * (R - T), 0.03, SPOKE);
    L(cx - 0.05, CY - 0.05, -0.045, 0.1, 0.1, 0.09, METAL);
  };

  const lamp = (x, y, z, ly) => {
    L(x, y, z, 0.07, 0.08, 0.08, METAL, false, ly);
    L(x + 0.015, y + 0.015, z - 0.02, 0.075, 0.05, 0.085, p.lights ? LIT : GLASS, p.lights, ly);
  };

  const bike = () => {
    wheel(RX);
    wheel(FX);

    // mudguards hug the top of each rim, a little proud of the tyre faces
    L(RX - 0.18, CY + R, -0.04, 0.36, 0.04, 0.08, ACC);
    L(RX - 0.31, CY + 0.27, -0.04, 0.14, 0.05, 0.08, ACC);
    L(RX + 0.17, CY + 0.27, -0.04, 0.14, 0.05, 0.08, ACC);
    L(1.46, CY + R, -0.04, 0.32, 0.04, 0.08, ACC);
    L(FX + 0.17, CY + 0.27, -0.04, 0.14, 0.05, 0.08, ACC);

    // frame
    L(RX, CY - 0.02, -0.06, 0.44, 0.04, 0.03, FRAME);         // chain stays either side of the wheel
    L(RX, CY - 0.02, 0.03, 0.44, 0.04, 0.03, FRAME);
    L(0.8, 0.26, -0.05, 0.12, 0.12, 0.1, TYRE);                // bottom bracket shell
    L(0.8125, CY, -0.0275, 0.055, 0.54, 0.055, FRAME);         // seat tube
    L(1.3925, 0.7, -0.0275, 0.055, 0.22, 0.055, FRAME);        // head tube
    stairs(0.86, 0.34, 1.42, 0.74, 0.075, 0.055, FRAME, 0);    // down tube
    stairs(1.42, 0.7, FX, CY, 0.04, 0.03, FRAME, -0.045);      // fork blades
    stairs(1.42, 0.7, FX, CY, 0.04, 0.03, FRAME, 0.045);
    L(1.38, 0.68, -0.065, 0.08, 0.04, 0.13, FRAME);            // fork crown
    if (!city) L(0.84, 0.78, -0.0275, 0.58, 0.06, 0.055, FRAME); // classic top tube

    // rear rack braced from the hub and bolted to the seat tube
    L(0.4, CY, 0.045, 0.04, 0.38, 0.03, METAL);
    L(0.4, CY, -0.075, 0.04, 0.38, 0.03, METAL);
    L(0.14, 0.7, -0.075, 0.7, 0.04, 0.15, METAL);
    L(0.14, 0.74, -0.075, 0.03, 0.04, 0.15, METAL);

    // seat post and saddle
    const sY = city ? 1.0 : 1.02;
    L(0.8225, 0.86, -0.0175, 0.035, sY - 0.86, 0.035, METAL);
    if (city) L(0.72, sY, -0.06, 0.25, 0.06, 0.12, TYRE);
    else L(0.7, sY, -0.045, 0.28, 0.05, 0.09, TYRE);

    // stem and handlebars: swept-back and tall for city, flat and low for classic
    const bY = city ? 1.06 : 0.96;
    L(1.4025, 0.92, -0.0175, 0.035, bY - 0.92, 0.035, METAL);
    if (city) {
      L(1.36, bY, -0.25, 0.06, 0.04, 0.5, METAL, false, bY);
      L(1.3, bY - 0.005, -0.285, 0.1, 0.05, 0.07, TYRE, false, bY);
      L(1.3, bY - 0.005, 0.215, 0.1, 0.05, 0.07, TYRE, false, bY);
    } else {
      L(1.39, bY, -0.22, 0.06, 0.04, 0.44, METAL, false, bY);
      L(1.38, bY - 0.005, -0.255, 0.08, 0.05, 0.07, TYRE, false, bY);
      L(1.38, bY - 0.005, 0.185, 0.08, 0.05, 0.07, TYRE, false, bY);
    }

    // drivetrain on the street side, cranks and pedals
    L(0.78, 0.24, -0.065, 0.16, 0.16, 0.02, METAL);
    L(RX, 0.38, -0.055, 0.42, 0.02, 0.012, TYRE);
    L(0.835, 0.305, -0.09, 0.03, 0.03, 0.04, METAL);
    L(0.82, 0.13, -0.11, 0.04, 0.19, 0.02, METAL);
    L(0.77, 0.11, -0.21, 0.14, 0.04, 0.1, TYRE);
    L(0.82, 0.32, 0.05, 0.04, 0.19, 0.02, METAL);
    L(0.77, 0.49, 0.07, 0.14, 0.04, 0.1, TYRE);
    if (city) L(0.44, 0.3, -0.09, 0.46, 0.14, 0.02, ACC); // chain guard

    // basket: hung from the bars, braced to the front hub, always above the rail
    if (p.basket) {
      const bx = 1.46, bw = 0.34, bd = 0.28, bh = 0.24, t = 0.03, bf = 0.9, bly = bf + 0.12;
      const K = (x, y, z, w, h, d, c) => L(x, y, z, w, h, d, c, false, bly);
      K(bx, bf, -bd / 2, bw, t, bd, WOOD);
      K(bx, bf, -bd / 2, bw, bh, t, WOOD);
      K(bx, bf, bd / 2 - t, bw, bh, t, WOOD);
      K(bx, bf, -bd / 2, t, bh, bd, WOOD);
      K(bx + bw - t, bf, -bd / 2, t, bh, bd, WOOD);
      K(bx, bf + 0.09, -bd / 2 - 0.02, bw, 0.03, 0.02, WEAVE);
      K(bx - 0.01, bf + bh - 0.03, -bd / 2 - 0.01, bw + 0.02, 0.04, bd + 0.02, WEAVE);
      K(bx + 0.03, bf + bh + 0.01, -bd / 2 + 0.03, bw - 0.06, 0.04, bd - 0.06, LEAF);
      for (const [fx, fz, fh] of [[0.07, -0.07, 0.08], [0.17, 0.03, 0.12], [0.26, -0.06, 0.06], [0.11, 0.07, 0.05]])
        K(bx + fx - 0.04, bf + bh + 0.05, fz - 0.04, 0.08, fh, 0.08, BLOSSOM);
      L(1.42, bY - 0.04, -0.03, 0.05, 0.08, 0.06, METAL, false, bY);  // bracket to the bars
      L(1.64, CY, -0.07, 0.02, bf - CY, 0.025, METAL);                // brace to the front hub
      lamp(bx + bw, bf + 0.08, -0.06, bly);
    } else {
      lamp(1.4475, 0.8, -0.04);
    }
  };

  const count = Math.max(1, Math.min(2, Math.round(p.bikes)));
  flip = false;
  bike();
  if (count > 1) {
    flip = true;
    bike();
    flip = false;
  }

  return { parts };
}
