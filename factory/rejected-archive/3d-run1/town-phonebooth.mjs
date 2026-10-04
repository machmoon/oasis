// Telephone Booth: a classic kiosk with gridded glazing, glowing crown signs in the header, an optional payphone
// glimpsed through the side glass and a small brass finial on a stepped or domed roof. Block asset: build(p) returns
// parts in metres on the Oasis Town grid (origin at the footprint's corner, y up, street side at z = 0).
// Brand paint is luminance-clamped so the frame always stays well below the glazing and the warm sign.
export const meta = {
  title: "Telephone Booth",
  kind: "3d",
  format: "blocks",
  kit: "Oasis Town",
  description: "A classic telephone booth with gridded glass, a payphone seen through the side and glowing crown signs in its header, sized to stand on any pavement corner.",
  tags: ["3d", "low poly", "phone booth", "telephone", "kiosk", "street furniture", "town", "kit"],
  price: 2,
  author: "oasis-factory",
  footprint: [1, 1],
  size: [800, 1000],
};

export const params = {
  knobs: {
    body: { type: "color", role: "primary", label: "Booth paint", default: "#E5484D" },
    crown: { type: "color", role: "highlight", label: "Sign crown", default: "#C8553D" },
    height: { type: "range", label: "Height (m)", default: 2.5, min: 2.4, max: 2.8, step: 0.1 },
    panes: { type: "range", label: "Pane rows", default: 7, min: 3, max: 8, step: 1 },
    roof: { type: "choice", label: "Roof", default: "stepped", options: ["stepped", "dome"] },
    phone: { type: "toggle", label: "Payphone inside", default: true },
    lights: { type: "toggle", label: "Lit at night", default: true },
  },
  presets: {
    "Racing Green": { body: "#2F7A55", crown: "#2F7A55" },
    "Navy Blue": { body: "#2B3A67", crown: "#3E7BFA" },
    "Sky Blue": { body: "#3E7BFA", crown: "#5B6270" },
  },
};

// ---------- colour helpers ----------
function toHsl(hex) {
  const n = parseInt(String(hex).replace("#", "").slice(0, 6), 16) || 0;
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
function toHex(h, s, l) {
  const f = (t) => {
    t = (t + 1) % 1;
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s, pp = 2 * l - q;
    if (t < 1 / 6) return pp + (q - pp) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return pp + (q - pp) * (2 / 3 - t) * 6;
    return pp;
  };
  const c = (v) => Math.round(Math.max(0, Math.min(1, v)) * 255).toString(16).padStart(2, "0");
  return "#" + c(f(h + 1 / 3)) + c(f(h)) + c(f(h - 1 / 3));
}
function lum(hex) {
  const n = parseInt(String(hex).replace("#", "").slice(0, 6), 16) || 0;
  const lin = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  return 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255);
}
// keep hue, cap saturation, and solve lightness so relative luminance lands in [lo, hi] (times mul)
function fit(hex, lo, hi, mul, smax) {
  const [h, s0] = toHsl(hex);
  const s = Math.min(s0, smax || 0.85);
  const target = Math.max(lo, Math.min(hi, lum(hex))) * (mul || 1);
  let a = 0, b = 1;
  for (let i = 0; i < 22; i++) {
    const m = (a + b) / 2;
    if (lum(toHex(h, s, m)) < target) a = m; else b = m;
  }
  return toHex(h, s, (a + b) / 2);
}

export function build(p) {
  const parts = [];
  const box = (x, y, z, w, h, d, c, e) => parts.push({ t: "box", p: [x, y, z], s: [w, h, d], c, ...(e ? { e: true } : {}) });
  const cyl = (y, r, h, c, n) => parts.push({ t: "cyl", p: [0.5, y, 0.5], r, h, c, n });

  const lit = !!p.lights;
  // brand paint: frame always far darker than glass and sign; dark step is a fixed ratio so tiers never merge
  const paint = fit(p.body, 0.07, 0.19, 1);
  const paintDark = fit(p.body, 0.07, 0.19, 0.55);
  const emblem = fit(p.crown, 0.03, 0.09, 1, 0.9); // crown glyph, always dark on the warm sign panel
  // fixed materials and state colours (never brand-tinted)
  const brass = "#F2B33D";
  const glass = lit ? "#FFD58A" : "#7E93A8";
  const signFace = lit ? "#FFD58A" : "#F6EEE0";
  const ink = "#2B3242", metal = "#5B6270", kerb = "#D9DCE1";

  // ---------- shared unit system ----------
  const B0 = 0.05, BW = 0.9;                // booth body extents inside the 1 m footprint
  const POST = 0.15;                        // chunky corner posts
  const G0 = B0 + 0.1;                      // glass plane, set back so posts stand proud
  const U0 = B0 + POST, U1 = 1 - B0 - POST; // glazing span along a face
  const SPAN = U1 - U0;
  const H = p.height;                       // top of the cap
  const SB = 0.34, CAP = 0.08;              // sign band and cap
  const yA = 0.38;                          // top of base
  const yB = H - SB - CAP;                  // top of glazing / bottom of sign band
  const GH = yB - yA;

  // detail on a face: inset = plane distance from footprint edge, t = thickness proud of that plane
  const face = (f, inset, u, y, w, h, t, c, e) => {
    if (f === 0) box(u, y, inset - t, w, h, t, c, e);              // front (-z), the door
    else if (f === 1) box(1 - u - w, y, 1 - inset, w, h, t, c, e); // back (+z)
    else if (f === 2) box(inset - t, y, 1 - u - w, t, h, w, c, e); // left (-x), the phone side
    else box(1 - inset, y, u, t, h, w, c, e);                      // right (+x)
  };
  // crown pictogram: band with three prongs, the centre one taller
  const crownGlyph = (f, inset, uc, y0, k, c, t) => {
    const bw = 0.26 * k, pw = 0.055 * k, bh = 0.05 * k;
    face(f, inset, uc - bw / 2, y0, bw, bh, t, c);
    face(f, inset, uc - bw / 2, y0 + bh, pw, 0.07 * k, t, c);
    face(f, inset, uc - pw / 2, y0 + bh, pw, 0.1 * k, t, c);
    face(f, inset, uc + bw / 2 - pw, y0 + bh, pw, 0.07 * k, t, c);
  };

  // ---------- plinth and base ----------
  box(0, 0, 0, 1, 0.08, 1, kerb);
  box(B0, 0.08, B0, BW, yA - 0.08, BW, paintDark);

  // ---------- glazed core and corner posts ----------
  box(G0, yA, G0, 1 - 2 * G0, GH, 1 - 2 * G0, glass, lit);
  for (const x of [B0, 1 - B0 - POST]) for (const z of [B0, 1 - B0 - POST]) box(x, yA, z, POST, GH, POST, paint);

  // ---------- glazing grid: rails, rows, two mullions -> three columns ----------
  const rows = Math.round(p.panes);
  const bar = 0.035, t = 0.04, rail = 0.07;
  const inner = GH - 2 * rail;
  const rowY = (k) => yA + rail + (inner * k) / rows; // boundary k (0 = top of bottom rail)
  for (let f = 0; f < 4; f++) {
    face(f, G0, U0, yA, SPAN, rail, t, paint);
    face(f, G0, U0, yB - rail, SPAN, rail, t, paint);
    for (let k = 1; k < rows; k++) face(f, G0, U0, rowY(k) - bar / 2, SPAN, bar, t, paint);
    for (let j = 1; j < 3; j++) face(f, G0, U0 + (SPAN * j) / 3 - bar / 2, yA, bar, GH, t, paint);
  }

  // ---------- payphone seen through the side glass, fitted inside one pane so it never crosses a bar ----------
  if (p.phone) {
    let k = 0;
    while (k < rows - 1 && rowY(k + 1) < 1.3) k++;
    const cy0 = rowY(k) + (k === 0 ? 0 : bar / 2), cy1 = rowY(k + 1) - (k === rows - 1 ? 0 : bar / 2);
    const cu0 = U0 + SPAN / 3 + bar / 2, cu1 = U0 + (2 * SPAN) / 3 - bar / 2;
    const m = 0.018, ph = Math.min(0.34, cy1 - cy0 - 2 * m), py = (cy0 + cy1) / 2 - ph / 2;
    face(2, G0, cu0 + m, py, cu1 - cu0 - 2 * m, ph, 0.012, ink);                    // phone body
    face(2, G0 - 0.012, cu0 + m + 0.02, py + ph - 0.07, cu1 - cu0 - 2 * m - 0.04, 0.045, 0.012, metal); // handset
  }

  // door handle on the street face, proud of the bars beside the right post
  box(U1 - 0.07, 0.95, G0 - 0.07, 0.035, 0.28, 0.07, metal);

  // ---------- header: big warm sign panels with a crown on every face ----------
  box(B0, yB, B0, BW, SB, BW, paint);
  for (let f = 0; f < 4; f++) {
    face(f, B0, 0.16, yB + 0.05, 0.68, 0.24, 0.03, signFace, lit);
    crownGlyph(f, B0 - 0.03, 0.5, yB + 0.075, 1.1, emblem, 0.02);
  }
  box(0, yB + SB, 0, 1, CAP, 1, paintDark); // overhanging cap, top = H

  // ---------- roof: both options are concentric about the booth centre ----------
  let yf;
  if (p.roof === "dome") {
    box(0.08, H, 0.08, 0.84, 0.07, 0.84, paint);
    cyl(H + 0.07, 0.4, 0.08, paintDark, 12);
    cyl(H + 0.15, 0.32, 0.07, paint, 12);
    cyl(H + 0.22, 0.21, 0.06, paintDark, 12);
    yf = H + 0.28;
  } else {
    box(0.08, H, 0.08, 0.84, 0.1, 0.84, paint);
    box(0.18, H + 0.1, 0.18, 0.64, 0.1, 0.64, paintDark);
    box(0.29, H + 0.2, 0.29, 0.42, 0.08, 0.42, paint);
    yf = H + 0.28;
  }

  // small brass finial, centred and proportioned to the top tier
  cyl(yf, 0.075, 0.06, brass, 8);
  parts.push({ t: "cone", p: [0.5, yf + 0.06, 0.5], r: 0.055, h: 0.1, c: brass, n: 8 });

  return { parts };
}
