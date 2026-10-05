// Error buzz: a detuned analogue low-tom pair (two oscillators dropping from a tom-style pitch sweep) played as two descending denial pulses with a gap. Layers: buzzing oscillator pair, sine tom body, stick click, and grit as sample-hold crush plus ring-modulated noise.
export const meta = {
  title: "Tom Deny Buzz", kind: "ui", format: "sound", duration: 0.5, price: 1, author: "quietmachine", payout: "quietmachine@creators.oasis.example", kit: "Drum Machine", description: "An error or access-denied buzz made from two detuned low-tom oscillators that drop in pitch over two descending pulses; for failed actions, locked doors and invalid input in sci-fi interfaces.",
  tags: ["error", "deny", "buzz", "ui", "drum machine", "tom", "arcade", "console"],
};
export const params = { knobs: {
  wave: { type: "choice", label: "Wave", default: "square", options: ["square", "saw"] },
  detune: { type: "range", label: "Detune", default: 0.5, min: 0, max: 1, step: 0.01 },
  length: { type: "range", label: "Length", default: 0.5, min: 0, max: 1, step: 0.01 },
  grit: { type: "range", label: "Grit", default: 0.3, min: 0, max: 1, step: 0.01 },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, r = c.rng(p.seed * 613 + 29);
  const pulse = 0.1 + 0.12 * p.length, gap = 0.05 + r() * 0.012;
  const out = new Float32Array(c.seconds(2 * pulse + gap + 0.08, sr));
  const base = 125 * (0.94 + r() * 0.12), ratio = 1.006 + 0.09 * p.detune;
  const k = 1 + Math.round(p.grit * 5);
  const one = (f0) => {
    const n = c.seconds(pulse, sr), buf = new Float32Array(n);
    const sweep = (t) => f0 * (1 + 0.9 * Math.exp(-t / 0.02)) * (1 - 0.1 * t / pulse);
    const a = c.osc(p.wave, sweep, n, sr, { duty: 0.5 });
    const b = c.osc(p.wave, (t) => sweep(t) * ratio, n, sr, { duty: 0.35 });
    const body = c.osc("sine", (t) => f0 * 0.5 * (1 + 0.8 * Math.exp(-t / 0.03)), n, sr);
    const lp = c.biquad("lp", 2600 + 2200 * (1 - p.grit * 0.5), 0.8, sr);
    for (let i = 0; i < n; i++) buf[i] = lp(a[i] * 0.45 + b[i] * 0.42) + body[i] * 0.5;
    if (p.grit > 0) {
      const nz = c.noise(r, n), bp = c.biquad("bp", 2200, 1.2, sr); let held = 0;
      for (let i = 0; i < n; i++) {
        if (i % k === 0) held = buf[i];
        const t = i / sr;
        buf[i] = buf[i] * (1 - 0.6 * p.grit) + held * 0.6 * p.grit + bp(nz[i]) * (0.5 + 0.5 * Math.sin(c.TAU * 110 * t)) * 0.6 * p.grit;
      }
    }
    const rel = 0.02 * sr;
    for (let i = 0; i < n; i++) {
      const t = i / sr;
      buf[i] *= Math.min(1, t / 0.002) * (0.55 + 0.45 * Math.exp(-t / 0.04)) * Math.min(1, (n - i) / rel);
    }
    c.mix(buf, c.burst(r, 0.012, "bp", 3200, 1.5, 0.0004, 0.003, sr), 0, 0.55, sr);
    return buf;
  };
  c.mix(out, one(base), 0, 1, sr);
  c.mix(out, one(base * (0.78 + r() * 0.03)), pulse + gap, 0.9, sr);
  c.fade(c.finish(out, 0.85, 1.3), 6, sr);
  return { samples: out };
}
