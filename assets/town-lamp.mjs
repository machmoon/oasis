// Town Lamp: a street lamp that glows at night. Block asset.
export const meta = { title: "Street Lamp", kind: "3d", format: "blocks", kit: "Oasis Town", price: 0, author: "oasis", footprint: [1, 1], size: [600, 900],
  description: "A street lamp with a lantern head that lights up at night. Post colour, height and lantern style are knobs.",
  tags: ["3d", "low poly", "lamp", "street light", "light", "town", "kit", "block"] };
export const params = { knobs: {
  post: { type: "color", role: "ink", label: "Post", default: "#3A3F48" },
  height: { type: "range", label: "Height (m)", default: 3, min: 2, max: 4.5, step: 0.25 },
  head: { type: "choice", label: "Lantern", default: "lantern", options: ["lantern", "globe"] },
} };
export function build(p) {
  const parts = [], box = (x, y, z, w, h, d, c, e) => parts.push({ t: "box", p: [x, y, z], s: [w, h, d], c, ...(e ? { e: true } : {}) });
  box(0.3, 0, 0.3, 0.4, 0.2, 0.4, p.post);
  box(0.42, 0.2, 0.42, 0.16, p.height - 0.2, 0.16, p.post);
  if (p.head === "globe") parts.push({ t: "cyl", p: [0.5, p.height, 0.5], r: 0.22, h: 0.4, c: "#FFE3A6", n: 10, e: true });
  else { box(0.3, p.height, 0.3, 0.4, 0.45, 0.4, "#FFE3A6", true); box(0.25, p.height + 0.45, 0.25, 0.5, 0.12, 0.5, p.post); }
  return { parts };
}
