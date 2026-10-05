// Hull bump: a hull meeting a dock fender. Layers: a pitch-dropping thump, a damped hull-panel ring, a fender-specific contact (tyre rubber slap and hollow drum, foam squash with fast damping, rope creak and fibre scuff), a stick-slip rubber squeak chirp on the rebound, and a tail of sloshing water plus a second rebound nudge.
export const meta = {
  title: "Hull Fender Bump", kind: "impact", format: "sound", duration: 1.2, price: 2, author: "stormfront", payout: "stormfront@creators.oasis.example", kit: "Ocean Harbour", description: "A boat hull bumping a dock fender, with tyre, foam or rope-bumper contact, a hull body ring, a rubber squeak chirp and a water slosh tail; for harbour scenes and boat docking.",
  tags: ["boat", "hull", "dock", "fender", "bump", "harbour", "impact", "squeak"],
};
export const params = { knobs: {
  fender: { type: "choice", label: "Fender", default: "tyre", options: ["tyre", "foam", "rope-bumper"] },
  force: { type: "range", label: "Force", default: 0.5, min: 0, max: 1, step: 0.01 },
  resonance: { type: "range", label: "Hull resonance", default: 0.5, min: 0, max: 1, step: 0.01 },
  squeak: { type: "range", label: "Squeak", default: 0.5, min: 0, max: 1, step: 0.01 },
  tail: { type: "toggle", label: "Water tail", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, fe = p.fender, f = p.force, rs = p.resonance;
  const r = c.rng(p.seed * 613 + params.knobs.fender.options.indexOf(fe) * 71 + 3);
  const dur = p.tail ? 1.2 : 0.8, out = new Float32Array(c.seconds(dur, sr));
  const F = { tyre: { b: 85, d: 0.09, cf: 2200, cq: 1.2, rd: 0.12, ca: 0.8 }, foam: { b: 60, d: 0.05, cf: 600, cq: 0.7, rd: 0.04, ca: 0.55 }, "rope-bumper": { b: 110, d: 0.04, cf: 3800, cq: 1.5, rd: 0.18, ca: 0.8 } }[fe];
  const n = c.seconds(0.4, sr), th = new Float32Array(n), base = F.b * (1.25 - 0.4 * f), dk = F.d + 0.05 * f;
  let ph = 0;
  for (let i = 0; i < n; i++) { const t = i / sr; ph += c.TAU * base * (1 + 1.5 * Math.exp(-t / 0.025)) / sr; th[i] = Math.sin(ph) * Math.exp(-t / dk) * Math.min(1, t / 0.002); }
  c.mix(out, th, 0.002, 0.45 + 0.5 * f, sr);
  c.mix(out, c.burst(r, 0.03, "bp", F.cf * (0.8 + 0.5 * f), F.cq, 0.0008, 0.006 + 0.01 * (fe === "foam"), sr), 0, (0.45 + 0.5 * f) * F.ca, sr);
  const hf = 150 + 100 * r();
  const modes = [[1.6, 1], [2.9, 0.7], [4.3, 0.5], [6.7, 0.35], [9.3, 0.2]].map(([a, b]) => [hf * a * (0.99 + 0.02 * r()), b]);
  c.mix(out, c.ring(modes, 0.5, F.rd * (0.5 + 0.7 * rs), sr), 0.004, (0.18 + 0.3 * rs) * (0.5 + 0.5 * f), sr);
  const nz = c.seconds(0.12, sr), hb = c.noise(r, nz), hl = c.biquad("bp", 420 + 300 * rs, 1.2, sr);
  for (let i = 0; i < nz; i++) hb[i] = hl(hb[i]) * Math.exp(-i / sr / 0.04) * Math.min(1, i / (0.003 * sr));
  c.mix(out, hb, 0.003, 0.5 * (0.3 + rs), sr);
  if (fe === "tyre") c.mix(out, c.ring([[140, 1], [230, 0.5], [410, 0.25]], 0.25, 0.09, sr), 0.006, 0.4, sr);
  if (fe === "foam") c.mix(out, c.burst(r, 0.14, "lp", 450, 0.7, 0.006, 0.05, sr), 0.004, 0.6, sr);
  if (fe === "rope-bumper") {
    for (let g = 0; g < 18; g++) c.mix(out, c.burst(r, 0.012, "bp", 2800 + r() * 3200, 3, 0.0005, 0.004, sr), 0.01 + Math.pow(r(), 1.5) * 0.2, (0.25 + 0.3 * r()) * (0.5 + f), sr);
    const m = c.seconds(0.3, sr), cr = new Float32Array(m), nn = c.noise(r, m), bq = c.biquad("bp", 900, 5, sr);
    for (let i = 0; i < m; i++) { const t = i / sr; cr[i] = bq(nn[i]) * (Math.sin(t * 90 + 3 * Math.sin(t * 11)) > 0.2 ? 1 : 0.15) * Math.sin(Math.PI * i / m); }
    c.mix(out, cr, 0.05, 0.9, sr);
  }
  const t0 = 0.1 + 0.08 * r(), len = c.seconds(0.2 + 0.3 * p.squeak, sr), s = new Float32Array(len);
  const f0 = 1000 + 700 * r() + (fe === "foam" ? -350 : fe === "rope-bumper" ? 500 : 0), dirn = r() < 0.5 ? -1 : 1;
  let sp = 0, st = 1;
  for (let i = 0; i < len; i++) {
    const t = i / len, ts = i / sr;
    if (i % 90 === 0) st = 0.55 + 0.45 * r();
    const fr = f0 * (1 + dirn * 0.35 * t) * (1 + 0.03 * Math.sin(ts * 55));
    sp += c.TAU * fr / sr;
    const stick = Math.sin(ts * 140 + 2 * Math.sin(ts * 23)) > -0.3 ? 1 : 0.25;
    s[i] = (Math.sin(sp) + 0.5 * Math.sin(2.01 * sp) + 0.25 * Math.sin(3.02 * sp)) * Math.sin(Math.PI * t) * stick * st;
  }
  c.mix(out, s, t0, 0.05 + 0.3 * p.squeak, sr);
  if (p.tail) {
    const m = c.seconds(0.9, sr), w = c.pink(r, m), lp = c.biquad("bp", 600, 0.8, sr), ph2 = r() * 6;
    for (let i = 0; i < m; i++) { const t = i / sr; w[i] = lp(w[i]) * (0.35 + 0.65 * Math.pow(0.5 + 0.5 * Math.sin(t * 9 + ph2 + 1.5 * Math.sin(t * 3)), 2)) * Math.exp(-t / 0.35) * Math.min(1, t / 0.06); }
    c.mix(out, w, 0.1, 0.5, sr);
    for (let g = 0; g < 7; g++) c.mix(out, c.burst(r, 0.05, "bp", 1400 + r() * 1800, 2.5, 0.002, 0.012, sr), 0.15 + r() * 0.6, 0.15 + 0.15 * r(), sr);
    c.mix(out, th, 0.38 + 0.05 * r(), 0.12 + 0.12 * f, sr);
  }
  c.fade(c.finish(out, 0.85, 1.2), 60, sr);
  return { samples: out };
}
