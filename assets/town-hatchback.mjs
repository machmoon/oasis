// Hatchback: a boxy toy car. Block asset.
export const meta = { title: "Toy Hatchback", kind: "3d", format: "blocks", kit: "Oasis Town", price: 2, author: "tramworks", payout: "tramworks@creators.oasis.example", footprint: [4, 2], size: [900, 700],
  description: "A boxy little hatchback with tinted windows, chunky wheels and headlights that glow at night.",
  tags: ["3d", "low poly", "car", "vehicle", "hatchback", "traffic", "town", "kit", "block"] };
export const params = { knobs: {
  body: { type: "color", role: "primary", label: "Body", default: "#3E7BFA" },
  roof: { type: "choice", label: "Roof", default: "plain", options: ["plain", "rack", "taxi"] },
  lights: { type: "toggle", label: "Headlights", default: true },
} };
export function build(p) {
  const parts = [], box = (x, y, z, w, h, d, c, e) => parts.push({ t: "box", p: [x, y, z], s: [w, h, d], c, ...(e ? { e: true } : {}) });
  box(0.3, 0.35, 0.25, 3.4, 0.75, 1.5, p.body);
  box(0.9, 1.1, 0.32, 2.1, 0.65, 1.36, p.body);
  box(0.95, 1.18, 0.29, 0.9, 0.48, 0.04, "#2B3242"); box(1.95, 1.18, 0.29, 0.9, 0.48, 0.04, "#2B3242");
  box(0.86, 1.18, 0.4, 0.04, 0.48, 1.2, "#2B3242"); box(3.0, 1.18, 0.4, 0.04, 0.48, 1.2, "#2B3242");
  for (const wx of [0.7, 2.75]) for (const wz of [0.15, 1.55]) box(wx, 0, wz, 0.6, 0.6, 0.3, "#23262D");
  box(0.26, 0.6, 0.35, 0.05, 0.22, 0.35, p.lights ? "#FFE7A8" : "#E8EAEE", p.lights); box(0.26, 0.6, 1.3, 0.05, 0.22, 0.35, p.lights ? "#FFE7A8" : "#E8EAEE", p.lights);
  box(3.69, 0.6, 0.35, 0.05, 0.2, 0.3, "#E5484D"); box(3.69, 0.6, 1.35, 0.05, 0.2, 0.3, "#E5484D");
  if (p.roof === "rack") { box(1.1, 1.75, 0.45, 1.7, 0.06, 1.1, "#3A3F48"); box(1.3, 1.81, 0.55, 1.2, 0.3, 0.9, "#E5484D"); }
  if (p.roof === "taxi") box(1.65, 1.75, 0.75, 0.6, 0.25, 0.5, "#F2B33D", true);
  return { parts };
}
