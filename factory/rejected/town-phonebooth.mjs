// Phone Booth: a classic telephone kiosk with gridded glazing, a crown-badged pediment and an illuminated
// header sign carrying a bold handset pictogram. Block asset: build(p) returns parts in metres on the Oasis
// Town grid (origin at the footprint's corner, y up, street side at z = 0, the door faces the street).
export const meta = {
  title: "Town Phone Booth",
  kind: "3d",
  format: "blocks",
  kit: "Oasis Town",
  description: "A red telephone booth with gridded glass, a stepped dome and a glowing crown sign with a telephone pictogram, sized for any kerb beside the town's shops.",
  tags: ["3d", "low poly", "phone booth", "telephone", "kiosk", "street furniture", "town", "kit"],
  price: 1,
  author: "oasis-factory",
  footprint: [1, 1],
  size: [1000, 1000],
};

export const params = {
  knobs: {
    body: { type: "color", role: "primary", label: "Booth paint", default: "#E5484D" },
    sign: { type: "color", role: "surface", label: "Sign panels", default: "#F6EEE0" },
    rows: { type: "range", label: "Pane rows", default: 4, min: 2, max: 8, step: 1 },
    roof: { type: "choice", label: "Crown", default: "dome", options: ["dome", "flat"] },
    lights: { type: "toggle", label: "Lit sign & panes", default: true },
  },
  presets: {
    Tram: { body: "#2F7A55", sign: "#F3E3C8" },
    Harbour: { body: "#3E7BFA", sign: "#F6EEE0" },
    Slate: { body: "#5B6270", sign: "#F7B8CF" },
  },
};

// ---- colour helpers -------------------------------------------------------------------------------------------
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
    t = (t % 1 + 1) % 1;
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s, pp = 2 * l - q;
    if (t < 1 / 6) return pp + (q - pp) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return pp + (q - pp) * (2 / 3 - t) * 6;
    return pp;
  };
  const to = (v) => Math.round(Math.min(1, Math.max(0, v)) * 255).toString(16).padStart(2, "0");
  return "#" + to(f(h + 1 / 3)) + to(f(h)) + to(f(h - 1 / 3));
}
function luminance(hex) {
  const n = parseInt(hex.slice(1), 16);
  const lin = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  return 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255);
}
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

// Telephone pictogram (row 0 at the top): handset over a desk base. Left-right symmetric, so it reads
// identically on every face from any camera, with nothing to mirror or split across a corner.
const ICON = [
  ".111111111.",
  "111.....111",
  "11.......11",
  "...11111...",
  "..1111111..",
];

export function build(p) {
  const parts = [];
  const box = (x, y, z, w, h, d, c, e) =>
    parts.push({ t: "box", p: [x, y, z], s: [w, h, d], c, ...(e ? { e: true } : {}) });
  const lit = !!p.lights;

  // ---- palette: keep the paint mid-to-dark (dark brands stay dark) so pale glass and signs always read ----
  const [bh, bs, bl] = hexToHsl(p.body);
  const bS = clamp(bs, 0, 0.8);
  let bL = clamp(bl, 0.18, 0.6);
  let body = hslToHex(bh, bS, bL);
  while (luminance(body) > 0.22 && bL > 0.18) { bL -= 0.02; body = hslToHex(bh, bS, bL); }
  const trim = hslToHex(bh, bS, bL < 0.3 ? bL + 0.1 : bL - 0.1);           // plinth, cornice, ledge
  const [sh, ss] = hexToHsl(p.sign);
  const signC = lit ? hslToHex(sh, clamp(ss, 0.15, 0.5), 0.88) : hslToHex(sh, clamp(ss, 0, 0.35), 0.8);
  const ink = "#2B3242", kerb = "#D9DCE1", metal = "#5B6270";
  const gilt = "#F2B33D";
  const giltC = lit ? "#FFD58A" : gilt;                                     // crown badge glows gold
  const glass = lit ? "#CFDCE8" : "#7E93A8";                                // glass brightens, stays blue-grey

  // ---- fixed proportions: a 0.9 m square booth, 2.5 m to the sign top (real K6 scale) ----
  const X0 = 0.05, X1 = 0.95, Z0 = 0.05, Z1 = 0.95, W = X1 - X0, cx = (X0 + X1) / 2;
  const IN = 0.04, POST = 0.11;
  const H = 2.5, BAND = 0.36, signY = H - BAND;
  const BASE = 0.04, PLINTH = 0.14, lowTop = 0.42, railH = 0.06;
  const gY0 = lowTop, gY1 = signY - railH, gh = gY1 - gY0;

  box(0, 0, 0, 1, BASE, 1, kerb);
  box(0.02, BASE, 0.02, 0.96, PLINTH - BASE, 0.96, trim);
  for (const [x, z] of [[X0, Z0], [X1 - POST, Z0], [X0, Z1 - POST], [X1 - POST, Z1 - POST]])
    box(x, PLINTH, z, POST, signY - PLINTH, POST, body);

  const c0 = X0 + IN, cw = W - 2 * IN;
  box(c0, PLINTH, c0, cw, lowTop - PLINTH, cw, body);       // kick panel
  box(c0, gY0, c0, cw, gh, cw, glass, lit);                  // glazing core
  box(c0, gY1, c0, cw, railH, cw, body);                     // top rail
  box(X0, signY, Z0, W, BAND, W, body);                      // sign band

  // rectangle on a face; u runs along the face, d = how far it stands proud of `plane`
  const onFace = (side, plane, u, y, w, h, d, c, e) => {
    if (side === "front") box(u, y, plane - d, w, h, d, c, e);
    else if (side === "back") box(u, y, plane, w, h, d, c, e);
    else if (side === "left") box(plane - d, y, u, d, h, w, c, e);
    else box(plane, y, u, d, h, w, c, e);
  };
  const sides = ["front", "back", "left", "right"];
  const outward = { front: -1, left: -1, back: 1, right: 1 };
  const glassPlane = { front: Z0 + IN, back: Z1 - IN, left: X0 + IN, right: X1 - IN };
  const outerPlane = { front: Z0, back: Z1, left: X0, right: X1 };
  const u0 = X0 + POST, u1 = X1 - POST, uw = u1 - u0;
  const BAR = 0.03, BD = 0.03;
  const rows = clamp(Math.round(p.rows), 2, 8), cols = 3;

  // sign panel and pictogram, sized as proportions of the band
  const pw = W - 0.1, ph = BAND * 0.78, pu = cx - pw / 2, py = signY + (BAND - ph) / 2;
  const iconRows = ICON.length, iconCols = ICON[0].length;
  const cellH = (ph * 0.74) / iconRows;
  const cellW = Math.min(cellH * 1.3, (pw * 0.7) / iconCols);
  const ix0 = cx - (iconCols * cellW) / 2, iy0 = py + (ph - iconRows * cellH) / 2;

  for (const s of sides) {
    const gp = glassPlane[s];
    for (let r = 1; r < rows; r++) onFace(s, gp, u0, gY0 + (gh * r) / rows - BAR / 2, uw, BAR, BD, body);
    for (let c = 1; c < cols; c++) onFace(s, gp, u0 + (uw * c) / cols - BAR / 2, gY0, BAR, gh, BD, body);

    // illuminated header panel with the handset pictogram in solid ink runs
    const op = outerPlane[s];
    onFace(s, op, pu, py, pw, ph, 0.02, signC, lit);
    const lp = op + outward[s] * 0.02;
    for (let r = 0; r < iconRows; r++) {
      const row = ICON[r];
      let i = 0;
      while (i < iconCols) {
        if (row[i] !== "1") { i++; continue; }
        let j = i;
        while (j < iconCols && row[j] === "1") j++;
        onFace(s, lp, ix0 + i * cellW, iy0 + (iconRows - 1 - r) * cellH, (j - i) * cellW, cellH, 0.015, ink);
        i = j;
      }
    }
  }

  // door on the street face: stiles and handle
  const fp = glassPlane.front;
  box(u0, gY0, fp - BD, 0.05, gh, BD, body);
  box(u1 - 0.05, gY0, fp - BD, 0.05, gh, BD, body);
  box(u1 - 0.045, 1.0, fp - BD - 0.025, 0.03, 0.3, 0.025, metal);

  // cornice, then a pediment tier carrying a crown badge on every face (present in both crown styles)
  box(X0 - 0.03, H, Z0 - 0.03, W + 0.06, 0.06, W + 0.06, trim);
  const pedY = H + 0.06, PED = 0.18, pi = 0.02;
  box(X0 + pi, pedY, Z0 + pi, W - 2 * pi, PED, W - 2 * pi, body);
  for (const s of sides) {
    const plane = outerPlane[s] - outward[s] * pi;
    const by = pedY + 0.03;
    onFace(s, plane, cx - 0.12, by, 0.24, 0.04, 0.025, giltC, lit);               // band
    onFace(s, plane, cx - 0.12, by + 0.04, 0.05, 0.06, 0.025, giltC, lit);        // left point
    onFace(s, plane, cx - 0.03, by + 0.04, 0.06, 0.09, 0.025, giltC, lit);        // centre point
    onFace(s, plane, cx + 0.07, by + 0.04, 0.05, 0.06, 0.025, giltC, lit);        // right point
  }
  const ledgeY = pedY + PED;
  box(X0 - 0.01, ledgeY, Z0 - 0.01, W + 0.02, 0.03, W + 0.02, trim);
  const capY = ledgeY + 0.03;

  if (p.roof === "dome") {
    // three clean concentric steps read as the shallow booth dome from above
    const steps = [[0.07, 0.08], [0.17, 0.07], [0.27, 0.05]];
    let y = capY;
    for (const [inset, h] of steps) {
      box(X0 + inset, y, Z0 + inset, W - 2 * inset, h, W - 2 * inset, body);
      y += h;
    }
    parts.push({ t: "cyl", p: [cx, y, cx], r: 0.04, h: 0.05, c: gilt, n: 8 });
    parts.push({ t: "cone", p: [cx, y + 0.05, cx], r: 0.045, h: 0.06, c: gilt, n: 8 });
  } else {
    // flat crown: a low slab and a tonal cap, no extra accent colour
    box(X0 + 0.05, capY, Z0 + 0.05, W - 0.1, 0.05, W - 0.1, body);
    box(X0 + 0.16, capY + 0.05, Z0 + 0.16, W - 0.32, 0.03, W - 0.32, trim);
  }

  return { parts };
}
