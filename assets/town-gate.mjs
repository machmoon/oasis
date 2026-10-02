// Approval Gate: a toll gate that only opens when the human approves. Block asset.
export const meta = { title: "Approval Gate", kind: "3d", format: "blocks", kit: "Oasis Town", price: 0, author: "oasis", footprint: [6, 3], size: [1000, 800],
  description: "A toll booth and barrier across a 6 m road: closed while an order waits, raised once you approve. The checkout, as a toy.",
  tags: ["3d", "low poly", "gate", "barrier", "toll", "checkout", "booth", "town", "kit", "block"] };
export const params = { knobs: {
  booth: { type: "color", role: "secondary", label: "Booth", default: "#3E7BFA" },
  arm: { type: "color", role: "primary", label: "Barrier stripes", default: "#E5484D" },
  open: { type: "toggle", label: "Approved (open)", default: false },
} };
export function build(p) {
  const parts = [], box = (x, y, z, w, h, d, c, e) => parts.push({ t: "box", p: [x, y, z], s: [w, h, d], c, ...(e ? { e: true } : {}) });
  box(0.2, 0, 0.2, 1.4, 1.9, 1.4, p.booth);
  box(0.35, 0.9, 0.16, 1.1, 0.6, 0.05, "#DCEBFF", true);
  parts.push({ t: "gable", p: [0.05, 1.9, 0.05], s: [1.7, 0.6, 1.7], c: "#2B3242", axis: "x" });
  box(1.8, 0, 0.7, 0.35, 1.1, 0.35, p.booth);
  const seg = 6, len = 4.4;
  for (let i = 0; i < seg; i++) {
    const c = i % 2 ? "#FBFBFB" : p.arm;
    if (p.open) box(1.88, 1.1 + (i * len) / seg, 0.78, 0.18, len / seg, 0.18, c);
    else box(2.15 + (i * len) / seg, 0.95, 0.78, len / seg, 0.18, 0.18, c);
  }
  box(1.85, 1.15, 0.6, 0.25, 0.25, 0.08, p.open ? "#3BD47A" : "#FF5A4E", true);
  return { parts };
}
