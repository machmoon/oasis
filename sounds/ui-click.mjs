// UI click: a short bright tap for buttons and toggles. Body is two damped sine modes (the "plastic" of the key),
// contact is a 1 ms filtered noise edge, and the style knob trades a soft thud, a clean tick or a glassy ping.
export const meta = {
  title: "Soft Click", kind: "ui", format: "sound", duration: 0.12, price: 1, author: "quietmachine", payout: "quietmachine@creators.oasis.example",
  description: "A button or toggle click whose material, pitch, brightness and length are knobs; every seed is a slightly different press.",
  tags: ["click", "ui", "button", "tap", "toggle", "interface", "menu", "soft"],
};
export const params = { knobs: {
  style: { type: "choice", label: "Style", default: "tick", options: ["thud", "tick", "ping", "wooden"] },
  pitch: { type: "range", label: "Pitch", default: 0.5, min: 0, max: 1, step: 0.01 },
  brightness: { type: "range", label: "Brightness", default: 0.5, min: 0, max: 1, step: 0.01 },
  length: { type: "range", label: "Length", default: 0.3, min: 0, max: 1, step: 0.01 },
  double: { type: "toggle", label: "Double tap", default: false },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, r = c.rng(p.seed * 31 + 7);
  const base = 600 * Math.pow(2, p.pitch * 2.2) * (0.98 + r() * 0.04);
  const decay = 0.012 + 0.09 * p.length;
  const one = () => {
    const n = c.seconds(decay * 6 + 0.02, sr), out = new Float32Array(n);
    const modes = { thud: [[base * 0.35, 1], [base * 0.7, 0.4]], tick: [[base, 1], [base * 2.4, 0.35]], ping: [[base * 1.5, 1], [base * 3.9, 0.5], [base * 6.1, 0.2]], wooden: [[base * 0.6, 1], [base * 1.6, 0.5], [base * 2.7, 0.2]] }[p.style];
    c.mix(out, c.ring(modes.map(([f, a]) => [f * (0.995 + r() * 0.01), a]), decay * 5, decay * (p.style === "ping" ? 1.6 : 0.8), sr), 0.0005, 0.7, sr);
    c.mix(out, c.burst(r, 0.006, "hp", 1500 + 5000 * p.brightness, 0.8, 0.0003, 0.0015, sr), 0, 0.35 + 0.5 * p.brightness, sr);
    if (p.style === "thud") c.mix(out, c.burst(r, 0.02, "lp", 400 + 300 * p.brightness, 0.9, 0.001, 0.006, sr), 0, 0.6, sr);
    return out;
  };
  const total = c.seconds(decay * 6 + 0.02 + (p.double ? 0.09 : 0), sr), out = new Float32Array(total);
  c.mix(out, one(), 0, 1, sr);
  if (p.double) c.mix(out, one(), 0.07 + r() * 0.02, 0.8, sr);
  c.filter(out, c.biquad("lp", 3000 + 9000 * p.brightness, 0.7, sr));
  c.fade(c.finish(out, 0.85), 2, sr);
  return { samples: out };
}
