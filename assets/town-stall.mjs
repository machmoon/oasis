// Market Stall: a striped stall stacked with goods. Block asset.
export const meta = { title: "Market Stall", kind: "3d", format: "blocks", kit: "Oasis Town", price: 2, author: "mika-blocks", payout: "mika-blocks@creators.oasis.example", footprint: [4, 3], size: [900, 800],
  description: "A street-market stall with a striped canopy and a counter stacked with goods. Canopy, goods and stock level are knobs.",
  tags: ["3d", "low poly", "market", "stall", "shop", "street food", "town", "kit", "block"] };
export const params = { knobs: {
  canopy: { type: "color", role: "primary", label: "Canopy", default: "#E5484D" },
  goods: { type: "color", role: "highlight", label: "Goods", default: "#F2B33D" },
  counter: { type: "color", role: "surface", label: "Counter", default: "#E7D3B5" },
  stock: { type: "range", label: "Stock", default: 6, min: 0, max: 9, step: 1 },
} };
export function build(p) {
  const parts = [], box = (x, y, z, w, h, d, c) => parts.push({ t: "box", p: [x, y, z], s: [w, h, d], c });
  box(0.4, 0, 0.6, 3.2, 0.95, 1.4, p.counter);
  for (const [x, z] of [[0.4, 0.6], [3.45, 0.6], [0.4, 1.85], [3.45, 1.85]]) box(x, 0.95, z, 0.15, 1.4, 0.15, "#8A6E52");
  for (let i = 0; i < 6; i++) box(0.2 + i * 0.6, 2.35, 0.3, 0.6, 0.14, 2.1, i % 2 ? "#FBFBFB" : p.canopy);
  const cols = [p.goods, p.canopy, "#79B86A"];
  for (let i = 0; i < p.stock; i++) box(0.65 + (i % 5) * 0.58, 0.95 + Math.floor(i / 5) * 0.42, 0.85 + (Math.floor(i / 5) % 2) * 0.25, 0.4, 0.4, 0.4, cols[i % 3]);
  return { parts };
}
