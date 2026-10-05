// Music box wind-down: a comb melody where every note is a struck tine (inharmonic modes, pin tick, small body knock) with a short ring; the notes are spaced by a decelerating cylinder, so gaps visibly widen and pitch sags flat and wavers as the spring dies. An optional room tail rings after the last note.
export const meta = {
  title: "Music Box Wind-Down", kind: "sfx", format: "sound", duration: 4, price: 4, author: "hollowbody", payout: "hollowbody@creators.oasis.example", kit: "Horror House", description: "A child's music box tune whose notes spread apart, sag flat and detune until the cylinder stops; a creepy lullaby sting for haunted-house scenes.",
  tags: ["music box", "horror", "creepy", "detune", "wind-down", "lullaby", "haunted", "toy"],
};
export const params = { knobs: {
  comb: { type: "choice", label: "Comb", default: "tin", options: ["tin", "brass"] },
  tune: { type: "choice", label: "Tune", default: "lullaby", options: ["lullaby", "minor waltz", "descending"] },
  slowdown: { type: "range", label: "Slowdown", default: 0.6, min: 0, max: 1, step: 0.01 },
  detune: { type: "range", label: "Detune", default: 0.5, min: 0, max: 1, step: 0.01 },
  pitch: { type: "range", label: "Start pitch", default: 0.5, min: 0, max: 1, step: 0.01 },
  tail: { type: "toggle", label: "Room tail", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, r = c.rng(p.seed * 613 + (p.comb === "tin" ? 3 : 29)), dur = 4, n = c.seconds(dur, sr), out = new Float32Array(n);
  const tin = p.comb === "tin";
  const root = 523.25 * Math.pow(2, (p.pitch - 0.5) * 1.2);
  const tunes = { lullaby: [0, 4, 7, 12, 7, 4, 7, 9, 5, 9, 12, 9, 7, 4, 2, 0, 4, 7, 12, 7, 4, 0], "minor waltz": [0, 3, 7, 12, 7, 3, 0, 3, 7, 10, 7, 3, 2, 5, 8, 14, 8, 5, 3, 0, 3, 7], descending: [12, 11, 9, 7, 5, 4, 2, 0, 7, 5, 4, 2, 0, -1, -3, -5, -7, -8, -10, -12, -12, -12] };
  const tune = tunes[p.tune];
  const modes = tin ? [[1, 1], [2.76, 0.5], [5.4, 0.25], [8.9, 0.12]] : [[1, 1], [2.0, 0.35], [3.01, 0.3], [4.2, 0.12]];
  const ringT = tin ? 0.14 : 0.24;
  const T = 3.3, rate0 = 7.5;
  let t = 0.05, ph = 0;
  for (let k = 0; k < tune.length && t < T; k++) {
    const prog = t / T, q = prog * prog;
    const speed = Math.max(0.12, 1 - p.slowdown * (0.2 + 0.85 * q) - 0.25 * p.slowdown * prog);
    const sag = 1 - p.detune * (0.01 + 0.16 * q) + (r() - 0.5) * 0.03 * p.detune * prog;
    const f = root * Math.pow(2, tune[k] / 12) * sag * (1 + (r() - 0.5) * 0.004);
    const ms = modes.map(([m, a]) => [f * m * (1 + (r() - 0.5) * 0.004 * (1 + 5 * p.detune * prog)), a]);
    const lvl = (0.6 + 0.35 * r()) * (1 - 0.45 * p.slowdown * q);
    const dec = ringT * (1 + 0.5 * speed);
    c.mix(out, c.ring(ms, dec * 4, dec, sr), t, lvl, sr);
    if (p.detune > 0.25) c.mix(out, c.ring(ms.map(([a, b]) => [a * (1.003 + 0.02 * p.detune * prog), b * 0.6]), dec * 3, dec * 0.8, sr), t, lvl * 0.45 * p.detune, sr);
    c.mix(out, c.burst(r, 0.005, "hp", tin ? 3800 : 2600, 0.8, 0.0003, 0.0015, sr), t - 0.0008, 0.35 * lvl, sr);
    c.mix(out, c.ring([[110 + r() * 30, 1], [230, 0.4]], 0.06, 0.015, sr), t, 0.2 * lvl, sr);
    t += (1 / rate0) / speed * (0.95 + 0.1 * r());
  }
  c.filter(out, c.biquad("lp", tin ? 7500 : 9000, 0.7, sr));
  if (p.tail) {
    const wet = new Float32Array(n);
    for (const d of [0.0297, 0.0371, 0.0411, 0.0533, 0.0677]) {
      const dl = Math.round(d * sr), y = new Float32Array(n); let lp = 0;
      for (let i = 0; i < n; i++) { lp += 0.4 * ((i >= dl ? y[i - dl] : 0) - lp); y[i] = out[i] + 0.9 * lp; wet[i] += y[i] * 0.12; }
    }
    for (let i = 0; i < n; i++) out[i] += wet[i] * 0.9;
  }
  c.finish(out, 0.85, 1.1);
  c.fade(out, 60, sr);
  return { samples: out };
}
