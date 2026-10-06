// Pluck: a Karplus-Strong string. A pick-filtered noise burst, comb-notched at the pick position, fills a tuned
// delay loop whose one-zero loop filter and per-period gain set brightness and ring time; a soft body lowpass on top.
// After STK src/Plucked.cpp (delay = sr/f - loop filter phase delay, the pickFilter pole 0.999 - 0.15·amp, the
// noise fill) and faustlibraries physmodels.lib `ks` (the (x + x')/2 reflexion filter).
// Hand-written by a Claude Code agent against the factory contract (not built by the factory).
export const meta = {
  title: "Plucked String", kind: "sfx", format: "sound", duration: 1.0, price: 2, author: "kickdrum", payout: "kickdrum@creators.oasis.example", kit: "Instrument",
  credit: "Karplus-Strong after STK Plucked.cpp and faustlibraries physmodels.lib ks",
  description: "A playable plucked string one-shot with note, brightness, ring time and pick position as knobs, for melodies, arpeggios and harp or guitar-like stabs in a game score.",
  tags: ["pluck", "string", "karplus", "guitar", "harp", "note", "instrument", "synth"],
};
export const params = { knobs: {
  note: { type: "choice", label: "Note", default: "C3", options: ["C3", "D3", "E3", "G3", "A3", "C4", "E4", "G4", "C5"] },
  brightness: { type: "range", label: "Brightness", default: 0.55, min: 0, max: 1, step: 0.01 },
  release: { type: "range", label: "Ring time", default: 0.45, min: 0, max: 1, step: 0.01 },
  position: { type: "range", label: "Pick position", default: 0.2, min: 0.04, max: 0.5, step: 0.01 },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, r = c.rng(p.seed * 977 + 13);
  const m = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[p.note[0]] + 12 * (+p.note.slice(-1) + 1);
  const f = 440 * Math.pow(2, (m - 69) / 12) * (1 + (r() - 0.5) * 0.003);
  const t60 = 0.35 + 2.8 * p.release * p.release, n = c.seconds(t60 + 0.05, sr);
  const s = 0.5 - 0.42 * p.brightness, L = sr / f - s, D = Math.floor(L), fr = L - D;
  const w0 = 2 * Math.PI * f / sr, g = Math.pow(0.001, 1 / (f * t60)) / Math.sqrt((1 - s) * (1 - s) + s * s + 2 * s * (1 - s) * Math.cos(w0));
  // excitation: noise through the pick filter, then comb-notched at the pick position
  const P = Math.ceil(L), ex = c.noise(r, P), pole = 0.999 - (0.3 + 0.6 * p.brightness) * 0.75;
  let lp = 0;
  for (let i = 0; i < P; i++) { lp = lp * pole + ex[i] * (1 - pole); ex[i] = lp; }
  const k = Math.max(1, Math.round(p.position * P)), exc = new Float32Array(P);
  for (let i = 0; i < P; i++) exc[i] = ex[i] - (i >= k ? ex[i - k] : 0) * 0.9;
  let mean = 0; for (let i = 0; i < P; i++) mean += exc[i] / P;
  const M = D + 3, line = new Float32Array(M), out = new Float32Array(n);
  let w = 0, prev = 0;
  for (let i = 0; i < n; i++) {
    let rd = w - D; if (rd < 0) rd += M; let rd1 = rd - 1; if (rd1 < 0) rd1 += M;
    const y = line[rd] * (1 - fr) + line[rd1] * fr;
    const v = g * ((1 - s) * y + s * prev) + (i < P ? exc[i] - mean : 0);
    prev = y; line[w] = v; if (++w >= M) w = 0;
    out[i] = y;
  }
  c.filter(out, c.biquad("lp", 1800 + 9000 * p.brightness, 0.6, sr));
  c.filter(out, c.biquad("hp", 45, 0.7, sr));
  const tl = c.seconds(Math.min(0.25, t60 * 0.3), sr);
  for (let i = 0; i < tl; i++) out[n - 1 - i] *= i / tl;
  for (let i = 0, a = c.seconds(0.0015, sr); i < a; i++) out[i] *= i / a;
  c.finish(out, 0.88);
  return { samples: out };
}
