// Swipe: a quick finger-on-glass gesture. Pink noise through a resonant state-variable bandpass whose centre sweeps
// across the gesture (up for a forward swipe, down for a back swipe), a faint pitched "air" tone following it, and a
// rise-then-fall envelope with the peak late in the motion so it reads as moving, not hitting.
// The sweep is jsfxr sfxr.js's moving filter (p_lpf_freq with p_lpf_ramp / p_hpf_ramp) on a noise source; the noise
// is pink (Tone.js Noise.ts, in the kit) rather than sfxr's white, so the swipe is softer.
// Hand-written by a Claude Code agent against the factory contract (not built by the factory).
export const meta = {
  title: "Swipe Gesture", kind: "ui", format: "sound", duration: 0.22, price: 1, author: "quietmachine", payout: "quietmachine@creators.oasis.example", kit: "Interface",
  credit: "Filter sweep after jsfxr sfxr.js p_lpf_ramp / p_hpf_ramp",
  description: "A soft swipe whoosh with direction, speed, brightness and tone as knobs, for page swipes, card dismissals, carousels and drawer slides.",
  tags: ["swipe", "whoosh", "gesture", "slide", "page", "ui", "transition", "interface"],
};
export const params = { knobs: {
  direction: { type: "choice", label: "Direction", default: "forward", options: ["forward", "back"] },
  speed: { type: "range", label: "Speed", default: 0.5, min: 0, max: 1, step: 0.01 },
  brightness: { type: "range", label: "Brightness", default: 0.5, min: 0, max: 1, step: 0.01 },
  tone: { type: "range", label: "Tone", default: 0.25, min: 0, max: 1, step: 0.01 },
  resonance: { type: "range", label: "Resonance", default: 0.4, min: 0, max: 1, step: 0.01 },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, r = c.rng(p.seed * 191 + 23), fwd = p.direction === "forward";
  const dur = 0.32 - 0.22 * p.speed + 0.02 * r(), n = c.seconds(dur, sr), src = c.pink(r, n), out = new Float32Array(n);
  const lo = 500 + 900 * p.brightness, hi = lo * (3 + 3 * p.brightness), Q = 0.7 + 4 * p.resonance, peak = 0.55 + 0.15 * r();
  // state-variable bandpass, its centre moved every 16 samples (the filter keeps its state across the sweep)
  let low = 0, band = 0, ff = 0;
  const qd = 1 / Q, top = sr * 0.16;
  for (let i = 0; i < n; i++) {
    if ((i & 15) === 0) { const t = i / n, sw = fwd ? t : 1 - t; ff = 2 * Math.sin(Math.PI * Math.min(top, lo * Math.pow(hi / lo, sw)) / sr); }
    low += ff * band; const high = src[i] - low - qd * band; band += ff * high;
    out[i] = band;
  }
  const env = new Float32Array(n);
  for (let i = 0; i < n; i++) { const t = i / n; env[i] = t < peak ? Math.pow(t / peak, 1.6) : Math.pow((1 - t) / (1 - peak), 1.2); }
  c.multiply(out, env);
  if (p.tone > 0) {
    const f0 = 300 + 500 * p.brightness, f1 = f0 * 2.2, tw = c.osc("sine", (t) => fwd ? f0 + (f1 - f0) * t / dur : f1 - (f1 - f0) * t / dur, n, sr, { phase: r() });
    c.multiply(tw, env); c.mix(out, tw, 0, 0.08 * p.tone, sr);
  }
  c.filter(out, c.biquad("hp", 150, 0.7, sr));
  c.fade(c.finish(out, 0.88), 1, sr);
  return { samples: out };
}
