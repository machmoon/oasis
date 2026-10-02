// Town House: a pitched-roof house with a door, windows and a chimney. Block asset.
export const meta = { title: "Cottage", kind: "3d", format: "blocks", kit: "Oasis Town", price: 3, author: "mika-blocks", payout: "mika-blocks@creators.oasis.example", footprint: [6, 6], size: [1000, 1000],
  description: "A cosy pitched-roof cottage with a front door, lit windows and a chimney. Walls, roof, size and floors are knobs.",
  tags: ["3d", "low poly", "house", "home", "cottage", "building", "town", "kit", "block"] };
export const params = { knobs: {
  wall: { type: "color", role: "surface", label: "Walls", default: "#F6EEE0" },
  roof: { type: "color", role: "primary", label: "Roof", default: "#C8553D" },
  door: { type: "color", role: "secondary", label: "Door", default: "#2F7A55" },
  floors: { type: "range", label: "Floors", default: 1, min: 1, max: 3, step: 1 },
  width: { type: "range", label: "Width (m)", default: 4, min: 3, max: 5, step: 0.5 },
  chimney: { type: "toggle", label: "Chimney", default: true },
  lights: { type: "toggle", label: "Lit windows", default: true },
}, presets: { Classic: { wall: "#F6EEE0", roof: "#C8553D", door: "#2F7A55" }, Nordic: { wall: "#D8E3EC", roof: "#3B4A5A", door: "#E5484D" }, Peach: { wall: "#FBE3D3", roof: "#7A4A3A", door: "#3E7BFA" } } };
export function build(p) {
  const parts = [], box = (x, y, z, w, h, d, c, e) => parts.push({ t: "box", p: [x, y, z], s: [w, h, d], c, ...(e ? { e: true } : {}) });
  const W = p.width, D = 4, H = 2.4 + (p.floors - 1) * 2.3, x0 = (6 - W) / 2, z0 = 1;
  box(x0 - 0.15, 0, z0 - 0.15, W + 0.3, 0.15, D + 0.3, "#BFC3CA");
  box(x0, 0.15, z0, W, H, D, p.wall);
  box(x0 + W / 2 - 0.45, 0.15, z0 - 0.05, 0.9, 1.9, 0.08, p.door);
  box(x0 + W / 2 - 0.65, 2.1, z0 - 0.4, 1.3, 0.12, 0.45, p.roof);
  for (let f = 0; f < p.floors; f++) {
    const y = 0.9 + f * 2.3, on = p.lights && (f + W) % 2 < 1.5;
    if (W >= 3.5) { box(x0 + 0.35, y, z0 - 0.04, 0.8, 0.9, 0.06, on ? "#FFD58A" : "#7E93A8", on); box(x0 + W - 1.15, y, z0 - 0.04, 0.8, 0.9, 0.06, on ? "#FFD58A" : "#7E93A8", on); }
    box(x0 - 0.04, y, z0 + 1.4, 0.06, 0.9, 1.1, "#7E93A8");
  }
  parts.push({ t: "gable", p: [x0 - 0.25, 0.15 + H, z0 - 0.25], s: [W + 0.5, 1.7, D + 0.5], c: p.roof, axis: "x" });
  if (p.chimney) box(x0 + W - 1.1, 0.15 + H + 0.4, z0 + D * 0.65, 0.5, 1.4, 0.5, "#9A6B52");
  return { parts };
}
