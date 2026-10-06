// Error: a low, rough "nope". One to three short buzzy notes, each a pair of square or saw waves a few hertz apart
// (the beating is the roughness) with a small downward pitch slide, the last note a step lower, through a lowpass.
// After jsfxr sfxr.js hitHurt (square at duty frnd(0.6) or saw, p_freq_ramp -0.3 to -0.7 so the period lengthens,
// no attack, short sustain and decay); the slide is gentler here and the notes repeat so it reads as a UI denial
// rather than a hit.
// Hand-written by a Claude Code agent against the factory contract (not built by the factory).
export const meta = {
  title: "Error Buzz", kind: "ui", format: "sound", duration: 0.3, price: 1, author: "quietmachine", payout: "quietmachine@creators.oasis.example", kit: "Interface",
  credit: "After jsfxr sfxr.js hitHurt",
  description: "A low buzzy error tone with pattern, pitch, harshness and length as knobs, for invalid input, failed actions, locked buttons and form errors.",
  tags: ["error", "deny", "wrong", "invalid", "buzz", "ui", "fail", "interface"],
};
export const params = { knobs: {
  pattern: { type: "choice", label: "Pattern", default: "double", options: ["double", "single", "triple"] },
  pitch: { type: "range", label: "Pitch", default: 0.4, min: 0, max: 1, step: 0.01 },
  harshness: { type: "range", label: "Harshness", default: 0.5, min: 0, max: 1, step: 0.01 },
  length: { type: "range", label: "Length", default: 0.4, min: 0, max: 1, step: 0.01 },
  drop: { type: "range", label: "Pitch drop", default: 0.4, min: 0, max: 1, step: 0.01 },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, r = c.rng(p.seed * 173 + 13);
  const count = { single: 1, double: 2, triple: 3 }[p.pattern];
  const f = 160 * Math.pow(2, 1.3 * p.pitch) * (0.97 + 0.06 * r()), len = 0.06 + 0.1 * p.length, gap = len * (0.35 + 0.15 * r());
  const n = c.seconds(count * (len + gap) + 0.03, sr), out = new Float32Array(n), duty = 0.5 - 0.35 * p.harshness;
  for (let k = 0; k < count; k++) {
    const last = k === count - 1 && count > 1, fk = f * (last ? 0.84 : 1), m = c.seconds(len * (last ? 1.4 : 1), sr);
    const sl = 0.08 * p.drop + 0.04, beat = 6 + 10 * p.harshness + 4 * r();
    const sweep = (bf) => (t) => bf * (1 - sl * t / len);
    const a = c.osc(p.harshness > 0.5 ? "saw" : "square", sweep(fk), m, sr, { duty, phase: r() });
    const b = c.osc("square", sweep(fk + beat), m, sr, { duty: 0.5, phase: r() });
    for (let i = 0; i < m; i++) a[i] = (a[i] + b[i] * 0.7) * 0.5;
    c.multiply(a, c.adsr(m, { attack: 0.003, sustain: len * 0.55, decay: len * 0.45, punch: 0.2 }, sr));
    c.mix(out, a, k * (len + gap), 1, sr);
  }
  c.filter(out, c.biquad("lp", 900 + 3500 * p.harshness, 0.9, sr));
  c.filter(out, c.biquad("hp", 90, 0.7, sr));
  c.fade(c.finish(out, 0.88, 1 + p.harshness), 1, sr);
  return { samples: out };
}
