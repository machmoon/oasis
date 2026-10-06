// Warm pad: a supersaw. Five saws spread evenly in cents around the note plus a sine an octave down, through a
// gentle lowpass that breathes on a slow LFO, under a slow attack / sustain / long release and a small room.
// Voice spread after Tone.js Tone/source/oscillator/FatOscillator.ts (detune = -spread/2 + i·spread/(count-1), each
// voice at -6 - count·1.1 dB); start phases come from the seed instead of FatOscillator's even i/count offsets, so
// every take is a new stack. Envelope stages after STK src/ADSR.cpp.
// Hand-written by a Claude Code agent against the factory contract (not built by the factory).
export const meta = {
  title: "Warm Pad", kind: "sfx", format: "sound", duration: 2.4, price: 3, author: "kickdrum", payout: "kickdrum@creators.oasis.example", kit: "Instrument",
  credit: "Supersaw spread after Tone.js FatOscillator.ts; envelope after STK ADSR.cpp",
  description: "A soft detuned supersaw pad note with note, brightness, attack, release and detune as knobs, for menu beds, title cards and slow synth chords.",
  tags: ["pad", "supersaw", "warm", "chord", "ambient", "synth", "instrument", "detune"],
};
export const params = { knobs: {
  note: { type: "choice", label: "Note", default: "C3", options: ["C3", "E3", "G3", "A2", "F3", "D3", "C4"] },
  brightness: { type: "range", label: "Brightness", default: 0.4, min: 0, max: 1, step: 0.01 },
  attack: { type: "range", label: "Attack (s)", default: 0.45, min: 0.02, max: 1.2, step: 0.01 },
  release: { type: "range", label: "Release (s)", default: 0.9, min: 0.15, max: 1.8, step: 0.01 },
  detune: { type: "range", label: "Detune (cents)", default: 22, min: 0, max: 60, step: 1 },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, r = c.rng(p.seed * 521 + 17);
  const m = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[p.note[0]] + 12 * (+p.note.slice(-1) + 1);
  const f = 440 * Math.pow(2, (m - 69) / 12);
  const hold = 0.8, n = c.seconds(p.attack + hold + p.release, sr), out = new Float32Array(n);
  const N = 5, st = [], ph = [];
  for (let i = 0; i < N; i++) { st.push(f * Math.pow(2, (-p.detune / 2 + i * p.detune / (N - 1) + (r() - 0.5) * 3) / 1200) / sr); ph.push(r()); }
  const s0 = st[0], s1 = st[1], s2 = st[2], s3 = st[3], s4 = st[4], sub = f / 2 / sr;
  let p0 = ph[0], p1 = ph[1], p2 = ph[2], p3 = ph[3], p4 = ph[4], ps = r();
  const a = p.attack * sr, rs = (p.attack + hold) * sr, rl = p.release * sr, vg = Math.pow(10, (-6 - N * 1.1) / 20);
  for (let i = 0; i < n; i++) {
    p0 += s0; p1 += s1; p2 += s2; p3 += s3; p4 += s4; ps += sub;
    if (p0 >= 1) p0 -= 1; if (p1 >= 1) p1 -= 1; if (p2 >= 1) p2 -= 1; if (p3 >= 1) p3 -= 1; if (p4 >= 1) p4 -= 1; if (ps >= 1) ps -= 1;
    const e = i < a ? i / a : i < rs ? 1 : Math.max(0, 1 - (i - rs) / rl);
    out[i] = ((p0 + p1 + p2 + p3 + p4) * 2 - 5) * vg * e + Math.sin(6.283185307179586 * ps) * 0.18 * e;
  }
  // two one-pole lowpasses whose cutoff breathes: it follows the attack a little and a slow seeded LFO
  const base = 300 + 3800 * p.brightness * p.brightness, rate = 0.25 + 0.35 * r(), lph = r() * 6.28, la = c.onepole(sr), lb = c.onepole(sr);
  let fc = base;
  for (let i = 0; i < n; i++) {
    if ((i & 63) === 0) { const t = i / sr; fc = base * (1 + 0.3 * Math.sin(6.283185307179586 * rate * t + lph)) * (0.6 + 0.4 * Math.min(1, t / Math.max(0.05, p.attack))); }
    out[i] = lb(la(out[i], fc), fc * 1.5);
  }
  const wet = c.reverb(out, { size: 0.5, decay: 0.55, mixAmt: 0.22 }, sr);
  c.fade(c.finish(wet, 0.88), 6, sr);
  return { samples: wet };
}
