// Car wipers in rain: a loopable 4 s interior bed. Layers: an always-on rain bed (pink hush plus dense bandpassed drop grains and tuned roof-panel thumps), wiper strokes as a rubber-on-glass friction layer (granular stick-slip ticks through a sweeping band) that tile the loop exactly, turnaround thumps, and glassy blade squeaks.
export const meta = {
  title: "Wiper Rain Loop", kind: "ambience", format: "sound", duration: 4, price: 5, author: "stormfront", payout: "stormfront@creators.oasis.example", kit: "Car Interior", description: "Inside a car in the rain: wiper blades swish across the glass over drumming roof rain, loopable for driving or waiting scenes.",
  tags: ["wipers", "rain", "car", "interior", "loop", "ambience", "windshield", "roof"],
};
export const params = { knobs: {
  blade: { type: "choice", label: "Blade type", default: "new", options: ["new", "worn"] },
  rain: { type: "range", label: "Rain intensity", default: 0.5, min: 0, max: 1, step: 0.01 },
  rate: { type: "range", label: "Wiper rate", default: 0.5, min: 0, max: 1, step: 0.01 },
  squeak: { type: "range", label: "Squeak", default: 0.3, min: 0, max: 1, step: 0.01 },
  patter: { type: "range", label: "Roof patter density", default: 0.5, min: 0, max: 1, step: 0.01 },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, r = c.rng(p.seed * 613 + 29), dur = 4, n = c.seconds(dur, sr), out = new Float32Array(n);
  const worn = p.blade === "worn", T = c.TAU;
  const hush = c.pink(r, n), lp = c.biquad("lp", 1800 + 900 * p.rain, 0.7, sr), hp = c.biquad("hp", 140, 0.7, sr);
  for (let i = 0; i < n; i++) hush[i] = lp(hp(hush[i]));
  c.mix(out, hush, 0, 0.12 + 0.12 * p.rain, sr);
  const drops = Math.round((500 + 1100 * p.patter) * dur * (0.5 + 0.5 * p.rain));
  for (let d = 0; d < drops; d++) {
    const f = 900 + r() * 3200;
    c.mix(out, c.burst(r, 0.004 + r() * 0.008, "bp", f, 3, 0.0003, 0.002 + r() * 0.003, sr), r() * dur, (0.06 + 0.35 * r() * r()) * (0.45 + 0.55 * p.rain), sr);
  }
  const heavy = Math.round(30 + 160 * p.patter * (0.4 + 0.6 * p.rain));
  for (let d = 0; d < heavy; d++) {
    const f = 150 + r() * 120;
    c.mix(out, c.ring([[f, 1], [f * 2.3, 0.4], [f * 3.7, 0.15]], 0.09, 0.02 + 0.02 * r(), sr), r() * dur, 0.08 + 0.22 * r(), sr);
  }
  const strokes = 2 * Math.round(2 + 2 * p.rate), per = dur / strokes, len = per * 0.78;
  for (let s = 0; s < strokes; s++) {
    const t0 = s * per + 0.02 + (r() - 0.5) * 0.02 * per, m = c.seconds(len, sr), x = new Float32Array(m);
    const up = s % 2 === 0, bp = c.biquad("bp", 2000, 1.2, sr), amp = (up ? 1 : 0.85) * (0.9 + 0.2 * r());
    let b2 = bp, ch = 1, gl = 0;
    for (let i = 0; i < m; i++) {
      const u = i / m, v = up ? u : 1 - u;
      if (i % 300 === 0) { b2 = c.biquad("bp", (worn ? 1400 : 2600) * (0.55 + 0.9 * Math.sin(Math.PI * (0.1 + 0.8 * v))) * (0.9 + 0.2 * r()), worn ? 1.6 : 0.9, sr); }
      if (i % 40 === 0) gl = r() < (worn ? 0.55 : 0.8) ? 0.4 + 0.6 * r() : 0.1;
      const e = Math.pow(Math.sin(Math.PI * u), 0.8);
      x[i] = b2((r() * 2 - 1) * gl) * e * (worn ? 0.9 + 0.5 * Math.sin(i / sr * 70 + s * 2) : 1) * 2.4;
    }
    c.mix(out, x, t0, 0.35 * amp, sr);
    const th = worn ? 0.3 : 0.45;
    c.mix(out, c.ring([[85, 1], [200, 0.5], [420, 0.15]], 0.1, 0.028, sr), t0 - 0.003, th, sr);
    c.mix(out, c.ring([[95, 1], [230, 0.5]], 0.1, 0.03, sr), t0 + len, th * 1.1, sr);
    c.mix(out, c.burst(r, 0.015, "lp", 1400, 0.8, 0.001, 0.005, sr), t0 + len, 0.2, sr);
    const sq = Math.round(p.squeak * (worn ? 5 : 2) * (0.6 + r() * 0.8) + (worn ? 1 : 0) * (p.squeak > 0.05 ? 1 : 0));
    for (let q = 0; q < sq; q++) {
      const qs = c.seconds(0.07 + r() * 0.12, sr), f0 = 2800 + r() * 2200, o = new Float32Array(qs);
      const qt = t0 + (0.1 + 0.75 * r()) * len;
      let ph = 0;
      for (let i = 0; i < qs; i++) {
        const u = i / qs, f = f0 * (1 + 0.25 * u + 0.03 * Math.sin(i / sr * 220));
        ph += T * f / sr;
        const stick = 0.5 + 0.5 * Math.sign(Math.sin(i / sr * (worn ? 260 : 150)));
        o[i] = (Math.sin(ph) + 0.5 * Math.sin(2 * ph) + 0.25 * Math.sin(3 * ph)) * Math.sin(Math.PI * u) * stick;
      }
      c.mix(out, o, qt, 0.28 * p.squeak + (worn ? 0.05 : 0), sr);
    }
  }
  c.fade(c.finish(out, 0.8), 15, sr);
  return { samples: out };
}
