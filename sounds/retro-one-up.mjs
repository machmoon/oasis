// Retro One-Up: a cheerful six-note extra-life jingle; band-limited chip voices with gated envelopes, a sparkle layer of bright bell partials and ticks, a volume swell, a vibrato hold on the top note and an optional tempo-synced echo.
export const meta = {
  title: "Retro One-Up", kind: "sfx", format: "sound", duration: 0.9, price: 3, author: "quietmachine", payout: "quietmachine@creators.oasis.example", kit: "Retro Arcade", description: "A bright six-note 8-bit extra-life jingle whose waveform, key, tempo, sparkle, swell and echo are knobs, for arcade pickups, 1-ups and reward stingers.",
  tags: ["1up", "extra-life", "jingle", "chiptune", "8-bit", "arcade", "reward", "retro"],
};
export const params = { knobs: {
  waveform: { type: "choice", label: "Waveform", default: "square", options: ["square", "pulse25", "triangle"] },
  key: { type: "range", label: "Key (semitones)", default: 0, min: -7, max: 7, step: 1 },
  rate: { type: "range", label: "Tempo rate", default: 1, min: 0.6, max: 1.8, step: 0.05 },
  sparkle: { type: "range", label: "Sparkle", default: 0.4, min: 0, max: 1, step: 0.01 },
  swell: { type: "range", label: "Volume swell", default: 0.3, min: 0, max: 1, step: 0.01 },
  echo: { type: "toggle", label: "Echo tail", default: false },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, ny = 0.45 * sr, r = c.rng(p.seed * 4111 + params.knobs.waveform.options.indexOf(p.waveform) * 53 + 9);
  const wf = p.waveform, root = 659.25 * Math.pow(2, p.key / 12), steps = [0, 3, 12, 8, 10, 15];
  const harmonics = (f) => {
    const hs = [], K = Math.min(30, Math.floor(ny / (f * 1.03)));
    for (let k = 1; k <= K; k++) {
      if (wf === "square" && k % 2) hs.push([k, 4 / (Math.PI * k), 0]);
      else if (wf === "triangle" && k % 2) hs.push([k, (8 / (Math.PI * Math.PI)) * ((k - 1) % 4 ? -1 : 1) / (k * k), 0]);
      else if (wf === "pulse25") hs.push([k, 2 * Math.sin(Math.PI * k * 0.25) / (Math.PI * k), Math.PI / 2 - Math.PI * k * 0.25]);
    }
    return hs;
  };
  const voice = (f, m, vib) => {
    const x = new Float32Array(m), hs = harmonics(f);
    let ph = 0;
    for (let i = 0; i < m; i++) {
      const t = i / sr;
      ph += (vib ? f * (1 + vib[1] * Math.min(1, t / 0.08) * Math.sin(c.TAU * vib[0] * t)) : f) / sr;
      const a = c.TAU * (ph - Math.floor(ph));
      let s = 0;
      for (let h = 0; h < hs.length; h++) s += hs[h][1] * Math.sin(a * hs[h][0] + hs[h][2]);
      x[i] = s;
    }
    return x;
  };
  const step = (0.085 / p.rate) * (0.97 + 0.06 * r());
  const onsets = [], lens = [];
  let t = 0.002;
  for (let k = 0; k < 6; k++) {
    onsets.push(t);
    lens.push(k === 5 ? 0.34 / Math.sqrt(p.rate) : step * (0.86 + 0.08 * r()));
    t += step * (0.96 + 0.08 * r());
  }
  const D = Math.round(sr * step * 1.5), fb = 0.45, repeats = 6;
  const tailEnd = onsets[5] + lens[5] + 0.06;
  const n = c.seconds(tailEnd, sr) + (p.echo ? D * repeats : 0), out = new Float32Array(n);
  const vib = [5.2 + 1.6 * r(), 0.008 + 0.006 * r()];
  for (let k = 0; k < 6; k++) {
    const f = root * Math.pow(2, steps[k] / 12) * Math.pow(2, (r() - 0.5) * 0.06 / 12);
    const len = lens[k], last = k === 5, m = c.seconds(len + 0.03, sr);
    const x = voice(f, m, last ? vib : null);
    const att = c.seconds(0.0025, sr), rel = c.seconds(0.022, sr), gate = c.seconds(len, sr), tau = last ? len * 0.3 : len * 2.5;
    for (let i = 0; i < m; i++) {
      let e = Math.exp(-i / sr / tau);
      if (i < att) e *= i / att;
      if (i > gate) e *= Math.max(0, 1 - (i - gate) / rel);
      x[i] *= e;
    }
    const level = (1 - p.swell * 0.75 * (1 - k / 5)) * (0.92 + 0.16 * r());
    c.mix(out, x, onsets[k], (wf === "triangle" ? 0.8 : 0.45) * level, sr);
    if (p.sparkle > 0) {
      const d = 1 + (r() - 0.5) * 0.02;
      const modes = [[f * 4 * d, 1], [f * 6.03 * d, 0.45], [f * 8.1, 0.2]].filter((m2) => m2[0] < ny);
      if (modes.length) c.mix(out, c.ring(modes, 0.12, 0.03 + 0.04 * p.sparkle, sr), onsets[k] + 0.001, 0.28 * p.sparkle * level, sr);
      c.mix(out, c.burst(r, 0.006, "hp", Math.min(ny * 0.8, 6000 + 3000 * r()), 0.8, 0.0004, 0.0015, sr), onsets[k], 0.25 * p.sparkle * level, sr);
      if (last) for (let s = 0; s < 6; s++) {
        let fs = f * (2 + Math.round(r() * 3)) * (1 + (r() - 0.5) * 0.01);
        while (fs * 2.01 > ny) fs *= 0.5;
        c.mix(out, c.ring([[fs, 1], [fs * 2.01, 0.3]], 0.08, 0.02, sr), onsets[k] + 0.03 + s * len * 0.11 + r() * 0.01, 0.14 * p.sparkle * (1 - s / 7), sr);
      }
    }
  }
  if (p.echo) {
    const lp = c.onepole(sr), y = new Float32Array(n);
    for (let i = 0; i < n; i++) y[i] = out[i] + (i >= D ? fb * lp(y[i - D], 3800) : 0);
    for (let i = 0; i < n; i++) out[i] = 0.8 * out[i] + 0.7 * (y[i] - out[i]);
  }
  c.filter(out, c.biquad("hp", 35, 0.7, sr));
  c.finish(out, 0.88, 1.1);
  c.fade(out, p.echo ? 40 : 4, sr);
  return { samples: out };
}
