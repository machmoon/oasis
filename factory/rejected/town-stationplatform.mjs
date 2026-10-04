// Tram Stop Platform: a raised 6 x 3 m tram platform with a sheltered canopy, full-height glass side screens, a
// timber bench, a round station clock hung from the canopy edge and a "T" stop totem at the far end.
// Block asset: build(p) returns parts in metres on the Oasis Town grid (origin at the footprint's corner, y up,
// track/street side at z = 0).
// Layout: the canopy is centred and kept at least 1 m inside both platform ends at every length. Posts, screens,
// bench and clock are derived from the canopy. The totem has its own reserved cell at the front-right corner,
// clear of the canopy and glass at every knob value. Nothing rises above the canopy slab except the optional
// pitched roof.
export const meta = {
  title: "Tram Stop Platform",
  kind: "3d",
  format: "blocks",
  kit: "Oasis Town",
  description: "A little tram stop with a canopy, glass side screens, a bench, a round station clock and a T stop sign, sized to line the street edge of any town block.",
  tags: ["3d", "low poly", "tram", "station", "platform", "transit", "shelter", "town"],
  price: 3,
  author: "oasis-factory",
  footprint: [6, 3],
  size: [1000, 1000],
};

export const params = {
  knobs: {
    canopy: { type: "color", role: "primary", label: "Canopy", default: "#2F7A55" },
    sign: { type: "color", role: "highlight", label: "Sign", default: "#F2B33D" },
    frame: { type: "color", role: "ink", label: "Posts & frame", default: "#5B6270" },
    length: { type: "range", label: "Canopy length (m)", default: 4, min: 3, max: 4, step: 0.5 },
    roof: { type: "choice", label: "Canopy roof", default: "flat", options: ["flat", "pitched"] },
    lights: { type: "toggle", label: "Lights", default: true },
  },
  presets: {
    Harbour: { canopy: "#3E7BFA", sign: "#F6EEE0", frame: "#2B3242" },
    Terracotta: { canopy: "#C8553D", sign: "#F7B8CF", frame: "#4A3A2E" },
    Plum: { canopy: "#7D5BA6", sign: "#FFD166", frame: "#3D2C4A" },
  },
};

export function build(p) {
  const parts = [];
  const box = (x, y, z, w, h, d, c, e) =>
    parts.push({ t: "box", p: [x, y, z], s: [w, h, d], c, ...(e ? { e: true } : {}) });

  // ---- fixed materials (never brand-tinted)
  const KERB = "#D9DCE1", EDGE = "#FBFBFB", GLASS = "#7E93A8", WOOD = "#8A6E52";
  const LIT = "#FFD58A", OFF = "#4A505C";
  const CASE = "#2B3242", FACE = "#FBFBFB", INK = "#2B3242", RED = "#E5484D";
  const on = !!p.lights;

  // ---- colour guards in OKLCH: clamp lightness and chroma so any brand input stays calm and readable
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const toLin = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  const toSrgb = (v) => 255 * (v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055);
  const parse = (h) => {
    const n = parseInt(String(h).replace("#", ""), 16) || 0;
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };
  const hexOf = (c) => "#" + c.map((v) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, "0")).join("").toUpperCase();
  const lumOf = (c) => 0.2126 * toLin(c[0]) + 0.7152 * toLin(c[1]) + 0.0722 * toLin(c[2]);
  const toLch = (h) => {
    const [r, g, b] = parse(h).map(toLin);
    const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
    const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
    const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
    const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
    const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
    const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
    return [L, Math.hypot(A, B), Math.atan2(B, A)];
  };
  const fromLch = (L, C, H) => {
    const A = C * Math.cos(H), B = C * Math.sin(H);
    const l = Math.pow(L + 0.3963377774 * A + 0.2158037573 * B, 3);
    const m = Math.pow(L - 0.1055613458 * A - 0.0638541728 * B, 3);
    const s = Math.pow(L - 0.0894841775 * A - 1.291485548 * B, 3);
    return [
      4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
      -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
      -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
    ];
  };
  const guard = (h, Lmin, Lmax, cmaxAt) => {
    const [L, C, H] = toLch(h);
    const L2 = clamp(L, Lmin, Lmax);
    let C2 = Math.min(C, cmaxAt(L2));
    if (Math.abs(L2 - L) < 0.002 && Math.abs(C2 - C) < 0.002) return hexOf(parse(h));
    let lin = fromLch(L2, C2, H);
    for (let k = 0; k < 40 && lin.some((v) => v < -0.001 || v > 1.001); k++) { C2 *= 0.9; lin = fromLch(L2, C2, H); }
    return hexOf(lin.map((v) => toSrgb(clamp(v, 0, 1))));
  };
  // canopy: mid lightness, chroma tapering as it gets lighter (no neon roofs)
  const CANOPY = guard(p.canopy, 0.4, 0.7, (L) => (L <= 0.6 ? 0.17 : 0.17 - (L - 0.6) * 0.7));
  // sign: any lightness, bounded chroma
  const SIGN = guard(p.sign, 0.3, 0.93, () => 0.17);
  // frame: always a dark tone against the pale platform (multiply down, keeps hue)
  let fc = parse(p.frame);
  for (let k = 0; k < 40 && lumOf(fc) > 0.09; k++) fc = fc.map((v) => v * 0.86);
  const FRAME = hexOf(fc);

  // sign glyph: the lighter of board / letter is the one that glows, so the T always reads, day or night
  const signLight = lumOf(parse(SIGN)) > 0.3;
  const LETTER = signLight ? "#2B3242" : "#FBFBFB";
  const boardGlow = on && signLight, letterGlow = on && !signLight;

  // ---- dimensions
  const PH = 0.35;                                   // platform height
  const L = clamp(Math.round(p.length * 2) / 2, 3, 4);
  const x0 = (6 - L) / 2;                            // canopy start: >= 1 m inside each platform end
  const zF = 0.45, zB = 2.65;                        // canopy front / back edges
  const RY = 3.0, SLAB = 0.14;                       // canopy underside, slab thickness
  const zP = 2.2;                                    // back post line (posts 2.2 - 2.35)

  // ---- platform covering the full footprint: kerb lip, white safety line, paving
  box(0, 0, 0, 6, PH, 0.08, KERB);
  box(0, 0, 0.08, 6, PH, 0.16, EDGE);
  box(0, 0, 0.24, 6, PH, 2.76, KERB);

  // ---- shelter: two back posts at the canopy ends, full-height glass side screens up to the canopy
  for (const px of [x0 + 0.15, x0 + L - 0.3]) {
    box(px, PH, zP, 0.15, RY - PH, 0.15, FRAME);                       // post
    const sx = px + 0.055, gz = 1.4;
    box(sx - 0.02, PH, gz, 0.08, 0.07, zP - gz, FRAME);                // bottom rail
    box(sx, PH + 0.07, gz, 0.04, RY - PH - 0.14, zP - gz, GLASS);      // pane
    box(sx - 0.02, RY - 0.07, gz, 0.08, 0.07, zP - gz, FRAME);         // top rail (meets canopy)
    box(sx - 0.02, PH, gz - 0.06, 0.08, RY - PH, 0.06, FRAME);         // front stile (meets canopy)
  }

  // ---- canopy: one brand-coloured slab, dark front fascia flush with its top, lit band on the fascia
  box(x0, RY, zF, L, SLAB, zB - zF, CANOPY);
  box(x0, RY - 0.08, zF - 0.06, L, SLAB + 0.08, 0.06, FRAME);          // fascia
  box(x0 + 0.2, RY - 0.03, zF - 0.09, L - 0.4, 0.1, 0.03, on ? LIT : OFF, on); // light band
  if (p.roof === "pitched") {
    parts.push({ t: "gable", p: [x0, RY + SLAB, zF], s: [L, 0.6, zB - zF], c: CANOPY, axis: "x" });
  }

  // ---- bench facing the track under the canopy front, centred, clear of the screens
  const bl = Math.min(2.0, L - 1.2), bx = 3 - bl / 2;
  for (const lx of [bx + 0.06, bx + bl - 0.14]) {
    box(lx, PH, 0.8, 0.08, 0.42, 0.07, FRAME);                         // front leg
    box(lx, PH, 1.13, 0.08, 0.86, 0.07, FRAME);                        // back leg / upright
  }
  box(bx, PH + 0.42, 0.76, bl, 0.07, 0.42, WOOD);                      // seat
  box(bx, PH + 0.58, 1.07, bl, 0.12, 0.06, WOOD);                      // back slat
  box(bx, PH + 0.76, 1.07, bl, 0.12, 0.06, WOOD);                      // back slat

  // ---- round station clock hung from the canopy front, centred over the bench
  // round plates are built from overlapping same-colour rectangles (15-75 degrees), reading as a disc
  const disc = (cx, cy, z, r, d, c, e) => {
    for (const deg of [15, 30, 45, 60, 75]) {
      const a = (deg * Math.PI) / 180, w = r * Math.cos(a), h = r * Math.sin(a);
      box(cx - w, cy - h, z, 2 * w, 2 * h, d, c, e);
    }
  };
  const ccx = 3, R = 0.42, ccy = RY - 0.22 - R;                        // case top 0.22 m under the canopy
  const zc = 0.36;                                                     // case front plane
  box(ccx - 0.04, ccy + R - 0.02, 0.46, 0.08, RY - (ccy + R) + 0.02, 0.08, FRAME); // hanger into slab
  disc(ccx, ccy, zc, R, 0.18, CASE);                                   // dark round case
  disc(ccx, ccy, zc - 0.03, 0.35, 0.03, FACE, on);                     // white dial (glows at night)
  const zt = zc - 0.05, zh = zc - 0.07, zhub = zc - 0.09;
  for (let k = 0; k < 12; k++) {                                       // 12 hour marks
    const a = (k * Math.PI) / 6, card = k % 3 === 0;
    const rt = card ? 0.255 : 0.27;
    const w = card ? (k % 6 === 0 ? 0.05 : 0.1) : 0.045;
    const h = card ? (k % 6 === 0 ? 0.1 : 0.05) : 0.045;
    box(ccx + rt * Math.sin(a) - w / 2, ccy + rt * Math.cos(a) - h / 2, zt, w, h, 0.02, INK);
  }
  box(ccx - 0.025, ccy, zh, 0.05, 0.25, 0.02, INK);                    // minute hand -> 12
  box(ccx, ccy - 0.035, zh, 0.17, 0.07, 0.02, INK);                    // hour hand -> 3
  box(ccx - 0.0125, ccy - 0.25, zh, 0.025, 0.215, 0.02, RED);          // red seconds hand -> 6
  box(ccx - 0.045, ccy - 0.045, zhub, 0.09, 0.09, 0.02, RED);          // hub

  // ---- stop totem in its own cell at the front-right corner (x 4.95 - 5.85), clear of canopy and glass
  const tw = 0.8, tcx = 5.4, tx = tcx - tw / 2, ty = 1.8;
  box(tcx - 0.05, PH, 0.22, 0.1, ty + tw + 0.05 - PH, 0.1, FRAME);     // pole, ends at plate top
  box(tx - 0.05, ty - 0.05, 0.18, tw + 0.1, tw + 0.1, 0.04, FRAME);    // backing plate
  box(tx, ty, 0.14, tw, tw, 0.04, SIGN, boardGlow);                    // board
  box(tx + 0.12, ty + 0.54, 0.11, 0.56, 0.14, 0.03, LETTER, letterGlow); // T bar
  box(tx + 0.32, ty + 0.12, 0.11, 0.16, 0.42, 0.03, LETTER, letterGlow); // T stem

  return { parts };
}
