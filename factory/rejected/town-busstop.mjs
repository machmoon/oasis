// Town Bus Stop: a kerbside shelter with glazed back panes, a slatted bench, a timetable lightbox on its end wall,
// a choice of roofs and a bus-flag pole. Block asset: build(p) returns parts in metres on the Oasis Town grid
// (origin at the footprint corner, y up, street side at z = 0). Brand colours are clamped per role.
export const meta = {
  title: "Town Bus Stop",
  kind: "3d",
  format: "blocks",
  kit: "Oasis Town",
  description: "A kerbside bus shelter with glass panes, a wooden bench, a glowing timetable lightbox and a bus-flag pole that lines a town street.",
  tags: ["3d", "low poly", "bus stop", "shelter", "timetable", "street furniture", "transit", "town"],
  price: 2,
  author: "oasis-factory",
  footprint: [3, 2],
  size: [1000, 1000],
};

export const params = {
  knobs: {
    frame: { type: "color", role: "primary", label: "Frame", default: "#2F7A55" },
    roof: { type: "color", role: "secondary", label: "Roof", default: "#5B6270" },
    sign: { type: "color", role: "highlight", label: "Sign", default: "#3E7BFA" },
    length: { type: "range", label: "Shelter length (m)", default: 1.6, min: 1.2, max: 2.0, step: 0.1 },
    roofStyle: { type: "choice", label: "Roof", default: "solar", options: ["solar", "flat", "pitched"] },
    lights: { type: "toggle", label: "Lights", default: true },
  },
  presets: {
    Terracotta: { frame: "#5B6270", roof: "#C8553D", sign: "#F2B33D" },
    Blossom: { frame: "#8A4F68", roof: "#D8DEE3", sign: "#E5484D" },
    Harbour: { frame: "#3E7BFA", roof: "#5B6270", sign: "#F2B33D" },
  },
};

// ---- colour guards -------------------------------------------------------
function hexToHsl(hex) {
  let h = String(hex || "#000000").replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const n = parseInt(h.slice(0, 6), 16) || 0;
  const r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
  let hh = 0, s = 0;
  if (mx !== mn) {
    const d = mx - mn;
    s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
    if (mx === r) hh = (g - b) / d + (g < b ? 6 : 0);
    else if (mx === g) hh = (b - r) / d + 2;
    else hh = (r - g) / d + 4;
    hh /= 6;
  }
  return [hh, s, l];
}
function hslToHex(h, s, l) {
  const f = (t) => {
    t = (t + 1) % 1;
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  const to = (v) => Math.round(Math.max(0, Math.min(1, v)) * 255).toString(16).padStart(2, "0");
  return "#" + to(f(h + 1 / 3)) + to(f(h)) + to(f(h - 1 / 3));
}
function clampColor(hex, lMin, lMax, sMax) {
  const [h, s, l] = hexToHsl(hex);
  return hslToHex(h, Math.min(s, sMax), Math.max(lMin, Math.min(lMax, l)));
}
function shade(hex, dl) {
  const [h, s, l] = hexToHsl(hex);
  return hslToHex(h, s, Math.max(0.1, Math.min(0.85, l + dl)));
}
function tint(hex, s, l) {
  const [h] = hexToHsl(hex);
  return hslToHex(h, s, l);
}
function lum(hex) {
  const n = parseInt(hex.replace("#", ""), 16);
  return (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
}

export function build(p) {
  const parts = [];
  const box = (x, y, z, w, h, d, c, e) =>
    parts.push({ t: "box", p: [x, y, z], s: [w, h, d], c, ...(e ? { e: true } : {}) });

  // brand roles: muted mid tones so any palette keeps depth; roof is a near-neutral tint
  const frame = clampColor(p.frame, 0.24, 0.44, 0.5);
  const frameDark = shade(frame, -0.1);
  const roof = clampColor(p.roof, 0.38, 0.6, 0.2);
  const roofCap = shade(roof, 0.07);
  const sign = clampColor(p.sign, 0.36, 0.56, 0.8);
  const icon = lum(sign) < 0.6 ? "#FFFFFF" : "#2B3242";

  // fixed materials (role-less)
  const glass = "#A9BED0", glint = "#E6EEF4", wood = "#8A6E52", kerbEdge = "#BFC3CA";
  const paveA = "#D9DCE1", paveB = "#E2E5E9", metal = "#8C929C", ink = "#5B6270";
  const lit = "#FFD58A", solar = "#2B3242", cellLine = "#7E93A8";
  const on = !!p.lights;
  const sheet = on ? tint(sign, 0.7, 0.9) : "#E4E7EB";   // timetable sheet: brand-tinted glow when lit

  const L = Math.max(1.2, Math.min(2.0, p.length));
  const x0 = 0.12, G = 0.12, T = 0.1;
  const zF = 0.5, zB = 1.68, topY = 2.42;
  const xR = x0 + L - T;

  // pavement: kerbstones on the street edge, chequered slabs behind (fixed 3 x 2 base)
  for (let i = 0; i < 6; i++) box(i * 0.5, 0, 0, 0.5, G, 0.2, kerbEdge);
  for (let j = 0; j < 4; j++)
    for (let i = 0; i < 6; i++) box(i * 0.5, 0, 0.2 + j * 0.45, 0.5, G, 0.45, (i + j) % 2 ? paveB : paveA);

  // posts with darker base shoes
  for (const px of [x0, xR])
    for (const pz of [zF, zB]) {
      box(px - 0.02, G, pz - 0.02, T + 0.04, 0.18, T + 0.04, frameDark);
      box(px, G + 0.18, pz, T, topY - G - 0.18, T, frame);
    }
  // rails: back and sides under the roof, plus a deep front beam that carries the canopy light
  box(x0 + T, topY - 0.1, zB, L - 2 * T, 0.1, T, frame);
  for (const px of [x0, xR]) box(px, topY - 0.1, zF + T, T, 0.1, zB - zF - T, frame);
  box(x0, topY - 0.24, zF - 0.03, L, 0.24, T + 0.03, frame);
  box(x0 + 0.18, topY - 0.17, zF - 0.05, L - 0.36, 0.09, 0.02, on ? lit : frameDark, on);

  // back glazing: 2 or 3 panes split by mullions, each with two straight vertical glints
  const gx0 = x0 + T, gw = L - 2 * T, gy = G + 0.13, gh = topY - 0.1 - gy;
  box(gx0, G, zB + 0.01, gw, 0.13, 0.06, frameDark);
  const panes = L >= 1.7 ? 3 : 2, mw = 0.06;
  const pw = (gw - (panes - 1) * mw) / panes;
  for (let i = 0; i < panes; i++) {
    const ax = gx0 + i * (pw + mw);
    box(ax, gy, 1.7, pw, gh, 0.04, glass);
    box(ax + pw * 0.62, 1.3, 1.68, Math.min(0.08, pw * 0.14), 0.85, 0.02, glint);
    box(ax + pw * 0.8, 1.45, 1.68, Math.min(0.03, pw * 0.06), 0.7, 0.02, glint);
    if (i < panes - 1) box(ax + pw, gy, 1.69, mw, gh, 0.06, frame);
  }

  // right-end wind screen with a straight glint
  const sz0 = zF + 0.45, sd = zB - sz0;
  box(xR, G, sz0, T, 0.13, sd - 0.02, frameDark);
  box(xR + 0.03, gy, sz0, 0.04, gh, sd, glass);
  box(xR + 0.01, 1.3, sz0 + sd * 0.55, 0.02, 0.85, 0.07, glint);

  // left end: solid wall carrying a framed timetable lightbox; every inset derived from the wall
  const lz0 = zF + T, ld = zB - lz0, wy0 = G, wy1 = topY - 0.1, B = 0.1;
  box(x0 - 0.01, wy0, lz0, 0.12, wy1 - wy0, ld, frame);
  const shY0 = wy0 + 0.3, shY1 = wy1 - B, shZ = lz0 + B, shD = ld - 2 * B;
  box(x0 - 0.03, shY0, shZ, 0.02, shY1 - shY0, shD, sheet, on);
  box(x0 - 0.05, shY1 - 0.24, shZ, 0.02, 0.24, shD, sign);                  // header band
  box(x0 - 0.07, shY1 - 0.17, shZ + 0.1, 0.02, 0.1, 0.22, icon);            // header mark
  const rows = 7, rowGap = (shY1 - 0.34 - shY0 - 0.12) / (rows - 1);
  for (let r = 0; r < rows; r++) {
    const y = shY0 + 0.12 + r * rowGap;
    box(x0 - 0.05, y, shZ + 0.08, 0.02, 0.05, 0.14, ink);                   // time
    box(x0 - 0.05, y, shZ + 0.3, 0.02, 0.05, Math.min(shD - 0.38, 0.3 + ((r * 5) % 3) * 0.1), ink); // stop
  }

  // bench: frame legs, wooden seat, two slats on back struts, armrest divider on long benches
  const bx = x0 + 0.3, bw = L - 0.55;
  const legs = [bx + 0.05, bx + bw - 0.11];
  for (const lx of legs) box(lx, G, 1.24, 0.06, 0.39 - G, 0.36, frameDark);
  box(bx, 0.39, 1.2, bw, 0.06, 0.46, wood);
  for (const lx of legs) box(lx, 0.45, 1.6, 0.06, 0.42, 0.06, frameDark);
  box(bx, 0.55, 1.54, bw, 0.12, 0.06, wood);
  box(bx, 0.73, 1.54, bw, 0.1, 0.06, wood);
  if (L >= 1.7) box(bx + bw / 2 - 0.03, 0.45, 1.24, 0.06, 0.2, 0.3, frameDark);

  // roof: slab sits on the rails; every style stays below the pole lamp so the bounds never change
  const rx = x0 - 0.1, rw = L + 0.2, rz = 0.36, rd = 1.56;
  if (p.roofStyle === "pitched") {
    box(rx, topY, rz, rw, 0.08, rd, roof);
    parts.push({ t: "gable", p: [rx, topY + 0.08, rz], s: [rw, 0.36, rd], c: roof, axis: "x" });
    box(rx, topY + 0.38, rz + rd / 2 - 0.06, rw, 0.07, 0.12, frameDark);   // ridge cap
  } else {
    box(rx, topY, rz, rw, 0.14, rd, roof);
    box(rx + 0.12, topY + 0.14, rz + 0.12, rw - 0.24, 0.05, rd - 0.24, roofCap);
    if (p.roofStyle === "solar") {
      const sw = Math.min(1.3, rw - 0.6), sdp = 0.9, sx = rx + (rw - sw) / 2, szz = rz + (rd - sdp) / 2, sy = topY + 0.19;
      box(sx - 0.04, sy, szz - 0.04, sw + 0.08, 0.04, sdp + 0.08, metal);
      box(sx, sy + 0.04, szz, sw, 0.04, sdp, solar);
      const cells = Math.max(2, Math.round(sw / 0.4));
      for (let i = 1; i < cells; i++) box(sx + (sw * i) / cells - 0.012, sy + 0.08, szz, 0.025, 0.02, sdp, cellLine);
      box(sx, sy + 0.08, szz + sdp / 2 - 0.012, sw, 0.02, 0.025, cellLine);
    } else {
      for (let i = 0; i < 3; i++) box(rx + 0.12, topY + 0.19, rz + 0.3 + i * 0.4, rw - 0.24, 0.04, 0.08, roof);
    }
  }

  // bus-flag pole on the pavement, fixed position, always clear of the roof (roof ends at x <= 2.22)
  const pcx = 2.74, pcz = 0.3, ph = 2.8;
  parts.push({ t: "cyl", p: [pcx, G, pcz], r: 0.05, h: ph, c: metal, n: 8 });
  const fy = 2.1, fz = pcz - 0.05 - 0.06, fw = 0.52;
  box(pcx - fw / 2, fy, fz, fw, 0.5, 0.06, sign);
  box(pcx - 0.19, fy + 0.15, fz - 0.02, 0.38, 0.22, 0.02, icon);           // bus body
  for (const wx of [-0.15, -0.045, 0.06]) box(pcx + wx, fy + 0.26, fz - 0.04, 0.09, 0.07, 0.02, sign); // windows
  for (const wx of [-0.14, 0.06]) box(pcx + wx, fy + 0.08, fz - 0.04, 0.08, 0.09, 0.02, icon);         // wheels
  box(pcx - 0.17, 1.1, fz, 0.34, 0.56, 0.06, frame);                       // timetable case
  box(pcx - 0.13, 1.14, fz - 0.02, 0.26, 0.46, 0.02, sheet, on);
  box(pcx - 0.13, 1.5, fz - 0.04, 0.26, 0.1, 0.02, sign);
  for (let r = 0; r < 4; r++) box(pcx - 0.1, 1.2 + r * 0.07, fz - 0.04, 0.2 - (r % 2) * 0.06, 0.03, 0.02, ink);
  parts.push({ t: "cyl", p: [pcx, G + ph, pcz], r: 0.09, h: 0.12, c: on ? lit : metal, n: 8, ...(on ? { e: true } : {}) });

  return { parts };
}
