// Soft click: a short tap for a button or toggle. A struck body (two or three damped modes) under a 1 ms contact edge;
// the tail toggle adds a small room so the same click can sit in a menu or on a desk.
export const meta = {
  title: "Soft Click", kind: "ui", format: "sound", duration: 0.12, price: 0, author: "you",
  description: "A button click whose material, pitch and brightness are knobs; every seed is a slightly different press.",
  tags: ["click", "ui", "button", "tap", "toggle", "menu"],
};
export const params = { knobs: {
  material: { type: "choice", label: "Material", default: "plastic", options: ["plastic", "wood", "glass"] },
  pitch: { type: "range", label: "Pitch", default: 0.5, min: 0, max: 1, step: 0.01 },
  brightness: { type: "range", label: "Brightness", default: 0.5, min: 0, max: 1, step: 0.01 },
  tail: { type: "toggle", label: "Room tail", default: false },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, r = c.rng(p.seed * 131 + 9);
  const base = 500 * Math.pow(2, p.pitch * 2) * (0.97 + r() * 0.06);
  const body = { plastic: [[base, 1], [base * 2.3, 0.3]], wood: [[base * 0.7, 1], [base * 1.7, 0.5], [base * 2.9, 0.2]], glass: [[base * 1.6, 1], [base * 4.1, 0.5], [base * 6.3, 0.25]] }[p.material];
  const decay = p.material === "glass" ? 0.05 : p.material === "wood" ? 0.03 : 0.02;
  const n = c.seconds(p.tail ? 0.3 : 0.12, sr), out = new Float32Array(n);
  c.mix(out, c.ring(body.map(([f, a]) => [f * (0.99 + r() * 0.02), a]), 0.1, decay, sr), 0.0008, 0.7, sr);
  c.mix(out, c.burst(r, 0.005, "hp", 1200 + 6000 * p.brightness, 0.8, 0.0003, 0.0012, sr), 0, 0.3 + 0.6 * p.brightness, sr);
  c.filter(out, c.biquad("lp", 2500 + 10000 * p.brightness, 0.7, sr));
  if (p.tail) c.reverb(out, { size: 0.3, decay: 0.5, mixAmt: 0.35 }, sr);
  c.fade(c.finish(out, 0.85), 2, sr);
  return { samples: out };
}
