// Town crier handbell: a swung brass handbell. Every stroke is a sharp clapper clack (hard noise edge + metallic ping) over a strongly inharmonic bell body whose ring is choked by the next stroke, so strikes stay discrete at any swing rate. Strokes alternate ding-dang with human timing, the clapper chatters between them, and the final stroke rings out modestly (a longer room tail only when tail is on).
export const meta = {
  title: "Crier's Handbell", kind: "sfx", format: "sound", duration: 3, price: 2, author: "hollowbody", payout: "hollowbody@creators.oasis.example", kit: "Medieval Market", description: "A town crier swinging a brass handbell to gather a crowd: bell size, swing rate, intensity, clapper rattle and distance are knobs; each seed is a different swing.",
  tags: ["handbell", "bell", "town crier", "medieval", "market", "brass", "alarm", "attention"],
};
export const params = { knobs: {
  size: { type: "choice", label: "Bell size", default: "medium", options: ["small", "medium"] },
  rate: { type: "range", label: "Swing rate", default: 3, min: 2, max: 5, step: 0.05 },
  intensity: { type: "range", label: "Intensity", default: 0.6, min: 0, max: 1, step: 0.01 },
  rattle: { type: "range", label: "Clapper rattle", default: 0.4, min: 0, max: 1, step: 0.01 },
  distance: { type: "range", label: "Distance", default: 0.2, min: 0, max: 1, step: 0.01 },
  tail: { type: "toggle", label: "Room tail", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, r = c.rng(p.seed * 613 + (p.size === "small" ? 11 : 29)), n = c.seconds(3, sr), out = new Float32Array(n);
  const med = p.size === "medium" ? 1 : 0;
  const f0 = (med ? 560 : 1500) * (0.99 + r() * 0.02);
  const modes = med ? [[0.5, 0.6], [1, 1], [1.5, 0.35], [2.04, 0.7], [2.76, 0.6], [4.1, 0.4], [5.4, 0.3], [6.9, 0.18]]
    : [[1, 1], [2.32, 0.6], [3.9, 0.5], [5.6, 0.35], [7.3, 0.2], [9.1, 0.12]];
  const period = 1 / p.rate, far = p.distance;
  const dec = (med ? 0.17 : 0.11) + 0.04 * p.intensity;
  const strike = (t, g, hard, side, last) => {
    const d = last ? dec * 2 : Math.min(dec, period * 0.38), det = side ? 1.006 : 1;
    const dur = last ? 1.1 : period * 0.95;
    c.mix(out, c.ring(modes.map(([k, a], i) => [f0 * k * det * (0.997 + r() * 0.006), a * (i > 4 ? 0.4 + hard : 1)]), dur, d, sr), t, g, sr);
    c.mix(out, c.ring([[f0 * 0.5, 0.7]], 0.08, 0.015, sr), t, g * 0.5, sr);
    c.mix(out, c.burst(r, 0.014, "hp", 2500 + 3500 * hard, 0.9, 0.0003, 0.005, sr), t, g * (0.9 + 0.7 * hard), sr);
    c.mix(out, c.ring([[2600 + r() * 700, 1], [4100 + r() * 500, 0.6]], 0.035, 0.007, sr), t, g * 0.5, sr);
  };
  const strokes = Math.floor(2 * p.rate);
  let t = 0.05;
  for (let s = 0; s < strokes; s++) {
    const hard = c.clamp(p.intensity * (0.8 + 0.4 * r()), 0, 1), side = s % 2, last = s === strokes - 1;
    const gap = period * (side ? 0.88 : 1.12) * (1 + (r() - 0.5) * 0.05);
    strike(t, (0.5 + 0.5 * hard) * (side ? 0.8 : 1) * (last ? 0.85 : 0.92 + 0.16 * r()), hard, side, last);
    const nr = last ? 0 : Math.round(p.rattle * (3 + 5 * r()));
    for (let k = 0; k < nr; k++) {
      const rt = t + gap * (0.3 + 0.6 * r());
      c.mix(out, c.burst(r, 0.005, "bp", 3000 + 3000 * r(), 3, 0.0003, 0.0018, sr), rt, 0.15 + 0.5 * p.rattle * r(), sr);
      c.mix(out, c.ring([[f0 * (2 + 4 * r()), 1]], 0.05, 0.012, sr), rt, 0.1 * p.rattle, sr);
    }
    t += gap;
  }
  c.filter(out, c.biquad("lp", 12000 - 9500 * far, 0.7, sr));
  let res = out;
  if (p.tail) { const w = new Float32Array(n); w.set(out); res = c.reverb(w, { size: 0.55 + 0.3 * far, decay: 0.7, mixAmt: 0.25 + 0.3 * far }, sr); }
  c.gain(res, 1 - 0.65 * far);
  c.fade(res, 40, sr);
  c.finish(res, 0.85, 1.1);
  return { samples: res };
}
