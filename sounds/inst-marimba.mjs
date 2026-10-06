// Marimba: STK's ModalBar. Four damped modes per bar type (marimba 1 / 3.99 / 10.65 and a fixed 2443 Hz, vibraphone,
// or a wood block), weighted by where the mallet strikes, excited by a mallet whose hardness opens the upper modes and
// adds a contact click; the vibraphone's motor tremolo on top.
// After STK src/ModalBar.cpp: the presets table (ratios, pole radii -> each mode's decay relative to the first, the
// 4th mode's gain; a negative ratio is a fixed frequency in Hz), setStrikePosition (gains 0.12·sin(πx),
// -0.03·sin(0.05 + 3.9πx), 0.11·sin(-0.05 + 11πx)) and setStickHardness (masterGain 0.1 + 1.8·hardness).
// Hand-written by a Claude Code agent against the factory contract (not built by the factory).
export const meta = {
  title: "Marimba Bar", kind: "sfx", format: "sound", duration: 0.85, price: 2, author: "kickdrum", payout: "kickdrum@creators.oasis.example", kit: "Instrument",
  credit: "Modal bar after STK ModalBar.cpp presets",
  description: "A struck marimba, vibraphone or wood bar note with note, bar type, mallet hardness, ring time and strike position as knobs, for mallet melodies, puzzle games and gentle UI music.",
  tags: ["marimba", "mallet", "vibraphone", "xylophone", "modal", "percussion", "instrument", "note"],
};
export const params = { knobs: {
  note: { type: "choice", label: "Note", default: "C4", options: ["C4", "E4", "G4", "A3", "C3", "D4", "C5"] },
  bar: { type: "choice", label: "Bar", default: "marimba", options: ["marimba", "vibraphone", "wood"] },
  hardness: { type: "range", label: "Mallet hardness", default: 0.4, min: 0, max: 1, step: 0.01 },
  ring: { type: "range", label: "Ring time (s)", default: 0.5, min: 0.15, max: 1.5, step: 0.01 },
  position: { type: "range", label: "Strike position", default: 0.45, min: 0.1, max: 0.9, step: 0.01 },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, r = c.rng(p.seed * 857 + 31);
  const m = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[p.note[0]] + 12 * (+p.note.slice(-1) + 1);
  const f = 440 * Math.pow(2, (m - 69) / 12);
  const P = {
    marimba: { ratio: [1, 3.99, 10.65, -2443], radius: [0.9996, 0.9994, 0.9994, 0.999], g3: 0.008, life: 1, trem: 0 },
    vibraphone: { ratio: [1, 2.01, 3.9, 14.37], radius: [0.99995, 0.99991, 0.99992, 0.9999], g3: 0.015, life: 2.2, trem: 0.35 },
    wood: { ratio: [1, 2.777, 7.378, 15.377], radius: [0.996, 0.994, 0.994, 0.99], g3: 0.008, life: 0.18, trem: 0 },
  }[p.bar];
  const x = Math.PI * p.position, pos = [0.12 * Math.sin(x), -0.03 * Math.sin(0.05 + 3.9 * x), 0.11 * Math.sin(-0.05 + 11 * x), P.g3];
  const ring = p.ring * P.life, n = c.seconds(Math.min(3.4, ring * 1.6 + 0.04), sr), out = new Float32Array(n), l0 = Math.log(P.radius[0]), t0 = 0.004 * r();
  for (let k = 0; k < 4; k++) {
    const fr = P.ratio[k] < 0 ? -P.ratio[k] : f * P.ratio[k];
    if (fr > sr * 0.45) continue;
    const tilt = Math.pow(fr / f, -(1.3 - 1.2 * p.hardness)), amp = Math.abs(pos[k]) * 8 * tilt * (k ? 1 : 1.2) * (0.9 + 0.2 * r());
    const tau = ring * 0.25 * l0 / Math.log(P.radius[k]);
    c.mix(out, c.ring([[fr * (1 + (r() - 0.5) * 0.006), amp]], Math.min(n / sr, tau * 7), tau, sr), t0 + 0.0012 + 0.0016 * r(), 1, sr);
  }
  const mallet = c.burst(r, 0.02, "lp", 600 + 5000 * p.hardness, 0.8, 0.0008, 0.002 + 0.004 * (1 - p.hardness), sr);
  c.mix(out, mallet, t0, (0.1 + 1.8 * p.hardness) * 0.25, sr);
  if (P.trem) { const w = 6.28 * (5 + r()) / sr, ph = r() * 6.28; for (let i = 0; i < n; i++) out[i] *= 1 + P.trem * Math.sin(w * i + ph); }
  const tl = c.seconds(0.05, sr);
  for (let i = 0; i < tl; i++) out[n - 1 - i] *= i / tl;
  c.fade(c.finish(out, 0.88), 0.5, sr);
  return { samples: out };
}
