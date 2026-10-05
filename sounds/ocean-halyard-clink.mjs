// Halyard clink: rope-ends slapping a mast in wind. Layers: a gusting wind bed, a hollow mast-tube body, and discrete slaps. Each slap is a short whip flam of ticks, then ringing tube modes from one of three halyard pitches, with level following the gusts.
export const meta = {
  title: "Halyard Clink", kind: "foley", format: "sound", duration: 3, price: 2, author: "stormfront", payout: "stormfront@creators.oasis.example", kit: "Ocean Harbour",
  description: "Halyards slapping a mast in the wind, with aluminium or wood tone, gusting wind, slap density and ring as knobs; a harbour mooring bed for boats at rest.",
  tags: ["halyard", "mast", "harbour", "sailboat", "clink", "wind", "marina", "rigging"],
};
export const params = { knobs: {
  mast: { type: "choice", label: "Mast", default: "aluminium", options: ["aluminium", "wood"] },
  wind: { type: "range", label: "Wind", default: 0.5, min: 0, max: 1, step: 0.01 },
  density: { type: "range", label: "Slap density", default: 0.5, min: 0, max: 1, step: 0.01 },
  ring: { type: "range", label: "Ring", default: 0.5, min: 0, max: 1, step: 0.01 },
  rate: { type: "range", label: "Rate", default: 1, min: 0.5, max: 2, step: 0.05 },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, r = c.rng(p.seed * 613 + (p.mast === "wood" ? 41 : 7)), dur = 3, n = c.seconds(dur, sr), out = new Float32Array(n);
  const alu = p.mast === "aluminium", W = p.wind;
  const gl = Math.ceil(n / 1024) + 2, gust = new Float32Array(gl); let gv = 0.5;
  for (let i = 0; i < gl; i++) { if (i % 12 === 0) gv = 0.25 + 0.75 * r(); gust[i] = (i ? gust[i - 1] : gv) * 0.9 + gv * 0.1; }
  const gAt = (t) => gust[Math.min(gl - 1, Math.floor(t * sr / 1024))];
  const wb = c.pink(r, n), hp = c.biquad("hp", 180, 0.7, sr), lp = c.biquad("lp", 600 + 1800 * W, 0.8, sr);
  for (let i = 0; i < n; i++) wb[i] = lp(hp(wb[i])) * (0.5 + 0.5 * gust[i >> 10]);
  c.mix(out, wb, 0, 0.06 + 0.4 * W, sr);
  const hum = c.pink(r, n), hl = c.biquad("bp", alu ? 250 : 160, 4, sr);
  for (let i = 0; i < n; i++) hum[i] = hl(hum[i]) * (0.4 + 0.6 * gust[i >> 10]);
  c.mix(out, hum, 0, 0.1 + 0.25 * W, sr);
  const count = Math.round(c.clamp((3 + 9 * p.density) * p.rate * (0.6 + 0.6 * W), 2, 22));
  const base = alu ? 1400 : 480, tail = alu ? 0.03 + 0.1 * p.ring : 0.015 + 0.04 * p.ring;
  const pitches = [0.85 + 0.1 * r(), 1.1 + 0.1 * r(), 1.4 + 0.15 * r()];
  const slot = (dur - 0.4) / count;
  for (let k = 0; k < count; k++) {
    const t = 0.05 + k * slot + r() * slot * 0.55;
    const f = base * pitches[Math.floor(r() * 3)] * (1 + 0.01 * (r() - 0.5));
    const a = (0.35 + 0.65 * r()) * (0.35 + 0.65 * gAt(t)) * (0.4 + 0.6 * W);
    const modes = alu ? [[f, 1], [f * 2.76, 0.5], [f * 5.4, 0.22]] : [[f, 1], [f * 1.9, 0.4], [f * 3.1, 0.12]];
    const ev = new Float32Array(c.seconds(tail * 6 + 0.12, sr));
    const flam = 1 + Math.floor(r() * 3);
    for (let j = 0; j < flam; j++) c.mix(ev, c.burst(r, 0.005, "bp", (alu ? 4200 : 2000) * (0.8 + 0.4 * r()), 1.5, 0.0004, 0.002, sr), j * (0.012 + 0.015 * r()), 0.4 + 0.5 * r(), sr);
    const t0 = (flam - 1) * 0.02;
    c.mix(ev, c.ring(modes, tail * 6, tail, sr), t0 + 0.0008, 0.3 + 0.6 * p.ring, sr);
    c.mix(ev, c.ring([[alu ? 235 : 140, 1]], 0.14, 0.04, sr), t0 + 0.001, 0.35, sr);
    c.mix(out, ev, t, a, sr);
  }
  c.reverb(out, { size: 0.3, decay: 0.3, mixAmt: 0.12 }, sr);
  c.fade(c.finish(out, 0.85, 1.1), 15, sr);
  return { samples: out };
}
