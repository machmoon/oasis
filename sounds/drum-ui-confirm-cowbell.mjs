// Confirm chime: a two-tone analogue cowbell blip (808-style pair of detuned square oscillators through a bandpass); a short first note steps up by a musical interval into a longer second note, with a click attack and an optional sparkle of inharmonic high partials.
export const meta = {
  title: "Cowbell Confirm", kind: "ui", format: "sound", duration: 0.6, price: 1, author: "quietmachine", payout: "quietmachine@creators.oasis.example", kit: "Drum Machine", description: "A two-tone confirm chime made from analogue cowbell blips, rising by a fifth, octave or third; for menu accepts, console acknowledgements and arcade pickups.",
  tags: ["confirm", "chime", "cowbell", "ui", "blip", "arcade", "console", "drum-machine"],
};
export const params = { knobs: {
  interval: { type: "choice", label: "Interval", default: "fifth", options: ["fifth", "octave", "third"] },
  pitch: { type: "range", label: "Pitch", default: 0.5, min: 0, max: 1, step: 0.01 },
  decay: { type: "range", label: "Decay", default: 0.5, min: 0, max: 1, step: 0.01 },
  sparkle: { type: "range", label: "Sparkle", default: 0.4, min: 0, max: 1, step: 0.01 },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, r = c.rng(p.seed * 613 + 29);
  const ratio = { fifth: 1.5, octave: 2, third: 1.25 }[p.interval];
  const base = 440 * Math.pow(2, p.pitch * 1.5 - 0.5) * (0.99 + r() * 0.02);
  const dec = 0.03 + 0.1 * p.decay;
  const gap = 0.09 + r() * 0.008;
  const total = c.seconds(gap + dec * 4.5 + 0.06, sr), out = new Float32Array(total);
  const blip = (f, d, len) => {
    const n = c.seconds(len, sr);
    const a = c.osc("square", f, n, sr), b = c.osc("square", f * 1.504 * (0.998 + r() * 0.004), n, sr);
    const bp = c.biquad("bp", f * 2.2, 1.8, sr), body = new Float32Array(n);
    const e = c.env(n, 0.001, d, sr), e2 = c.env(n, 0.001, d * 0.3, sr);
    for (let i = 0; i < n; i++) body[i] = bp(a[i] + b[i]) * (0.6 * e[i] + 0.4 * e2[i]);
    const m = new Float32Array(n);
    c.mix(m, body, 0, 1.4, sr);
    c.mix(m, c.burst(r, 0.006, "hp", 4000, 0.8, 0.0003, 0.002, sr), 0, 0.35, sr);
    const sp = c.ring([[f * 4.07, 1], [f * 5.93, 0.7], [f * 8.11, 0.5]], d * 3, d * (0.3 + 0.5 * p.sparkle), sr);
    c.mix(m, sp, 0.001, 0.05 + 0.4 * p.sparkle, sr);
    return c.fade(m, 6, sr);
  };
  c.mix(out, blip(base, dec * 0.6, gap + 0.012), 0, 0.75 + r() * 0.05, sr);
  c.mix(out, blip(base * ratio, dec, dec * 4.5), gap, 1, sr);
  c.filter(out, c.biquad("lp", 5000 + 7000 * p.sparkle, 0.7, sr));
  c.finish(out, 0.85, 1.1);
  c.fade(out, 8, sr);
  return { samples: out };
}
