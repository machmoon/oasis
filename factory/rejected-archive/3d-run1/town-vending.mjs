// Vending Machines: a bank of slim street vending machines with glowing display windows and shelves of drinks
// art-directed from the machine colours. Block asset: build(p) returns parts in metres on the Oasis Town grid
// (origin at the footprint's corner, y up, street side at z = 0).
export const meta = {
  title: "Vending Machines",
  kind: "3d",
  format: "blocks",
  kit: "Oasis Town",
  description: "A bank of slim street vending machines with glowing display windows and shelves of colour-matched drinks, made to tuck against a shop wall or a tram stop.",
  tags: ["3d", "low poly", "vending machine", "drinks", "street furniture", "japan", "town", "kit"],
  price: 2,
  author: "oasis-factory",
  footprint: [2, 1],
  size: [1000, 1000],
};

export const params = {
  knobs: {
    bodyA: { type: "color", role: "primary", label: "Machine colour", default: "#E5484D" },
    bodyB: { type: "color", role: "secondary", label: "Second machine", default: "#3E7BFA" },
    trim: { type: "color", role: "ink", label: "Trim & panels", default: "#5B6270" },
    machines: { type: "range", label: "Machines", default: 2, min: 1, max: 3, step: 1 },
    rows: { type: "range", label: "Drink rows", default: 4, min: 3, max: 5, step: 1 },
    lights: { type: "toggle", label: "Lit fronts", default: true },
  },
  presets: {
    Tram: { bodyA: "#2F7A55", bodyB: "#F2B33D", trim: "#3B4A44" },
    Blossom: { bodyA: "#F7B8CF", bodyB: "#7D5BA6", trim: "#3D2C4A" },
    Harbour: { bodyA: "#F6EEE0", bodyB: "#3E7BFA", trim: "#2B3242" },
  },
};

// --- colour guards: brand colours land on paint only, with clamped lightness so faces keep their shading ---
function hexToHsl(hex) {
  const h = String(hex || "#888888").replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h.slice(0, 6), 16) || 0;
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
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s, pp = 2 * l - q;
    if (t < 1 / 6) return pp + (q - pp) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return pp + (q - pp) * (2 / 3 - t) * 6;
    return pp;
  };
  const c = (v) => Math.round(Math.max(0, Math.min(1, v)) * 255).toString(16).padStart(2, "0");
  return "#" + c(f(h + 1 / 3)) + c(f(h)) + c(f(h - 1 / 3));
}
function guard(hex, lMin, lMax, sMax, dl) {
  const [h, s, l] = hexToHsl(hex);
  const L = Math.max(lMin, Math.min(lMax, l)) + (dl || 0);
  return hslToHex(h, Math.min(s, sMax), Math.max(0.08, Math.min(0.92, L)));
}

export function build(p) {
  const parts = [];
  const box = (x, y, z, w, h, d, c, e) => {
    if (w > 0.001 && h > 0.001 && d > 0.001) parts.push({ t: "box", p: [x, y, z], s: [w, h, d], c, ...(e ? { e: true } : {}) });
  };

  const n = Math.max(1, Math.min(3, Math.round(p.machines)));
  const rows = Math.max(3, Math.min(5, Math.round(p.rows)));
  const lit = !!p.lights;

  // fixed unit system: machines 0.62 m wide, 1.9 m tall, 0.74 m deep, 0.02 m apart, bank centred on the lot
  const MW = 0.62, GAP = 0.02, MH = 1.9, MD = 0.74, zF = 0.22;
  const LOW = 0.72, WIN = 1.0, TOPW = LOW + WIN;
  const INS = 0.06, ww = MW - 2 * INS, COLS = 4, cw = ww / COLS;
  const pitch = WIN / rows, ch = pitch - 0.09;
  const BW = n * MW + (n - 1) * GAP;
  const x0 = (2 - BW) / 2, end = x0 + BW;
  const AZ0 = 0.04, AZ1 = zF - 0.02, AH = 0.05;

  // paint (brand-driven, lightness clamped)
  const bodyCols = [p.bodyA, p.bodyB].map((c) => guard(c, 0.42, 0.78, 0.8, 0));
  const shadeCols = [p.bodyA, p.bodyB].map((c) => guard(c, 0.42, 0.78, 0.8, -0.09));
  const lidCols = [p.bodyA, p.bodyB].map((c) => guard(c, 0.42, 0.78, 0.8, -0.16));
  const deepCols = [p.bodyA, p.bodyB].map((c) => guard(c, 0.28, 0.42, 0.85, 0));
  const midCols = [p.bodyA, p.bodyB].map((c) => guard(c, 0.46, 0.56, 0.85, 0));
  const trim = guard(p.trim, 0.14, 0.28, 0.45, 0);
  // fixed materials
  const dark = "#2B3242", glass = "#7E93A8", glow = "#FFD58A", white = "#FBFBFB", steel = "#D8DEE3", kerb = "#D9DCE1";
  const tile = lit ? glow : glass;

  // one apron slab, sized exactly to the visible bank
  const ax0 = Math.max(0, x0 - 0.05), ax1 = Math.min(2, end + 0.05);
  box(ax0, 0, AZ0, ax1 - ax0, AH, AZ1 - AZ0, kerb);

  for (let i = 0; i < n; i++) {
    const mx = x0 + i * (MW + GAP);
    const own = i % 2, other = (i + 1) % 2;
    const wx = mx + INS;
    // drinks art-directed from the machine colours: deep own, deep neighbour, mid own; white label bands
    const drinkSet = [deepCols[own], deepCols[other], midCols[own]];

    // light pool on the apron in front of this machine
    if (lit) box(mx + 0.06, AH, 0.06, MW - 0.12, 0.015, 0.12, glow, true);

    // cabinet: one solid body, a darker lower panel, a darker lid cap and a kick plate
    box(mx, 0, zF, MW, MH, MD, bodyCols[own]);
    box(mx + 0.03, 0.1, zF - 0.02, MW - 0.06, LOW - 0.14, 0.02, shadeCols[own]);
    box(mx - 0.01, MH, zF - 0.03, MW + 0.02, 0.07, MD + 0.03, lidCols[own]);
    box(mx, 0, zF - 0.02, MW, 0.08, 0.02, trim);

    // window frame: sills and full-height jambs
    box(mx + 0.03, LOW - 0.03, zF - 0.03, MW - 0.06, 0.03, 0.03, trim);
    box(mx + 0.03, TOPW, zF - 0.03, MW - 0.06, 0.03, 0.03, trim);
    box(mx + 0.03, LOW, zF - 0.03, 0.03, WIN, 0.03, trim);
    box(mx + MW - 0.06, LOW, zF - 0.03, 0.03, WIN, 0.03, trim);

    // display: per cell a lit tile, a shelf ledge and a drink with a label band
    for (let r = 0; r < rows; r++) {
      const sy = LOW + r * pitch;
      for (let k = 0; k < COLS; k++) {
        const cx = wx + cw * (k + 0.5);
        const ci = (k + r + i) % 3;
        const c = drinkSet[ci];
        box(wx + k * cw, sy + 0.03, zF - 0.02, cw, pitch - 0.03, 0.02, tile, lit);
        box(wx + k * cw, sy, zF - 0.11, cw, 0.03, 0.11, steel);
        const y0 = sy + 0.03;
        const bodyH = ch >= 0.2 ? ch - 0.05 : ch - 0.02;
        box(cx - 0.0425, y0, zF - 0.1, 0.085, bodyH, 0.08, c);
        box(cx - 0.0465, y0 + bodyH * 0.35, zF - 0.104, 0.093, Math.min(0.05, bodyH * 0.3), 0.084, white);
        if (ch >= 0.2) {
          box(cx - 0.022, y0 + bodyH, zF - 0.085, 0.044, 0.035, 0.045, c);
          box(cx - 0.028, y0 + bodyH + 0.035, zF - 0.09, 0.056, 0.015, 0.05, white);
        } else {
          box(cx - 0.035, y0 + bodyH, zF - 0.095, 0.07, 0.02, 0.065, steel);
        }
      }
    }

    // header light box with a logo chip in the neighbour's colour
    box(wx, TOPW + 0.05, zF - 0.03, ww, 0.1, 0.03, lit ? white : steel, lit);
    box(mx + MW / 2 - 0.05, TOPW + 0.07, zF - 0.05, 0.1, 0.06, 0.02, midCols[other]);

    // selection buttons, one under each drink column
    for (let k = 0; k < COLS; k++) {
      const cx = wx + cw * (k + 0.5);
      box(wx + k * cw, 0.58, zF - 0.03, cw, 0.08, 0.03, trim);
      box(cx - 0.03, 0.6, zF - 0.05, 0.06, 0.04, 0.02, lit ? glow : steel, lit);
    }

    // coin and note unit with a small display
    box(mx + MW - 0.19, 0.28, zF - 0.03, 0.13, 0.24, 0.03, trim);
    box(mx + MW - 0.145, 0.44, zF - 0.05, 0.04, 0.05, 0.02, dark);
    box(mx + MW - 0.17, 0.36, zF - 0.05, 0.08, 0.03, 0.02, lit ? glow : dark, lit);

    // pickup flap with lip
    box(wx, 0.12, zF - 0.03, 0.32, 0.18, 0.03, dark);
    box(wx, 0.3, zF - 0.05, 0.32, 0.03, 0.05, trim);
  }

  // left side of the bank: kick band and a backlit poster with a big can graphic
  const xs = x0 - 0.02;
  box(xs, 0, zF, 0.02, 0.08, MD, trim);
  const zA = zF + 0.14, zB = zF + MD - 0.14, yA = 0.8, yB = 1.64, B = 0.04;
  box(xs, yA, zA, 0.02, B, zB - zA, trim);
  box(xs, yB - B, zA, 0.02, B, zB - zA, trim);
  box(xs, yA + B, zA, 0.02, yB - yA - 2 * B, B, trim);
  box(xs, yA + B, zB - B, 0.02, yB - yA - 2 * B, B, trim);
  const iA = zA + B, iB = zB - B, jA = yA + B, jB = yB - B;
  const CW = 0.2, cz0 = (iA + iB) / 2 - CW / 2, cy0 = jA + 0.08, cy1 = jB - 0.08;
  const bg = lit ? white : steel;
  box(xs, jA, iA, 0.02, cy0 - jA, iB - iA, bg, lit);
  box(xs, cy1, iA, 0.02, jB - cy1, iB - iA, bg, lit);
  box(xs, cy0, iA, 0.02, cy1 - cy0, cz0 - iA, bg, lit);
  box(xs, cy0, cz0 + CW, 0.02, cy1 - cy0, iB - cz0 - CW, bg, lit);
  box(xs, cy0, cz0, 0.02, 0.04, CW, steel);
  box(xs, cy0 + 0.04, cz0, 0.02, cy1 - cy0 - 0.1, CW, midCols[n > 1 ? 1 : 0]);
  box(xs, cy1 - 0.06, cz0, 0.02, 0.06, CW, steel);
  const mid = (cy0 + 0.04 + cy1 - 0.06) / 2;
  box(xs - 0.02, mid - 0.05, cz0, 0.02, 0.1, CW, white);

  return { parts };
}
