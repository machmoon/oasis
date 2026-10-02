// Town Billboard: a bold advertising board on steel legs, with a hung service catwalk and flood lamps on arms.
// Block asset: build(p) returns parts in metres on the Oasis Town grid. The origin is the footprint's corner,
// y is up and the street side is at z = 0. Every part stays inside the 4 x 1 m footprint.
export const meta = {
  title: "Town Billboard",
  kind: "3d",
  format: "blocks",
  kit: "Oasis Town",
  description: "A chunky roadside billboard on a kerb pad, with steel legs, a hung catwalk and arm-mounted flood lamps. It fills a 4 x 1 m strip behind the pavement or beside the town shop.",
  tags: ["3d", "low poly", "billboard", "sign", "advert", "street", "town", "kit"],
  price: 3,
  author: "oasis-factory",
  footprint: [4, 1],
  size: [1000, 1000],
};

export const params = {
  knobs: {
    panel: { type: "color", role: "primary", label: "Panel", default: "#3E7BFA" },
    accent: { type: "color", role: "highlight", label: "Accent", default: "#F2B33D" },
    frame: { type: "color", role: "ink", label: "Frame & legs", default: "#5B6270" },
    height: { type: "range", label: "Clearance (m)", default: 2.8, min: 2.4, max: 4.0, step: 0.4 },
    design: { type: "choice", label: "Artwork", default: "tram", options: ["tram", "cafe", "hills", "sale"] },
    legs: { type: "choice", label: "Support", default: "twin", options: ["twin", "pole"] },
    lights: { type: "toggle", label: "Flood lamps", default: true },
  },
  presets: {
    Tram: { panel: "#2F7A55", accent: "#F7B8CF", frame: "#3B4A44" },
    Brick: { panel: "#C8553D", accent: "#F6EEE0", frame: "#4A4F5C" },
    Plum: { panel: "#7D5BA6", accent: "#FFD58A", frame: "#3D2C4A" },
  },
};

// ---- colour helpers: brand colours keep their hue, while lightness and saturation are clamped for contrast
function hexToRgb(hex) {
  const n = parseInt(String(hex).replace("#", "").padEnd(6, "0").slice(0, 6), 16) || 0;
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}
function hexToHsl(hex) {
  const [r, g, b] = hexToRgb(hex);
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
  const c = (v) => Math.round(Math.min(1, Math.max(0, v)) * 255).toString(16).padStart(2, "0");
  return "#" + (s === 0 ? c(l) + c(l) + c(l) : c(f(h + 1 / 3)) + c(f(h)) + c(f(h - 1 / 3))).toUpperCase();
}
function lum(hex) {
  const lin = (v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
  const [r, g, b] = hexToRgb(hex);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}
function contrast(a, b) {
  const la = lum(a), lb = lum(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}
function mix(a, b, t) {
  const A = hexToRgb(a), B = hexToRgb(b);
  const c = (i) => Math.round((A[i] + (B[i] - A[i]) * t) * 255).toString(16).padStart(2, "0");
  return ("#" + c(0) + c(1) + c(2)).toUpperCase();
}
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

export function build(p) {
  const parts = [];
  const box = (x, y, z, w, h, d, c, e) => parts.push({ t: "box", p: [x, y, z], s: [w, h, d], c, ...(e ? { e: true } : {}) });
  const gable = (x, y, z, w, h, d, c) => parts.push({ t: "gable", p: [x, y, z], s: [w, h, d], c, axis: "z" });

  // ---- palette
  // Panel: a deep, calm field. Saturation is capped and the panel is darkened until its luminance sits low,
  // so lime or cyan brand inputs settle into rich greens or teals instead of neon.
  const [ph, ps, pl] = hexToHsl(p.panel);
  const pS = Math.min(ps, 0.7);
  let pL = clamp(pl, 0.3, 0.58);
  let panel = hslToHex(ph, pS, pL);
  while (lum(panel) > 0.19 && pL > 0.2) { pL -= 0.02; panel = hslToHex(ph, pS, pL); }
  // Accent: always clearly lighter than the panel, so artwork pops in every brand probe
  const [ah, as, al] = hexToHsl(p.accent);
  const aS = Math.min(as, pS > 0.55 ? 0.72 : 0.85);
  let aL = clamp(al, 0.58, 0.86);
  let accent = hslToHex(ah, aS, aL);
  while (contrast(accent, panel) < 3 && aL < 0.93) { aL += 0.02; accent = hslToHex(ah, aS, aL); }
  const outline = hslToHex(ph, Math.min(pS, 0.4), 0.14);    // dark keyline and the details on the accent shapes
  const text = lum(panel) < 0.3 ? "#FBFBFB" : "#2B3242";      // headline bars
  // Structure: always a dark steel against the pale ground
  const [fh, fs, fl] = hexToHsl(p.frame);
  const frameL = clamp(fl, 0.2, 0.34);
  const frame = hslToHex(fh, Math.min(fs, 0.32), frameL);
  const deck = hslToHex(fh, Math.min(fs, 0.2), frameL + 0.26);   // catwalk grating: a tint of the frame
  const kerb = "#D9DCE1", footing = "#C9CED6";
  const lit = "#FFD58A", glass = "#7E93A8";

  // ---- one vertical stack, all measured from H:
  // pad 0..0.06 | footings ..0.21 | legs ..H-0.1 | frame H-0.1..H+2.1 | lamp arms on top
  // The catwalk hangs 0.6 m below the panel and in front of the legs, so it never crosses the artwork.
  const H = p.height;
  const PH = 2.0;
  const FZ = 0.41;              // panel front face
  const CW = H - 0.6;           // catwalk deck top
  const BEAM = CW - 0.22;       // underside of the catwalk support beams
  const LZ = 0.48, LD = 0.2;    // legs sit under the frame (frame z 0.45..0.72), behind the panel face

  box(0, 0, 0, 4, 0.06, 1, kerb); // kerb pad marking the 4 x 1 footprint

  // a post built from short segments, so each piece sorts cleanly against the panel above it
  const post = (x, z, y0, y1) => {
    const n = Math.max(1, Math.ceil((y1 - y0) / 1.1)), seg = (y1 - y0) / n;
    for (let i = 0; i < n; i++) box(x, y0 + i * seg, z, 0.2, seg, LD, frame);
  };

  const bracketXs = [];
  if (p.legs === "pole") {
    box(1.6, 0.06, 0.3, 0.8, 0.15, 0.56, footing);
    parts.push({ t: "cyl", p: [2.0, 0.21, LZ + LD / 2], r: 0.14, h: H - 0.25 - 0.21, c: frame, n: 10 });
    box(0.9, H - 0.25, LZ, 2.2, 0.15, LD, frame);   // head beam under the frame
    box(0.5, BEAM, LZ, 3.0, 0.12, LD, frame);       // cross-arm through the pole that carries the catwalk
    box(1.86, BEAM - 0.3, LZ, 0.28, 0.3, LD, frame); // collar clamping the cross-arm to the pole
    bracketXs.push(0.6, 1.9, 3.2);
  } else {
    for (const lx of [0.8, 3.0]) {
      box(lx - 0.15, 0.06, 0.36, 0.5, 0.15, 0.44, footing);
      post(lx, LZ, 0.21, H - 0.1);
      bracketXs.push(lx);
    }
    const span = BEAM - 0.21;
    for (const f of [0.3, 0.75]) box(1.0, 0.21 + span * f, LZ + 0.04, 2.0, 0.12, 0.12, frame); // cross braces
  }

  // catwalk: brackets running forward from the structure, two stringers, a deck, a toe rail and end hangers
  for (const bx of bracketXs) box(bx, BEAM, 0.05, 0.2, 0.12, LZ - 0.05, frame);
  box(0.15, BEAM, 0.07, 3.7, 0.12, 0.1, frame);
  box(0.15, BEAM, 0.36, 3.7, 0.12, 0.1, frame);
  box(0.15, CW - 0.1, 0.05, 3.7, 0.1, LZ - 0.05, deck);
  box(0.15, CW, 0.05, 3.7, 0.12, 0.05, frame);
  for (const hx of [0.18, 3.74]) box(hx, CW, 0.42, 0.08, H - 0.1 - CW, 0.06, frame); // hangers up to the frame

  // ---- frame rim and panel face
  box(0.0, H - 0.1, 0.45, 4.0, PH + 0.2, 0.27, frame);
  box(0.1, H, FZ, 3.8, PH, 0.04, panel);

  // ---- artwork. Layers: keyline (FZ-0.02..FZ), accent (FZ-0.04..), detail (FZ-0.06..).
  // Safe zone: x 0.35..3.65, y H+0.28..H+1.5. The band above y H+1.52 belongs to the lamp wash.
  const sticker = (x, y, w, h) => {
    box(x - 0.07, y - 0.07, FZ - 0.02, w + 0.14, h + 0.14, 0.02, outline);
    box(x, y, FZ - 0.04, w, h, 0.02, accent);
  };
  const peak = (x, y, w, h) => {
    gable(x - 0.12, y - 0.07, FZ - 0.02, w + 0.24, h + 0.14, 0.02, outline);
    gable(x, y, FZ - 0.04, w, h, 0.02, accent);
  };
  const detail = (x, y, w, h) => box(x, y, FZ - 0.06, w, h, 0.02, outline);
  const ink = (x, y, w, h) => box(x, y, FZ - 0.04, w, h, 0.04, outline);
  const bar = (x, y, w, h) => box(x, y, FZ - 0.04, w, h, 0.04, text);
  const headline = () => {
    bar(2.15, H + 1.05, 1.45, 0.38);
    bar(2.15, H + 0.72, 1.0, 0.2);
    sticker(2.15, H + 0.34, 0.9, 0.26); // price or offer tag
  };

  if (p.design === "tram") {
    ink(0.38, H + 0.28, 1.54, 0.04);                       // rail
    for (const wx of [0.62, 1.44]) ink(wx, H + 0.32, 0.24, 0.14); // wheels
    sticker(0.45, H + 0.5, 1.4, 0.62);                     // car body
    for (const wx of [0.58, 0.99, 1.4]) detail(wx, H + 0.78, 0.3, 0.24); // windows
    detail(0.45, H + 0.62, 1.4, 0.05);                     // waist line
    ink(1.12, H + 1.12, 0.06, 0.28);                       // pantograph
    ink(0.9, H + 1.38, 0.5, 0.06);
    headline();
  } else if (p.design === "cafe") {
    sticker(0.45, H + 0.32, 1.3, 0.1);                     // saucer
    sticker(0.6, H + 0.44, 0.85, 0.6);                     // cup
    sticker(1.52, H + 0.58, 0.22, 0.32);                   // handle
    detail(1.58, H + 0.66, 0.1, 0.16);
    detail(0.6, H + 0.82, 0.85, 0.06);                     // cup band
    for (let i = 0; i < 3; i++) bar(0.78 + i * 0.2, H + 1.14 + (i % 2) * 0.06, 0.08, 0.26); // steam
    headline();
  } else if (p.design === "hills") {
    sticker(0.35, H + 0.3, 3.3, 0.18);                     // ground band
    peak(0.5, H + 0.55, 1.8, 0.85);
    peak(1.95, H + 0.55, 1.3, 0.55);
    sticker(3.05, H + 1.0, 0.36, 0.36);                    // sun
    bar(2.4, H + 1.06, 0.45, 0.12);
  } else {
    const hs = [0.4, 0.6, 0.85, 1.1];                       // rising sales chart
    hs.forEach((hh, i) => sticker(0.45 + i * 0.4, H + 0.32, 0.28, hh));
    headline();
  }

  // ---- flood lamps: arms reach over the frame top and hold hooded heads out in front of the panel
  const top = H + PH + 0.1;
  for (const lx of [0.7, 2.0, 3.3]) {
    box(lx - 0.05, top, 0.05, 0.1, 0.1, 0.67, frame);                                     // arm
    box(lx - 0.28, top - 0.26, 0.06, 0.56, 0.26, 0.26, frame);                            // head
    box(lx - 0.2, top - 0.22, 0.02, 0.4, 0.16, 0.04, p.lights ? lit : glass, p.lights);   // front lens
    box(lx - 0.22, top - 0.3, 0.1, 0.44, 0.04, 0.2, p.lights ? lit : glass, p.lights);    // down lens
  }
  // the light wash: stepped pools of warm light under each lamp, widening down the top band of the panel
  if (p.lights) {
    const rows = [[1.72, 0.28, 0.75, 0.6], [1.6, 0.12, 1.0, 0.4], [1.52, 0.08, 1.22, 0.22]];
    for (const lx of [0.7, 2.0, 3.3]) {
      for (const [y, h, w, t] of rows) {
        const x0 = Math.max(0.1, lx - w / 2), x1 = Math.min(3.9, lx + w / 2);
        box(x0, H + y, FZ - 0.012, x1 - x0, h, 0.012, mix(panel, lit, t), true);
      }
    }
  }

  return { parts };
}
