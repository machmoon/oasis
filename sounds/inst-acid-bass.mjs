// Acid bass: a TB-303 style note. A saw or square through the 303 ladder (four coupled one-pole stages with the
// resonance fed back through a 150 Hz highpass), cutoff swept by an exponential envelope, amp boosted by that envelope.
// Filter is Open303's TB_303 mode (RobinSchmidt/Open303 Source/DSPCode/rosic_TeeBeeFilter.h: getSample and the
// calculateCoefficientsApprox4 b0/k/g fit; resonanceSkewed = (1 - e^-3r) / (1 - e^-3)); cutoff = cutoff·2^(envMod·env)
// and amp += 0.45·env after rosic_Open303.h getSample. Coefficients refresh every 8 samples instead of every sample.
// Hand-written by a Claude Code agent against the factory contract (not built by the factory).
export const meta = {
  title: "Acid Bass", kind: "sfx", format: "sound", duration: 0.5, price: 3, author: "kickdrum", payout: "kickdrum@creators.oasis.example", kit: "Instrument",
  credit: "TB-303 filter after Open303 rosic_TeeBeeFilter.h (TB_303 mode) and rosic_Open303.h",
  description: "A squelchy 303-style acid bass note with note, waveform, cutoff, resonance, envelope amount and release as knobs, for acid lines, techno cues and arcade boss themes.",
  tags: ["acid", "303", "bass", "squelch", "resonant", "techno", "instrument", "synth"],
};
export const params = { knobs: {
  note: { type: "choice", label: "Note", default: "C2", options: ["C2", "D2", "E2", "G2", "A2", "C3", "A1"] },
  wave: { type: "choice", label: "Waveform", default: "saw", options: ["saw", "square"] },
  cutoff: { type: "range", label: "Cutoff (Hz)", default: 400, min: 120, max: 2400, step: 10 },
  resonance: { type: "range", label: "Resonance", default: 0.75, min: 0, max: 1, step: 0.01 },
  envmod: { type: "range", label: "Env amount", default: 0.6, min: 0, max: 1, step: 0.01 },
  release: { type: "range", label: "Release (s)", default: 0.12, min: 0.02, max: 0.8, step: 0.01 },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, r = c.rng(p.seed * 733 + 3), TAU = 6.283185307179586;
  const m = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[p.note[0]] + 12 * (+p.note.slice(-1) + 1);
  const f = 440 * Math.pow(2, (m - 69) / 12) * Math.pow(2, (r() - 0.5) * 0.008);
  const hold = 0.32, n = c.seconds(hold + p.release + 0.02, sr), out = new Float32Array(n);
  const rs = (1 - Math.exp(-3 * p.resonance)) / (1 - Math.exp(-3)), oct = 4.5 * p.envmod * (0.9 + 0.2 * r());
  const ek = Math.exp(-1 / ((0.12 + 0.12 * r()) * sr)), hpA = Math.exp(-TAU * 150 / sr);
  const sq = p.wave === "square", hi = sr * 0.22, rel0 = hold * sr, rl = p.release * sr, at = 0.003 * sr;
  let ph = r(), e = 1, y1 = 0, y2 = 0, y3 = 0, y4 = 0, hx = 0, hy = 0, b0 = 0, k = 0, g = 1, lp = 0;
  for (let i = 0; i < n; i++) {
    if ((i & 7) === 0) {
      const fc = Math.min(hi, p.cutoff * Math.pow(2, oct * e)), fx = fc / sr * 0.7071067811865476;
      b0 = (0.00045522346 + 6.1922189 * fx) / (1 + 12.358354 * fx + 4.4156345 * fx * fx);
      k = fx * (fx * (fx * (fx * (fx * (fx + 7198.6997) - 5837.7917) - 476.47308) + 614.95611) + 213.87126) + 16.998792;
      g = k / 17; g = ((g - 1) * rs + 1) * (1 + rs); k *= rs;
    }
    ph += f / sr; if (ph >= 1) ph -= 1;
    const osc = sq ? (ph < 0.5 ? 1 : -1) : 1 - 2 * ph;
    lp += 0.5 * (osc - lp); // tame naive-oscillator aliasing a little before the ladder
    const fb = k * y4; hy = hpA * (hy + fb - hx); hx = fb; // feedback highpass (one-pole, 150 Hz)
    const y0 = lp - hy;
    y1 += 2 * b0 * (y0 - y1 + y2); y2 += b0 * (y1 - 2 * y2 + y3); y3 += b0 * (y2 - 2 * y3 + y4); y4 += b0 * (y3 - 2 * y4);
    let amp = i < at ? i / at : 1; if (i > rel0) amp *= Math.max(0, 1 - (i - rel0) / rl);
    out[i] = 2 * g * y4 * amp * (1 + 0.45 * e); e *= ek;
  }
  c.filter(out, c.biquad("hp", 35, 0.7, sr));
  c.fade(c.finish(out, 0.9, 1.4), 2, sr);
  return { samples: out };
}
