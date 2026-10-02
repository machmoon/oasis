// Park Bench: a slatted bench with optional planters. Block asset.
export const meta = { title: "Park Bench", kind: "3d", format: "blocks", kit: "Oasis Town", price: 0, author: "oasis", footprint: [3, 1], size: [900, 700],
  description: "A slatted park bench on iron legs, with optional planter boxes at each end.",
  tags: ["3d", "low poly", "bench", "park", "seat", "street furniture", "town", "kit", "block"] };
export const params = { knobs: {
  wood: { type: "color", label: "Wood", default: "#B07A4E" },
  frame: { type: "color", role: "ink", label: "Frame", default: "#3A3F48" },
  length: { type: "range", label: "Length (m)", default: 1.8, min: 1.2, max: 2.6, step: 0.2 },
  planters: { type: "toggle", label: "Planters", default: true },
} };
export function build(p) {
  const parts = [], box = (x, y, z, w, h, d, c) => parts.push({ t: "box", p: [x, y, z], s: [w, h, d], c });
  const L = p.length, x0 = (3 - L) / 2;
  for (const lx of [x0 + 0.1, x0 + L - 0.18]) { box(lx, 0, 0.3, 0.08, 0.45, 0.45, p.frame); box(lx, 0.45, 0.68, 0.08, 0.5, 0.06, p.frame); }
  for (let i = 0; i < 3; i++) box(x0, 0.42, 0.3 + i * 0.15, L, 0.05, 0.12, p.wood);
  for (let i = 0; i < 2; i++) box(x0, 0.6 + i * 0.16, 0.7, L, 0.12, 0.05, p.wood);
  if (p.planters) for (const px of [x0 - 0.55, x0 + L + 0.05]) { box(px, 0, 0.3, 0.5, 0.45, 0.5, "#8A6E52"); box(px + 0.05, 0.45, 0.35, 0.4, 0.3, 0.4, "#79B86A"); }
  return { parts };
}
