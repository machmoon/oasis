// Tram: a two-car city tram. Block asset.
export const meta = { title: "City Tram", kind: "3d", format: "blocks", kit: "Oasis Town", price: 3, author: "tramworks", payout: "tramworks@creators.oasis.example", footprint: [8, 2], size: [1000, 700],
  description: "A two-car city tram with lit windows and a pantograph. Body colour, stripe and cars are knobs.",
  tags: ["3d", "low poly", "tram", "train", "vehicle", "transport", "town", "kit", "block"] };
export const params = { knobs: {
  body: { type: "color", role: "secondary", label: "Body", default: "#2F7A55" },
  stripe: { type: "color", role: "background", label: "Stripe", default: "#F6EEE0" },
  cars: { type: "range", label: "Cars", default: 2, min: 1, max: 3, step: 1 },
  lights: { type: "toggle", label: "Lit windows", default: true },
} };
export function build(p) {
  const parts = [], box = (x, y, z, w, h, d, c, e) => parts.push({ t: "box", p: [x, y, z], s: [w, h, d], c, ...(e ? { e: true } : {}) });
  const car = 3.6;
  for (let i = 0; i < p.cars; i++) {
    const x = 0.2 + i * (car + 0.15);
    box(x, 0.35, 0.3, car, 1.9, 1.4, p.body);
    box(x, 1.05, 0.28, car, 0.18, 1.44, p.stripe);
    for (let w = 0; w < 3; w++) box(x + 0.35 + w * 1.1, 1.3, 0.27, 0.8, 0.6, 0.04, p.lights ? "#FFD58A" : "#7E93A8", p.lights);
    box(x + 0.2, 2.25, 0.4, car - 0.4, 0.2, 1.2, "#5A606B");
    for (const wx of [0.5, car - 0.9]) box(x + wx, 0.1, 0.35, 0.4, 0.25, 1.3, "#2B2E35");
  }
  box(1.4, 2.45, 0.9, 0.08, 0.6, 0.08, "#5A606B");
  box(1, 3.02, 0.6, 0.9, 0.06, 0.7, "#5A606B");
  return { parts };
}
