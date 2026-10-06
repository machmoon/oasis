// String ensemble: a string-machine section. Three detuned saws plus one an octave up, through a lowpass and a
// body highpass, a slow bowed attack and long release, then an ensemble chorus: three modulated delay taps whose
// LFOs sit 120 degrees apart, mixed with the dry signal.
// Chorus after Tone.js Tone/effect/Chorus.ts (getDefaults: frequency 1.5 Hz, delayTime 3.5 ms, depth 0.7; the delay
// swings delayTime ± delayTime·depth); three taps at 120° instead of Chorus's two at a 180° spread, for a mono
// string-machine ensemble. Envelope stages after STK src/ADSR.cpp.
// Hand-written by a Claude Code agent against the factory contract (not built by the factory).
export const meta = {
  title: "String Ensemble", kind: "sfx", format: "sound", duration: 2.3, price: 3, author: "kickdrum", payout: "kickdrum@creators.oasis.example", kit: "Instrument",
  credit: "Ensemble chorus after Tone.js Chorus.ts; envelope after STK ADSR.cpp",
  description: "A lush string-machine section note with note, brightness, bow attack, release and ensemble depth as knobs, for synthwave swells, sci-fi title cards and soft orchestral beds.",
  tags: ["strings", "ensemble", "string machine", "solina", "pad", "chorus", "instrument", "synth"],
};
export const params = { knobs: {
  note: { type: "choice", label: "Note", default: "C4", options: ["C4", "E4", "G4", "A3", "F3", "C3", "C5"] },
  brightness: { type: "range", label: "Brightness", default: 0.45, min: 0, max: 1, step: 0.01 },
  attack: { type: "range", label: "Bow attack (s)", default: 0.35, min: 0.02, max: 1.2, step: 0.01 },
  release: { type: "range", label: "Release (s)", default: 0.8, min: 0.1, max: 1.8, step: 0.01 },
  ensemble: { type: "range", label: "Ensemble", default: 0.7, min: 0, max: 1, step: 0.01 },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, r = c.rng(p.seed * 359 + 47), TAU = 6.283185307179586;
  const m = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[p.note[0]] + 12 * (+p.note.slice(-1) + 1);
  const f = 440 * Math.pow(2, (m - 69) / 12);
  const hold = 0.8, n = c.seconds(p.attack + hold + p.release, sr), dry = new Float32Array(n);
  const s0 = f * Math.pow(2, -(7 + r()) / 1200) / sr, s1 = f / sr, s2 = f * Math.pow(2, (7 + r()) / 1200) / sr, s3 = 2 * f * Math.pow(2, (r() - 0.5) * 8 / 1200) / sr;
  let q0 = r(), q1 = r(), q2 = r(), q3 = r();
  const a = p.attack * sr, rs = (p.attack + hold) * sr, rl = p.release * sr, oc = 0.25 + 0.4 * p.brightness;
  for (let i = 0; i < n; i++) {
    q0 += s0; q1 += s1; q2 += s2; q3 += s3;
    if (q0 >= 1) q0 -= 1; if (q1 >= 1) q1 -= 1; if (q2 >= 1) q2 -= 1; if (q3 >= 1) q3 -= 1;
    const e = i < a ? Math.sqrt(i / a) : i < rs ? 1 : Math.max(0, 1 - (i - rs) / rl);
    dry[i] = (2 * (q0 + q1 + q2) - 3 + oc * (2 * q3 - 1)) * e * 0.3;
  }
  c.filter(dry, c.biquad("lp", 900 + 5200 * p.brightness * p.brightness, 0.8, sr));
  c.filter(dry, c.biquad("lp", 1400 + 7000 * p.brightness, 0.6, sr));
  c.filter(dry, c.biquad("hp", 180, 0.7, sr));
  // ensemble: three taps around 3.5 ms, swinging ±3.5·depth ms at 1.5 Hz, 120° apart, plus a faster 6 Hz shimmer
  const D = 0.0035 * sr, dev = D * 0.9 * p.ensemble, out = new Float32Array(n);
  const w1 = TAU * (1.2 + 0.6 * r()) / sr, w2 = TAU * (5.5 + r()) / sr, lph = r() * TAU, wet = 0.25 + 0.5 * p.ensemble;
  let d0 = D, d1 = D, d2 = D;
  for (let i = 0; i < n; i++) {
    if ((i & 7) === 0) {
      const u = w1 * i + lph, v = w2 * i + lph;
      d0 = D + dev * (Math.sin(u) + 0.15 * Math.sin(v)); d1 = D + dev * (Math.sin(u + 2.0943951) + 0.15 * Math.sin(v + 2.0943951)); d2 = D + dev * (Math.sin(u + 4.1887902) + 0.15 * Math.sin(v + 4.1887902));
    }
    let y = 0, j = i - d0, j0 = j | 0, fr = j - j0;
    if (j0 >= 0) y += dry[j0] + (dry[j0 + 1] - dry[j0]) * fr;
    j = i - d1; j0 = j | 0; fr = j - j0; if (j0 >= 0) y += dry[j0] + (dry[j0 + 1] - dry[j0]) * fr;
    j = i - d2; j0 = j | 0; fr = j - j0; if (j0 >= 0) y += dry[j0] + (dry[j0 + 1] - dry[j0]) * fr;
    out[i] = dry[i] * (1 - wet * 0.6) + y * wet * 0.45;
  }
  const tl = c.seconds(0.05, sr);
  for (let i = 0; i < tl; i++) out[n - 1 - i] *= i / tl;
  c.fade(c.finish(out, 0.88), 3, sr);
  return { samples: out };
}
