// Town Shop: a corner shop with a striped awning, a shop window and floors of flats above. Block asset: build(p)
// returns parts in metres on the Oasis Town grid (origin at the footprint's corner, y up, street side at z = 0).
export const meta = {
  title: "Town Shop",
  kind: "3d",
  format: "blocks",
  kit: "Oasis Town",
  description: "A little corner shop with a striped awning and flats above. Floors, width, roof and every colour rebuild live.",
  tags: ["3d", "low poly", "building", "shop", "store", "town", "city", "kit", "block"],
  price: 4,
  author: "mika-blocks", payout: "mika-blocks@creators.oasis.example",
  footprint: [6, 6],
  size: [1000, 1000],
};

export const params = {
  knobs: {
    wall: { type: "color", role: "surface", label: "Walls", default: "#F3E3C8" },
    awning: { type: "color", role: "primary", label: "Awning", default: "#E5484D" },
    trim: { type: "color", role: "ink", label: "Trim & roof", default: "#5B6270" },
    sign: { type: "color", role: "highlight", label: "Sign", default: "#F2B33D" },
    floors: { type: "range", label: "Floors", default: 2, min: 1, max: 5, step: 1 },
    width: { type: "range", label: "Width (m)", default: 5, min: 3, max: 6, step: 1 },
    roof: { type: "choice", label: "Roof", default: "gable", options: ["gable", "flat"] },
    lights: { type: "toggle", label: "Lit windows", default: true },
  },
  presets: {
    Kyoto: { wall: "#F3E3C8", awning: "#E5484D", trim: "#5B6270", sign: "#F2B33D" },
    Mint: { wall: "#E3F2EA", awning: "#2F7A55", trim: "#3B4A44", sign: "#FFD166" },
    Plum: { wall: "#F2E6EE", awning: "#7D5BA6", trim: "#3D2C4A", sign: "#FFB347" },
  },
};

export function build(p) {
  const parts = [];
  const box = (x, y, z, w, h, d, c, e) => parts.push({ t: "box", p: [x, y, z], s: [w, h, d], c, ...(e ? { e: true } : {}) });
  const W = p.width, D = 5, FLOOR = 2.6, GROUND = 3.1;
  const x0 = (6 - W) / 2, z0 = 0.6;
  const H = GROUND + (p.floors - 1) * FLOOR;
  const glass = "#7E93A8", lit = "#FFD58A";

  box(x0 - 0.15, 0, z0 - 0.15, W + 0.3, 0.15, D + 0.3, "#BFC3CA"); // plinth
  box(x0, 0.15, z0, W, H, D, p.wall);
  // shop front: big window, door, sign band
  box(x0 + 0.4, 0.5, z0 - 0.04, W * 0.55, 1.7, 0.06, p.lights ? lit : glass, p.lights);
  box(x0 + W - 1.3, 0.15, z0 - 0.04, 0.9, 2.1, 0.06, p.trim);
  box(x0 + 0.2, 2.45, z0 - 0.05, W - 0.4, 0.45, 0.08, p.sign);
  // striped awning over the window
  const stripes = Math.max(3, Math.round(W * 1.4));
  for (let i = 0; i < stripes; i++) {
    const w = (W - 0.2) / stripes;
    box(x0 + 0.1 + i * w, 2.2, z0 - 0.9, w, 0.12, 0.9, i % 2 ? "#FBFBFB" : p.awning);
  }
  // flats above: two windows per floor on the front, one on the side
  for (let f = 1; f < p.floors; f++) {
    const y = GROUND + (f - 1) * FLOOR + 0.6;
    const on = p.lights && (f * 7 + p.floors) % 3 !== 0;
    for (const fx of [0.6, W - 1.6]) box(x0 + fx, y, z0 - 0.04, 1, 1.2, 0.06, on ? lit : glass, on);
    box(x0 - 0.04, y, z0 + D / 2 - 0.5, 0.06, 1.2, 1, glass);
    box(x0 + 0.5, y - 0.15, z0 - 0.25, W - 1, 0.1, 0.25, p.trim); // balcony ledge
  }
  // roof
  if (p.roof === "gable") parts.push({ t: "gable", p: [x0 - 0.2, 0.15 + H, z0 - 0.2], s: [W + 0.4, 1.6, D + 0.4], c: p.trim, axis: "x" });
  else {
    box(x0 - 0.1, 0.15 + H, z0 - 0.1, W + 0.2, 0.3, D + 0.2, p.trim);
    box(x0 + W - 1.6, 0.45 + H, z0 + 2, 1.1, 0.7, 1.1, "#D8DEE3"); // rooftop unit
  }
  return { parts };
}
