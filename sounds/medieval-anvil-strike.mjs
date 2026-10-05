// Anvil strike: a smith's hammer on an iron anvil. Layers: a hard contact click and hammer-face thud, a low body thump through the stand, an inharmonic steel ring whose upper partials die faster than the fundamentals, an optional high shimmer tail, and a faint hammer rebound tick.
export const meta = {
  title: "Anvil Strike", kind: "impact", format: "sound", duration: 1.6, price: 3, author: "hollowbody", payout: "hollowbody@creators.oasis.example", kit: "Medieval Market",
  description: "A smith's hammer blow on an iron anvil: size, force, ring, damping and pitch are knobs, so a forge scene never repeats a strike.",
  tags: ["anvil", "hammer", "blacksmith", "metal", "impact", "medieval", "forge", "ring"],
};
export const params = { knobs: {
  size: { type: "choice", label: "Anvil size", default: "medium", options: ["small", "medium", "large"] },
  force: { type: "range", label: "Force", default: 0.6, min: 0, max: 1, step: 0.01 },
  ring: { type: "range", label: "Ring amount", default: 0.6, min: 0, max: 1, step: 0.01 },
  damp: { type: "range", label: "Dampening", default: 0.2, min: 0, max: 1, step: 0.01 },
  pitch: { type: "range", label: "Pitch", default: 0.5, min: 0, max: 1, step: 0.01 },
  tail: { type: "toggle", label: "Ring tail", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, si = params.knobs.size.options.indexOf(p.size);
  const r = c.rng(p.seed * 613 + si * 97 + 11);
  const out = new Float32Array(c.seconds(2.7, sr));
  const base = [1050, 640, 380][si] * Math.pow(2, (p.pitch - 0.5) * 1.2) * (0.99 + r() * 0.02);
  const f = p.force, ra = p.ring;
  const decay = [0.2, 0.38, 0.65][si] * (1 - 0.88 * p.damp) * (p.tail ? 1 : 0.22) + 0.025;
  const ratios = [1, 2.32, 3.87, 5.43, 7.1, 9.2];
  const amps = [1, 0.75, 0.55, 0.4, 0.28, 0.18];
  const ringLen = Math.min(2.5, decay * 5 + 0.1);
  const ringBuf = new Float32Array(out.length);
  for (let i = 0; i < ratios.length; i++) {
    const fr = base * ratios[i] * (0.996 + r() * 0.008), a = amps[i] * (0.9 + 0.2 * r());
    const d = decay / (1 + 0.45 * i);
    c.mix(ringBuf, c.ring([[fr, a], [fr * 1.012, a * 0.35]], Math.min(ringLen, d * 6 + 0.05), d, sr), 0.0012, 1, sr);
  }
  if (p.tail) c.mix(ringBuf, c.ring([[base * 11.3, 0.5], [base * 13.9, 0.35]], ringLen, decay * 0.45, sr), 0.003, 0.3 * ra, sr);
  c.mix(out, ringBuf, 0, (0.12 + 0.6 * ra) * (0.35 + 0.65 * f), sr);
  const bodyF = base * 0.2;
  c.mix(out, c.ring([[bodyF, 1], [bodyF * 1.9, 0.35]], 0.2, 0.025 + 0.02 * (2 - si) + 0.02 * (1 - p.damp), sr), 0.002, (0.3 + 0.5 * f) * (0.6 + 0.2 * si), sr);
  c.mix(out, c.burst(r, 0.012, "hp", 2500 + 3500 * f, 0.8, 0.0004, 0.003, sr), 0, 0.6 + 0.6 * f, sr);
  c.mix(out, c.burst(r, 0.03, "bp", 1200 + 800 * f, 1.5, 0.0008, 0.008, sr), 0.0005, 0.5 * (0.4 + f), sr);
  if (f > 0.55) c.mix(out, c.burst(r, 0.006, "hp", 5000, 0.8, 0.0003, 0.0015, sr), 0.0035 + r() * 0.002, 0.3 * f, sr);
  c.mix(out, c.burst(r, 0.008, "hp", 3000, 0.8, 0.0003, 0.002, sr), 0.07 + r() * 0.03, 0.12 + 0.15 * f, sr);
  const end = Math.min(out.length, c.seconds(decay * 4.5 + 0.12, sr));
  const o2 = new Float32Array(end);
  o2.set(out.subarray(0, end));
  c.fade(o2, Math.min(50, end / sr * 300), sr);
  c.finish(o2, 0.9, 1.1);
  return { samples: o2 };
}
