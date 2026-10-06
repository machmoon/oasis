// Sub bass: a sine at the note with a short downward pitch "punch", an octave sine for definition, a tanh drive that
// grows odd harmonics, all under a linear attack / decay-to-sustain / release envelope.
// Envelope after STK src/ADSR.cpp (linear ATTACK to 1, DECAY to the sustain level, RELEASE to 0, one rate per stage);
// the pitch punch is jsfxr sfxr.js's period slide (p_freq_ramp), run over Hz.
// Hand-written by a Claude Code agent against the factory contract (not built by the factory).
export const meta = {
  title: "Sub Bass", kind: "sfx", format: "sound", duration: 0.9, price: 2, author: "kickdrum", payout: "kickdrum@creators.oasis.example", kit: "Instrument",
  credit: "Envelope after STK ADSR.cpp; pitch slide after jsfxr sfxr.js",
  description: "A deep sine sub bass note with note, drive, attack, release and punch as knobs, for bass lines under electronic, trap and ambient game scores.",
  tags: ["sub", "bass", "sine", "808", "low", "note", "instrument", "synth"],
};
export const params = { knobs: {
  note: { type: "choice", label: "Note", default: "C2", options: ["C2", "E2", "G2", "A1", "F1", "D2", "E1"] },
  drive: { type: "range", label: "Drive", default: 0.3, min: 0, max: 1, step: 0.01 },
  attack: { type: "range", label: "Attack (s)", default: 0.008, min: 0.002, max: 0.3, step: 0.001 },
  release: { type: "range", label: "Release (s)", default: 0.35, min: 0.05, max: 1.5, step: 0.01 },
  punch: { type: "range", label: "Punch", default: 0.4, min: 0, max: 1, step: 0.01 },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, r = c.rng(p.seed * 389 + 5);
  const m = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[p.note[0]] + 12 * (+p.note.slice(-1) + 1);
  const f = 440 * Math.pow(2, (m - 69) / 12) * Math.pow(2, (r() - 0.5) * 0.006);
  const hold = 0.5, n = c.seconds(p.attack + hold + p.release, sr), out = new Float32Array(n);
  const up = 1 + 1.5 * p.punch, pt = 0.012 + 0.02 * r(), drift = (r() - 0.5) * 0.004, ph0 = r();
  let ph = ph0, ph2 = ph0 * 2 + 0.25;
  const k = 1 + 6 * p.drive * p.drive, norm = 1 / Math.tanh(k), oct = 0.12 + 0.35 * p.drive;
  const a = p.attack * sr, d = 0.15 * sr, sus = 0.8, rs = (p.attack + hold) * sr, rl = p.release * sr;
  let e = 0, pe = 1;
  const pk = Math.exp(-1 / (pt * sr));
  for (let i = 0; i < n; i++) {
    const hz = f * (1 + (up - 1) * pe) * (1 + drift * i / n); pe *= pk;
    ph += hz / sr; ph2 += 2 * hz / sr; if (ph >= 1) ph -= 1; if (ph2 >= 1) ph2 -= 1;
    if (i < a) e = i / a; else if (i < a + d) e = 1 - (1 - sus) * (i - a) / d; else if (i < rs) e = sus; else e = sus * Math.max(0, 1 - (i - rs) / rl);
    const x = Math.sin(6.283185307179586 * ph) + oct * Math.sin(6.283185307179586 * ph2);
    out[i] = Math.tanh(k * x * 0.8) * norm * e;
  }
  c.mix(out, c.burst(r, 0.012, "bp", 900 + 1800 * p.drive, 0.9, 0.0005, 0.003, sr), 0, 0.08 + 0.25 * p.punch, sr);
  c.filter(out, c.biquad("hp", 22, 0.7, sr));
  c.fade(c.finish(out, 0.9), 2, sr);
  return { samples: out };
}
