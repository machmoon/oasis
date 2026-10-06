// Pop: a bubbly UI pop for things appearing. A sine whose pitch leaps upward over a few milliseconds (a bubble
// closing), a tiny noise snap on the onset, and an optional wet ring for a juicier, rounder pop.
// The pitch leap is jsfxr sfxr.js's positive p_freq_ramp (periodMult = 1 - ramp³·0.01 shortening the period each
// sample) on a sine, with no attack and a short decay as its blipSelect preset sets; the snap is a kit noise grain.
// Hand-written by a Claude Code agent against the factory contract (not built by the factory).
export const meta = {
  title: "Bubble Pop", kind: "ui", format: "sound", duration: 0.2, price: 1, author: "quietmachine", payout: "quietmachine@creators.oasis.example", kit: "Interface",
  credit: "Pitch slide after jsfxr sfxr.js p_freq_ramp / blipSelect",
  description: "A round bubble pop with pitch, size, snap and length as knobs, for elements appearing, likes, reactions and playful taps.",
  tags: ["pop", "bubble", "appear", "like", "reaction", "ui", "playful", "interface"],
};
export const params = { knobs: {
  pitch: { type: "range", label: "Pitch", default: 0.5, min: 0, max: 1, step: 0.01 },
  size: { type: "range", label: "Size", default: 0.5, min: 0, max: 1, step: 0.01 },
  snap: { type: "range", label: "Snap", default: 0.4, min: 0, max: 1, step: 0.01 },
  length: { type: "range", label: "Length", default: 0.35, min: 0, max: 1, step: 0.01 },
  wet: { type: "toggle", label: "Wet ring", default: false },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, r = c.rng(p.seed * 61 + 29);
  const f0 = 300 * Math.pow(2, 1.8 * p.pitch) * (0.95 + 0.1 * r()), rise = 1.8 + 1.6 * p.size + 0.3 * r();
  const st = 0.006 + 0.02 * p.size, dec = 0.015 + 0.06 * p.length, n = c.seconds(dec * 6 + 0.01, sr);
  const body = c.osc("sine", (t) => f0 * (1 + (rise - 1) * (1 - Math.exp(-t / st))), n, sr, { phase: 0.75 + 0.1 * r() });
  c.multiply(body, c.env(n, 0.0008, dec, sr));
  const out = new Float32Array(n + c.seconds(p.wet ? 0.12 : 0.004, sr));
  c.mix(out, body, 0.0005 * r(), 1, sr);
  c.mix(out, c.burst(r, 0.012, "bp", 1500 + 3500 * p.snap, 0.8, 0.0002, 0.0012 + 0.002 * p.snap, sr), 0, 0.1 + 3 * p.snap, sr);
  if (p.wet) c.mix(out, c.ring([[f0 * rise, 0.5], [f0 * rise * 2.1, 0.15]], 0.15, 0.03, sr), 0.004, 0.35, sr);
  c.filter(out, c.biquad("hp", 120, 0.7, sr));
  c.fade(c.finish(out, 0.88), 0.5, sr);
  return { samples: out };
}
