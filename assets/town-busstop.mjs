// Bus Stop: an open-ended glass shelter with a bench, a lit timetable case and a flag sign on a kerbside pole.
// build(p) returns parts in metres on the Oasis Town grid (origin at the footprint's corner, y up, street side at z = 0).
export const meta = {
  title: "Town Bus Stop",
  kind: "3d",
  format: "blocks",
  kit: "Oasis Town",
  description: "A kerbside bus shelter with a mullioned glass back, a wooden bench, a flag sign and lit timetable on a pole, and a litter bin, filling a 3x2 pavement edge of the town grid.",
  tags: ["3d", "low poly", "bus stop", "shelter", "street furniture", "transit", "town", "kit"],
  price: 2,
  author: "oasis-factory",
  footprint: [3, 2],
  size: [1000, 1000],
};

export const params = {
  knobs: {
    frame: { type: "color", role: "ink", label: "Frame", default: "#2F7A55" },
    roof: { type: "color", role: "primary", label: "Roof", default: "#5B6270" },
    sign: { type: "color", role: "highlight", label: "Sign", default: "#F2B33D" },
    roofShape: { type: "choice", label: "Roof", default: "lightbox", options: ["lightbox", "flat", "pitched"] },
    width: { type: "range", label: "Shelter length (m)", default: 1.8, min: 1.4, max: 2.2, step: 0.2 },
    pole: { type: "range", label: "Pole height (m)", default: 2.8, min: 2.4, max: 3.4, step: 0.2 },
    lights: { type: "toggle", label: "Lights", default: true },
  },
  presets: {
    Harbour: { frame: "#3E7BFA", roof: "#2B3242", sign: "#E5484D" },
    Blossom: { frame: "#5B6270", roof: "#C8553D", sign: "#F7B8CF" },
    Meadow: { frame: "#2B3242", roof: "#79B86A", sign: "#F2B33D" },
  },
};

export function build(p) {
  const parts = [];
  const box = (x, y, z, w, h, d, c, e) =>
    parts.push({ t: "box", p: [x, y, z], s: [w, h, d], c, ...(e ? { e: true } : {}) });

  // ---- colour helpers ----
  const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const hex = (a) => "#" + a.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("").toUpperCase();
  const lum = (h) => { const [r, g, b] = rgb(h); return (0.299 * r + 0.587 * g + 0.114 * b) / 255; };
  const mix = (a, b, t) => { const A = rgb(a), B = rgb(b); return hex(A.map((v, i) => v + (B[i] - v) * t)); };
  const shade = (h, amt) => (lum(h) < 0.4 ? mix(h, "#FFFFFF", amt) : mix(h, "#000000", amt));
  const clampDark = (h, max) => { let c = h; for (let i = 0; i < 24 && lum(c) > max; i++) c = mix(c, "#1E2430", 0.12); return c; };
  // structure and roof keep contrast against the pale pavement and sky
  const fc = clampDark(p.frame, 0.5);
  const rc = clampDark(p.roof, 0.62);
  const edge = shade(rc, 0.3);

  const GLASS = "#7E93A8", GLASS_HI = "#97ABBD", GLINT = "#D3DEE7", WOOD = "#8A6E52";
  const PAVE = "#D9DCE1", PAPER = "#F6EEE0", INK = "#2B3242", LIT = "#FFD58A";
  const on = !!p.lights;
  const icon = lum(p.sign) > 0.55 ? INK : "#FBFBFB";

  // ---- pavement pad with a kerb edge on the street side ----
  box(0, 0, 0, 3, 0.05, 2, PAVE);
  box(0, 0.05, 0, 3, 0.02, 0.14, "#C4C8CF");
  const G = 0.05;

  // ---- shelter frame: right end fixed beside the pole, length grows toward the open left end ----
  const W = p.width, PT = 0.08;
  const X1 = 2.35, X0 = X1 - W;
  const ZF = 0.55, ZB = 1.8, TOP = 2.35;
  for (const x of [X0, X1 - PT]) {
    box(x, G, ZF, PT, TOP - G, PT, fc);
    box(x, G, ZB - PT, PT, TOP - G, PT, fc);
  }
  box(X0, TOP - 0.1, ZF, W, 0.1, PT, fc);
  box(X0, TOP - 0.1, ZB - PT, W, 0.1, PT, fc);
  for (const x of [X0, X1 - PT]) box(x, TOP - 0.1, ZF, PT, 0.1, ZB - ZF, fc);

  // ---- glass back: two-tone sky reflection, mullions, transom and glints ----
  const GZ = ZB - 0.06, GY0 = G + 0.13, GTOP = TOP - 0.1, SPLIT = 1.25;
  const IX0 = X0 + PT, IW = W - 2 * PT;
  box(IX0, G, ZB - 0.07, IW, 0.13, 0.06, fc);
  box(IX0, GY0, GZ, IW, SPLIT - GY0, 0.04, GLASS);
  box(IX0, SPLIT, GZ, IW, GTOP - SPLIT, 0.04, GLASS_HI);
  box(IX0, SPLIT - 0.03, GZ - 0.03, IW, 0.06, 0.03, fc);                 // transom
  const panes = Math.max(2, Math.round(IW / 0.7)), pw = IW / panes;
  for (let i = 1; i < panes; i++) box(IX0 + i * pw - 0.025, GY0, GZ - 0.03, 0.05, GTOP - GY0, 0.03, fc);
  for (let i = 0; i < panes; i++) {
    const px = IX0 + i * pw;
    box(px + 0.12, 1.4, GZ - 0.02, 0.07, 0.62, 0.02, GLINT);
    box(px + 0.25, 1.55, GZ - 0.02, 0.035, 0.42, 0.02, GLINT);
  }

  // ---- glass end panel on the far (right) end only; the camera-side end stays open onto the bench ----
  const EZ0 = ZF + PT, ED = ZB - ZF - 2 * PT;
  box(X1 - PT, G, EZ0, PT, 0.13, ED, fc);
  box(X1 - 0.06, GY0, EZ0, 0.04, SPLIT - GY0, ED, GLASS);
  box(X1 - 0.06, SPLIT, EZ0, 0.04, GTOP - SPLIT, ED, GLASS_HI);
  box(X1 - 0.09, SPLIT - 0.03, EZ0, 0.03, 0.06, ED, fc);
  box(X1 - 0.08, 1.4, EZ0 + 0.2, 0.02, 0.62, 0.07, GLINT);
  box(X1 - 0.08, 1.55, EZ0 + 0.33, 0.02, 0.42, 0.035, GLINT);

  // ---- bench sized to the shelter, in full view through the open front and end ----
  const BX0 = X0 + PT + 0.12, BX1 = X1 - PT - 0.12, BL = BX1 - BX0;
  const legXs = [BX0 + 0.05, BX1 - 0.11];
  if (BL > 1.3) legXs.push(BX0 + BL / 2 - 0.03);
  for (const x of legXs) {
    box(x, G, 1.36, 0.06, 0.42 - G, 0.06, fc);
    box(x, G, 1.64, 0.06, 0.85 - G, 0.06, fc);
  }
  box(BX0, 0.42, 1.32, BL, 0.06, 0.38, WOOD);
  box(BX0, 0.58, 1.58, BL, 0.1, 0.06, WOOD);
  box(BX0, 0.74, 1.58, BL, 0.1, 0.06, WOOD);
  const seats = Math.max(2, Math.round(BL / 0.55));
  for (let i = 1; i < seats; i++) box(BX0 + (BL * i) / seats - 0.03, 0.48, 1.36, 0.06, 0.16, 0.22, fc);

  // ---- lamp hung under the roof behind the front beam, and the pool of light it throws ----
  box(X0 + 0.25, TOP - 0.25, ZF + PT, W - 0.5, 0.25, 0.14, on ? LIT : "#E3E1DA", on);
  box(X0 + 0.25, TOP - 0.28, ZF + PT + 0.02, W - 0.5, 0.03, 0.1, shade(fc, 0.15));
  if (on) box(X0 + 0.1, G, ZF + 0.1, W - 0.2, 0.012, 0.66, "#FBE9BF", true);

  // ---- roof: dark edge slab on every shape, then the profile ----
  const RX0 = X0 - 0.08, RW = W + 0.16, RZ0 = 0.43, RD = 1.49;
  box(RX0, TOP, RZ0, RW, 0.1, RD, edge);
  if (p.roofShape === "pitched") {
    parts.push({ t: "gable", p: [RX0, TOP + 0.1, RZ0], s: [RW, 0.34, RD], c: rc, axis: "x" });
  } else {
    box(RX0, TOP + 0.1, RZ0, RW, 0.1, RD, rc);
    if (p.roofShape === "lightbox") {
      // illuminated route header standing on the front edge of the roof
      const LX = RX0 + 0.12, LW = RW - 0.24, LY = TOP + 0.2, LH = 0.34, LZ = RZ0 + 0.04;
      box(LX - 0.03, LY, LZ - 0.01, LW + 0.06, 0.04, 0.3, edge);
      box(LX, LY + 0.04, LZ, LW, LH, 0.28, p.sign, on);
      box(LX + 0.1, LY + 0.1, LZ - 0.03, 0.24, 0.22, 0.03, icon);                 // route roundel
      box(LX + 0.16, LY + 0.16, LZ - 0.04, 0.12, 0.1, 0.01, p.sign);
      box(LX + 0.44, LY + 0.24, LZ - 0.03, Math.min(0.6, LW - 0.6), 0.07, 0.03, icon);
      box(LX + 0.44, LY + 0.12, LZ - 0.03, Math.min(0.38, LW - 0.6), 0.07, 0.03, icon);
    }
  }

  // ---- kerbside pole: flag sign up top, timetable case at eye level, both facing the approaching bus ----
  const PX = 2.8, PZ = 0.33, PH = p.pole;
  parts.push({ t: "cyl", p: [PX, G, PZ], r: 0.1, h: 0.1, c: shade(fc, 0.2), n: 8 });
  parts.push({ t: "cyl", p: [PX, G, PZ], r: 0.05, h: PH, c: fc, n: 8 });
  const FX = PX - 0.05; // pole's street-approach face
  // flag sign
  const SH = 0.6, SD = 0.55, SY = G + PH - 0.1 - SH, SZ = PZ - SD / 2;
  box(FX - 0.04, SY - 0.04, SZ - 0.04, 0.04, SH + 0.08, SD + 0.08, fc);
  box(FX - 0.07, SY, SZ, 0.03, SH, SD, p.sign, on);
  const IX = FX - 0.09;
  box(IX, SY + 0.2, PZ - 0.19, 0.02, 0.22, 0.38, icon);                                 // bus body
  for (const dz of [-0.15, -0.04, 0.07]) box(IX - 0.01, SY + 0.31, PZ + dz, 0.01, 0.08, 0.08, p.sign); // windows
  for (const dz of [-0.15, 0.06]) box(IX, SY + 0.12, PZ + dz, 0.02, 0.1, 0.09, icon);    // wheels
  box(IX, SY + 0.47, PZ - 0.19, 0.02, 0.07, 0.38, icon);                                // route bar
  // timetable case
  const TY = 0.9, TH = 0.72, TD = 0.44, TZ = PZ - TD / 2;
  box(FX - 0.05, TY, TZ, 0.05, TH, TD, fc);
  box(FX - 0.07, TY + 0.04, TZ + 0.04, 0.02, TH - 0.08, TD - 0.08, on ? "#FFF7E4" : PAPER, on);
  box(FX - 0.08, TY + TH - 0.18, TZ + 0.04, 0.01, 0.13, TD - 0.08, p.sign);
  for (let i = 0; i < 4; i++) {
    const y = TY + TH - 0.27 - i * 0.1;
    box(FX - 0.08, y, TZ + 0.08, 0.01, 0.045, [0.14, 0.1, 0.13, 0.08][i], INK);
    box(FX - 0.08, y, TZ + 0.24, 0.01, 0.045, [0.1, 0.13, 0.07, 0.12][i], INK);
  }
  // pole lamp, glowing in a lightened sign hue
  parts.push({ t: "cyl", p: [PX, G + PH, PZ], r: 0.12, h: 0.16, c: on ? mix(p.sign, "#FFFFFF", 0.5) : shade(p.sign, 0.25), n: 8, ...(on ? { e: true } : {}) });
  parts.push({ t: "cone", p: [PX, G + PH + 0.16, PZ], r: 0.14, h: 0.12, c: fc, n: 8 });

  // ---- litter bin at the open front-left corner, clear of the shelter at every length ----
  parts.push({ t: "cyl", p: [0.27, G, 0.32], r: 0.17, h: 0.78, c: fc, n: 8 });
  parts.push({ t: "cyl", p: [0.27, G + 0.78, 0.32], r: 0.18, h: 0.1, c: shade(fc, 0.22), n: 8 });

  return { parts };
}
