// Pedal hat chick: a foot-closed hi-hat. A tight metallic square cluster per metal type (own band, own decay), a short noisy plate-on-plate slap and a tiny low-mid foot knock (no sub); the optional splash is a separate short sizzle that rings out after the closure.
export const meta = {
  title: "Pedal Hat Chick", kind: "sfx", format: "sound", duration: 0.14, price: 1, author: "kickdrum", payout: "kickdrum@creators.oasis.example", kit: "Drum Machine",
  description: "A very short analogue pedal hi-hat chick: a tight metallic closure with a noisy slap, for drum machine kits, stingers and rhythm one-shots.",
  tags: ["hihat", "pedal", "chick", "drum-machine", "analogue", "percussion", "hat", "one-shot"],
};
export const params = { knobs: {
  metal: { type: "choice", label: "Metal", default: "bright", options: ["thin", "bright", "dark"] },
  tightness: { type: "range", label: "Tightness", default: 0.6, min: 0, max: 1, step: 0.01 },
  noise: { type: "range", label: "Noise", default: 0.5, min: 0, max: 1, step: 0.01 },
  tail: { type: "toggle", label: "Splash tail", default: false },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, r = c.rng(p.seed * 613 + 29), out = new Float32Array(c.seconds(0.14, sr));
  // [band centre, Q, cluster ratio, highpass, decay scale, noise type, slap decay scale]
  const cfg = {
    thin: [10000, 3.0, 1.35, 8500, 0.55, "hp", 0.7],
    bright: [6800, 1.3, 1.0, 5000, 1.0, "hp", 1.0],
    dark: [3200, 0.9, 0.6, 1800, 1.6, "bp", 1.5],
  }[p.metal];
  const t = p.tightness, dec = (0.034 - 0.024 * t) * cfg[4];
  const base = [205, 304, 369, 522, 540, 800];
  const n = c.seconds(0.1, sr), cl = new Float32Array(n);
  for (let k = 0; k < 6; k++) c.mix(cl, c.osc("square", base[k] * cfg[2] * (0.96 + r() * 0.08) * 2.6, n, sr), 0, 1 / 6, sr);
  c.filter(cl, c.biquad("hp", cfg[3], 0.8, sr));
  c.filter(cl, c.biquad("bp", cfg[0], cfg[1], sr));
  c.multiply(cl, c.env(n, 0.0007, dec, sr));
  c.mix(out, cl, 0, 2.4 * (1.05 - 0.75 * p.noise), sr);
  const nz = c.burst(r, 0.07, cfg[5], cfg[5] === "bp" ? 4200 : cfg[3] * 0.85, cfg[5] === "bp" ? 0.8 : 0.7, 0.0005, dec * 0.8, sr);
  c.mix(out, nz, 0.0004, 0.15 + 1.3 * p.noise, sr);
  const slapDec = (0.004 + 0.005 * (1 - t)) * cfg[6];
  c.mix(out, c.burst(r, 0.015, "bp", cfg[0] * 0.8, 0.9, 0.0003, slapDec, sr), 0, 0.7, sr);
  c.mix(out, c.burst(r, 0.02, "bp", 420 + r() * 80, 1.4, 0.0008, 0.006, sr), 0.001, 0.22, sr);
  if (p.tail) {
    const m = c.seconds(0.11, sr), s = c.noise(r, m), hp = c.biquad("hp", cfg[3] * 0.9, 1.0, sr), q = c.env(m, 0.008, 0.032, sr);
    for (let i = 0; i < m; i++) s[i] = hp(s[i]) * q[i] * (0.7 + 0.3 * Math.sin(i * 0.37 + r()));
    c.mix(out, s, 0.018, 0.6 + 0.4 * p.noise, sr);
  }
  c.filter(out, c.biquad("hp", 300, 0.7, sr));
  c.fade(out, 6, sr);
  c.finish(out, 0.85, 1.1);
  return { samples: out };
}
