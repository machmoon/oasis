// Food Truck: a chunky street-food van with a serving hatch, a striped awning flap, a chalk menu board and a
// glowing "EAT" roof sign. Block asset: build(p) returns parts in metres on the Oasis Town grid (origin at the
// footprint's corner, y up, street side at z = 0). The cab faces -x; the serving side faces the street.
// The bodywork is built from full-depth cells on one shared column grid, and the hatch interior is painted into
// those cells. Brand colours are clamped into the kit's tonal band, so stripes and lettering keep their contrast.
export const meta = {
  title: "Food Truck",
  kind: "3d",
  format: "blocks",
  kit: "Oasis Town",
  description: "A toy street-food truck with a serving hatch, a striped awning flap, a chalk menu and a glowing EAT roof sign, built to park kerbside in any little town.",
  tags: ["3d", "low poly", "food truck", "vehicle", "street food", "market", "town", "kit"],
  price: 3,
  author: "oasis-factory",
  footprint: [5, 2.5],
  size: [1000, 1000],
};

export const params = {
  knobs: {
    body: { type: "color", role: "surface", label: "Body", default: "#F6EEE0" },
    awning: { type: "color", role: "primary", label: "Awning", default: "#E5484D" },
    sign: { type: "color", role: "highlight", label: "Sign", default: "#F2B33D" },
    length: { type: "range", label: "Kitchen length (m)", default: 3.1, min: 2.7, max: 3.5, step: 0.2 },
    height: { type: "range", label: "Box height (m)", default: 2.9, min: 2.6, max: 3.3, step: 0.1 },
    hatch: { type: "toggle", label: "Hatch open", default: true },
    lights: { type: "toggle", label: "Lights", default: true },
  },
  presets: {
    Tram: { body: "#2F7A55", awning: "#F7B8CF", sign: "#FFD166" },
    Harbour: { body: "#D8DEE3", awning: "#3E7BFA", sign: "#F7B8CF" },
    Midnight: { body: "#2B3242", awning: "#F2B33D", sign: "#E5484D" },
  },
};

function hexRgb(h) {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function rgbHex(r, g, b) {
  const c = (v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0");
  return "#" + c(r) + c(g) + c(b);
}
function lum(h) {
  const [r, g, b] = hexRgb(h);
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}
function mix(a, b, t) {
  const A = hexRgb(a), B = hexRgb(b);
  return rgbHex(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t);
}
function toHsl(hex) {
  let [r, g, b] = hexRgb(hex);
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
  if (mx - mn < 1e-6) return [0, 0, l];
  const d = mx - mn, s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
  let h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h / 6, s, l];
}
function fromHsl(h, s, l) {
  if (s < 1e-6) return rgbHex(l * 255, l * 255, l * 255);
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s, pp = 2 * l - q;
  const f = (t) => {
    t = (t + 1) % 1;
    if (t < 1 / 6) return pp + (q - pp) * 6 * t;
    if (t < 0.5) return q;
    if (t < 2 / 3) return pp + (q - pp) * (2 / 3 - t) * 6;
    return pp;
  };
  return rgbHex(f(h + 1 / 3) * 255, f(h) * 255, f(h - 1 / 3) * 255);
}
// Keep a brand colour inside the band its slot was designed for.
function band(hex, sMin, lMin, lMax) {
  let [h, s, l] = toHsl(hex);
  if (s > 0.08) s = Math.max(s, sMin);
  l = Math.max(lMin, Math.min(lMax, l));
  return fromHsl(h, s, l);
}
// Trim relative to the base: darken light colours, lift dark ones hard so seams survive near-black bodies.
function shade(h) {
  return lum(h) > 0.45 ? mix(h, "#000000", 0.28) : mix(h, "#FFFFFF", 0.5);
}

export function build(p) {
  const parts = [];
  const r3 = (v) => Math.round(v * 1000) / 1000;
  const box = (x, y, z, w, h, d, c, e) =>
    parts.push({ t: "box", p: [r3(x), r3(y), r3(z)], s: [r3(w), r3(h), r3(d)], c, ...(e ? { e: true } : {}) });
  const cyl = (cx, y, cz, r, h, c) => parts.push({ t: "cyl", p: [r3(cx), r3(y), r3(cz)], r, h: r3(h), c, n: 10 });

  const cuts = (a, b, g) => {
    const out = [a];
    let v = (Math.floor(a / g + 1e-6) + 1) * g;
    while (v < b - 1e-6) { if (v > a + 1e-6) out.push(v); v += g; }
    out.push(b);
    return out;
  };
  const merge = (arr) => {
    const s = arr.slice().sort((a, b) => a - b), out = [];
    for (const v of s) if (!out.length || v - out[out.length - 1] > 0.03) out.push(v);
    return out;
  };
  const cells = (xs, ys, z, d, col) => {
    for (let i = 0; i < xs.length - 1; i++)
      for (let j = 0; j < ys.length - 1; j++) {
        const [c, e] = col(xs[i], xs[i + 1], ys[j], ys[j + 1]);
        box(xs[i], ys[j], z, xs[i + 1] - xs[i], ys[j + 1] - ys[j], d, c, e);
      }
  };
  const strip = (xs, y, z, h, d, c) => {
    for (let i = 0; i < xs.length - 1; i++) box(xs[i], y, z, xs[i + 1] - xs[i], h, d, c);
  };
  const mosaic = (x0, yTop, z, d, cw, ch, rows, pal, glow) => {
    rows.forEach((row, r) => {
      for (let i = 0; i < row.length; i++) {
        const k = row[i];
        if (pal[k]) box(x0 + i * cw, yTop - (r + 1) * ch, z, cw, ch, d, pal[k], glow.indexOf(k) >= 0);
      }
    });
  };

  const body = p.body, open = p.hatch, L = p.lights;
  const A = band(p.awning, 0.5, 0.36, 0.58); // stripes always strong against white and the lit interior
  const S = band(p.sign, 0.45, 0.48, 0.76); // sign board stays bright enough to glow
  const dark = lum(body) < 0.45;
  const trim = shade(body);
  const hem = mix(A, "#000000", 0.3);
  const letter = lum(S) > 0.5 ? "#2B3242" : "#FBFBFB";
  const roof = "#5B6270", glass = "#7E93A8", lit = "#FFD58A", ink = "#2B3242";
  const tyre = "#3B4048", steel = "#C9CED6", pole = "#8C929C", white = "#FBFBFB", well = "#22262E";
  const menuFrame = dark ? "#D9DCE1" : "#8A6E52";

  const z0 = 0.6, z1 = 2.3, D = z1 - z0;
  const K = p.length, H = p.height, kx0 = 1.4, kx1 = kx0 + K;
  const ox0 = kx0 + 0.25, ox1 = kx1 - 1.05, oy0 = 1.2, oy1 = 2.3, hw = ox1 - ox0;
  const cxC = (ox0 + ox1) / 2;
  const fC = [0.85, kx1 - 0.7]; // wheel centres

  // ---- kitchen box
  const xsK = merge([...cuts(kx0, kx1, 0.25), ox0, ox1]);
  const ysK = merge([0.3, 0.5, 1.0, oy0, 1.75, oy1, 2.6, H].filter((v) => v <= H + 1e-6));
  cells(xsK, ysK, z0, D, (x0, x1, y0, y1) => {
    if (y0 < 0.45) return [roof, false];
    if (open && x0 >= ox0 - 0.01 && x1 <= ox1 + 0.01 && y0 >= oy0 - 0.01 && y1 <= oy1 + 0.01)
      return [L ? lit : "#3A4150", L];
    return [body, false];
  });
  strip(merge([kx0 - 0.05, ...xsK, kx1 + 0.05]), H, z0 - 0.05, 0.1, D + 0.1, roof); // roof cap
  strip(xsK.filter((x) => x <= ox0 + 0.01 || x >= ox1 - 0.01), 0.92, z0 - 0.03, 0.08, 0.03, trim);
  box(ox0, 0.92, z0 - 0.03, hw, 0.08, 0.03, trim);

  // ---- cab and hood
  cells(cuts(0.5, 1.4, 0.25), [0.3, 0.5, 1.0, 1.5, 2.2], z0, D, (x0, x1, y0) => [y0 < 0.45 ? roof : body, false]);
  cells(cuts(0.12, 0.5, 0.25), [0.3, 0.5, 1.25], z0, D, (x0, x1, y0) => [y0 < 0.45 ? roof : body, false]);
  box(0.45, 2.2, z0 - 0.03, 0.95, 0.07, D + 0.06, roof);
  box(0.47, 1.35, 0.75, 0.03, 0.6, 1.4, glass); // windscreen
  box(0.72, 1.35, z0 - 0.03, 0.5, 0.55, 0.03, glass); // side window
  box(0.62, 1.0, z0 - 0.03, 0.04, 1.0, 0.03, trim); // door seams
  box(1.28, 1.0, z0 - 0.03, 0.04, 1.0, 0.03, trim);
  box(0.66, 1.96, z0 - 0.03, 0.62, 0.04, 0.03, trim);
  box(1.08, 1.2, z0 - 0.05, 0.16, 0.06, 0.05, steel); // handle
  box(0.09, 0.6, 1.1, 0.03, 0.4, 0.7, ink); // grille
  for (const hz of [0.75, 1.9]) box(0.09, 0.85, hz, 0.03, 0.22, 0.25, L ? "#FFF4D6" : "#E8ECF0", L);
  box(0, 0.3, 0.65, 0.12, 0.25, 1.6, steel); // front bumper
  box(kx1, 0.3, 0.65, 0.1, 0.25, 1.6, steel); // rear bumper
  for (const tz of [0.7, 2.0]) box(kx1 + 0.1, 0.6, tz, 0.04, 0.18, 0.2, L ? "#FF6A70" : "#9E3A3E", L);

  // ---- chassis rail under the body, linking both axles
  box(fC[0] - 0.1, 0.12, 0.85, fC[1] - fC[0] + 0.2, 0.18, 1.2, well);

  // ---- wheels: rounded tyres pressed against the body, dark wells and mudguards behind them
  for (const cx of fC) {
    for (const [zw, zf, dir] of [[z0 - 0.18, z0, -1], [z1, z1, 1]]) {
      box(cx - 0.18, 0, zw, 0.36, 0.7, 0.18, tyre);
      box(cx - 0.35, 0.17, zw, 0.7, 0.36, 0.18, tyre);
      box(cx - 0.3, 0.05, zw, 0.6, 0.6, 0.18, tyre);
      const wz = dir < 0 ? zf - 0.02 : zf;
      box(cx - 0.43, 0.3, wz, 0.86, 0.52, 0.02, well); // wheel well
      box(cx - 0.47, 0.82, dir < 0 ? zf - 0.04 : zf, 0.94, 0.06, 0.04, trim); // mudguard
    }
    box(cx - 0.13, 0.22, z0 - 0.21, 0.26, 0.26, 0.03, steel); // hub
    box(cx - 0.05, 0.3, z0 - 0.23, 0.1, 0.1, 0.02, pole);
  }

  // ---- hatch frame
  box(ox0 - 0.08, oy0, z0 - 0.03, 0.08, oy1 + 0.08 - oy0, 0.03, trim);
  box(ox1, oy0, z0 - 0.03, 0.08, oy1 + 0.08 - oy0, 0.03, trim);
  box(ox0, oy1, z0 - 0.03, hw, 0.08, 0.03, trim);

  const fx0 = ox0 - 0.08, fw = hw + 0.16;
  const nS = Math.max(4, Math.round(fw / 0.3)), sw = fw / nS;
  if (open) {
    // chef on the lit back wall
    const cz = z0 - 0.03;
    box(cxC - 0.35, oy0, cz, 0.2, 0.3, 0.03, "#2F7A55");
    box(cxC - 0.15, oy0, cz, 0.3, 0.3, 0.03, white);
    box(cxC + 0.15, oy0, cz, 0.2, 0.3, 0.03, "#2F7A55");
    box(cxC - 0.14, 1.5, cz, 0.28, 0.26, 0.03, "#F0C8A0");
    for (const ex of [cxC - 0.09, cxC + 0.05]) box(ex, 1.64, cz - 0.02, 0.04, 0.05, 0.02, ink);
    box(cxC - 0.15, 1.76, cz, 0.3, 0.06, 0.03, white);
    box(cxC - 0.22, 1.82, cz, 0.44, 0.14, 0.03, white);
    // counter
    strip(cuts(fx0, fx0 + fw, 0.25), oy0 - 0.08, 0.3, 0.08, 0.3, steel);
    // burger
    const bx = ox0 + 0.08;
    box(bx, oy0, 0.33, 0.3, 0.06, 0.22, "#D98A3D");
    box(bx - 0.01, oy0 + 0.06, 0.32, 0.32, 0.06, 0.24, "#6B3E26");
    box(bx - 0.02, oy0 + 0.12, 0.31, 0.34, 0.03, 0.26, "#79B86A");
    box(bx, oy0 + 0.15, 0.33, 0.3, 0.1, 0.22, "#D98A3D");
    // drink cup
    const ux = ox1 - 0.2;
    cyl(ux, oy0, 0.44, 0.09, 0.1, white);
    cyl(ux, oy0 + 0.1, 0.44, 0.095, 0.07, A);
    cyl(ux, oy0 + 0.17, 0.44, 0.09, 0.06, white);
    cyl(ux, oy0 + 0.23, 0.44, 0.1, 0.03, S);
    box(ux - 0.015, oy0 + 0.26, 0.425, 0.03, 0.14, 0.03, A);
    // awning flap propped out over the street, with a striped valance and dark hem
    for (let i = 0; i < nS; i++) box(fx0 + i * sw, oy1 + 0.08, 0.22, sw, 0.1, z0 - 0.22, i % 2 ? white : A);
    for (let i = 0; i < nS; i++) box(fx0 + i * sw, 2.22, 0.17, sw, 0.16, 0.05, i % 2 ? white : A);
    box(fx0, 2.18, 0.17, fw, 0.04, 0.05, hem);
    for (const bx2 of [ox0 - 0.08, ox1]) {
      box(bx2, 2.2, 0.45, 0.08, 0.18, 0.12, pole);
      box(bx2, 2.3, 0.32, 0.08, 0.08, 0.13, pole);
    }
    box(ox0 + 0.1, 2.34, 0.3, hw - 0.2, 0.04, 0.08, L ? "#FFF1C9" : "#D8DEE3", L); // light bar
  } else {
    // flap folded down over the opening
    const n = Math.max(4, Math.round(hw / 0.3)), w = hw / n;
    for (let i = 0; i < n; i++) box(ox0 + i * w, oy0, z0 - 0.045, w, oy1 - oy0, 0.045, i % 2 ? white : A);
    box(ox0 - 0.08, oy0 - 0.08, z0 - 0.03, hw + 0.16, 0.08, 0.03, trim);
    box(cxC - 0.25, 1.3, z0 - 0.07, 0.5, 0.06, 0.025, steel);
    box(ox0, oy1 - 0.06, z0 - 0.07, hw, 0.06, 0.025, hem);
  }

  // ---- chalk menu board: header bar, three even chalk lines with prices
  const mx0 = kx1 - 0.85, my0 = 1.15, mw = 0.7, mh = 1.15;
  box(mx0, my0, z0 - 0.03, mw, mh, 0.03, menuFrame);
  box(mx0 + 0.05, my0 + 0.05, z0 - 0.05, mw - 0.1, mh - 0.1, 0.02, ink);
  box(mx0 + 0.1, my0 + mh - 0.26, z0 - 0.065, mw - 0.2, 0.14, 0.015, S);
  for (let i = 0; i < 3; i++) {
    const y = my0 + mh - 0.48 - i * 0.2;
    box(mx0 + 0.1, y, z0 - 0.065, 0.3, 0.06, 0.015, "#F6EEE0");
    box(mx0 + 0.5, y, z0 - 0.065, 0.1, 0.06, 0.015, S);
  }

  // ---- roof sign: 3x5 glyphs, single stroke colour, one empty cell between letters
  const cw = 0.15, cols = 13, rowsN = 7, swd = cols * cw, sh = rowsN * cw;
  const sx0 = (kx0 + kx1) / 2 - swd / 2, sy0 = H + 0.31, sz = 1.35;
  for (const px of [sx0 + 0.3, sx0 + swd - 0.38]) box(px, H + 0.1, sz + 0.04, 0.08, 0.14, 0.08, pole);
  for (let i = 0; i < cols; i++) {
    box(sx0 + i * cw, sy0 - 0.07, sz, cw, 0.07, 0.16, roof);
    box(sx0 + i * cw, sy0 + sh, sz, cw, 0.07, 0.16, roof);
  }
  box(sx0 - 0.07, sy0 - 0.07, sz, 0.07, sh + 0.14, 0.16, roof);
  box(sx0 + swd, sy0 - 0.07, sz, 0.07, sh + 0.14, 0.16, roof);
  const E = ["kkk", "k..", "kk.", "k..", "kkk"];
  const Ag = [".k.", "k.k", "kkk", "k.k", "k.k"];
  const T = ["kkk", ".k.", ".k.", ".k.", ".k."];
  const pad = ".".repeat(cols);
  const signRows = [pad];
  for (let r = 0; r < 5; r++) signRows.push("." + E[r] + "." + Ag[r] + "." + T[r] + ".");
  signRows.push(pad);
  mosaic(sx0, sy0 + sh, sz, 0.04, cw, cw, signRows, { ".": S, k: letter }, L ? "." : "");

  // ---- roof vent and flue
  box(kx1 - 0.6, H + 0.1, 1.75, 0.4, 0.3, 0.4, "#D8DEE3");
  cyl(kx1 - 0.4, H + 0.4, 1.95, 0.08, 0.3, pole);

  return { parts };
}
