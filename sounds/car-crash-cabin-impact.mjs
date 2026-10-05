// Cabin crash: a muffled collision heard from inside, built in stages. Cabin-filtered low layers (pitch-dropping body thump, rumble, crumple grains, sliding metal groans) sit under bright layers that skip the cabin filter: a glass shatter cluster and sparse crackle ticks, an optional airbag bang with gas hiss, and a debris tail whose length follows severity.
export const meta = {
  title: "Cabin Crash Impact", kind: "impact", format: "sound", duration: 3, price: 5, author: "hollowbody", payout: "hollowbody@creators.oasis.example", kit: "Car Interior", description: "A muffled collision felt from inside a car: a heavy body thump, crumpling metal, bright crackling glass and an optional airbag pop, for crash scenes and game-over moments.",
  tags: ["car", "crash", "collision", "impact", "glass", "airbag", "crumple", "interior"],
};
export const params = { knobs: {
  severity: { type: "range", label: "Severity", default: 0.6, min: 0, max: 1, step: 0.01 },
  glass: { type: "range", label: "Glass amount", default: 0.5, min: 0, max: 1, step: 0.01 },
  crumple: { type: "range", label: "Metal crumple", default: 0.6, min: 0, max: 1, step: 0.01 },
  pitch: { type: "range", label: "Pitch", default: 0.5, min: 0, max: 1, step: 0.01 },
  airbag: { type: "toggle", label: "Airbag pop", default: true },
  debris: { type: "toggle", label: "Debris tail", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, r = c.rng(p.seed * 613 + 41), sev = p.severity, gl = p.glass, cr = p.crumple;
  const total = 1.7 + 1.3 * sev, n = c.seconds(total, sr), low = new Float32Array(n), hi = new Float32Array(n);
  const pm = Math.pow(2, (p.pitch - 0.5) * 1.2), f0 = (70 + 30 * (1 - sev)) * pm, bn = c.seconds(0.8, sr);
  const body = c.osc("sine", (t) => f0 * (1 + 1.2 * Math.exp(-t * 18)), bn, sr), be = c.env(bn, 0.002, 0.08 + 0.16 * sev, sr);
  for (let i = 0; i < bn; i++) body[i] *= be[i];
  c.mix(low, body, 0.01, 0.8, sr);
  c.mix(low, c.burst(r, 0.12, "lp", 900 * pm, 0.8, 0.002, 0.03 + 0.03 * sev, sr), 0.005, 0.8 * (0.5 + sev), sr);
  const rn = c.seconds(1.2 + 0.8 * sev, sr), rum = c.brown(r, rn), rl = c.biquad("lp", 200 * pm, 0.8, sr), re = c.env(rn, 0.03, 0.2 + 0.3 * sev, sr);
  for (let i = 0; i < rn; i++) rum[i] = rl(rum[i]) * re[i];
  c.mix(low, rum, 0.02, 2 + 3 * sev, sr);
  const cn = Math.round(50 + 90 * cr), span = 0.25 + 0.4 * sev + 0.25 * cr;
  for (let g = 0; g < cn; g++) {
    const t = 0.012 + Math.pow(r(), 1.5) * span;
    c.mix(low, c.burst(r, 0.015 + r() * 0.04, "bp", (400 + r() * 1800) * pm, 1.5 + r() * 3, 0.001, 0.005 + r() * 0.015, sr), t, (0.15 + 0.5 * r()) * (0.3 + 0.7 * cr) * (0.5 + 0.5 * sev), sr);
  }
  for (let g = 0; g < 3; g++) {
    const f = (150 + r() * 260) * pm, gn = c.seconds(0.3 + 0.2 * r(), sr), dir = r() < 0.5 ? -0.3 : 0.25;
    const m = c.osc("saw", (t) => f * (1 + dir * t * 2), gn, sr), me = c.env(gn, 0.015, 0.1 + 0.05 * r(), sr), lp = c.biquad("lp", 1100 * pm, 2.5, sr), w = 30 + 40 * r();
    for (let i = 0; i < gn; i++) m[i] = lp(m[i]) * me[i] * (0.6 + 0.4 * Math.sin(i / sr * w));
    c.mix(low, m, 0.03 + r() * 0.3, (0.1 + 0.25 * cr) * (0.5 + sev), sr);
  }
  c.filter(low, c.biquad("lp", 2000 + 2200 * sev, 0.6, sr));
  const shat = Math.round(14 + 14 * gl), crk = Math.round(14 + 70 * gl);
  for (let g = 0; g < shat; g++) c.mix(hi, c.ring([[2800 + r() * 4500, 1], [5500 + r() * 3000, 0.5]], 0.03, 0.003 + r() * 0.005, sr), 0.02 + r() * 0.09, (0.25 + 0.5 * r()) * (0.25 + 0.75 * gl) * (0.5 + 0.5 * sev), sr);
  for (let g = 0; g < crk; g++) {
    const t = 0.12 + Math.pow(r(), 1.4) * (0.5 + 0.7 * sev), a = (0.15 + 0.45 * r()) * (0.25 + 0.75 * gl);
    if (r() < 0.7) c.mix(hi, c.ring([[2500 + r() * 5500, 1], [4500 + r() * 3500, 0.4]], 0.04, 0.003 + r() * 0.01, sr), t, a, sr);
    else c.mix(hi, c.burst(r, 0.006, "hp", 4500, 1, 0.0003, 0.002, sr), t, a, sr);
  }
  if (p.airbag) {
    const ap = 0.17 + 0.04 * r();
    c.mix(hi, c.burst(r, 0.05, "bp", 1200, 0.8, 0.0015, 0.014, sr), ap, 1.3, sr);
    c.mix(hi, c.burst(r, 0.015, "hp", 3200, 0.8, 0.0005, 0.004, sr), ap, 0.9, sr);
    c.mix(hi, c.osc("sine", (t) => 65 * pm * (1 + 0.5 * Math.exp(-t * 40)), c.seconds(0.18, sr), sr), ap, 0.9, sr);
    const hn = c.seconds(0.5, sr), h = c.noise(r, hn), he = c.env(hn, 0.02, 0.15, sr), hh = c.biquad("hp", 3000, 0.7, sr);
    for (let i = 0; i < hn; i++) h[i] = hh(h[i]) * he[i];
    c.mix(hi, h, ap + 0.03, 0.45, sr);
  }
  if (p.debris) {
    const t0 = 0.55, t1 = total - 0.25, dn = Math.round(40 + 40 * sev);
    for (let g = 0; g < dn; g++) {
      const t = t0 + Math.pow(r(), 1.4) * (t1 - t0), k = 1 - (t - t0) / (t1 - t0 + 0.1);
      if (r() < 0.5) c.mix(hi, c.ring([[2200 + r() * 4000, 1], [1000 + r() * 900, 0.4]], 0.05, 0.005 + r() * 0.01, sr), t, 0.3 * k * (0.3 + gl), sr);
      else c.mix(low, c.burst(r, 0.02, "bp", 400 + r() * 1200, 2, 0.001, 0.008 + r() * 0.01, sr), t, 0.28 * k, sr);
    }
  }
  c.filter(hi, c.biquad("lp", 9000, 0.7, sr));
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = low[i] + 1.1 * hi[i];
  c.finish(out, 0.95, 1.3);
  c.gain(out, 0.6 + 0.4 * sev);
  c.fade(out, 40, sr);
  return { samples: out };
}
