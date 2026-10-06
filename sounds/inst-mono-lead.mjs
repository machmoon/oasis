// Mono lead: two detuned saws or squares that scoop up into the note, a resonant lowpass opened by its own envelope
// (base cutoff times 2^(octaves·env)), a delayed vibrato and an attack / sustain / release amp envelope.
// Voice layout and the filter envelope's base·2^octaves range after Tone.js Tone/instrument/MonoSynth.ts getDefaults
// and Tone/component/envelope/FrequencyEnvelope.ts; vibrato as jsfxr sfxr.js does it (p_vib_strength, p_vib_speed on
// the period). The filter is a Chamberlin state-variable lowpass (no open-source file: the textbook form).
// Hand-written by a Claude Code agent against the factory contract (not built by the factory).
export const meta = {
  title: "Mono Lead", kind: "sfx", format: "sound", duration: 0.9, price: 2, author: "kickdrum", payout: "kickdrum@creators.oasis.example", kit: "Instrument",
  credit: "After Tone.js MonoSynth.ts / FrequencyEnvelope.ts; vibrato after jsfxr sfxr.js",
  description: "A singing monophonic synth lead note with note, waveform, cutoff, attack, release and vibrato as knobs, for chiptune-adjacent melodies, hero themes and synthwave hooks.",
  tags: ["lead", "mono", "synth", "saw", "synthwave", "melody", "instrument", "vibrato"],
};
export const params = { knobs: {
  note: { type: "choice", label: "Note", default: "A4", options: ["A4", "C5", "E5", "G4", "D5", "E4", "A5"] },
  wave: { type: "choice", label: "Waveform", default: "saw", options: ["saw", "square"] },
  cutoff: { type: "range", label: "Cutoff", default: 0.5, min: 0, max: 1, step: 0.01 },
  attack: { type: "range", label: "Attack (s)", default: 0.01, min: 0.002, max: 0.4, step: 0.001 },
  release: { type: "range", label: "Release (s)", default: 0.3, min: 0.03, max: 1.2, step: 0.01 },
  vibrato: { type: "range", label: "Vibrato", default: 0.4, min: 0, max: 1, step: 0.01 },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, r = c.rng(p.seed * 271 + 19), TAU = 6.283185307179586;
  const m = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[p.note[0]] + 12 * (+p.note.slice(-1) + 1);
  const f = 440 * Math.pow(2, (m - 69) / 12);
  const hold = 0.6, n = c.seconds(p.attack + hold + p.release, sr), out = new Float32Array(n);
  const det = Math.pow(2, (6 + 6 * r()) / 1200), sq = p.wave === "square", scoop = 0.94 + 0.03 * r(), st = 0.03 + 0.03 * r();
  const vs = 5 + 1.2 * r(), vdep = 0.03 * p.vibrato, vdel = 0.12 * sr, vph = r();
  const base = 250 + 1400 * p.cutoff, oct = 1 + 3 * p.cutoff, fhi = sr * 0.16;
  const a = p.attack * sr, rs = (p.attack + hold) * sr, rl = p.release * sr, fa = Math.max(1, 0.05 * sr), fk = Math.exp(-1 / (0.25 * sr));
  let q1 = r(), q2 = r(), low = 0, band = 0, fe = 0, ff = 0.1;
  const qd = 1 / (1.2 + 2.8 * p.cutoff);
  for (let i = 0; i < n; i++) {
    const t = i / sr, vib = i > vdel ? vdep * Math.min(1, (i - vdel) / (0.2 * sr)) * Math.sin(TAU * vs * t + vph) : 0;
    const hz = f * (1 - (1 - scoop) * Math.exp(-t / st)) * (1 + vib);
    q1 += hz / sr; q2 += hz * det / sr; if (q1 >= 1) q1 -= 1; if (q2 >= 1) q2 -= 1;
    const o = sq ? (q1 < 0.5 ? 0.6 : -0.6) + (q2 < 0.5 ? 0.6 : -0.6) : 1 - 2 * q1 + 1 - 2 * q2;
    fe = i < fa ? i / fa : 0.5 + (fe - 0.5) * fk;
    if ((i & 15) === 0) ff = 2 * Math.sin(Math.PI * Math.min(fhi, base * Math.pow(2, oct * fe)) / sr);
    low += ff * band; const high = o - low - qd * band; band += ff * high;
    const e = i < a ? i / a : i < rs ? 1 : Math.max(0, 1 - (i - rs) / rl);
    out[i] = low * e * (1 + 6 * vib);
  }
  const wet = c.reverb(out, { size: 0.35, decay: 0.4, mixAmt: 0.12 }, sr);
  c.filter(wet, c.biquad("hp", 80, 0.7, sr));
  c.fade(c.finish(wet, 0.88), 3, sr);
  return { samples: wet };
}
