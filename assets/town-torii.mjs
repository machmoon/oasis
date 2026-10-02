// Torii Gate: a shrine gate. Block asset.
export const meta = { title: "Torii Gate", kind: "3d", format: "blocks", kit: "Oasis Town", price: 2, author: "shrinewright", payout: "shrinewright@creators.oasis.example", footprint: [4, 2], size: [900, 800],
  description: "A vermilion shrine gate with two lintels. Colour, height and span are knobs.",
  tags: ["3d", "low poly", "torii", "gate", "shrine", "japan", "kyoto", "town", "kit", "block"] };
export const params = { knobs: {
  colour: { type: "color", role: "primary", label: "Lacquer", default: "#D9402E" },
  top: { type: "color", role: "ink", label: "Top beam", default: "#2B2B30" },
  height: { type: "range", label: "Height (m)", default: 3.6, min: 2.5, max: 5, step: 0.25 },
} };
export function build(p) {
  const parts = [], box = (x, y, z, w, h, d, c) => parts.push({ t: "box", p: [x, y, z], s: [w, h, d], c });
  const H = p.height;
  for (const x of [0.6, 3.1]) { parts.push({ t: "cyl", p: [x + 0.15, 0, 1], r: 0.18, h: H, c: p.colour, n: 10 }); box(x - 0.05, 0, 0.8, 0.4, 0.3, 0.4, p.top); }
  box(0.3, H * 0.78, 0.88, 3.4, 0.24, 0.24, p.colour);
  box(-0.1, H, 0.8, 4.2, 0.3, 0.4, p.colour);
  box(-0.25, H + 0.3, 0.75, 4.5, 0.2, 0.5, p.top);
  box(1.85, H * 0.78 + 0.24, 0.9, 0.3, H * 0.22 - 0.24, 0.2, p.colour);
  return { parts };
}
