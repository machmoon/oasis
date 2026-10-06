// Drawbar organ: STK's BeeThree, four additive sine operators (ratios 0.999, 1.997, 3.006, 6.009, the top one fed
// back on itself through a short filter for grit), a key click, a decaying second-harmonic "percussion" and a rotary
// speaker (amplitude plus a little pitch wobble) on the sum. Registrations swap in other drawbar ratios.
// After STK src/BeeThree.cpp and include/BeeThree.h tick(): setRatio values, gains fmGains_[95/95/99/95], output
// (control1·2·g3·op3 + control2·2·g2·op2 + g1·op1 + g0·op0)·0.125, op3 phase-offset by its own last output.
// Hand-written by a Claude Code agent against the factory contract (not built by the factory).
export const meta = {
  title: "Drawbar Organ", kind: "sfx", format: "sound", duration: 0.9, price: 2, author: "kickdrum", payout: "kickdrum@creators.oasis.example", kit: "Instrument",
  credit: "Additive FM after STK BeeThree.cpp / FM.cpp",
  description: "A tonewheel-style organ note with note, registration, brightness, attack, release and rotary speed as knobs, for gospel stabs, jazz comping and haunted chapels.",
  tags: ["organ", "drawbar", "hammond", "tonewheel", "keys", "rotary", "instrument", "synth"],
};
export const params = { knobs: {
  note: { type: "choice", label: "Note", default: "C4", options: ["C4", "E4", "G4", "A3", "F3", "C3", "C5"] },
  registration: { type: "choice", label: "Registration", default: "beethree", options: ["beethree", "jazz", "flute", "full"] },
  brightness: { type: "range", label: "Brightness", default: 0.5, min: 0, max: 1, step: 0.01 },
  attack: { type: "range", label: "Attack (s)", default: 0.008, min: 0.003, max: 0.4, step: 0.001 },
  release: { type: "range", label: "Release (s)", default: 0.15, min: 0.02, max: 1, step: 0.01 },
  rotary: { type: "range", label: "Rotary speed", default: 0.4, min: 0, max: 1, step: 0.01 },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, r = c.rng(p.seed * 619 + 23), TAU = 6.283185307179586;
  const m = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[p.note[0]] + 12 * (+p.note.slice(-1) + 1);
  const f = 440 * Math.pow(2, (m - 69) / 12);
  const fg = (i) => Math.pow(0.933033, 99 - i);
  // [ratios], [gains]: BeeThree's own, then 16'/8'/5⅓'/4' jazz, 8'/4' flute, and a full 8'/4'/2⅔'/2' stack
  const REG = {
    beethree: [[0.999, 1.997, 3.006, 6.009], [fg(95), fg(95), 2 * fg(99), 2 * fg(95)]],
    jazz: [[0.5, 1, 1.498, 2.002], [0.9, 1, 0.7, 0.35]],
    flute: [[1, 2.001, 4.003, 0.5], [1, 0.45, 0.12, 0.25]],
    full: [[1, 2.002, 2.997, 4.004], [1, 0.9, 0.8, 0.75]],
  }[p.registration];
  const [R, G] = REG, top = 0.25 + 1.5 * p.brightness, mid = 0.5 + p.brightness;
  const hold = 0.7, n = c.seconds(p.attack + hold + p.release, sr), out = new Float32Array(n);
  const s = R.map((x) => f * x * (1 + (r() - 0.5) * 0.0015) / sr);
  let q0 = r(), q1 = r(), q2 = r(), q3 = r(), last = 0, perc = 1;
  const pk = Math.exp(-1 / (0.18 * sr)), fbk = 0.6 * p.brightness;
  const rot = (0.8 + 6 * p.rotary) / sr, rd = 0.1 + 0.3 * p.rotary;
  let rq = r();
  const a = p.attack * sr, rs = (p.attack + hold) * sr, rl = p.release * sr;
  for (let i = 0; i < n; i++) {
    const w = Math.sin(TAU * rq); rq += rot; if (rq >= 1) rq -= 1;
    const pm = 1 + 0.002 * rd * w;
    q0 += s[0] * pm; q1 += s[1] * pm; q2 += s[2] * pm; q3 += s[3] * pm;
    if (q0 >= 1) q0 -= 1; if (q1 >= 1) q1 -= 1; if (q2 >= 1) q2 -= 1; if (q3 >= 1) q3 -= 1;
    const o3 = Math.sin(TAU * q3 + last * fbk); last = 0.5 * (last + o3);
    let y = G[0] * Math.sin(TAU * q0) + G[1] * Math.sin(TAU * q1) * (1 + 0.8 * perc) + mid * G[2] * Math.sin(TAU * q2) + top * G[3] * o3;
    perc *= pk;
    const e = i < a ? i / a : i < rs ? 1 : Math.max(0, 1 - (i - rs) / rl);
    out[i] = y * e * (1 + rd * w) * 0.125;
  }
  const click = c.burst(r, 0.008, "bp", 1800 + 2500 * p.brightness, 0.7, 0.0003, 0.0015, sr);
  c.mix(out, click, 0, 0.04 * Math.max(0.2, 1 - p.attack * 8), sr);
  const wet = c.reverb(out, { size: 0.45, decay: 0.45, mixAmt: 0.15 }, sr);
  c.fade(c.finish(wet, 0.88), 3, sr);
  return { samples: wet };
}
