// Send whoosh: a message leaving. A rising band of noise that accelerates away (the filter centre and the level both
// climb, then cut off fast), a pitched glide riding the same curve, and a small "away" tick at the end of the flight.
// The rising sweep is jsfxr sfxr.js's p_freq_ramp with p_freq_dramp (the slide itself accelerating) applied to a
// noise band and a sine; the noise is the kit's pink. The tick is a kit noise grain.
// Hand-written by a Claude Code agent against the factory contract (not built by the factory).
export const meta = {
  title: "Send Whoosh", kind: "ui", format: "sound", duration: 0.3, price: 1, author: "quietmachine", payout: "quietmachine@creators.oasis.example", kit: "Interface",
  credit: "Accelerating slide after jsfxr sfxr.js p_freq_ramp / p_freq_dramp",
  description: "A quick rising send whoosh with length, pitch, brightness and tone as knobs, for sent messages, uploads, shared posts and launched actions.",
  tags: ["send", "whoosh", "sent", "message", "upload", "ui", "swoosh", "interface"],
};
export const params = { knobs: {
  length: { type: "range", label: "Length", default: 0.4, min: 0, max: 1, step: 0.01 },
  pitch: { type: "range", label: "Pitch", default: 0.5, min: 0, max: 1, step: 0.01 },
  brightness: { type: "range", label: "Brightness", default: 0.5, min: 0, max: 1, step: 0.01 },
  tone: { type: "range", label: "Tone", default: 0.5, min: 0, max: 1, step: 0.01 },
  tick: { type: "toggle", label: "Away tick", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, r = c.rng(p.seed * 239 + 43), TAU = 6.283185307179586;
  const dur = 0.14 + 0.32 * p.length + 0.02 * r(), n = c.seconds(dur + 0.04, sr), m = c.seconds(dur, sr);
  const src = c.pink(r, n), out = new Float32Array(n);
  const lo = 350 + 500 * p.brightness, hi = lo * (5 + 4 * p.brightness), top = sr * 0.16, curve = 1.6 + 0.6 * r();
  let low = 0, band = 0, ff = 0, ph = r();
  const f0 = 280 * Math.pow(2, 1.3 * p.pitch), f1 = f0 * 3, tg = 0.04 + 0.4 * p.tone, cut = c.seconds(0.012, sr);
  for (let i = 0; i < m; i++) {
    const t = i / m, s = Math.pow(t, curve);
    if ((i & 15) === 0) ff = 2 * Math.sin(Math.PI * Math.min(top, lo * Math.pow(hi / lo, s)) / sr);
    low += ff * band; const high = src[i] - low - 0.7 * band; band += ff * high;
    ph += (f0 + (f1 - f0) * s) / sr; if (ph >= 1) ph -= 1;
    const e = (0.15 + 0.85 * s) * Math.min(1, i / (0.01 * sr)) * Math.min(1, (m - i) / cut);
    out[i] = (band + tg * Math.sin(TAU * ph)) * e;
  }
  if (p.tick) c.mix(out, c.burst(r, 0.012, "bp", 2500 + 2500 * p.brightness, 1.2, 0.0003, 0.002, sr), dur - 0.006, 1.1, sr);
  c.filter(out, c.biquad("hp", 160, 0.7, sr));
  c.fade(c.finish(out, 0.88), 1, sr);
  return { samples: out };
}
