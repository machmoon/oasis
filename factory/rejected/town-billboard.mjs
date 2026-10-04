// Town Billboard: a bold poster board on twin steel legs, with a catwalk and arm-hung lamps. Block asset: build(p)
// returns parts in metres on the Oasis Town grid (origin at the footprint's corner, y up, street side at z = 0).
export const meta = {
  title: "Town Billboard",
  kind: "3d",
  format: "blocks",
  kit: "Oasis Town",
  description: "A full-width 4 m billboard on twin steel legs with a catwalk and arm-hung lamps, tall enough for a lot or a rooftop; its bold artwork glows at night.",
  tags: ["3d", "low poly", "billboard", "sign", "advert", "street", "rooftop", "town", "kit"],
  price: 2,
  author: "oasis-factory",
  footprint: [4, 1],
  size: [1000, 1000],
};

export const params = {
  knobs: {
    panel: { type: "color", role: "primary", label: "Panel", default: "#3E7BFA" },
    accent: { type: "color", role: "highlight", label: "Accent", default: "#F2B33D" },
    frame: { type: "color", role: "ink", label: "Frame", default: "#2B3242" },
    height: { type: "range", label: "Clearance (m)", default: 3, min: 1.4, max: 5.6, step: 0.2 },
    board: { type: "range", label: "Board height (m)", default: 2.2, min: 1.6, max: 3, step: 0.2 },
    art: { type: "choice", label: "Artwork", default: "oasis", options: ["oasis", "arrow", "bars"] },
    lights: { type: "toggle", label: "Lights on", default: true },
  },
  presets: {
    Tram: { panel: "#2F7A55", accent: "#F7B8CF", frame: "#1F2A24" },
    Sunset: { panel: "#C8553D", accent: "#F6EEE0", frame: "#3D2C4A" },
    Blossom: { panel: "#F7B8CF", accent: "#2F7A55", frame: "#5B6270" },
  },
};

export function build(p) {
  const parts = [];
  const box = (x, y, z, w, h, d, c, e) =>
    parts.push({ t: "box", p: [x, y, z], s: [w, h, d], c, ...(e ? { e: true } : {}) });

  // ---- colour guards: only darken or gently tint within each role, never swap roles
  const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
  const hex = (a) => "#" + a.map((v) => Math.round(Math.max(0, Math.min(1, v)) * 255).toString(16).padStart(2, "0")).join("").toUpperCase();
  const lum = (h) => { const [r, g, b] = rgb(h); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
  const shade = (h, k) => hex(rgb(h).map((v) => v * k));
  const tint = (h, k) => hex(rgb(h).map((v) => v + (1 - v) * k));
  const INK = "#2B3242", WHITE = "#FBFBFB";

  const panel = p.panel, Lp = lum(panel);
  let frame = p.frame;
  if (lum(frame) > 0.32) frame = shade(frame, 0.3 / lum(frame));          // the frame stays a dark ink
  if (Math.abs(lum(frame) - Lp) < 0.12) frame = shade(frame, 0.5);

  let accent = p.accent;
  for (let i = 0; i < 2 && Math.abs(lum(accent) - Lp) < 0.18; i++)
    accent = Lp > 0.45 ? shade(accent, 0.55) : tint(accent, 0.45);         // same hue, more contrast
  const paper = Lp > 0.55 ? INK : WHITE;                                  // lettering always reads

  // ---- fixed materials
  const steel = "#5B6270", concrete = "#BFC3CA", lampBody = "#3A3F48", lit = "#FFD58A", lensOff = "#4A505B";
  const on = !!p.lights;

  // ---- dimensions: the board spans the whole 4 m footprint
  const W = 4, x0 = 0;
  const H = Math.min(5.6, Math.max(1.4, p.height));     // underside of the board
  const PH = Math.min(3, Math.max(1.6, p.board));
  const TOP = H + PH;
  const ZF = 0.45, ZB = 0.8, B = 0.14;                  // board faces, frame lip width
  const LZ = ZF - 0.08;                                 // lip front face

  // ---- legs: thicken and gain braces as they grow, set under the board's edges
  const LW = Math.min(0.34, Math.max(0.22, 0.16 + H * 0.03));
  const legZ = ZF + (ZB - ZF - LW) / 2;
  const legTop = H - 0.12;                              // carries the catwalk
  const legX = [x0 + 0.2, x0 + W - 0.2 - LW];
  for (const lx of legX) {
    box(lx - 0.12, 0, legZ - 0.12, LW + 0.24, 0.25, LW + 0.24, concrete);
    box(lx, 0.25, legZ, LW, legTop - 0.25, LW, steel);
  }
  const nb = H < 2.4 ? 1 : H < 4 ? 2 : 3;
  for (let k = 1; k <= nb; k++) {
    const by = 0.25 + ((legTop - 0.25) * k) / (nb + 1) - 0.07;
    box(legX[0] + LW, by, legZ + LW / 2 - 0.07, legX[1] - legX[0] - LW, 0.14, 0.14, steel);
  }

  // ---- catwalk exactly as wide as the board, accent kick-plate on its street edge
  box(x0, legTop, 0.04, W, 0.12, ZB - 0.04, steel);
  box(x0, legTop, 0, W, 0.12, 0.04, accent);

  // ---- board: backing slab, raised frame lip, inset poster face
  box(x0, H, ZF, W, PH, ZB - ZF, frame);
  box(x0, H, LZ, W, B, 0.08, frame);
  box(x0, TOP - B, LZ, W, B, 0.08, frame);
  box(x0, H + B, LZ, B, PH - 2 * B, 0.08, frame);
  box(x0 + W - B, H + B, LZ, B, PH - 2 * B, 0.08, frame);
  const fx = x0 + B, fy = H + B, fw = W - 2 * B, fh = PH - 2 * B;
  box(fx, fy, ZF - 0.04, fw, fh, 0.04, panel);

  // ---- artwork, 0.03 proud of the poster; it glows in its own hue when lit
  const AZ = ZF - 0.07;
  const art = (x, y, w, h, c) => box(x, y, AZ, w, h, 0.03, c, on);
  if (p.art === "oasis") {
    const G = {
      O: ["111", "101", "101", "101", "111"],
      A: ["111", "101", "111", "101", "101"],
      S: ["111", "100", "111", "001", "111"],
      I: ["111", "010", "010", "010", "111"],
    };
    const word = "OASIS", cols = word.length * 4 - 1;
    const c = Math.min((fw * 0.86) / cols, (fh * 0.72) / 6.9);
    const tw = cols * c, tx = fx + (fw - tw) / 2, y0 = fy + (fh - 6.9 * c) / 2;
    art(tx, y0, tw, c, accent);                                            // underline band
    for (let li = 0; li < word.length; li++) {
      const g = G[word[li]], lx = tx + li * 4 * c;
      for (let r = 0; r < 5; r++) {
        const y = y0 + 1.9 * c + (4 - r) * c;
        let s = -1;
        for (let k = 0; k <= 3; k++) {
          const filled = k < 3 && g[r][k] === "1";
          if (filled && s < 0) s = k;
          if (!filled && s >= 0) { art(lx + s * c, y, (k - s) * c, c, paper); s = -1; }
        }
      }
    }
  } else if (p.art === "arrow") {
    art(fx + fw * 0.1, fy + fh * 0.06, fw * 0.8, fh * 0.06, paper);         // horizon
    const sw = fw * 0.14, cx = fx + fw / 2;
    art(cx - sw / 2, fy + fh * 0.12, sw, fh * 0.4, accent);                // shaft
    parts.push({ t: "gable", p: [cx - fw * 0.18, fy + fh * 0.52, AZ], s: [fw * 0.36, fh * 0.36, 0.03], c: accent, axis: "z", ...(on ? { e: true } : {}) });
  } else {
    art(fx + fw * 0.1, fy + fh * 0.1, fw * 0.8, fh * 0.06, paper);          // baseline
    for (let i = 0; i < 3; i++) art(fx + fw * (0.15 + i * 0.26), fy + fh * 0.16, fw * 0.18, fh * (0.3 + 0.2 * i), accent);
  }

  // ---- lamps: riser on the board top, arm cantilevered to the street, head hung clear above the frame
  for (let i = 0; i < 3; i++) {
    const lx = x0 + (W * (i + 0.5)) / 3;
    box(lx - 0.05, TOP, ZB - 0.2, 0.1, 0.5, 0.1, lampBody);                  // riser
    box(lx - 0.05, TOP + 0.4, 0.08, 0.1, 0.1, ZB - 0.2 - 0.08, lampBody);     // arm
    box(lx - 0.22, TOP + 0.18, 0.04, 0.44, 0.22, 0.28, lampBody);             // head
    box(lx - 0.18, TOP + 0.13, 0.06, 0.36, 0.05, 0.24, on ? lit : lensOff, on); // lens, aimed down at the art
  }

  return { parts };
}
