// Fish crate set down on the quay: a rocking series of contacts (bump, then two or three smaller bounces), each with a hard tick, a crate body (hollow wood boards or stiff plastic shell) and a cluster of ice chips; plus a scrape, a sloshing wet layer and an optional stone-quay slap echo.
export const meta = {
  title: "Crate Set Down", kind: "foley", format: "sound", duration: 1.1, price: 1, author: "stormfront", payout: "stormfront@creators.oasis.example", kit: "Ocean Harbour", description: "A fish crate lowered onto the harbour quay with a bump, a rocking settle and a rattle of ice; for dockside scenes, fishing games and film foley.",
  tags: ["crate", "fish", "harbour", "quay", "foley", "ice", "wet", "dock"],
};
export const params = { knobs: {
  crate: { type: "choice", label: "Crate", default: "wood", options: ["wood", "plastic"] },
  load: { type: "range", label: "Load", default: 0.5, min: 0, max: 1, step: 0.01 },
  ice: { type: "range", label: "Ice rattle", default: 0.5, min: 0, max: 1, step: 0.01 },
  wetness: { type: "range", label: "Wetness", default: 0.4, min: 0, max: 1, step: 0.01 },
  tail: { type: "toggle", label: "Quay tail", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, r = c.rng(p.seed * 613 + (p.crate === "wood" ? 11 : 97)), out = new Float32Array(c.seconds(1.1, sr));
  const w = p.load, wood = p.crate === "wood", k = 1 - 0.25 * w;
  const base = wood ? [[210 * k, 1], [335 * k, 0.6], [590 * k, 0.35], [910 * k, 0.15]] : [[480 * k, 1], [1130 * k, 0.5], [1900 * k, 0.35], [3100 * k, 0.2]];
  const chip = (t, a) => c.mix(out, c.burst(r, 0.003 + r() * 0.004, "bp", 4000 + r() * 4500, 5, 0.0002, 0.0012, sr), t, a, sr);
  let t = 0, gap = 0.1 + r() * 0.05, amp = 1;
  for (let n = 0; n < 4; n++) {
    const det = base.map(([f, a]) => [f * (0.985 + r() * 0.03) * (1 + 0.04 * n), a]);
    c.mix(out, c.burst(r, 0.01, "hp", (wood ? 2200 : 3800) * (0.9 + r() * 0.2), 0.8, 0.0004, 0.003, sr), t, 0.6 * amp, sr);
    c.mix(out, c.ring(det, 0.45, wood ? 0.07 : 0.15, sr), t + 0.003, (0.6 - 0.25 * w) * amp, sr);
    if (n === 0) {
      c.mix(out, c.ring([[70 - 25 * w, 1], [140 - 40 * w, 0.4]], 0.3, 0.05 + 0.08 * w, sr), 0.003, 0.5 + 0.6 * w, sr);
      c.mix(out, c.burst(r, 0.05, "bp", wood ? 900 : 2500, 1.5, 0.001, 0.014, sr), 0.002, 0.4, sr);
    }
    const m = Math.round((4 + 22 * p.ice) * (n === 0 ? 1 : 0.7));
    for (let g = 0; g < m; g++) chip(t + 0.004 + Math.pow(r(), 1.4) * 0.09, (0.15 + 0.5 * r()) * (0.2 + 0.8 * p.ice) * (0.4 + 0.6 * amp));
    t += gap; gap *= 0.55 + r() * 0.1; amp *= 0.5;
  }
  for (let g = 0; g < 6 + 40 * p.ice; g++) { const tt = 0.3 + Math.pow(r(), 1.3) * 0.45; chip(tt, (0.08 + 0.3 * r()) * (0.2 + 0.8 * p.ice) * (1.1 - tt)); }
  const sn = c.seconds(0.1, sr), sc = c.noise(r, sn), sb = c.biquad("bp", wood ? 1400 : 3000, 1.2, sr), se = c.env(sn, 0.01, 0.04, sr);
  for (let i = 0; i < sn; i++) sc[i] = sb(sc[i]) * se[i];
  c.mix(out, sc, 0.02 + r() * 0.02, 0.2 + 0.2 * w, sr);
  if (p.wetness > 0) {
    for (let g = 0; g < 3 + 10 * p.wetness; g++) {
      const tt = 0.01 + r() * 0.5, f0 = 400 + r() * 900, d = c.seconds(0.07, sr), x = c.noise(r, d), e = c.env(d, 0.004, 0.022, sr);
      for (let i = 0; i < d; i++) x[i] *= e[i] * Math.sin(c.TAU * (f0 + 1500 * i / d) / sr * i);
      c.mix(out, x, tt, 0.4 * p.wetness, sr);
    }
    for (let g = 0; g < 2 + 5 * p.wetness; g++) {
      const f0 = 1800 + r() * 1800, d = c.seconds(0.04, sr), x = c.osc("sine", (tt) => f0 * (1 + 4 * tt), d, sr), e = c.env(d, 0.001, 0.012, sr);
      for (let i = 0; i < d; i++) x[i] *= e[i];
      c.mix(out, x, 0.3 + r() * 0.45, 0.2 * p.wetness, sr);
    }
    c.mix(out, c.burst(r, 0.14, "bp", 1800, 1.2, 0.003, 0.045, sr), 0.005, 0.45 * p.wetness, sr);
  }
  if (p.tail) {
    const dry = Float32Array.from(out), lp = c.biquad("lp", 1800, 0.7, sr);
    c.filter(dry, lp);
    c.mix(out, dry, 0.085, 0.35, sr);
    c.mix(out, dry, 0.19, 0.2, sr);
    const q = c.seconds(0.4, sr), sl = c.noise(r, q), l2 = c.biquad("lp", 1100, 0.8, sr), e = c.env(q, 0.02, 0.12, sr);
    for (let i = 0; i < q; i++) sl[i] = l2(sl[i]) * e[i];
    c.mix(out, sl, 0.03, 0.14, sr);
  }
  c.filter(out, c.biquad("lp", wood ? 9000 : 12000, 0.7, sr));
  c.fade(c.finish(out, 0.85, 1.1), 20, sr);
  return { samples: out };
}
