// Flats: a mid-rise apartment block with balconies. Block asset.
export const meta = { title: "Apartment Flats", kind: "3d", format: "blocks", kit: "Oasis Town", price: 5, author: "oasis", footprint: [6, 6], size: [1000, 1100],
  description: "A mid-rise block of flats with balconies, potted plants, a lobby canopy and a rooftop water tank. Floors and every colour rebuild live.",
  tags: ["3d", "low poly", "apartments", "flats", "building", "city", "town", "kit", "block"] };
export const params = { knobs: {
  wall: { type: "color", role: "surface", label: "Walls", default: "#D8DEE3" },
  balcony: { type: "color", role: "primary", label: "Balconies", default: "#E5484D" },
  trim: { type: "color", role: "ink", label: "Trim", default: "#5B6270" },
  floors: { type: "range", label: "Floors", default: 5, min: 3, max: 8, step: 1 },
  tank: { type: "toggle", label: "Water tank", default: true },
  lights: { type: "toggle", label: "Lit windows", default: true },
}, presets: { Concrete: { wall: "#D8DEE3", balcony: "#E5484D", trim: "#5B6270" }, Brick: { wall: "#C9785A", balcony: "#F6EEE0", trim: "#3B2F2A" } } };
export function build(p) {
  const parts = [], box = (x, y, z, w, h, d, c, e) => parts.push({ t: "box", p: [x, y, z], s: [w, h, d], c, ...(e ? { e: true } : {}) });
  const F = 2.6, H = 0.2 + p.floors * F, W = 5, D = 5, x0 = 0.5, z0 = 0.5;
  box(x0, 0, z0, W, H, D, p.wall);
  box(x0 + 1.9, 0, z0 - 0.04, 1.2, 2.2, 0.06, "#7E93A8");
  box(x0 + 1.6, 2.3, z0 - 0.9, 1.8, 0.12, 0.9, p.trim);
  for (let f = 1; f < p.floors; f++) {
    const y = 0.2 + f * F;
    for (const bx of [0.3, 2.8]) {
      const lit = p.lights && (f * 3 + bx * 7) % 5 < 2.5;
      box(x0 + bx, y + 0.5, z0 - 0.04, 1.9, 1.4, 0.06, lit ? "#FFD58A" : "#7E93A8", lit);
      box(x0 + bx - 0.05, y, z0 - 0.8, 2.0, 0.12, 0.8, p.balcony);
      box(x0 + bx - 0.05, y + 0.12, z0 - 0.82, 2.0, 0.5, 0.06, p.balcony);
      if ((f + bx) % 2 > 0.5) box(x0 + bx + 0.2, y + 0.12, z0 - 0.6, 0.35, 0.4, 0.35, "#79B86A");
    }
    box(x0 - 0.04, y + 0.5, z0 + 1.8, 0.06, 1.3, 1.4, "#7E93A8");
  }
  box(x0 - 0.1, H, z0 - 0.1, W + 0.2, 0.3, D + 0.2, p.trim);
  if (p.tank) { parts.push({ t: "cyl", p: [x0 + 3.8, H + 0.3, z0 + 3.6], r: 0.55, h: 1.1, c: "#9AA3AE", n: 10 }); parts.push({ t: "cone", p: [x0 + 3.8, H + 1.4, z0 + 3.6], r: 0.6, h: 0.35, c: "#5B6270", n: 10 }); }
  return { parts };
}
