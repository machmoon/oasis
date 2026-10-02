// Plaza Fountain: a stepped stone fountain with a water bowl. Block asset.
export const meta = { title: "Plaza Fountain", kind: "3d", format: "blocks", kit: "Oasis Town", price: 2, author: "oasis", footprint: [4, 4], size: [900, 900],
  description: "A round stepped fountain for a town square: stone basin, a raised bowl and a spout, water in pale blue.",
  tags: ["3d", "low poly", "fountain", "plaza", "park", "water", "town", "kit", "block"] };
export const params = { knobs: {
  stone: { type: "color", label: "Stone", default: "#DCD6CB" },
  water: { type: "color", label: "Water", default: "#8FD3E8" },
  tiers: { type: "range", label: "Tiers", default: 2, min: 1, max: 3, step: 1 },
  size: { type: "range", label: "Basin size (m)", default: 3.4, min: 2.4, max: 4, step: 0.2 },
} };
export function build(p) {
  const parts = [], R = p.size / 2;
  parts.push({ t: "cyl", p: [2, 0, 2], r: R, h: 0.5, c: p.stone, n: 12 });
  parts.push({ t: "cyl", p: [2, 0.5, 2], r: R - 0.25, h: 0.04, c: p.water, n: 12 });
  let y = 0.5;
  for (let i = 0; i < p.tiers; i++) {
    const r = Math.max(0.35, R * (0.45 - i * 0.12));
    parts.push({ t: "cyl", p: [2, y, 2], r: 0.18, h: 0.7, c: p.stone, n: 8 });
    y += 0.7;
    parts.push({ t: "cyl", p: [2, y, 2], r, h: 0.2, c: p.stone, n: 10 });
    parts.push({ t: "cyl", p: [2, y + 0.2, 2], r: r - 0.08, h: 0.03, c: p.water, n: 10 });
    y += 0.2;
  }
  parts.push({ t: "cone", p: [2, y, 2], r: 0.12, h: 0.45, c: p.water, n: 8 });
  return { parts };
}
