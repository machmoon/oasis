// Hover tick: the lightest UI sound, a focus or hover cue that should almost not be noticed. A few-millisecond
// blip (sine, square or a glassy two-mode ping) with a sub-millisecond noise edge, highpassed so it never thumps.
// After jsfxr sfxr.js blipSelect (square at duty frnd(0.6) or saw, p_base_freq 0.2-0.6, no attack, very short
// sustain and decay, p_hpf_freq 0.1), shortened to hover length; the ping material uses kit modes instead.
// Hand-written by a Claude Code agent against the factory contract (not built by the factory).
export const meta = {
  title: "Hover Tick", kind: "ui", format: "sound", duration: 0.04, price: 1, author: "quietmachine", payout: "quietmachine@creators.oasis.example", kit: "Interface",
  credit: "After jsfxr sfxr.js blipSelect",
  description: "A tiny, quiet hover or focus tick with material, pitch, length and edge as knobs, for menu hovers, list focus, tab stops and slider detents.",
  tags: ["hover", "focus", "tick", "blip", "menu", "ui", "subtle", "interface"],
};
export const params = { knobs: {
  material: { type: "choice", label: "Material", default: "sine", options: ["sine", "square", "ping"] },
  pitch: { type: "range", label: "Pitch", default: 0.5, min: 0, max: 1, step: 0.01 },
  length: { type: "range", label: "Length", default: 0.3, min: 0, max: 1, step: 0.01 },
  edge: { type: "range", label: "Edge", default: 0.3, min: 0, max: 1, step: 0.01 },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, r = c.rng(p.seed * 53 + 71);
  const f = 1400 * Math.pow(2, 1.6 * p.pitch) * (0.96 + 0.08 * r()), dec = 0.003 + 0.012 * p.length;
  const n = c.seconds(dec * 6 + 0.004, sr), out = new Float32Array(n), off = 0.0006 * r();
  if (p.material === "ping") c.mix(out, c.ring([[f, 1], [f * 2.76, 0.35]], dec * 6, dec * 1.3, sr), off + 0.0003, 0.7, sr);
  else {
    const b = c.osc(p.material, f, n, sr, { duty: 0.3, phase: r() });
    c.multiply(b, c.env(n, 0.0006, dec, sr));
    c.mix(out, b, off, p.material === "square" ? 0.35 : 0.8, sr);
  }
  c.mix(out, c.burst(r, 0.006, "hp", 3000, 0.7, 0.0001, 0.0005 + 0.0008 * p.edge, sr), off, 0.05 + 1.8 * p.edge, sr);
  c.filter(out, c.biquad("hp", 600, 0.7, sr));
  c.fade(c.finish(out, 0.8), 0.3, sr);
  return { samples: out };
}
