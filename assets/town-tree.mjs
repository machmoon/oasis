// Town Tree: a blocky cherry, maple or pine on a little planter, in any season. Block asset.
export const meta = { title: "Blossom Tree", kind: "3d", format: "blocks", kit: "Oasis Town", price: 1, author: "parkline", payout: "parkline@creators.oasis.example", footprint: [2, 2], size: [800, 900],
  description: "A toy tree made of stacked blocks: cherry blossom, round summer tree or pine, with a season and a size.",
  tags: ["3d", "low poly", "tree", "cherry blossom", "sakura", "nature", "town", "kit", "block"] };
export const params = { knobs: {
  shape: { type: "choice", label: "Shape", default: "blossom", options: ["blossom", "round", "pine"] },
  season: { type: "choice", label: "Season", default: "spring", options: ["spring", "summer", "autumn", "winter"] },
  height: { type: "range", label: "Height (m)", default: 3.2, min: 2, max: 6, step: 0.2 },
  trunk: { type: "color", label: "Trunk", default: "#7A5A43" },
} };
const LEAVES = { spring: ["#F7B8CF", "#F29BBA", "#FBD3E2"], summer: ["#5FA35C", "#4E8F4C", "#79B86A"], autumn: ["#E58A3A", "#D4642E", "#F0B048"], winter: ["#F3F6F9", "#E3EAF0", "#FFFFFF"] };
export function build(p) {
  const parts = [], box = (x, y, z, w, h, d, c) => parts.push({ t: "box", p: [x, y, z], s: [w, h, d], c });
  const L = p.shape === "pine" && p.season !== "winter" ? ["#3E7B4F", "#2F6A44", "#4E8F5A"] : LEAVES[p.season];
  const H = p.height, t = H * 0.4;
  box(0.7, 0, 0.7, 0.6, 0.25, 0.6, "#9A8F82");
  box(0.88, 0.25, 0.88, 0.24, t, 0.24, p.trunk);
  if (p.shape === "pine") {
    for (let i = 0; i < 3; i++) parts.push({ t: "cone", p: [1, t * 0.7 + i * (H - t) * 0.3, 1], r: 0.95 - i * 0.22, h: (H - t) * 0.55, c: L[i % 3], n: 6 });
  } else {
    const c = H - t;
    box(0.2, t, 0.2, 1.6, c * 0.55, 1.6, L[0]);
    box(0.4, t + c * 0.55, 0.4, 1.2, c * 0.3, 1.2, L[2]);
    box(0.05, t + c * 0.2, 0.7, 0.4, 0.4, 0.5, L[1]);
    box(1.45, t + c * 0.3, 0.9, 0.45, 0.4, 0.4, L[1]);
    if (p.shape === "round") box(0.6, t + c * 0.85, 0.6, 0.8, c * 0.15, 0.8, L[0]);
  }
  return { parts };
}
