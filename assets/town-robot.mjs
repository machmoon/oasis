// Agent Kiosk: Oasis's little robot shopkeeper. Block asset.
export const meta = { title: "Agent Kiosk", kind: "3d", format: "blocks", kit: "Oasis Town", price: 1, author: "tramworks", payout: "tramworks@creators.oasis.example", footprint: [2, 2], size: [800, 900],
  description: "The Oasis agent as a toy robot on a plinth: a screen face, an antenna and a cube it is about to deliver. Face, body and cube colours are knobs.",
  tags: ["3d", "low poly", "robot", "agent", "mascot", "character", "town", "kit", "block"] };
export const params = { knobs: {
  body: { type: "color", role: "surface", label: "Body", default: "#F6F7F9" },
  face: { type: "color", role: "ink", label: "Screen", default: "#2B3242" },
  eyes: { type: "color", role: "highlight", label: "Eyes", default: "#7CF0C2" },
  cube: { type: "color", role: "primary", label: "Cube", default: "#F2B33D" },
  mood: { type: "choice", label: "Mood", default: "happy", options: ["happy", "thinking", "asleep"] },
} };
export function build(p) {
  const parts = [], box = (x, y, z, w, h, d, c, e) => parts.push({ t: "box", p: [x, y, z], s: [w, h, d], c, ...(e ? { e: true } : {}) });
  box(0.15, 0, 0.15, 1.7, 0.25, 1.7, "#C9CED6");
  box(0.4, 0.25, 0.45, 1.2, 1.0, 1.1, p.body);
  box(0.3, 1.25, 0.4, 1.4, 0.95, 1.2, p.body);
  box(0.42, 1.36, 0.36, 1.16, 0.72, 0.05, p.face);
  if (p.mood === "asleep") for (const ex of [0.6, 1.15]) box(ex, 1.62, 0.33, 0.25, 0.06, 0.03, p.eyes, true);
  else for (const ex of [0.65, 1.15]) box(ex, p.mood === "thinking" ? 1.68 : 1.6, 0.33, 0.2, 0.2, 0.03, p.eyes, true);
  if (p.mood === "happy") box(0.8, 1.45, 0.33, 0.4, 0.06, 0.03, p.eyes, true);
  box(0.96, 2.2, 0.96, 0.08, 0.5, 0.08, "#8C929C");
  box(0.86, 2.7, 0.86, 0.28, 0.28, 0.28, p.cube, true);
  box(1.75, 0.95, 0.75, 0.42, 0.42, 0.42, p.cube);
  box(1.7, 0.8, 0.85, 0.3, 0.15, 0.25, p.body);
  return { parts };
}
