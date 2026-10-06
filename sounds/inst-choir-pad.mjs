// Choir pad: a small section singing a vowel. Four saw "glottal" sources, each with its own slight detune and
// vibrato, tilted by a one-zero and a one-pole lowpass, plus breath noise, through four parallel formant resonators
// set from a vowel table; slow attack and release and a hall.
// After STK src/VoicForm.cpp / include/VoicForm.h tick() (onezero zero -0.9, onepole pole 0.9, noise added, the four
// formant filters run in parallel and summed) with formant frequency, radius and gain from STK src/Phonemes.cpp
// (eee, ahh, ohh, ooo rows). Radii are converted to a bandwidth at 44.1 kHz and used as RBJ bandpass Qs.
// Hand-written by a Claude Code agent against the factory contract (not built by the factory).
export const meta = {
  title: "Choir Pad", kind: "sfx", format: "sound", duration: 2.4, price: 3, author: "kickdrum", payout: "kickdrum@creators.oasis.example", kit: "Instrument",
  credit: "Formant voice after STK VoicForm.cpp and Phonemes.cpp",
  description: "A soft synthetic choir singing a held vowel, with note, vowel, attack, release, section spread and breath as knobs, for cathedral moods, fantasy menus and eerie swells.",
  tags: ["choir", "vocal", "pad", "formant", "vowel", "aah", "instrument", "synth"],
};
export const params = { knobs: {
  note: { type: "choice", label: "Note", default: "C4", options: ["C4", "E4", "G4", "A3", "F3", "C3", "D4"] },
  vowel: { type: "choice", label: "Vowel", default: "ahh", options: ["ahh", "ooo", "eee", "ohh"] },
  attack: { type: "range", label: "Attack (s)", default: 0.5, min: 0.05, max: 1.2, step: 0.01 },
  release: { type: "range", label: "Release (s)", default: 0.9, min: 0.15, max: 1.8, step: 0.01 },
  spread: { type: "range", label: "Section spread", default: 0.5, min: 0, max: 1, step: 0.01 },
  breath: { type: "range", label: "Breath", default: 0.3, min: 0, max: 1, step: 0.01 },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, r = c.rng(p.seed * 211 + 59), TAU = 6.283185307179586;
  const m = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[p.note[0]] + 12 * (+p.note.slice(-1) + 1);
  const f = 440 * Math.pow(2, (m - 69) / 12);
  // [Hz, radius, dB] x4, from STK Phonemes.cpp
  const V = {
    eee: [[273, 0.996, 10], [2086, 0.945, -16], [2754, 0.979, -12], [3270, 0.44, -17]],
    ahh: [[770, 0.95, 0], [1153, 0.97, -9], [2450, 0.78, -29], [3140, 0.8, -39]],
    ohh: [[637, 0.91, 0], [895, 0.9, -3], [2556, 0.95, -17], [3070, 0.91, -20]],
    ooo: [[349, 0.986, -10], [918, 0.94, -20], [2350, 0.96, -27], [2731, 0.95, -33]],
  }[p.vowel];
  const hold = 0.8, n = c.seconds(p.attack + hold + p.release, sr), src = new Float32Array(n);
  const N = 4, st = [], ph = [], vr = [], vp = [];
  for (let k = 0; k < N; k++) { st.push(f * Math.pow(2, (k - 1.5) * (2 + 10 * p.spread) / 1200 + (r() - 0.5) * 0.002) / sr); ph.push(r()); vr.push(TAU * (4.6 + 1.4 * r()) / sr); vp.push(r() * TAU); }
  const vd = 0.004 + 0.004 * p.spread, a = p.attack * sr, rs = (p.attack + hold) * sr, rl = p.release * sr;
  const nz = c.noise(r, n), bg = 0.05 + 1.2 * p.breath;
  let z1 = 0, y1 = 0, p0 = ph[0], p1 = ph[1], p2 = ph[2], p3 = ph[3];
  const inc = new Float64Array(N);
  for (let i = 0; i < n; i++) {
    if ((i & 15) === 0) for (let k = 0; k < N; k++) inc[k] = st[k] * (1 + vd * Math.sin(vr[k] * i + vp[k])); // vibrato, per 16 samples
    p0 += inc[0]; p1 += inc[1]; p2 += inc[2]; p3 += inc[3];
    if (p0 >= 1) p0 -= 1; if (p1 >= 1) p1 -= 1; if (p2 >= 1) p2 -= 1; if (p3 >= 1) p3 -= 1;
    const x = 4 - 2 * (p0 + p1 + p2 + p3);
    const tz = (x + 0.9 * z1) / 1.9; z1 = x; y1 = 0.9 * y1 + 0.1 * tz;
    const e = i < a ? i / a : i < rs ? 1 : Math.max(0, 1 - (i - rs) / rl);
    src[i] = (y1 * 2 + nz[i] * bg * 0.25) * e;
  }
  const out = new Float32Array(n);
  for (const [hz, rad, dB] of V) {
    if (hz > sr * 0.45) continue;
    const bw = -Math.log(rad) * 44100 / Math.PI, q = Math.max(1.5, hz / bw), g = Math.pow(10, dB / 20);
    const band = c.filter(Float32Array.from(src), c.biquad("bp", hz, q, sr));
    for (let i = 0; i < n; i++) out[i] += band[i] * g;
  }
  c.mix(out, src, 0, 0.04, sr);
  // breath: air over the section, a bandpassed noise riding the same envelope
  const air = c.noise(r, n); c.filter(air, c.biquad("bp", 3800, 0.6, sr));
  for (let i = 0; i < n; i++) out[i] += air[i] * 0.09 * p.breath * (i < a ? i / a : i < rs ? 1 : Math.max(0, 1 - (i - rs) / rl));
  const wet = c.reverb(out, { size: 0.7, decay: 0.6, mixAmt: 0.28 }, sr);
  c.filter(wet, c.biquad("hp", 90, 0.7, sr));
  c.fade(c.finish(wet, 0.88), 5, sr);
  return { samples: wet };
}
