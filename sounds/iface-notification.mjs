// Notification: a short chime that asks for attention without alarming. Two or three FM bell notes in a mood's
// pattern (a rising major arpeggio, a falling third, or a repeated alert note), each a carrier with one modulator
// whose index decays faster than the note, so every strike starts bright and settles.
// Each note is a single carrier/modulator pair from STK src/TubeBell.cpp (ratio 1.414 modulator, fast strike, long
// decay, include/TubeBell.h tick); one pair instead of two keeps the chime clean at UI loudness.
// Hand-written by a Claude Code agent against the factory contract (not built by the factory).
export const meta = {
  title: "Notification Chime", kind: "ui", format: "sound", duration: 0.7, price: 1, author: "quietmachine", payout: "quietmachine@creators.oasis.example", kit: "Interface",
  credit: "FM note after STK TubeBell.cpp",
  description: "A soft notification chime with mood, pitch, tail and brightness as knobs, for messages, reminders, badges and toasts.",
  tags: ["notification", "chime", "alert", "message", "ding", "ui", "toast", "interface"],
};
export const params = { knobs: {
  mood: { type: "choice", label: "Mood", default: "bright", options: ["bright", "gentle", "alert"] },
  pitch: { type: "range", label: "Pitch", default: 0.5, min: 0, max: 1, step: 0.01 },
  tail: { type: "range", label: "Tail", default: 0.4, min: 0, max: 1, step: 0.01 },
  brightness: { type: "range", label: "Brightness", default: 0.5, min: 0, max: 1, step: 0.01 },
  speed: { type: "range", label: "Speed", default: 0.5, min: 0, max: 1, step: 0.01 },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, r = c.rng(p.seed * 229 + 17), TAU = 6.283185307179586;
  const pat = { bright: [1, 1.25, 1.5], gentle: [1.5, 1.2], alert: [1, 1, 1] }[p.mood];
  const f = 660 * Math.pow(2, 1.2 * p.pitch) * (0.98 + 0.04 * r()), step = 0.06 + 0.1 * (1 - p.speed) + 0.01 * r();
  const ring = 0.12 + 0.5 * p.tail, idx = (0.3 + 2 * p.brightness) * TAU * 0.2;
  const n = c.seconds(step * (pat.length - 1) + ring * 1.3 + 0.02, sr), out = new Float32Array(n);
  pat.forEach((k, j) => {
    const fk = f * k, m = c.seconds(ring * 1.3, sr), note = new Float32Array(m);
    let q = r(), qm = r(), e = 1, em = 1;
    const ke = Math.exp(-6.9 / (ring * sr)), km = Math.exp(-6.9 / (ring * 0.3 * sr)), at = c.seconds(0.002, sr);
    for (let i = 0; i < m; i++) {
      q += fk / sr; qm += fk * 1.414 / sr; if (q >= 1) q -= 1; if (qm >= 1) qm -= 1;
      note[i] = Math.sin(TAU * q + idx * em * Math.sin(TAU * qm)) * e * (i < at ? i / at : 1); e *= ke; em *= km;
    }
    c.mix(out, note, j * step, j === pat.length - 1 ? 1 : 0.85, sr);
  });
  c.filter(out, c.biquad("hp", 250, 0.7, sr));
  const tl = c.seconds(0.03, sr);
  for (let i = 0; i < tl; i++) out[n - 1 - i] *= i / tl;
  c.fade(c.finish(out, 0.88), 0.5, sr);
  return { samples: out };
}
