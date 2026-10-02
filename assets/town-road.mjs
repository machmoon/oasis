// Town Road: a 6 m street tile with kerbs, markings and an optional crossing or tram rails. Block asset.
export const meta = { title: "Road Tile", kind: "3d", format: "blocks", kit: "Oasis Town", price: 0, author: "oasis", footprint: [6, 6], size: [900, 900],
  description: "A 6 m street tile: asphalt, kerbs and lane markings, with an optional zebra crossing or tram rails. Lays end to end on the town grid.",
  tags: ["3d", "low poly", "road", "street", "tile", "town", "kit", "block"] };
export const params = { knobs: {
  asphalt: { type: "color", label: "Asphalt", default: "#4A4F58" },
  kerb: { type: "color", role: "surface", label: "Kerb", default: "#D9DCE1" },
  marking: { type: "color", role: "highlight", label: "Markings", default: "#F3F0E1" },
  feature: { type: "choice", label: "Feature", default: "lanes", options: ["lanes", "crossing", "tram"] },
}, presets: { Day: {}, Sand: { asphalt: "#6B6257", kerb: "#E8DCC6", marking: "#FFF6DA" } } };
export function build(p) {
  const parts = [], box = (x, y, z, w, h, d, c) => parts.push({ t: "box", p: [x, y, z], s: [w, h, d], c });
  box(0, 0, 0, 6, 0.1, 6, p.asphalt);
  box(0, 0, 0, 6, 0.22, 0.7, p.kerb); box(0, 0, 5.3, 6, 0.22, 0.7, p.kerb);
  if (p.feature === "crossing") for (let i = 0; i < 6; i++) box(1.2 + i * 0.62, 0.1, 0.9, 0.36, 0.02, 4.2, p.marking);
  else if (p.feature === "tram") for (const z of [2.05, 2.45, 3.55, 3.95]) box(0, 0.1, z, 6, 0.05, 0.1, "#8C929C");
  else for (let x = 0.3; x < 6; x += 2) box(x, 0.1, 2.95, 1.2, 0.02, 0.1, p.marking);
  return { parts };
}
