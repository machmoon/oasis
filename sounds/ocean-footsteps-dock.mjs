// Dock footsteps: a walking phrase on harbour planking. Each step layers a body thump, a surface-coloured heel click, a board-resonance ring, a grit scuff, a pitch-gliding plank creak (a gritty scrape on stone) and a softer trailing-foot toe drag, over a faint under-dock water murmur; rate sets spacing.
export const meta = {
  title: "Dock Footsteps", kind: "foley", format: "sound", duration: 3, price: 2, author: "stormfront", payout: "stormfront@creators.oasis.example", kit: "Ocean Harbour", description: "A person walking along harbour planking, with the surface, weight, board creak, shoe grit and walking rate as knobs; a game would use it for a quayside or pier traversal loop.",
  tags: ["footsteps", "dock", "pier", "planks", "harbour", "creak", "foley", "walk"],
};
export const params = { knobs: {
  surface: { type: "choice", label: "Surface", default: "dry-plank", options: ["dry-plank", "wet-plank", "stone-quay"] },
  weight: { type: "range", label: "Weight", default: 0.5, min: 0, max: 1, step: 0.01 },
  creak: { type: "range", label: "Creak", default: 0.5, min: 0, max: 1, step: 0.01 },
  grit: { type: "range", label: "Shoe grit", default: 0.4, min: 0, max: 1, step: 0.01 },
  rate: { type: "range", label: "Rate (steps/s)", default: 1.8, min: 1.3, max: 3, step: 0.05 },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, r = c.rng(p.seed * 613 + params.knobs.surface.options.indexOf(p.surface) * 97 + 3);
  const w = p.weight, steps = Math.max(3, Math.round(2.4 * p.rate)), period = 1 / p.rate;
  const dur = Math.min(4, 0.1 + steps * period + 0.4), n0 = c.seconds(dur, sr), out = new Float32Array(n0);
  const S = p.surface, stone = S === "stone-quay", wet = S === "wet-plank";
  const bed = c.brown(r, n0), blp = c.biquad("lp", stone ? 700 : 450, 0.7, sr); let pk = 1e-6;
  for (let i = 0; i < n0; i++) { bed[i] = blp(bed[i]) * (0.7 + 0.3 * Math.sin(i / sr * 1.3 + 2 * r())); pk = Math.max(pk, Math.abs(bed[i])); }
  c.mix(out, bed, 0, 0.07 / pk, sr);
  for (let s = 0; s < steps; s++) {
    const t0 = 0.05 + s * period + (r() - 0.5) * 0.06 * period, v = (0.75 + 0.25 * r()) * (0.6 + 0.5 * w);
    const f0 = (105 - 50 * w) * (0.93 + 0.14 * r());
    c.mix(out, c.ring([[f0, 1], [f0 * 2.1, 0.25]], 0.25, 0.03 + 0.07 * w, sr), t0 + 0.004, (stone ? 0.35 : 0.8) * v, sr);
    const ck = stone ? [4200, 0.8] : wet ? [1500, 0.6] : [2400, 0.8];
    c.mix(out, c.burst(r, 0.012, "lp", ck[0] * (0.9 + 0.2 * r()), ck[1], 0.0008, 0.004, sr), t0, (stone ? 0.8 : 0.5) * v, sr);
    if (stone) c.mix(out, c.ring([[1800 * (0.95 + 0.1 * r()), 0.5], [3300, 0.25]], 0.08, 0.012, sr), t0 + 0.001, 0.3 * v, sr);
    else {
      const k = (1 - 0.15 * w) * (0.97 + 0.06 * r()), dm = wet ? 0.03 : 0.07;
      c.mix(out, c.ring([[170 * k, 1], [340 * k, 0.55], [690 * k, 0.3], [1150 * k, 0.12]], 0.3, dm + 0.03 * w, sr), t0 + 0.003, 0.5 * v, sr);
    }
    if (wet) {
      c.mix(out, c.burst(r, 0.07, "bp", 2800, 1.2, 0.003, 0.025, sr), t0 + 0.005, 0.4 * v, sr);
      c.mix(out, c.burst(r, 0.05, "bp", 900, 2, 0.003, 0.015, sr), t0 + 0.04 + 0.04 * r(), 0.25 * v, sr);
    }
    const gr = Math.round(8 + p.grit * (12 + 22 * w));
    for (let g = 0; g < gr; g++) c.mix(out, c.burst(r, 0.003 + r() * 0.004, "bp", 3000 + r() * 4000, 4, 0.0003, 0.001, sr), t0 + 0.01 + Math.pow(r(), 1.5) * 0.12, (0.1 + 0.4 * r()) * (0.4 + 0.6 * v) * (0.3 + 0.7 * p.grit), sr);
    if (p.grit > 0.05) {
      const n = c.seconds(0.06 + 0.05 * w, sr), x = c.noise(r, n), bp = c.biquad("bp", 4500, 0.8, sr);
      for (let i = 0; i < n; i++) x[i] = bp(x[i]) * Math.sin(Math.PI * i / n);
      c.mix(out, x, t0 + 0.015, 0.3 * p.grit * v, sr);
    }
    const tt = t0 + period * (0.45 + 0.1 * r());
    c.mix(out, c.burst(r, 0.05, "lp", stone ? 2500 : 1100, 0.8, 0.002, 0.012, sr), tt, 0.22 * v, sr);
    c.mix(out, c.ring([[f0 * 1.3, 1], [f0 * 2.6, 0.2]], 0.12, 0.025, sr), tt + 0.003, (stone ? 0.1 : 0.22) * v, sr);
    if (stone) {
      const m = Math.round(2 + 8 * p.creak);
      for (let g = 0; g < m; g++) c.mix(out, c.burst(r, 0.006, "bp", 2200 + 1800 * g / m + 300 * r(), 3, 0.0005, 0.002, sr), t0 + 0.03 + 0.1 * g / m, 0.25 * p.creak * v, sr);
    } else if (p.creak > 0.03 && r() < 0.5 + 0.5 * p.creak) {
      const n = c.seconds(Math.min(period * 0.7, 0.12 + 0.2 * p.creak * (0.6 + 0.6 * r())), sr), up = r() < 0.5, fa = 260 + 220 * r(), fb = fa * (up ? 1.6 : 0.6), x = new Float32Array(n);
      let ph = 0, ph2 = 0;
      for (let i = 0; i < n; i++) {
        const u = i / n, f = fa + (fb - fa) * u, jit = 1 + 0.25 * Math.sin(i / sr * 70 * c.TAU) * (0.5 + 0.5 * r());
        ph += c.TAU * f / sr; ph2 += c.TAU * f * 1.51 / sr;
        x[i] = (Math.sin(ph) + 0.5 * Math.sin(ph2) + 0.3 * Math.sin(ph * 3)) * jit * Math.sin(Math.PI * u) * (0.6 + 0.4 * r());
      }
      c.mix(out, x, t0 + 0.03 + 0.08 * r(), 0.2 * (0.3 + 0.7 * p.creak) * (0.6 + 0.6 * w), sr);
    }
  }
  c.filter(out, c.biquad("lp", stone ? 9000 : 7000, 0.7, sr));
  c.finish(out, 0.85, 1.1);
  c.gain(out, 0.6 + 0.4 * w);
  c.fade(out, 8, sr);
  return { samples: out };
}
