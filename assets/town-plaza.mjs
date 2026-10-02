// Town Plaza: a 6 m ground tile, grass or paving, with optional flower beds. Block asset.
export const meta = { title: "Plaza Tile", kind: "3d", format: "blocks", kit: "Oasis Town", price: 0, author: "oasis", footprint: [6, 6], size: [900, 900],
  description: "A 6 m ground tile for the town grid: lawn, stone paving or a tiled plaza, with optional flower beds.",
  tags: ["3d", "low poly", "ground", "tile", "grass", "plaza", "town", "kit", "block"] };
export const params = { knobs: {
  surface: { type: "choice", label: "Surface", default: "grass", options: ["grass", "paving", "plaza"] },
  grass: { type: "color", label: "Grass", default: "#A9C48A" },
  stone: { type: "color", role: "surface", label: "Stone", default: "#DCD6CB" },
  flowers: { type: "color", role: "highlight", label: "Flowers", default: "#F7B8CF" },
  beds: { type: "toggle", label: "Flower beds", default: false },
}, presets: { Spring: { grass: "#A9C48A", flowers: "#F7B8CF" }, Autumn: { grass: "#C9B58E", flowers: "#E58A3A" } } };
export function build(p) {
  const parts = [], box = (x, y, z, w, h, d, c) => parts.push({ t: "box", p: [x, y, z], s: [w, h, d], c });
  if (p.surface === "grass") box(0, 0, 0, 6, 0.14, 6, p.grass);
  else {
    box(0, 0, 0, 6, 0.12, 6, p.stone);
    const n = p.surface === "plaza" ? 4 : 3, s = 6 / n;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if ((i + j) % 2) box(i * s + 0.04, 0.12, j * s + 0.04, s - 0.08, 0.015, s - 0.08, "#CFC8BB");
  }
  if (p.beds) for (const [x, z] of [[0.4, 0.4], [4.4, 4.4]]) {
    box(x, 0.12, z, 1.2, 0.3, 1.2, "#8A6E52");
    for (let i = 0; i < 4; i++) box(x + 0.15 + (i % 2) * 0.5, 0.42, z + 0.15 + Math.floor(i / 2) * 0.5, 0.36, 0.3, 0.36, p.flowers);
  }
  return { parts };
}
