// Electric piano: STK's Rhodey. A body pair (a sine at the note modulating a carrier an octave up) and a tine pair (a
// 15x modulator, fed back on itself, on a fast decay) that gives the metallic bark on the attack; tremolo on the sum.
// After STK src/Rhodey.cpp and include/Rhodey.h tick(): setRatio 1, 0.5, 1, 15; gains fmGains_[99/90/99/67] (src/FM.cpp
// steps 0.933033 per index); decays 1.5, 1.5, 1.0 and 0.25 s; output (1 - control2/2)·body + control2/2·tine, then
// amplitude modulation by the vibrato LFO; base frequency is 2·note as Rhodey::setFrequency sets it (the tine ratio is
// capped below Nyquist at a 22.05 kHz preview). Decays here are exponential (STK ramps linearly) and scale with the Decay knob.
// Hand-written by a Claude Code agent against the factory contract (not built by the factory).
export const meta = {
  title: "Electric Piano", kind: "sfx", format: "sound", duration: 1.7, price: 2, author: "kickdrum", payout: "kickdrum@creators.oasis.example", kit: "Instrument",
  credit: "FM after STK Rhodey.cpp / FM.cpp",
  description: "A Rhodes-style FM electric piano note with note, brightness, tine bark, decay and tremolo as knobs, for lo-fi chords, lounge cues and soft game menus.",
  tags: ["electric piano", "rhodes", "ep", "fm", "keys", "lofi", "instrument", "synth"],
};
export const params = { knobs: {
  note: { type: "choice", label: "Note", default: "C4", options: ["C4", "E4", "G4", "A3", "F3", "D4", "C5"] },
  brightness: { type: "range", label: "Brightness", default: 0.45, min: 0, max: 1, step: 0.01 },
  tine: { type: "range", label: "Tine bark", default: 0.5, min: 0, max: 1, step: 0.01 },
  decay: { type: "range", label: "Decay (s)", default: 1.5, min: 0.3, max: 3, step: 0.05 },
  tremolo: { type: "range", label: "Tremolo", default: 0.2, min: 0, max: 1, step: 0.01 },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, r = c.rng(p.seed * 151 + 41), TAU = 6.283185307179586;
  const m = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[p.note[0]] + 12 * (+p.note.slice(-1) + 1);
  const f = 440 * Math.pow(2, (m - 69) / 12) * Math.pow(2, (r() - 0.5) * 0.004);
  const fg = (i) => Math.pow(0.933033, 99 - i), g0 = fg(99), g1 = fg(90) * TAU * (0.4 + 2.2 * p.brightness), g2 = fg(99), g3 = fg(67) * TAU * (0.5 + 3 * p.tine);
  const c2 = 0.15 + 0.7 * p.tine, D = p.decay, n = c.seconds(D + 0.05, sr), out = new Float32Array(n);
  const b = 2 * f, s0 = b / sr, s1 = b * 0.5 / sr, s2 = b / sr, s3 = b * Math.min(15, 0.45 * sr / b) * (1 + (r() - 0.5) * 0.01) / sr;
  let q0 = r(), q1 = r(), q2 = r(), q3 = r(), last = 0, e0 = 1, e1 = 1, e2 = 1, e3 = 1;
  const k0 = Math.exp(-6.9 / (D * sr)), k1 = Math.exp(-6.9 / (D * sr)), k2 = Math.exp(-6.9 / (D * 0.67 * sr)), k3 = Math.exp(-6.9 / (D * 0.17 * sr));
  const vr = (4.5 + r()) / sr, vd = 0.35 * p.tremolo, at = 0.002 * sr;
  let vq = r();
  for (let i = 0; i < n; i++) {
    q0 += s0; q1 += s1; q2 += s2; q3 += s3; vq += vr;
    if (q0 >= 1) q0 -= 1; if (q1 >= 1) q1 -= 1; if (q2 >= 1) q2 -= 1; if (q3 >= 1) q3 -= 1; if (vq >= 1) vq -= 1;
    const mb = g1 * e1 * Math.sin(TAU * q1), mt = g3 * e3 * Math.sin(TAU * q3 + last * 0.5); last = mt;
    const y = (1 - c2 * 0.5) * g0 * e0 * Math.sin(TAU * q0 + mb) + c2 * 0.5 * g2 * e2 * Math.sin(TAU * q2 + mt);
    out[i] = y * (1 + vd * Math.sin(TAU * vq)) * (i < at ? i / at : 1);
    e0 *= k0; e1 *= k1; e2 *= k2; e3 *= k3;
  }
  c.mix(out, c.burst(r, 0.02, "bp", 2500, 0.8, 0.0004, 0.004, sr), 0, 0.03 + 0.06 * p.tine, sr);
  const tl = c.seconds(0.06, sr);
  for (let i = 0; i < tl; i++) out[n - 1 - i] *= i / tl;
  c.fade(c.finish(out, 0.88), 1, sr);
  return { samples: out };
}
