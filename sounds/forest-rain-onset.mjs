// Forest rain onset: the first fat drops of a coming storm, a stream of surface-specific drop events (leaf flick + damped leaf body + drip, soil thud + litter crackle, or a Minnaert plop with splash-back) whose rate builds over a rising pre-storm air bed.
export const meta = {
  title: "First Drops", kind: "sfx", format: "sound", duration: 3, price: 2, author: "stormfront", payout: "stormfront@creators.oasis.example", kit: "Forest at Night", description: "The first scattered raindrops pattering onto leaves, soil or a puddle as a storm builds, for the moment a forest scene turns from still night to rain.",
  tags: ["rain", "drops", "leaves", "puddle", "storm", "forest", "patter", "weather"],
};
export const params = { knobs: {
  surface: { type: "choice", label: "Falls on", default: "leaves", options: ["leaves", "ground", "puddle"] },
  density: { type: "range", label: "Density", default: 0.35, min: 0, max: 1, step: 0.01 },
  size: { type: "range", label: "Drop size", default: 0.5, min: 0, max: 1, step: 0.01 },
  buildup: { type: "range", label: "Build-up", default: 0.5, min: 0, max: 1, step: 0.01 },
  duration: { type: "range", label: "Duration", default: 2.6, min: 1, max: 3.6, step: 0.1 },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, si = params.knobs.surface.options.indexOf(p.surface), r = c.rng(p.seed * 6113 + si * 271 + 3);
  const tail = 0.35, dur = c.clamp(p.duration, 1, 3.95 - tail), n = c.seconds(dur + tail, sr), out = new Float32Array(n);
  const base = 5 + 21 * p.density, grow = 3.2 * p.buildup;
  const rate = (t) => base * (1 + grow * Math.pow(Math.min(1, t / dur), 1.6));
  const bed = c.pink(r, n), hp = c.biquad("hp", 600, 0.7, sr), lp = c.biquad("lp", 2200 + 5000 * p.buildup, 0.7, sr);
  const ph = r() * c.TAU, ph2 = r() * c.TAU;
  for (let i = 0; i < n; i++) {
    const ts = i / sr, u = Math.min(1, ts / dur);
    const rel = ts > dur ? Math.pow(Math.max(0, 1 - (ts - dur) / tail), 2) : 1;
    const gust = 1 + 0.2 * Math.sin(c.TAU * 0.37 * ts + ph) + 0.1 * Math.sin(c.TAU * 0.91 * ts + ph2);
    bed[i] = lp(hp(bed[i])) * (0.07 + 0.04 * p.density + 0.3 * p.buildup * u * u) * gust * rel;
  }
  c.mix(out, bed, 0, 0.6, sr);
  const drop = (t, s, amp) => {
    if (p.surface === "leaves") {
      const f = 2400 + 2500 * r() - 1200 * s, f1 = (650 + 900 * r() - 300 * s);
      c.mix(out, c.burst(r, 0.006 + 0.01 * s, "bp", f, 2.5, 0.0004, 0.002 + 0.004 * s, sr), t, amp, sr);
      c.mix(out, c.ring([[f1, 1], [f1 * (1.6 + 0.2 * r()), 0.5], [f1 * (2.8 + 0.3 * r()), 0.25]], 0.05, 0.005 + 0.01 * s, sr), t + 0.0005, 0.25 * amp, sr);
      c.mix(out, c.burst(r, 0.04, "bp", 4500 + 2000 * r(), 0.8, 0.003, 0.012, sr), t + 0.002, (0.12 + 0.2 * s) * amp, sr);
      if (r() < 0.3) c.mix(out, c.burst(r, 0.006, "bp", 3000 + 2000 * r(), 3, 0.0004, 0.002, sr), t + 0.04 + r() * 0.15, 0.35 * amp, sr);
    } else if (p.surface === "ground") {
      c.mix(out, c.burst(r, 0.02 + 0.03 * s, "lp", 400 + 500 * r() - 200 * s, 0.9, 0.001, 0.006 + 0.012 * s, sr), t, amp, sr);
      c.mix(out, c.ring([[90 + 60 * r(), 1], [260 + 80 * r(), 0.3]], 0.07, 0.01 + 0.016 * s, sr), t + 0.001, 0.55 * amp * (0.3 + s), sr);
      c.mix(out, c.burst(r, 0.005, "bp", 2500 + 1500 * r(), 2, 0.0003, 0.0015, sr), t, 0.3 * amp, sr);
      if (r() < 0.45) for (let g = 0, m = 1 + Math.floor(r() * 3); g < m; g++)
        c.mix(out, c.burst(r, 0.004, "bp", 1500 + 2500 * r(), 3, 0.0003, 0.0012, sr), t + 0.004 + r() * 0.03, (0.12 + 0.15 * r()) * amp, sr);
    } else {
      const plop = (at, d, f0, g) => {
        const m = c.seconds(d * 4, sr), x = new Float32Array(m), att = 0.0015 * sr; let phs = 0;
        for (let i = 0; i < m; i++) {
          phs += c.TAU * f0 * (1 + 1.6 * i / m) / sr;
          x[i] = Math.sin(phs) * Math.exp(-i / (d * sr)) * Math.min(1, i / att) * (1 - i / m);
        }
        c.mix(out, x, at, g, sr);
      };
      c.mix(out, c.burst(r, 0.003, "hp", 4000, 0.7, 0.0003, 0.001, sr), t, 0.3 * amp, sr);
      plop(t + 0.002, 0.018 + 0.04 * s, (1400 - 800 * s) * (0.8 + 0.4 * r()), 0.7 * amp);
      c.mix(out, c.burst(r, 0.03, "bp", 1800, 1, 0.002, 0.01, sr), t + 0.001, 0.25 * amp * s, sr);
      if (r() < 0.2 + 0.5 * s) plop(t + 0.05 + 0.08 * r(), 0.008 + 0.006 * r(), 2200 + 1500 * r(), 0.25 * amp);
    }
  };
  let t = 0.008 + r() * 0.008, k = 0;
  const maxGap = 0.42;
  while (t < dur && k < 600) {
    const s = c.clamp(p.size * 0.75 + r() * 0.45 - 0.15, 0, 1);
    const amp = (0.4 + 0.6 * s) * (0.6 + 0.4 * r());
    drop(t, s, amp);
    t += Math.min(maxGap * (0.6 + 0.4 * r()), -Math.log(1 - r() * 0.999) / rate(t));
    k++;
  }
  c.finish(out, 0.9);
  c.fade(out, 12, sr);
  return { samples: out };
}
