// Bell buoy: the swell rocks the buoy about once a second and each lean throws the clapper against a cast bell in a short cluster. Layers: per-partial inharmonic bell modes (highs die first, a detuned twin gives beating), a bright metallic strike, rust rattle grains, quiet hull creak and slosh; the tail toggle lets the bell ring out and adds a reverb tail, off damps it.
export const meta = {
  title: "Bell Buoy Ring", kind: "sfx", format: "sound", duration: 3.5, price: 3, author: "stormfront", payout: "stormfront@creators.oasis.example", kit: "Ocean Harbour", description: "A harbour bell buoy clanging in irregular clusters as the swell rocks it, with water slosh underneath; for coastal scenes, fog and harbour beds.",
  tags: ["bell", "buoy", "harbour", "ocean", "clang", "sea", "maritime", "fog"],
};
export const params = { knobs: {
  size: { type: "choice", label: "Bell size", default: "medium", options: ["small", "medium", "large"] },
  swell: { type: "range", label: "Swell", default: 0.5, min: 0, max: 1, step: 0.01 },
  hits: { type: "range", label: "Clapper hits", default: 0.5, min: 0, max: 1, step: 0.01 },
  rust: { type: "range", label: "Rust", default: 0.3, min: 0, max: 1, step: 0.01 },
  pitch: { type: "range", label: "Pitch", default: 0.5, min: 0, max: 1, step: 0.01 },
  tail: { type: "toggle", label: "Ring-out tail", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, r = c.rng(p.seed * 613 + 29), dur = 3.5, n = c.seconds(dur, sr), out = new Float32Array(n);
  const sz = {
    small: { f: 1050, ring: 0.7, q: [1, 2.32, 4.25, 6.63, 9.38, 12.5], a: [1, 0.7, 0.55, 0.4, 0.25, 0.15] },
    medium: { f: 560, ring: 1.1, q: [1, 2.0, 2.76, 5.4, 8.93, 11.34], a: [1, 0.6, 0.75, 0.45, 0.3, 0.18] },
    large: { f: 250, ring: 1.7, q: [0.5, 1, 1.19, 1.56, 2.0, 2.74, 4.07, 6.1], a: [0.5, 1, 0.8, 0.6, 0.5, 0.35, 0.25, 0.15] },
  }[p.size];
  const base = sz.f * Math.pow(2, (p.pitch - 0.5) * 1.4);
  const ring = sz.ring * (1 - 0.5 * p.rust) * (p.tail ? 1 : 0.4);
  const sw = p.swell, rockHz = 0.7 + 0.5 * sw, ph0 = r() * 6.28;
  const strike = (tt, vel) => {
    sz.q.forEach((q, i) => {
      const f = base * q * (1 + (r() - 0.5) * 0.008), a = sz.a[i] * (0.8 + 0.4 * r()), d = ring / (1 + i * 0.9);
      c.mix(out, c.ring([[f, a]], d * 5, d, sr), tt, 0.3 * vel, sr);
      c.mix(out, c.ring([[f * (1.004 + 0.004 * p.rust), a * 0.6]], d * 5, d * 1.1, sr), tt, 0.2 * vel, sr);
    });
    c.mix(out, c.burst(r, 0.012, "hp", 3000 + 3500 * r(), 1.2, 0.0003, 0.003, sr), tt, 0.55 * vel, sr);
    c.mix(out, c.burst(r, 0.035, "bp", base * 2.5, 2.5, 0.0004, 0.01, sr), tt, 0.4 * vel, sr);
    c.mix(out, c.ring([[base * 0.5, 1]], 0.12, 0.025, sr), tt, 0.25 * vel, sr);
    const g = Math.round(p.rust * 14);
    for (let k = 0; k < g; k++) c.mix(out, c.burst(r, 0.004, "bp", 2200 + 4000 * r(), 6, 0.0003, 0.002, sr), tt + 0.01 + r() * 0.25, (0.06 + 0.2 * r()) * p.rust * vel, sr);
  };
  let t = 0.1 + 0.2 * r();
  while (t < dur - 1.3) {
    const lean = 0.5 + 0.5 * Math.sin(c.TAU * rockHz * t * 0.5 + ph0);
    if (r() < 0.55 + 0.45 * sw) {
      const cnt = 1 + Math.round(p.hits * 3 * (0.4 + 0.6 * r()));
      let tt = t;
      for (let h = 0; h < cnt && tt < dur - 1.3; h++) {
        strike(tt, (0.5 + 0.5 * lean) * (0.6 + 0.4 * sw) * Math.pow(0.8, h) * (0.8 + 0.2 * r()));
        tt += 0.1 + 0.14 * r();
      }
    }
    t += (1 / rockHz) * (0.8 + 0.5 * r()) + 0.15;
  }
  const sl = c.noise(r, n), bp = c.biquad("bp", 450, 0.8, sr);
  for (let i = 0; i < n; i++) {
    const m = 0.5 + 0.5 * Math.sin(c.TAU * rockHz * 0.5 * (i / sr) + ph0 + 1);
    sl[i] = bp(sl[i]) * m * m * (0.1 + 0.9 * sw);
  }
  c.mix(out, sl, 0, 0.05, sr);
  if (p.rust > 0.2) for (let k = 0; k < 2; k++) {
    const f0 = 200 + r() * 120, m = c.seconds(0.3, sr), cr = c.osc("saw", (u) => f0 * (1 + 0.1 * Math.sin(u * 40)), m, sr), e = c.env(m, 0.05, 0.1, sr);
    for (let i = 0; i < m; i++) cr[i] *= e[i];
    c.filter(cr, c.biquad("bp", 700, 3, sr));
    c.mix(out, cr, 0.3 + r() * 2, 0.06 * p.rust, sr);
  }
  let res = out;
  if (p.tail) {
    const w = c.reverb(out, { size: 0.8, decay: 0.6, mixAmt: 0.25 }, sr);
    if (w.length === n) res = w;
  }
  c.fade(res, 60, sr);
  c.finish(res, 0.85, 1.0);
  return { samples: res };
}
