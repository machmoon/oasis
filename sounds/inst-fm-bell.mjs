// FM bell: STK's TubeBell. Two modulator -> carrier sine pairs (algorithm 5) at ratios 1·0.995 / 1.414·0.995 and
// 1·1.005 / 1.414, the second modulator fed back on itself, each operator on its own decay, plus a soft strike tick.
// After STK src/TubeBell.cpp and include/TubeBell.h tick() (setRatio values, gains fmGains_[94/76/99/71] with
// fmGains_ stepping by 0.933033 per index as src/FM.cpp builds it, output 0.5·(carrier pair)). Two deviations: the
// decays are exponential rather than STK ADSR's linear ramps so a one-shot rings out naturally, and the modulators
// decay faster than the carriers so the strike darkens as it rings, the way a struck tube does.
// Hand-written by a Claude Code agent against the factory contract (not built by the factory).
export const meta = {
  title: "FM Tubular Bell", kind: "sfx", format: "sound", duration: 2.2, price: 2, author: "kickdrum", payout: "kickdrum@creators.oasis.example", kit: "Instrument",
  credit: "FM after STK TubeBell.cpp / FM.cpp",
  description: "A struck FM bell note with note, brightness, ring time and bell type as knobs, for chimes, reward stingers, music boxes and festive cues.",
  tags: ["bell", "fm", "chime", "tubular", "dx7", "note", "instrument", "synth"],
};
export const params = { knobs: {
  note: { type: "choice", label: "Note", default: "C5", options: ["C5", "E5", "G5", "A4", "C4", "G4", "C6"] },
  type: { type: "choice", label: "Bell", default: "tube", options: ["tube", "church", "glass"] },
  brightness: { type: "range", label: "Brightness", default: 0.5, min: 0, max: 1, step: 0.01 },
  ring: { type: "range", label: "Ring time (s)", default: 1.8, min: 0.4, max: 3.6, step: 0.05 },
  strike: { type: "range", label: "Strike", default: 0.4, min: 0, max: 1, step: 0.01 },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, r = c.rng(p.seed * 433 + 29), TAU = 6.283185307179586;
  const m = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[p.note[0]] + 12 * (+p.note.slice(-1) + 1);
  const f = 440 * Math.pow(2, (m - 69) / 12);
  // [carrier A, mod A, carrier B, mod B] ratios; tube is TubeBell's, church and glass move the modulators inharmonic
  const R = { tube: [0.995, 1.414 * 0.995, 1.005, 1.414], church: [0.995, 2.01, 1.005, 3.17], glass: [1, 3.51, 2.002, 5.43] }[p.type];
  const fg = (i) => Math.pow(0.933033, 99 - i), gA = fg(94), mA = fg(76) * TAU, gB = fg(99), mB = fg(71) * TAU;
  const idx = 0.35 + 2.4 * p.brightness, fbk = 0.5 * TAU * 0.15 * p.brightness;
  const n = c.seconds(p.ring + 0.05, sr), out = new Float32Array(n);
  const st = R.map((x) => f * x * (1 + (r() - 0.5) * 0.002) / sr);
  let q0 = r(), q1 = r(), q2 = r(), q3 = r(), last = 0;
  const kc = Math.exp(-6.9 / (p.ring * sr)), kc2 = Math.exp(-6.9 / (p.ring * 0.5 * sr)), km = Math.exp(-6.9 / (p.ring * 0.55 * sr));
  let ec = 1, ec2 = 1, em = 1;
  const at = Math.max(1, 0.004 * sr);
  for (let i = 0; i < n; i++) {
    q0 += st[0]; q1 += st[1]; q2 += st[2]; q3 += st[3];
    if (q0 >= 1) q0 -= 1; if (q1 >= 1) q1 -= 1; if (q2 >= 1) q2 -= 1; if (q3 >= 1) q3 -= 1;
    const a = i < at ? i / at : 1;
    const m1 = Math.sin(TAU * q1) * mA * idx * em;
    const m3 = Math.sin(TAU * q3 + last * fbk) * mB * idx * em; last = m3;
    out[i] = 0.5 * a * (gA * ec * Math.sin(TAU * q0 + m1) + 0.5 * gB * ec2 * Math.sin(TAU * q2 + m3));
    ec *= kc; ec2 *= kc2; em *= km;
  }
  c.mix(out, c.burst(r, 0.03, "bp", Math.min(sr * 0.4, f * 4.5), 1.2, 0.0005, 0.006, sr), 0, 0.05 + 0.4 * p.strike, sr);
  c.mix(out, c.ring([[f * 2.76, 0.6], [f * 5.4, 0.3]], 0.25, 0.04 + 0.03 * r(), sr), 0, 0.2 * p.strike, sr);
  const tl = c.seconds(0.08, sr);
  for (let i = 0; i < tl; i++) out[n - 1 - i] *= i / tl;
  c.fade(c.finish(out, 0.88), 1, sr);
  return { samples: out };
}
