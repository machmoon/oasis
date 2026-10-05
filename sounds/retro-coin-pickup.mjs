// Coin pickup: a two-note chiptune chime. A short first blip jumps (with a tiny chip slide) up to a held second note.
// Each note is an upper-stepped, 4-bit-style enveloped square/pulse/triangle with an octave sparkle and a tucked contact tick, plus optional echo taps.
export const meta = {
  title: "Arcade Coin", kind: "sfx", format: "sound", duration: 0.55, price: 2, author: "quietmachine", payout: "quietmachine@creators.oasis.example", kit: "Retro Arcade", description: "A classic two-note 8-bit coin chime with knobs for waveform, pitch, brightness, interval jump and an echo tail, for pickups, rewards and score ticks.",
  tags: ["coin", "pickup", "8-bit", "chiptune", "arcade", "retro", "reward", "square"],
};
export const params = { knobs: {
  waveform: { type: "choice", label: "Waveform", default: "square", options: ["square", "pulse25", "triangle"] },
  pitch: { type: "range", label: "Pitch", default: 0.5, min: 0, max: 1, step: 0.01 },
  brightness: { type: "range", label: "Brightness", default: 0.6, min: 0, max: 1, step: 0.01 },
  interval: { type: "range", label: "Interval jump", default: 0.3, min: 0, max: 1, step: 0.01 },
  echo: { type: "toggle", label: "Echo tail", default: false },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, wi = params.knobs.waveform.options.indexOf(p.waveform), r = c.rng(p.seed * 613 + 29 + wi * 7);
  const shape = p.waveform === "triangle" ? "tri" : "square";
  const duty = p.waveform === "pulse25" ? 0.23 + r() * 0.04 : 0.5;
  const b = p.brightness;
  const base = 988 * Math.pow(2, (p.pitch - 0.5) * 1.5) * (1 + (r() - 0.5) * 0.016);
  const semis = Math.round(2 + 10 * p.interval);
  const f2 = base * Math.pow(2, semis / 12) * (1 + (r() - 0.5) * 0.008);
  const t1 = 0.06 + r() * 0.018, hold = 0.03 + r() * 0.03, tau = 0.065 + r() * 0.03;
  const slide = 0.02 + r() * 0.05, slideT = 0.003 + r() * 0.005;
  const len2 = hold + tau * 5.2;
  const d = 0.095 + r() * 0.025, taps = 3;
  const dryLen = t1 + len2 + 0.008;
  const total = dryLen + (p.echo ? d * taps + 0.02 : 0);
  const out = new Float32Array(c.seconds(total, sr));
  const note = (f, len, h, tk, at, g, sl) => {
    const n = c.seconds(len, sr);
    const ff = sl ? (t) => f * (1 - sl * Math.exp(-t / slideT)) : f;
    const ff2 = sl ? (t) => 2 * f * (1 - sl * Math.exp(-t / slideT)) : f * 2;
    const x = c.osc(shape, ff, n, sr, { duty }), o = c.osc(shape, ff2, n, sr, { duty: 0.5 });
    const sparkle = 0.06 + 0.3 * b, vib = 0.0015 + r() * 0.003, vr = 8 + r() * 5, slew = 1 - Math.exp(-1 / (0.0008 * sr));
    let es = 0;
    for (let i = 0; i < n; i++) {
      const t = i / sr;
      let e = t < 0.0015 ? t / 0.0015 : t < h ? 1 : Math.exp(-(t - h) / tk);
      if (e > 0.12) e = Math.round(e * 15) / 15;
      es += (e - es) * slew;
      const w = 1 + vib * Math.sin(c.TAU * vr * t) * Math.min(1, t / 0.08);
      x[i] = (x[i] * w + sparkle * o[i]) * es;
    }
    c.fade(x, 3, sr);
    c.mix(out, x, at, g, sr);
  };
  note(base, t1 + 0.015, t1 - 0.004, 0.006, 0.001, 0.8, 0);
  note(f2, len2, hold, tau, t1, 0.85, slide);
  c.mix(out, c.burst(r, 0.004, "hp", 3500 + 3000 * b, 0.8, 0.0004, 0.0012, sr), 0, 0.05 + 0.18 * b, sr);
  c.mix(out, c.burst(r, 0.003, "hp", 4000 + 3000 * b, 0.8, 0.0003, 0.001, sr), t1, 0.03 + 0.1 * b, sr);
  const cut = Math.min(sr * 0.45, 1800 + 13000 * b * b);
  c.filter(out, c.biquad("lp", cut, 0.7, sr));
  c.filter(out, c.biquad("hp", 180, 0.7, sr));
  if (p.echo) {
    const dryN = c.seconds(dryLen, sr);
    for (let k = 1; k <= taps; k++) {
      const tap = out.slice(0, dryN);
      c.filter(tap, c.biquad("lp", Math.max(900, cut / (1 + k * 0.8)), 0.7, sr));
      c.mix(out, tap, d * k, 0.42 * Math.pow(0.55, k - 1), sr);
    }
  }
  c.finish(out, 0.93);
  c.fade(out, 6, sr);
  return { samples: out };
}
